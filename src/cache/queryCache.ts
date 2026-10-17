// In-memory cache-then-network store.
// Lookup and insert are O(1) average. Key construction is O(k log k) in query fields.
// Space is O(cached entries + in-flight keys). This is not Apollo: no normalized
// entities, no TTL, and nothing survives a reload.

export type QueryParams = Record<string, string | number | boolean | null | undefined>

export type QuerySnapshot<T> = {
  data: T | null
  isLoading: boolean
  isRevalidating: boolean
  error: string | null
  errorIsBlocking: boolean
}

export type QueryOutcome<T> = {
  data: T | null
  error: string | null
}

type CacheEntry = {
  data: unknown
}

type Fetcher<T> = (signal: AbortSignal) => Promise<T>

const emptySnapshot: QuerySnapshot<never> = {
  data: null,
  isLoading: false,
  isRevalidating: false,
  error: null,
  errorIsBlocking: false,
}

export function normalizeQuery(query: QueryParams): string {
  // Sort keys so { b: 1, a: 2 } and { a: 2, b: 1 } share one cache entry.
  const entries = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)] as [string, string])
    .sort(([left], [right]) => left.localeCompare(right))

  return new URLSearchParams(entries).toString()
}

export function cacheKey(endpoint: string, query: QueryParams): string {
  return `${endpoint}?${normalizeQuery(query)}`
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return 'The SpaceX API took too long to respond.'
  }
  if (error instanceof Error && error.message) return error.message
  return 'The launch request failed.'
}

export function createQueryCache() {
  const cache = new Map<string, CacheEntry>()
  const inFlight = new Map<string, Promise<QueryOutcome<unknown>>>()
  const controllers = new Map<string, AbortController>()
  const requestSequence = new Map<string, number>()
  const errors = new Map<string, string>()
  const snapshots = new Map<string, QuerySnapshot<unknown>>()
  const listeners = new Set<() => void>()

  function notify(): void {
    snapshots.clear()
    listeners.forEach((listener) => listener())
  }

  function read<T>(key: string): T | null {
    const entry = cache.get(key)
    return entry ? (entry.data as T) : null
  }

  function buildSnapshot<T>(key: string): QuerySnapshot<T> {
    const data = read<T>(key)
    const pending = inFlight.has(key)
    const error = errors.get(key) ?? null
    return {
      data,
      isLoading: pending && data === null && error === null,
      isRevalidating: pending && data !== null,
      error,
      errorIsBlocking: error !== null && data === null,
    }
  }

  function getSnapshot<T>(key: string): QuerySnapshot<T> {
    const existing = snapshots.get(key)
    if (existing) return existing as QuerySnapshot<T>
    const snapshot = buildSnapshot<T>(key)
    snapshots.set(key, snapshot)
    return snapshot
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function cancel(key: string): void {
    requestSequence.set(key, (requestSequence.get(key) ?? 0) + 1)
    controllers.get(key)?.abort()
    controllers.delete(key)
    inFlight.delete(key)
    notify()
  }

  function cancelByPrefix(prefix: string): void {
    for (const key of inFlight.keys()) {
      if (key.startsWith(prefix)) cancel(key)
    }
  }

  function revalidate<T>(key: string, fetcher: Fetcher<T>): Promise<QueryOutcome<T>> {
    const existing = inFlight.get(key)
    if (existing) return existing as Promise<QueryOutcome<T>>

    const sequence = (requestSequence.get(key) ?? 0) + 1
    requestSequence.set(key, sequence)
    errors.delete(key)

    const controller = new AbortController()
    controllers.set(key, controller)

    const promise = fetcher(controller.signal)
      .then((data): QueryOutcome<T> => {
        if (requestSequence.get(key) !== sequence) {
          return { data: read<T>(key), error: null }
        }
        cache.set(key, { data })
        errors.delete(key)
        return { data, error: null }
      })
      .catch((error: unknown): QueryOutcome<T> => {
        if (isAbortError(error) || requestSequence.get(key) !== sequence) {
          return { data: read<T>(key), error: null }
        }
        const message = errorMessage(error)
        errors.set(key, message)
        return { data: read<T>(key), error: message }
      })
      .finally(() => {
        if (inFlight.get(key) === promise) inFlight.delete(key)
        if (controllers.get(key) === controller) controllers.delete(key)
        notify()
      })

    inFlight.set(key, promise as Promise<QueryOutcome<unknown>>)
    notify()
    return promise
  }

  function forceRevalidate<T>(key: string, fetcher: Fetcher<T>): Promise<QueryOutcome<T>> {
    cancel(key)
    return revalidate(key, fetcher)
  }

  function clear(): void {
    for (const controller of controllers.values()) controller.abort()
    cache.clear()
    inFlight.clear()
    controllers.clear()
    requestSequence.clear()
    errors.clear()
    snapshots.clear()
    notify()
  }

  return {
    subscribe,
    getSnapshot,
    read,
    revalidate,
    forceRevalidate,
    cancel,
    cancelByPrefix,
    clear,
    emptySnapshot: emptySnapshot as QuerySnapshot<never>,
  }
}

export const queryCache = createQueryCache()

export type QueryCache = ReturnType<typeof createQueryCache>
