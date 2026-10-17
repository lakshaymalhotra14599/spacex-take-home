import { useEffect, useRef } from 'react'
import { useSyncExternalStore } from 'react'
import {
  cacheKey,
  queryCache,
  type QueryParams,
  type QuerySnapshot,
} from '../cache/queryCache.ts'

type Fetcher<T> = (signal: AbortSignal) => Promise<T>

export function useCachedQuery<T>(
  endpoint: string,
  params: QueryParams,
  fetcher: Fetcher<T>,
): QuerySnapshot<T> & { retry: () => void } {
  const key = cacheKey(endpoint, params)
  const snapshot = useSyncExternalStore(
    queryCache.subscribe,
    () => queryCache.getSnapshot<T>(key),
    () => queryCache.getSnapshot<T>(key),
  )
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    void queryCache.revalidate(key, (signal) => fetcherRef.current(signal))
    return () => queryCache.cancel(key)
  }, [key])

  return {
    ...snapshot,
    retry: () => {
      void queryCache.forceRevalidate(key, (signal) => fetcherRef.current(signal))
    },
  }
}
