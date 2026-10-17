import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { launchQueryKey, type LaunchPage } from '../api/spacex.ts'
import { queryCache } from '../cache/queryCache.ts'
import { InfiniteSentinel } from './InfiniteSentinel.tsx'
import { LaunchExplorer } from './LaunchExplorer.tsx'

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  disconnected = false
  callback: IntersectionObserverCallback
  root = null
  rootMargin = ''
  thresholds = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  observe() {}
  unobserve() {}
  disconnect() {
    this.disconnected = true
  }
  takeRecords() {
    return []
  }
  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
}

const rockets = [
  { id: 'falcon-9', name: 'Falcon 9' },
  { id: 'falcon-heavy', name: 'Falcon Heavy' },
]

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function launchPage(offset: number, limit: number, total: number, rocketId: string) {
  const received = Math.max(0, Math.min(limit, total - offset))
  return {
    count: total,
    next: offset + received < total ? `https://lldev.thespacedevs.com/2.3.0/launches/?offset=${offset + limit}` : null,
    previous: null,
    results: Array.from({ length: received }, (_, index) => {
      const id = `${rocketId}-${offset + index}`
      return {
        id,
        name: `Vehicle | Mission ${id}`,
        net: index === 2 ? 'not-a-date' : '2014-09-07T00:00:00.000Z',
        image: index === 0 ? null : { thumbnail_url: `https://example.test/${id}.png` },
        rocket: {
          configuration: {
            id: rocketId === 'all' ? 'falcon-9' : rocketId,
            name: rocketId === 'falcon-heavy' ? 'Falcon Heavy' : 'Falcon 9',
          },
        },
        mission: {
          name: `Mission ${id}`,
          description: index === 1 ? '   ' : 'Mission details',
        },
      }
    }),
  }
}

function readLaunchQuery(input: RequestInfo | URL) {
  const url = new URL(String(input))
  return {
    rocket: url.searchParams.get('rocket__configuration__name') ?? 'all',
    offset: Number(url.searchParams.get('offset') ?? 0),
    limit: Number(url.searchParams.get('limit') ?? 3),
    isRocketList: url.pathname.includes('launcher_configurations'),
  }
}

function installFetch(total = 40) {
  const calls: Array<{ rocket?: string; offset: number; limit: number }> = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const query = readLaunchQuery(input)
      if (query.isRocketList) return json({ results: rockets })
      calls.push({ rocket: query.rocket, offset: query.offset, limit: query.limit })
      return json(launchPage(query.offset, query.limit, total, query.rocket))
    }),
  )
  return calls
}

