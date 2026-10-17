export const MANUAL_PAGE_COUNT = 10
export const PAGE_SIZE = 3

export type PageRequest = {
  page: number
  limit: number
  offset: number
}

export function pageRequest(page: number): PageRequest {
  if (page < 1) throw new Error('Page numbers start at 1.')
  return {
    page,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }
}

export function isManualPage(page: number): boolean {
  return page <= MANUAL_PAGE_COUNT
}

export function hasMoreRecords(offset: number, received: number, limit: number, totalDocs: number): boolean {
  // An empty or short page is the end, even if totalDocs is stale.
  if (received === 0 || received < limit) return false
  return offset + received < totalDocs
}

export function appendUnique<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const seen = new Set(current.map((record) => record.id))
  const next = current.slice()
  for (const record of incoming) {
    if (seen.has(record.id)) continue
    seen.add(record.id)
    next.push(record)
  }
  return next
}

export function flattenPages<T extends { id: string }>(pages: ReadonlyMap<number, T[]>): T[] {
  const pageNumbers = [...pages.keys()].sort((left, right) => left - right)
  let rows: T[] = []
  for (const pageNumber of pageNumbers) {
    rows = appendUnique(rows, pages.get(pageNumber) ?? [])
  }
  return rows
}
