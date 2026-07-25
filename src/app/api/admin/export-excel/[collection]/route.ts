import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import type { CollectionSlug, Field, Sort, Where } from 'payload'
import * as XLSX from 'xlsx'
import config from '@payload-config'

type ExportBody = {
  where?: Where
  sort?: Sort
  search?: string
  // Optional list of top-level field paths the client wants. If omitted we export all.
  columns?: string[]
}

const MAX_ROWS = 50_000
const PAGE_SIZE = 500

// Flatten a Payload field value into something Excel can render in a single cell.
const cellValue = (value: unknown): string | number | boolean | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (v && typeof v === 'object') {
          const o = v as Record<string, unknown>
          return String(o.name ?? o.title ?? o.email ?? o.label ?? o.id ?? JSON.stringify(o))
        }
        return String(v)
      })
      .join(', ')
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    // Common shapes: populated relationship, upload, named object
    return String(o.name ?? o.title ?? o.email ?? o.label ?? o.filename ?? o.id ?? JSON.stringify(o))
  }
  return String(value)
}

// Extract the user-facing field set from a collection config.
// We keep all top-level fields except `ui`-type and presentational fields.
const getExportableFields = (fields: Field[]): { name: string; label: string }[] => {
  const out: { name: string; label: string }[] = []
  for (const f of fields) {
    if (f.type === 'ui' || f.type === 'collapsible' || f.type === 'tabs' || f.type === 'row') {
      // Recurse into layout fields
      const nested = 'fields' in f && Array.isArray((f as any).fields) ? (f as any).fields : null
      if (nested) {
        out.push(...getExportableFields(nested))
      } else if (f.type === 'tabs' && 'tabs' in f) {
        for (const tab of (f as any).tabs ?? []) {
          if (Array.isArray(tab.fields)) out.push(...getExportableFields(tab.fields))
        }
      }
      continue
    }
    if (!('name' in f) || !f.name) continue
    const label =
      typeof f.label === 'string'
        ? f.label
        : f.label && typeof f.label === 'object'
          ? (Object.values(f.label)[0] as string) || f.name
          : f.name
    out.push({ name: f.name, label })
  }
  return out
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ collection: string }> },
) {
  try {
    const { collection: collectionParam } = await context.params
    const payload = await getPayload({ config })

    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate the collection slug — only allow real, registered collections
    const collectionConfig = payload.collections[collectionParam as CollectionSlug]?.config
    if (!collectionConfig) {
      return NextResponse.json({ error: 'Unknown collection' }, { status: 404 })
    }

    let body: ExportBody = {}
    try {
      body = (await request.json()) as ExportBody
    } catch {
      body = {}
    }

    const { where, sort, search, columns } = body

    // Build searchable-fields filter when `search` is provided (mirrors what
    // Payload's list view does — OR across `listSearchableFields`).
    let combinedWhere: Where | undefined = where
    const searchTerm = typeof search === 'string' ? search.trim() : ''
    const searchable = collectionConfig.admin?.listSearchableFields
    if (searchTerm && Array.isArray(searchable) && searchable.length > 0) {
      const searchWhere: Where = {
        or: searchable.map((f) => ({ [f]: { like: searchTerm } })),
      }
      combinedWhere = where ? { and: [where, searchWhere] } : searchWhere
    }

    // Enforce tenant scoping by applying the collection's baseListFilter — the
    // same filter that scopes the admin list view. Without this, a superadmin
    // request would export rows from every site.
    const baseListFilter = (collectionConfig.admin as { baseListFilter?: unknown })
      ?.baseListFilter
    if (typeof baseListFilter === 'function') {
      const reqLike = { payload, user, headers: request.headers }
      const tenantWhere = (await (
        baseListFilter as (args: { req: unknown }) => Promise<Where | null>
      )({ req: reqLike })) as Where | null
      if (tenantWhere) {
        combinedWhere = combinedWhere ? { and: [combinedWhere, tenantWhere] } : tenantWhere
      }
    }

    // Field set to export. Honor the client-supplied column list when present.
    const allFields = getExportableFields(collectionConfig.fields as Field[])
    const fieldList =
      Array.isArray(columns) && columns.length > 0
        ? allFields.filter((f) => columns.includes(f.name))
        : allFields

    // Always include id + timestamps so rows stay traceable.
    const headers = [
      { name: 'id', label: 'id' },
      ...fieldList.filter((f) => f.name !== 'id'),
    ]

    // Page through results — respect user access (no overrideAccess).
    const rows: Record<string, unknown>[] = []
    let page = 1
    while (rows.length < MAX_ROWS) {
      const result = await payload.find({
        collection: collectionParam as CollectionSlug,
        where: combinedWhere,
        sort,
        depth: 1,
        limit: PAGE_SIZE,
        page,
        user,
      })

      for (const doc of result.docs) {
        const row: Record<string, unknown> = {}
        for (const h of headers) {
          row[h.label] = cellValue((doc as unknown as Record<string, unknown>)[h.name])
        }
        rows.push(row)
        if (rows.length >= MAX_ROWS) break
      }

      if (!result.hasNextPage) break
      page++
    }

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: headers.map((h) => h.label),
    })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, collectionParam.slice(0, 31))

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const filename = `${collectionParam}-${stamp}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export' },
      { status: 500 },
    )
  }
}
