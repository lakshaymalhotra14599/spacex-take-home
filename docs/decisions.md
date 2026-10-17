# Design decisions

This file records why the launch explorer is built the way it is. It is meant to be discussed and revised during review.

## Skill checklist

| Skill requested | Status | What it governs |
| --- | --- | --- |
| `react-best-practices` | Unavailable under that name | The repo installs `vercel-react-best-practices`. That skill was read and applied. |
| `vercel-react-best-practices` | Present at `.agents/skills/vercel-react-best-practices/SKILL.md` | Parallel rocket and launch fetches, no extra data library, no components defined inside components, `content-visibility` on rows, `Map` lookups, functional state updates, explicit conditionals. |
| `frontend-design` | Present at `.agents/skills/frontend-design/SKILL.md` | Visual direction, typography, color, and restrained motion. |
| `react-api-cache-pagination` | Present in the user Agent Store | Cache module, cache-then-network, dedupe, stale responses, pagination reset, IntersectionObserver. |
| Project rule `.cursor/rules/project-conventions.mdc` | Present, `alwaysApply: true` | TypeScript, separation of concerns, explicit states, accessibility, no blanket memoization. |

The agent cannot open Cursor's `/` skill menu itself. The three available skills were attached to the session and their `SKILL.md` files were read before implementation.

`client-swr-dedup` recommends SWR. This project does not use it. The assignment and the cache skill both require a small in-memory cache, and the project rule rejects extra libraries.

## Language

The saved assignment prompt says JavaScript. The always-on project rule was updated to TypeScript, and the Vite app was already TypeScript. The implementation stays TypeScript so the existing `tsc` build and the project rule stay intact. The cache shape is the same one the cache skill shows in JavaScript, with explicit types added.

## API

`api.spacexdata.com` answered HTTP 522/525, so the app uses the Launch Library dev API that is responding:

- `GET https://lldev.thespacedevs.com/2.3.0/launches/?lsp__name=SpaceX`
- `GET https://lldev.thespacedevs.com/2.3.0/launcher_configurations/?manufacturer__name=SpaceX`

The response is `{ count, next, previous, results }`. A launch's mission name is `mission.name`, the date is `net`, details are `mission.description`, and the patch is `image.thumbnail_url`. The rocket dropdown uses `rocket.configuration` ids and names, then filters with `rocket__configuration__id`. `lsp__name=SpaceX` keeps the table on SpaceX flights even though the unfiltered launches feed includes every provider.

`count` is the end-of-data total. `next: null`, an empty page, or a short page also stops pagination.

Requests use `cache: "no-store"` so the browser HTTP cache cannot pretend to be our revalidation.

## Pagination state machine

Page size stays 3 for every page. An earlier note suggested 5 records after page 11. This prompt says "3 launch records per page" and says not to reinterpret that, so page 11+ still requests 3 records. Only the trigger changes.

| State | What the user sees | Next request |
| --- | --- | --- |
| Page 1 loading, cache miss | Skeleton table | `limit=3&offset=0` |
| Pages 1–9 loaded, more exist | Table plus Load more | Button loads the next offset of 3 |
| Page 10 loaded, more exist | Load more is removed | Sentinel loads page 11 at `offset=30` |
| Page 11+ | Sentinel stays armed | Each intersection loads the next 3 |
| Short page, empty page, or `offset + received >= totalDocs` | End-of-list note | No further request |
| Next page fails | Rows already shown stay | Non-blocking retry. The observer does not loop |
| Rocket changes | List clears, page returns to 1 | Previous in-flight launch requests are cancelled |

Offset for page `n` (1-based) is `(n - 1) * 3`.

## Cache

The cache reproduces Apollo's `cache-and-network` policy only:

1. Build a key from the endpoint and sorted query parameters.
2. If that key has data, render it immediately.
3. Always revalidate on the network unless an identical request is already in flight.
4. Write the response and update the UI when it returns.
5. On failure, keep the cached value and show a non-blocking error. With no cache, show a blocking error and retry.
6. A newer request for the same key increments a sequence number and aborts the previous request. A late response cannot overwrite the newer value.
7. Filter changes use a generation counter so a late page cannot append onto the new list.

It is not Apollo. There is no normalized entity store, no TTL, no persistence across reloads, and no GraphQL identity. Freshness means "revalidate when a query is shown." Invalidation on filter change cancels in-flight launch requests and drops them from the screen. Completed pages stay in memory so returning to a rocket can paint instantly, then revalidate.

Lookup and write are O(1) average. Building a key is O(k log k) for `k` query fields. Memory is O(cached pages + in-flight keys). Flattening the visible list is O(n) in the number of loaded launches, with a `Set` so duplicate ids are skipped in O(1) per id.

## UI direction

Mission-control ledger, not a generic admin table. Near-black blue field, a faint technical grid, and one amber accent. Display type is Big Shoulders Display. Body type is Schibsted Grotesk. Motion is a short entrance and a skeleton pulse, and it turns off under `prefers-reduced-motion`.

"All rockets" is included so the unfiltered SpaceX list stays reachable. Launches are ordered by `net` descending so the ledger opens on recent flights.

## Performance choices that matter

- Rockets and the first launch page start together. Neither waits for the other.
- Rocket id-to-name lookup is a `Map`.
- Patch images are lazy and have a fixed 48px box.
- Rows use `content-visibility: auto`.
- `useMemo`, `useCallback`, and `React.memo` are not sprinkled through the tree. Refs and functional updates cover the stale-closure cases that actually break pagination.

## Open points

- Switch page 11+ to 5 records if that earlier instruction should override this prompt.
- Drop "All rockets" if the dropdown must contain only rocket names.
- Change the date sort if the review expects oldest-first.
