/**
 * How a member is named wherever the admin offers a choice of members — the
 * slideshow's skip list, the Speech Master slide, contact persons, a team grid.
 *
 * Those pickers show the member collection's title, and the title used to be
 * the company. An administrator marking who is absent this week thinks in
 * people, and two members can share a company, so the person leads and the
 * company follows in brackets. It is stored rather than computed on read
 * because the picker searches and sorts on the title column.
 */
export interface MemberNameParts {
  name?: string | null
  surname?: string | null
  company?: string | null
}

const clean = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''

export function memberDisplayName({ name, surname, company }: MemberNameParts): string {
  const person = [clean(name), clean(surname)].filter(Boolean).join(' ')
  const firm = clean(company)
  if (person && firm) return `${person} (${firm})`
  return person || firm
}
