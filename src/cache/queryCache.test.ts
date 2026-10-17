import { describe, expect, it, vi } from 'vitest'
import { cacheKey, createQueryCache } from './queryCache.ts'

const endpoint = 'https://example.test/launches'

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (error: unknown) => void = () => {}
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('query cache', () => {
  it('builds the same key when parameter order changes', () => {
    expect(cacheKey(endpoint, { b: 1, a: 'falcon' })).toBe(cacheKey(endpoint, { a: 'falcon', b: 1 }))
  })

  it('returns a cache hit immediately and still revalidates', async () => {
    const cache = createQueryCache()
    const key = cacheKey(endpoint, { page: 1 })
    const first = deferred<{ mission: string }>()
    const initial = cache.revalidate(key, () => first.promise)
    first.resolve({ mission: 'CRS-1' })
    await initial

    const second = deferred<{ mission: string }>()
    let started = false
    const outcome = cache.revalidate(key, () => {
      started = true
      return second.promise
    })

    expect(cache.read(key)).toEqual({ mission: 'CRS-1' })
    expect(cache.getSnapshot(key).isRevalidating).toBe(true)
    expect(started).toBe(true)

    second.resolve({ mission: 'CRS-2' })
    await outcome
    expect(cache.read(key)).toEqual({ mission: 'CRS-2' })
  })

  it('keeps a cache miss empty until the network succeeds', async () => {
    const cache = createQueryCache()
    const key = cacheKey(endpoint, { page: 1 })
    const pending = deferred<{ mission: string }>()
    const outcome = cache.revalidate(key, () => pending.promise)

    expect(cache.read(key)).toBeNull()
    expect(cache.getSnapshot(key).isLoading).toBe(true)

    pending.resolve({ mission: 'Starlink' })
    await outcome
    expect(cache.read(key)).toEqual({ mission: 'Starlink' })
    expect(cache.getSnapshot(key).isLoading).toBe(false)
  })

  it('preserves cached data and exposes a non-blocking error when revalidation fails', async () => {
    const cache = createQueryCache()
    const key = cacheKey(endpoint, { page: 1 })
    await cache.revalidate(key, async () => ({ mission: 'Cached' }))

    const outcome = await cache.revalidate(key, async () => {
      throw new Error('offline')
    })

    expect(outcome.data).toEqual({ mission: 'Cached' })
    expect(outcome.error).toBe('offline')
    expect(cache.read(key)).toEqual({ mission: 'Cached' })
    const snapshot = cache.getSnapshot(key)
    expect(snapshot.errorIsBlocking).toBe(false)
    expect(snapshot.error).toBe('offline')
  })

  it('exposes a blocking error when a cache miss fails', async () => {
    const cache = createQueryCache()
    const key = cacheKey(endpoint, { page: 1 })
    const outcome = await cache.revalidate(key, async () => {
      throw new Error('offline')
    })

    expect(outcome.data).toBeNull()
    expect(cache.read(key)).toBeNull()
    expect(cache.getSnapshot(key).errorIsBlocking).toBe(true)
  })

  it('shares one network request across concurrent callers', async () => {
    const cache = createQueryCache()
    const key = cacheKey(endpoint, { page: 2 })
    const pending = deferred<string>()
    const fetcher = vi.fn(() => pending.promise)

    const first = cache.revalidate(key, fetcher)
    const second = cache.revalidate(key, fetcher)
    pending.resolve('ok')
    await Promise.all([first, second])

    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('drops a stale response after a newer request starts', async () => {
    const cache = createQueryCache()
    const key = cacheKey(endpoint, { rocket: 'falcon-9' })
    const older = deferred<{ mission: string }>()
    const newer = deferred<{ mission: string }>()
    const first = cache.revalidate(key, () => older.promise)
    const second = cache.forceRevalidate(key, () => newer.promise)

    newer.resolve({ mission: 'New filter' })
    await second
    older.resolve({ mission: 'Old filter' })
    await first.catch(() => undefined)

    expect(cache.read(key)).toEqual({ mission: 'New filter' })
  })

  it('does not record an abort as a user-facing error', async () => {
    const cache = createQueryCache()
    const key = cacheKey(endpoint, { page: 1 })
    const outcome = cache.revalidate(key, (signal) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })

    cache.cancel(key)
    await outcome
    expect(cache.getSnapshot(key).error).toBeNull()
  })
})
