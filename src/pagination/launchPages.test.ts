import { describe, expect, it } from 'vitest'
import { appendUnique, flattenPages, hasMoreRecords, pageRequest } from './launchPages.ts'

describe('launch pagination', () => {
  it('requests 3 records per page, including page 11', () => {
    expect(pageRequest(1)).toEqual({ page: 1, limit: 3, offset: 0 })
    expect(pageRequest(10)).toEqual({ page: 10, limit: 3, offset: 27 })
    expect(pageRequest(11)).toEqual({ page: 11, limit: 3, offset: 30 })
  })

  it('appends pages without duplicate ids', () => {
    const first = [{ id: 'a' }, { id: 'b' }]
    const second = [{ id: 'b' }, { id: 'c' }]
    expect(appendUnique(first, second)).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
  })

  it('stops on an empty page, a short page, or the reported total', () => {
    expect(hasMoreRecords(0, 0, 3, 20)).toBe(false)
    expect(hasMoreRecords(0, 2, 3, 20)).toBe(false)
    expect(hasMoreRecords(0, 3, 3, 3)).toBe(false)
    expect(hasMoreRecords(0, 3, 3, 9)).toBe(true)
  })

  it('does not keep rows from a page map that was replaced', () => {
    const falcon = new Map([[1, [{ id: 'falcon-1' }]]])
    const starship = new Map([[1, [{ id: 'starship-1' }]]])
    expect(flattenPages(falcon).map((row) => row.id)).toEqual(['falcon-1'])
    expect(flattenPages(starship).map((row) => row.id)).toEqual(['starship-1'])
  })
})
