import type { Payload } from 'payload'

export interface ColumnMapping {
  [excelColumn: string]: string
}

export interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; email: string; error: string }>
  preview?: string[]
}

export interface MappedRow {
  email?: string
  name?: string
  surname?: string
  role?: string
  status?: string
  phone?: string
  company?: string
  jobPosition?: string
  orgRole?: string
  companyPhone?: string
  companyEmail?: string
  website?: string
  description?: string
  companyDescription?: string
  inaugurationDate?: any
  powerGroupLead?: any
  attendanceType?: string
  videoUrl?: string
  linkedinUrl?: string
  facebookUrl?: string
  instagramUrl?: string
  twitterUrl?: string
}

export function excelDateToISO(excelDate: any): string | undefined {
  if (!excelDate) return undefined

  if (typeof excelDate === 'string') {
    const trimmed = excelDate.trim()

    const ddmmyyyyRegex = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/
    const ddmmyyyyMatch = ddmmyyyyRegex.exec(trimmed)
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch
      const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }

    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0]
    }

    return trimmed
  }

  if (typeof excelDate === 'number') {
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + excelDate * 86400000)
    return date.toISOString().split('T')[0]
  }

  return undefined
}

export function mapRowData(rawRow: any, mapping: ColumnMapping): MappedRow {
  const row: any = {}
  for (const [excelCol, systemField] of Object.entries(mapping)) {
    if (rawRow[excelCol] !== undefined && rawRow[excelCol] !== null && rawRow[excelCol] !== '') {
      row[systemField] = rawRow[excelCol]
    }
  }
  return row
}

export function validateRequiredFields(row: MappedRow): void {
  if (!row.email || !row.name || !row.surname) {
    throw new Error('Missing required fields: email, name, or surname')
  }
}

export async function findOrCreateUser(payload: Payload, row: MappedRow): Promise<string | number> {
  const email = String(row.email).trim().toLowerCase()

  const existingUser = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })

  if (existingUser.docs.length > 0) {
    return existingUser.docs[0].id
  }

  const newUser = await payload.create({
    collection: 'users',
    data: {
      email: email,
      name: String(row.name).trim(),
      surname: String(row.surname).trim(),
      password: 'ChangeMe123!',
    },
  })

  return newUser.id
}

export async function checkExistingMembership(
  payload: Payload,
  userId: string | number,
  siteId: number,
): Promise<void> {
  const existingMembership = await payload.find({
    collection: 'site-memberships',
    where: {
      and: [{ user: { equals: userId } }, { site: { equals: siteId } }],
    },
    limit: 1,
  })

  if (existingMembership.docs.length > 0) {
    throw new Error('User already has a membership in this chapter')
  }
}

export function buildMembershipData(row: MappedRow, userId: string | number, siteId: number): any {
  const membershipData: any = {
    user: userId,
    site: siteId,
    role: row.role && ['member', 'member-admin'].includes(row.role) ? row.role : 'member',
    status: row.status && ['active', 'blocked'].includes(row.status) ? row.status : 'active',
  }

  addOptionalStringField(membershipData, row, 'phone')
  addOptionalStringField(membershipData, row, 'company')
  addOptionalStringField(membershipData, row, 'jobPosition')
  addOptionalStringField(membershipData, row, 'orgRole')
  addOptionalStringField(membershipData, row, 'companyPhone')
  addOptionalStringField(membershipData, row, 'companyEmail')
  addOptionalStringField(membershipData, row, 'website')
  addOptionalStringField(membershipData, row, 'description')
  addOptionalStringField(membershipData, row, 'companyDescription')
  addOptionalStringField(membershipData, row, 'videoUrl')
  addOptionalStringField(membershipData, row, 'linkedinUrl')
  addOptionalStringField(membershipData, row, 'facebookUrl')
  addOptionalStringField(membershipData, row, 'instagramUrl')
  addOptionalStringField(membershipData, row, 'twitterUrl')

  addDateField(membershipData, row, 'inaugurationDate')
  addBooleanField(membershipData, row, 'powerGroupLead')
  addAttendanceTypeField(membershipData, row)

  return membershipData
}

function addOptionalStringField(target: any, source: MappedRow, field: string): void {
  if (source[field as keyof MappedRow]) {
    target[field] = String(source[field as keyof MappedRow]).trim()
  }
}

function addDateField(target: any, source: MappedRow, field: string): void {
  if (source[field as keyof MappedRow]) {
    const convertedDate = excelDateToISO(source[field as keyof MappedRow])
    if (convertedDate) {
      target[field] = convertedDate
    }
  }
}

function addBooleanField(target: any, source: MappedRow, field: string): void {
  if (source[field as keyof MappedRow]) {
    const val = String(source[field as keyof MappedRow])
      .toLowerCase()
      .trim()
    target[field] = val === 'yes' || val === 'true' || val === '1'
  }
}

function addAttendanceTypeField(target: any, source: MappedRow): void {
  if (
    source.attendanceType &&
    ['online', 'onsite'].includes(String(source.attendanceType).toLowerCase())
  ) {
    target.attendanceType = String(source.attendanceType).toLowerCase()
  }
}

export async function processUserRow(
  payload: Payload,
  row: MappedRow,
  siteId: number,
): Promise<void> {
  validateRequiredFields(row)
  const userId = await findOrCreateUser(payload, row)
  await checkExistingMembership(payload, userId, siteId)
  const membershipData = buildMembershipData(row, userId, siteId)
  await payload.create({
    collection: 'site-memberships',
    data: membershipData,
  })
}

export function getEmailFromRawRow(rawRow: any, mapping: ColumnMapping): string {
  const emailColumn = Object.keys(mapping).find((k) => mapping[k] === 'email') || 'email'
  return rawRow[emailColumn] || 'unknown'
}
