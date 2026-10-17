import { describe, expect, it } from 'vitest'
import { normalizeLaunch, normalizeLaunchPage, normalizeRockets } from './spacex.ts'

describe('launch library normalization', () => {
  it('reads mission name, details, and thumbnail_url', () => {
    const launch = normalizeLaunch({
      id: '1',
      name: 'Falcon 9 Block 5 | CRS-1',
      net: '2014-09-07T00:00:00.000Z',
      image: { thumbnail_url: 'https://example.test/thumb.png', image_url: 'https://example.test/full.png' },
      rocket: { configuration: { id: 164, name: 'Falcon 9' } },
      mission: { name: 'CRS-1', description: '   ' },
    })

    expect(launch).toMatchObject({
      id: '1',
      missionName: 'CRS-1',
      details: null,
      patchUrl: 'https://example.test/thumb.png',
      rocketId: 'Falcon 9',
      dateUtc: '2014-09-07T00:00:00.000Z',
    })
  })

  it('falls back to the full image and tolerates a missing patch', () => {
    expect(
      normalizeLaunch({
        id: '2',
        mission: { name: 'Demo' },
        image: { thumbnail_url: null, image_url: 'https://example.test/full.png' },
      })?.patchUrl,
    ).toBe('https://example.test/full.png')

    expect(normalizeLaunch({ id: '3', mission: { name: 'No patch' }, image: null })?.patchUrl).toBeNull()
  })

  it('reads count/results pages and launcher configurations', () => {
    const page = normalizeLaunchPage(
      { count: 4, results: [{ id: 'a', mission: { name: 'One' } }] },
      { offset: 3, limit: 3 },
    )
    expect(page).toMatchObject({ totalDocs: 4, offset: 3, limit: 3, launches: [{ id: 'a', missionName: 'One' }] })
    expect(normalizeRockets({ results: [{ id: 164, name: 'Falcon 9' }, { id: 165, name: 'Falcon 9' }, { name: 'Skip' }] })).toEqual([
      { id: 'Falcon 9', name: 'Falcon 9' },
    ])
  })
})
