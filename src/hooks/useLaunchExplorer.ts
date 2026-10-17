import { useEffect, useRef, useState } from 'react'
import {
  fetchLaunchPage,
  fetchRockets,
  LAUNCHES_ENDPOINT,
  launchQueryKey,
  ROCKETS_ENDPOINT,
  type LaunchPage,
  type LaunchRecord,
} from '../api/spacex.ts'
import { queryCache } from '../cache/queryCache.ts'
import { flattenPages, hasMoreRecords, isManualPage, MANUAL_PAGE_COUNT, pageRequest } from '../pagination/launchPages.ts'
import { useCachedQuery } from './useCachedQuery.ts'

export type ListStatus = 'loading' | 'ready' | 'loading-more' | 'error'

export type LaunchListState = {
  rocketId: string
  selectRocket: (rocketId: string) => void
  rockets: ReturnType<typeof useCachedQuery<Awaited<ReturnType<typeof fetchRockets>>>>
  launches: LaunchRecord[]
  totalDocs: number | null
  loadedPage: number
  hasMore: boolean
  status: ListStatus
  error: string | null
  blocking: boolean
  revalidating: boolean
  showLoadMore: boolean
  showInfiniteScroll: boolean
  loadMore: () => void
  loadFromScroll: (isVisible: boolean) => void
  retry: () => void
}

function pageKey(rocketId: string, page: number): string {
  const request = pageRequest(page)
  return launchQueryKey({ rocketId, limit: request.limit, offset: request.offset })
}

