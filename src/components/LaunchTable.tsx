import { useState } from 'react'
import type { LaunchRecord } from '../api/spacex.ts'
import { formatLaunchDate } from '../format/launchDate.ts'
import { useDetailLength } from '../hooks/useDetailLength.ts'
import { PAGE_SIZE } from '../pagination/launchPages.ts'
import { DetailsCopy } from './DetailsCopy.tsx'

type LaunchTableProps = {
  launches: LaunchRecord[]
  rocketNameById: ReadonlyMap<string, string>
  isBusy: boolean
  pendingRows: number
}

export function LaunchTable({ launches, rocketNameById, isBusy, pendingRows }: LaunchTableProps) {
  const detailLength = useDetailLength()

  return (
    <div className="table-scroll">
      <table className={isBusy ? 'is-busy' : undefined} aria-busy={isBusy}>
        <caption>SpaceX launches</caption>
        <thead>
          <tr>
            <th scope="col">Mission</th>
            <th scope="col">Rocket</th>
            <th scope="col">Launch date</th>
            <th scope="col">Details</th>
            <th scope="col">Patch</th>
          </tr>
        </thead>
        <tbody>
          {launches.map((launch, index) => {
            const rocketName = launch.rocketId ? rocketNameById.get(launch.rocketId) ?? 'Unknown rocket' : 'Unknown rocket'
            return (
              <tr key={launch.id}>
                <th scope="row">{launch.missionName}</th>
                <td data-label="Rocket">{rocketName}</td>
                <td data-label="Launch date">{formatLaunchDate(launch.dateUtc)}</td>
                <td data-label="Details">
                  <DetailsCopy text={launch.details ?? 'No details published'} lines={detailLength.maxLines} />
                </td>
                <td data-label="Patch">
                  {launch.patchUrl ? (
                    <MissionPatch
                      name={launch.missionName}
                      url={launch.patchUrl}
                      priority={index < PAGE_SIZE ? 'high' : 'low'}
                    />
                  ) : (
                    <span className="patch-fallback">No patch</span>
                  )}
                </td>
              </tr>
            )
          })}
          {pendingRows > 0 ? <SkeletonRows count={pendingRows} /> : null}
        </tbody>
      </table>
    </div>
  )
}

function SkeletonRows({ count }: { count: number }) {
  return Array.from({ length: count }, (_, index) => (
    <tr key={`pending-${index}`} className="skeleton-row" aria-hidden="true">
      <td className="skeleton-mission" data-label="Mission"><span className="bone bone-title" /></td>
      <td data-label="Rocket"><span className="bone bone-short" /></td>
      <td data-label="Launch date"><span className="bone bone-short" /></td>
      <td data-label="Details"><span className="bone bone-detail" /></td>
      <td data-label="Patch"><span className="bone bone-patch" /></td>
    </tr>
  ))
}

function MissionPatch({ name, url, priority }: { name: string; url: string; priority: 'high' | 'low' }) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')

  if (phase === 'error') {
    return <span className="patch-fallback">No patch</span>
  }

  return (
    <span className="patch-frame">
      {phase === 'loading' ? <span className="patch-skeleton" /> : null}
      <img
        src={url}
        alt={`${name} mission patch`}
        width={48}
        height={48}
        loading={priority === 'high' ? 'eager' : 'lazy'}
        fetchPriority={priority}
        decoding="async"
        className={phase === 'ready' ? 'is-ready' : 'is-pending'}
        onLoad={() => setPhase('ready')}
        onError={() => setPhase('error')}
      />
    </span>
  )
}
