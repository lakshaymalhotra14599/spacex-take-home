import { cacheKey, type QueryParams } from '../cache/queryCache.ts'

const API_ORIGIN = 'https://lldev.thespacedevs.com/2.3.0'

export const LAUNCHES_ENDPOINT = `${API_ORIGIN}/launches/`
export const ROCKETS_ENDPOINT = `${API_ORIGIN}/launcher_configurations/`

export type LaunchRecord = {
  id: string
  missionName: string
  rocketId: string | null
  dateUtc: string | null
  details: string | null
  patchUrl: string | null
}

export type LaunchPage = {
  launches: LaunchRecord[]
  totalDocs: number
  offset: number
  limit: number
}

export type Rocket = {
  id: string
  name: string
}

export type LaunchQuery = {
  rocketId: string
  limit: number
  offset: number
}

export function launchQueryParams({ rocketId, limit, offset }: LaunchQuery): QueryParams {
  return {
    lsp__name: 'SpaceX',
    ordering: '-net',
    limit,
    offset,
    rocket__configuration__name: rocketId === 'all' ? undefined : rocketId,
  }
}

export function launchQueryKey(query: LaunchQuery): string {
  return cacheKey(LAUNCHES_ENDPOINT, launchQueryParams(query))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null) return value as Record<string, unknown>
  return null
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function idText(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return text(value)
}

export function normalizeLaunch(value: unknown): LaunchRecord | null {
  const record = asRecord(value)
  if (!record) return null

  const mission = asRecord(record.mission)
  const rocket = asRecord(record.rocket)
  const configuration = asRecord(rocket?.configuration)
  const image = asRecord(record.image)
  const missionName = text(mission?.name) ?? text(record.name) ?? 'Unnamed mission'
  const dateUtc = text(record.net) ?? text(record.date_utc)
  const id = idText(record.id) ?? `${missionName}-${dateUtc ?? 'unknown-date'}`
  // The assignment asks for image/thumbnail_url. Fall back to the full image.
  const patchUrl = text(image?.thumbnail_url) ?? text(image?.image_url)

  return {
    id,
    missionName,
    rocketId: text(configuration?.name),
    dateUtc,
    details: text(mission?.description) ?? text(record.details),
    patchUrl,
  }
}

export function normalizeLaunchPage(value: unknown, query?: Pick<LaunchQuery, 'limit' | 'offset'>): LaunchPage {
  const record = asRecord(value)
  const docs = Array.isArray(record?.results) ? record.results : []
  const launches = docs.flatMap((doc) => {
    const launch = normalizeLaunch(doc)
    return launch ? [launch] : []
  })
  const totalDocs = typeof record?.count === 'number' ? record.count : launches.length

  return {
    launches,
    totalDocs,
    offset: query?.offset ?? 0,
    limit: query?.limit ?? launches.length,
  }
}

export function normalizeRockets(value: unknown): Rocket[] {
  const record = asRecord(value)
  const list = Array.isArray(value) ? value : Array.isArray(record?.results) ? record.results : []
  const rockets = list.flatMap((item) => {
    const rocket = asRecord(item)
    const id = idText(rocket?.id)
    const name = text(rocket?.name)
    if (!id || !name) return []
    return [{ id, name }]
  })
  const seen = new Set<string>()
  return rockets.flatMap((rocket) => {
    if (seen.has(rocket.name)) return []
    seen.add(rocket.name)
    return [{ id: rocket.name, name: rocket.name }]
  })
}

function requestSignal(signal: AbortSignal): AbortSignal {
  // A hung SpaceX response should become a visible error instead of an endless skeleton.
  return AbortSignal.any([signal, AbortSignal.timeout(8000)])
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Launch Library request failed (${response.status}).`)
  }
  return response.json() as Promise<unknown>
}

function endpointUrl(endpoint: string, params: QueryParams): string {
  const url = new URL(endpoint)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

export async function fetchLaunchPage(query: LaunchQuery, signal: AbortSignal): Promise<LaunchPage> {
  const response = await fetch(endpointUrl(LAUNCHES_ENDPOINT, launchQueryParams(query)), {
    signal: requestSignal(signal),
    cache: 'no-store',
  })
  return normalizeLaunchPage(await readJson(response), query)
}

export async function fetchRockets(signal: AbortSignal): Promise<Rocket[]> {
  const response = await fetch(
    endpointUrl(ROCKETS_ENDPOINT, { manufacturer__name: 'SpaceX', limit: 100 }),
    { signal: requestSignal(signal), cache: 'no-store' },
  )
  const rockets = normalizeRockets(await readJson(response))
  return rockets.sort((left, right) => left.name.localeCompare(right.name))
}