export function useLaunchExplorer(): LaunchListState {
  const rockets = useCachedQuery(ROCKETS_ENDPOINT, {}, fetchRockets)
  const initialPage = queryCache.read<LaunchPage>(pageKey('all', 1))
  const [rocketId, setRocketId] = useState('all')
  const [pages, setPages] = useState<Map<number, LaunchRecord[]>>(() =>
    initialPage ? new Map([[1, initialPage.launches]]) : new Map(),
  )
  const [loadedPage, setLoadedPage] = useState(initialPage ? 1 : 0)
  const [totalDocs, setTotalDocs] = useState<number | null>(initialPage?.totalDocs ?? null)
  const [hasMore, setHasMore] = useState(
    initialPage ? hasMoreRecords(initialPage.offset, initialPage.launches.length, initialPage.limit, initialPage.totalDocs) : false,
  )
  const [status, setStatus] = useState<ListStatus>(initialPage ? 'ready' : 'loading')
  const [error, setError] = useState<string | null>(null)
  const [blocking, setBlocking] = useState(false)
  const [revalidating, setRevalidating] = useState(Boolean(initialPage))

  const generationRef = useRef(0)
  const rocketIdRef = useRef(rocketId)
  const loadedPageRef = useRef(loadedPage)
  const hasMoreRef = useRef(hasMore)
  const loadingRef = useRef(false)
  const moreErrorRef = useRef(false)
  const failedPageRef = useRef(1)
  const visibleRef = useRef(false)
  const mountedRef = useRef(true)
  const loadToken = useRef(0)

  rocketIdRef.current = rocketId
  loadedPageRef.current = loadedPage
  hasMoreRef.current = hasMore

  function publish(page: number, pageData: LaunchPage, fromCache: boolean): void {
    const request = pageRequest(page)
    const more = hasMoreRecords(pageData.offset, pageData.launches.length, request.limit, pageData.totalDocs)
    hasMoreRef.current = more
    loadedPageRef.current = Math.max(loadedPageRef.current, page)
    moreErrorRef.current = false
    setPages((current) => {
      const next = new Map(current)
      next.set(page, pageData.launches)
      return next
    })
    setLoadedPage(loadedPageRef.current)
    setTotalDocs(pageData.totalDocs)
    setHasMore(more)
    setStatus('ready')
    setError(null)
    setBlocking(false)
    setRevalidating(fromCache)
  }

  async function loadPage(page: number, activeRocketId: string, generation: number, force: boolean): Promise<void> {
    const request = pageRequest(page)
    const key = pageKey(activeRocketId, page)
    const isCurrent = () =>
      mountedRef.current && generationRef.current === generation && rocketIdRef.current === activeRocketId
    const cached = queryCache.read<LaunchPage>(key)

    if (cached && isCurrent()) publish(page, cached, true)

    const fetcher = (signal: AbortSignal) =>
      fetchLaunchPage({ rocketId: activeRocketId, limit: request.limit, offset: request.offset }, signal)
    const outcome = force ? await queryCache.forceRevalidate(key, fetcher) : await queryCache.revalidate(key, fetcher)

    if (!isCurrent()) return
    if (outcome.error) {
      failedPageRef.current = page
      moreErrorRef.current = page > 1
      const cachedData = outcome.data ?? cached
      if (cachedData) {
        setStatus('ready')
        setError(outcome.error)
        setBlocking(false)
        setRevalidating(false)
        return
      }
      setStatus(page === 1 ? 'error' : 'ready')
      setError(outcome.error)
      setBlocking(page === 1)
      setRevalidating(false)
      return
    }
    if (outcome.data) {
      publish(page, outcome.data, false)
    }
  }

  useEffect(() => {
    const generation = generationRef.current
    const activeRocketId = rocketId
    const token = ++loadToken.current
    loadingRef.current = true
    if (!queryCache.read<LaunchPage>(pageKey(activeRocketId, 1))) {
      setStatus('loading')
      setError(null)
      setBlocking(false)
    }

    void loadPage(1, activeRocketId, generation, false).finally(() => {
      if (loadToken.current === token) loadingRef.current = false
    })

    return () => {
      loadingRef.current = false
      queryCache.cancelByPrefix(LAUNCHES_ENDPOINT)
    }
  }, [rocketId])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function loadNext(source: 'button' | 'scroll', force = false): Promise<void> {
    if (loadingRef.current) return
    if (source === 'scroll' && moreErrorRef.current && !force) return
    const nextPage = force ? failedPageRef.current : loadedPageRef.current + 1
    if (!force && loadedPageRef.current > 0 && !hasMoreRef.current) return
    if (source === 'button' && !isManualPage(nextPage)) return
    if (source === 'scroll' && nextPage <= MANUAL_PAGE_COUNT) return

    loadingRef.current = true
    moreErrorRef.current = false
    setStatus('loading-more')
    const generation = generationRef.current
    const activeRocketId = rocketIdRef.current
    try {
      await loadPage(nextPage, activeRocketId, generation, force)
    } finally {
      if (generationRef.current === generation) loadingRef.current = false
    }
  }

  function selectRocket(nextRocketId: string): void {
    if (nextRocketId === rocketIdRef.current) return
    generationRef.current += 1
    rocketIdRef.current = nextRocketId
    visibleRef.current = false
    moreErrorRef.current = false
    queryCache.cancelByPrefix(LAUNCHES_ENDPOINT)

    const cached = queryCache.read<LaunchPage>(pageKey(nextRocketId, 1))
    loadedPageRef.current = cached ? 1 : 0
    hasMoreRef.current = cached
      ? hasMoreRecords(cached.offset, cached.launches.length, cached.limit, cached.totalDocs)
      : false
    setRocketId(nextRocketId)
    setPages(cached ? new Map([[1, cached.launches]]) : new Map())
    setLoadedPage(loadedPageRef.current)
    setTotalDocs(cached?.totalDocs ?? null)
    setHasMore(hasMoreRef.current)
    setError(null)
    setBlocking(false)
    setRevalidating(Boolean(cached))
    setStatus(cached ? 'ready' : 'loading')
  }

  const launches = flattenPages(pages)
  const manualPagesRemain = loadedPage > 0 && loadedPage < MANUAL_PAGE_COUNT

  return {
    rocketId,
    selectRocket,
    rockets,
    launches,
    totalDocs,
    loadedPage,
    hasMore,
    status,
    error,
    blocking,
    revalidating,
    showLoadMore: hasMore && manualPagesRemain && !blocking,
    showInfiniteScroll: hasMore && loadedPage >= MANUAL_PAGE_COUNT && !blocking,
    loadMore: () => {
      void loadNext('button')
    },
    loadFromScroll: (isVisible: boolean) => {
      visibleRef.current = isVisible
      if (isVisible) void loadNext('scroll')
    },
    retry: () => {
      const page = failedPageRef.current || 1
      if (page <= 1) {
        loadingRef.current = false
        void loadPage(1, rocketIdRef.current, generationRef.current, true)
        return
      }
      loadingRef.current = false
      void loadNext(page <= MANUAL_PAGE_COUNT ? 'button' : 'scroll', true)
    },
  }
}