beforeEach(() => {
  queryCache.clear()
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('LaunchExplorer', () => {
  it('loads the first three launches and the rocket dropdown', async () => {
    installFetch()
    const user = userEvent.setup()
    render(<LaunchExplorer />)

    expect(await screen.findByRole('rowheader', { name: 'Mission all-0' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Mission all-1' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Mission all-2' })).toBeInTheDocument()
    expect(screen.getAllByText('Sep 07 2014').length).toBeGreaterThan(0)
    expect(screen.getByText('Date unavailable')).toBeInTheDocument()
    expect(screen.getByText('No details published')).toBeInTheDocument()
    expect(screen.getByText('No patch')).toBeInTheDocument()
    expect(screen.getAllByText('Falcon 9').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Rocket' }))
    expect(screen.getByRole('option', { name: 'Falcon Heavy' })).toBeInTheDocument()
    expect(screen.getAllByRole('rowheader')).toHaveLength(3)
  })

  it('loads three more records from the Load more button', async () => {
    const calls = installFetch()
    const user = userEvent.setup()
    render(<LaunchExplorer />)
    await screen.findByRole('rowheader', { name: 'Mission all-0' })

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    expect(await screen.findByRole('rowheader', { name: 'Mission all-3' })).toBeInTheDocument()
    expect(screen.getAllByRole('rowheader')).toHaveLength(6)
    expect(calls.some((call) => call.offset === 3 && call.limit === 3)).toBe(true)
  })

  it('does not request the same page twice while it is loading', async () => {
    const calls = installFetch()
    render(<LaunchExplorer />)
    const button = await screen.findByRole('button', { name: 'Load more' })
    button.click()
    button.click()
    await screen.findByRole('rowheader', { name: 'Mission all-3' })
    expect(calls.filter((call) => call.offset === 3)).toHaveLength(1)
  })

  it('filters by rocket and drops a late response from the previous filter', async () => {
    const previousRequest: { release: (() => void) | null } = { release: null }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const query = readLaunchQuery(input)
        if (query.isRocketList) return json({ results: rockets })
        const payload = launchPage(query.offset, query.limit, 6, query.rocket)
        if (query.rocket === 'all') {
          return new Promise<Response>((resolve, reject) => {
            const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
            init?.signal?.addEventListener('abort', onAbort)
            previousRequest.release = () => {
              init?.signal?.removeEventListener('abort', onAbort)
              resolve(json(payload))
            }
          })
        }
        return json(payload)
      }),
    )

    const user = userEvent.setup()
    render(<LaunchExplorer />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rocket' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Rocket' }))
    await user.click(await screen.findByRole('option', { name: 'Falcon Heavy' }))

    expect(await screen.findByRole('rowheader', { name: 'Mission Falcon Heavy-0' })).toBeInTheDocument()
    previousRequest.release?.()
    await waitFor(() => {
      expect(screen.queryByRole('rowheader', { name: 'Mission all-0' })).not.toBeInTheDocument()
    })
  })

  it('shows a blocking error when the first load fails with no cache', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('launcher_configurations')) return json({ results: rockets })
        return json({ message: 'nope' }, 500)
      }),
    )
    render(<LaunchExplorer />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Launches are unavailable')
    expect(screen.queryByRole('rowheader')).not.toBeInTheDocument()
  })

  it('keeps cached launches visible when revalidation fails', async () => {
    const seeded: LaunchPage = {
      launches: [
        {
          id: 'cached-1',
          missionName: 'Cached mission',
          rocketId: 'falcon-9',
          dateUtc: '2014-09-07T00:00:00.000Z',
          details: 'Saved details',
          patchUrl: null,
        },
      ],
      totalDocs: 1,
      offset: 0,
      limit: 3,
    }
    await queryCache.revalidate(launchQueryKey({ rocketId: 'all', limit: 3, offset: 0 }), async () => seeded)
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('launcher_configurations')) return json({ results: rockets })
        return json({ message: 'nope' }, 500)
      }),
    )

    render(<LaunchExplorer />)
    expect(screen.getByRole('rowheader', { name: 'Cached mission' })).toBeInTheDocument()
    expect(await screen.findByText(/Showing the last saved results/)).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Cached mission' })).toBeInTheDocument()
  })

  it('stops at the end of the dataset', async () => {
    installFetch(3)
    render(<LaunchExplorer />)
    await screen.findByRole('rowheader', { name: 'Mission all-0' })
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    expect(screen.getByText('All matching launches are loaded.')).toBeInTheDocument()
  })

  it('starts infinite scrolling on page 11 with three-record pages', async () => {
    const calls = installFetch(48)
    const user = userEvent.setup()
    render(<LaunchExplorer />)
    await screen.findByRole('button', { name: 'Load more' })

    for (let page = 2; page <= 10; page += 1) {
      await user.click(screen.getByRole('button', { name: 'Load more' }))
      await screen.findByRole('rowheader', { name: `Mission all-${(page - 1) * 3}` })
    }

    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    const sentinel = await screen.findByTestId('scroll-sentinel')
    expect(sentinel).toBeInTheDocument()
    MockIntersectionObserver.instances.at(-1)?.trigger(true)

    expect(await screen.findByRole('rowheader', { name: 'Mission all-30' })).toBeInTheDocument()
    expect(calls.some((call) => call.offset === 30 && call.limit === 3)).toBe(true)
    expect(screen.getAllByRole('rowheader')).toHaveLength(33)
  })
})

describe('InfiniteSentinel', () => {
  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<InfiniteSentinel enabled resetKey={1} onVisible={() => {}} />)
    expect(MockIntersectionObserver.instances).toHaveLength(1)
    unmount()
    expect(MockIntersectionObserver.instances[0]?.disconnected).toBe(true)
  })
})

describe('table structure', () => {
  it('renders the patch image with reserved dimensions', async () => {
    installFetch()
    render(<LaunchExplorer />)
    const row = await screen.findByRole('rowheader', { name: 'Mission all-1' })
    const image = within(row.parentElement as HTMLElement).getByRole('img')
    expect(image).toHaveAttribute('width', '48')
    expect(image).toHaveAttribute('loading', 'eager')
    expect(image).toHaveAttribute('fetchpriority', 'high')
    expect(image).toHaveAttribute('decoding', 'async')
  })

  it('opens truncated details from the more button', async () => {
    const scrollHeight = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(120)
    const clientHeight = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(40)
    installFetch()
    const user = userEvent.setup()
    render(<LaunchExplorer />)

    const more = await screen.findAllByRole('button', { name: 'Show more details' })
    await user.click(more[0])

    expect(screen.getByRole('button', { name: 'Show less details' })).toHaveAttribute('aria-expanded', 'true')
    scrollHeight.mockRestore()
    clientHeight.mockRestore()
  })

  it('replaces skeleton rows with launches', async () => {
    let releaseLaunch: (value: Response) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (input: RequestInfo | URL) =>
          new Promise<Response>((resolve) => {
            const query = readLaunchQuery(input)
            if (query.isRocketList) {
              resolve(json({ results: rockets }))
              return
            }
            releaseLaunch = resolve
          }),
      ),
    )
    render(<LaunchExplorer />)

    expect(document.querySelectorAll('.skeleton-row')).toHaveLength(3)
    expect(screen.getByText('Loading launches.')).toBeInTheDocument()

    releaseLaunch(json(launchPage(0, 3, 40, 'all')))
    expect(await screen.findByRole('rowheader', { name: 'Mission all-0' })).toBeInTheDocument()
    expect(document.querySelectorAll('.skeleton-row')).toHaveLength(0)
  })
})
