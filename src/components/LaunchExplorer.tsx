import { useEffect } from 'react'
import { InfiniteSentinel } from './InfiniteSentinel.tsx'
import { LaunchTable } from './LaunchTable.tsx'
import { RocketFilter } from './RocketFilter.tsx'
import { useLaunchExplorer } from '../hooks/useLaunchExplorer.ts'
import { PAGE_SIZE } from '../pagination/launchPages.ts'

export function LaunchExplorer() {
  const list = useLaunchExplorer()
  const rocketNameById = new Map((list.rockets.data ?? []).map((rocket) => [rocket.id, rocket.name]))
  const pendingRows = list.status === 'loading' || list.status === 'loading-more' ? PAGE_SIZE : 0
  const showEmpty = list.status === 'ready' && list.launches.length === 0 && !list.blocking

  useEffect(() => {
    document.title = 'SpaceX launch ledger'
  }, [])

  return (
    <div className="ledger">
      <header className="masthead">
        <p className="wordmark">SpaceX</p>
        <div>
          <h1>Launch ledger</h1>
          <p>Mission name, rocket, date, details, and patch for recorded SpaceX flights.</p>
        </div>
      </header>

      <RocketFilter
        rockets={list.rockets.data ?? []}
        rocketId={list.rocketId}
        isLoading={list.rockets.isLoading}
        error={list.rockets.error}
        onRetry={list.rockets.retry}
        onChange={list.selectRocket}
      />

      <p className="result-meta" role="status">
        {pendingRows > 0 && list.launches.length === 0 ? 'Loading launches.' : null}
        {list.revalidating ? 'Refreshing saved launches. ' : null}
        {list.totalDocs !== null && list.launches.length > 0
          ? `Showing ${list.launches.length} of ${list.totalDocs}.`
          : null}
        {list.loadedPage >= 10 && list.showInfiniteScroll ? ' Further launches load as you scroll.' : null}
      </p>

      {list.blocking ? (
        <div className="blocking-error" role="alert">
          <h2>Launches are unavailable</h2>
          <p>{list.error ?? 'The launch request failed.'}</p>
          <button type="button" onClick={list.retry}>
            Retry
          </button>
        </div>
      ) : null}

      {showEmpty ? (
        <p className="empty-state">No launches match this rocket.</p>
      ) : null}

      {list.launches.length > 0 || pendingRows > 0 ? (
        <LaunchTable
          launches={list.launches}
          rocketNameById={rocketNameById}
          isBusy={pendingRows > 0 || list.revalidating}
          pendingRows={pendingRows}
        />
      ) : null}

      {list.error && !list.blocking ? (
        <p className="inline-error" role="status">
          {list.error} Showing the last saved results.{' '}
          <button type="button" onClick={list.retry}>
            Retry
          </button>
        </p>
      ) : null}

      {list.showLoadMore ? (
        <button type="button" className="load-more" onClick={list.loadMore} disabled={list.status === 'loading-more'}>
          {list.status === 'loading-more' ? 'Loading launches' : 'Load more'}
        </button>
      ) : null}

      {list.showInfiniteScroll ? (
        <InfiniteSentinel enabled resetKey={list.loadedPage} onVisible={list.loadFromScroll} />
      ) : null}

      {!list.hasMore && list.loadedPage > 0 && !list.blocking ? (
        <p className="end-state">All matching launches are loaded.</p>
      ) : null}
    </div>
  )
}
