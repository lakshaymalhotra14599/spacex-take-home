# SpaceX Take-Home Assignment — React Implementation

## 1. Mandatory skill activation

Before writing any code, explicitly verify and use these Cursor skills:

- `react-best-practices` — React architecture, component rendering, data fetching, performance, and bundle optimization.
- `frontend-design` — visual design, typography, spacing, responsive layouts, accessibility, and polished UI interactions.
- `react-api-cache-pagination` — API caching, cache-then-network behavior, request deduplication, pagination, and infinite scrolling.

For each skill:
1. Locate its `SKILL.md` and read its instructions.
2. If supported, invoke it explicitly using Cursor Agent's `/` skill menu.
3. If it does not exist or cannot be activated, report that fact. Do not pretend it was used.
4. Use the skill's actual recommendations throughout implementation and validation.

Also inspect and follow `.cursor/rules/project-conventions.mdc`, if present.

Before proceeding, provide a concise checklist mapping each skill to the work it governs. If any skill is unavailable, explain the fallback and continue only after reporting the limitation.

## 2. Assignment requirements

Read the supplied `SpaceX Take Home Project.pdf` and implement every requirement:

- Fetch SpaceX launch data and display it in a table.
- Show mission name, rocket name, launch date, launch details, and mission patch.
- Use the API's `image` or `thumbnail_url` field as appropriate for the patch, verifying the actual response schema.
- Provide a rocket dropdown populated with rocket names.
- Display 3 launch records per page.
- Implement a Load More button.
- Support infinite scrolling when reaching page 11.
- Implement caching that mimics Apollo's `cache-and-network` fetch policy.

Do not silently reinterpret the pagination requirement. Explain how the first 10 pages of 3 records each, manual loading, and infinite scrolling starting on page 11 will work together.

## 3. Technology and implementation constraints

- React with JavaScript, not TypeScript.
- Use functional components and React hooks.
- Use plain CSS for styling.
- Prefer native `fetch`, `Map`, `IntersectionObserver`, and browser APIs where appropriate.
- Avoid unnecessary dependencies, global state libraries, and premature abstractions.
- Keep API access, cache management, UI components, and styling separated.
- Write clean, maintainable code with descriptive names and useful comments.
- Use semantic HTML and accessible controls.

Inspect the existing repository before making changes. Preserve its package manager, working configuration, and established conventions wherever reasonable. If no application exists, scaffold a minimal React application with Vite.

## 4. API and data modeling

Use the official SpaceX API v4.

Inspect the API schema before implementation. Verify:
- Launch identifiers, names, dates, details, and patch image fields.
- Rocket IDs and how to resolve them into rocket names.
- Available filtering and pagination parameters.
- The actual pagination response format and how the end of the dataset is determined.

Avoid making one unnecessary API request per table row. Fetch or cache rocket metadata efficiently.

Handle missing mission details, missing patch images, invalid dates, and unknown rocket names gracefully.

Normalize the data into a consistent frontend model.

## 5. Cache implementation

Implement a reusable in-memory cache that mimics Apollo's `cache-and-network` behavior without introducing Apollo Client.

Required behavior:

1. Construct deterministic cache keys from the endpoint and normalized query parameters.
2. When cached data exists, render it immediately.
3. Trigger a network request to revalidate cached data.
4. Update the cache and UI when fresh data arrives.
5. When no cached data exists, display an appropriate loading state while fetching.
6. If revalidation fails but cached data exists, preserve the cached data and show a non-blocking error.
7. Deduplicate concurrent requests for identical cache keys.
8. Prevent stale responses from overwriting newer results.
9. Avoid duplicate records when loading subsequent pages.
10. Handle request cancellation, retries where appropriate, and component unmounting safely.

Keep cache management independent of React components.

Document cache invalidation and freshness assumptions. Do not claim that the implementation is equivalent to Apollo in every respect; explain the behavior it reproduces and any limitations.

## 6. Pagination and infinite scrolling

Implement pagination in a way that meets the assignment exactly.

- Fetch 3 launch records per page.
- Provide a Load More button for explicit user-controlled pagination.
- Implement infinite scrolling beginning at page 11.
- Use `IntersectionObserver` with appropriate cleanup.
- Prevent concurrent requests from loading the same page twice.
- Prevent infinite loops when the API returns empty pages or errors.
- Reset pagination and invalidate or reselect displayed query data when the rocket filter changes.
- Ensure late responses from a previous filter do not contaminate the new results.
- Track whether more records exist using verified API metadata or a reliable end-of-data strategy.
- Provide clear loading and completion indicators.

Explain the state transitions between manual pagination and infinite scrolling before implementing them.

## 7. Visual design

Create a polished SpaceX launch explorer, not a generic CRUD dashboard.

Design direction:
- Space-inspired dark interface with restrained accent colors.
- Clear visual hierarchy and readable typography.
- A compact header with the SpaceX identity and a short description.
- A prominent rocket filter with an accessible dropdown.
- A well-structured table with aligned columns and readable mission details.
- Consistent spacing, borders, hover states, and subtle transitions.
- Properly sized patch thumbnails with graceful fallbacks.
- Responsive behavior for tablets and mobile screens.
- Visible focus indicators, keyboard accessibility, and sufficient color contrast.
- Loading skeletons or placeholders that preserve layout stability.
- Helpful empty, error, retry, and end-of-list states.

Avoid excessive animations, unnecessary gradients, visual clutter, and oversized UI elements. Prioritize usability and clarity.

## 8. Performance

Apply the React best-practices skill and validate the actual implementation.

Focus on:
- Avoiding unnecessary component re-renders.
- Stable list keys and efficient list rendering.
- Avoiding duplicate API calls.
- Efficient cache lookups.
- Preventing repeated rocket metadata requests.
- Lazy-loading patch images when appropriate.
- Reserving image dimensions to reduce layout shifts.
- Cleaning up observers, listeners, and requests.
- Avoiding excessive client-side filtering or data transformations.
- Keeping the production bundle lean.

Do not add `useMemo`, `useCallback`, or `React.memo` indiscriminately. Explain optimizations that materially improve behavior.

## 9. Testing

Use the repository's existing test framework if available. Otherwise, choose a minimal compatible setup, preferably Vitest with React Testing Library.

Add meaningful tests covering:

- Initial launch loading.
- Rocket dropdown population and filtering.
- Three-record pagination.
- Load More behavior.
- Infinite scrolling beginning at page 11.
- Cache hits and cache misses.
- Cached rendering followed by network revalidation.
- Network failures with and without cached data.
- Concurrent request deduplication.
- Duplicate record prevention.
- Filter changes during in-flight requests.
- End-of-data behavior.
- Missing mission details and patch images.
- IntersectionObserver cleanup.

Mock network responses instead of relying on live API calls in automated tests.

## 10. Required workflow

### Phase A: Inspect and plan
- Read the assignment PDF and repository.
- Verify the skills and project rules.
- Inspect the API response schema.
- Present a file structure, component plan, cache design, pagination state machine, and test plan.

### Phase B: Implement
- Build the API and rocket metadata services.
- Implement and test the cache.
- Build the launch table and rocket filter.
- Implement manual pagination.
- Add infinite scrolling for page 11 onward.
- Apply the visual design and accessibility requirements.
- Keep the code organized and easy to review.

### Phase C: Validate
- Run the test suite.
- Run the production build.
- Fix errors and regressions.
- Review React performance, caching correctness, UI quality, accessibility, and pagination behavior separately.
- Verify all assignment requirements against the final implementation.

Do not report tests as passing unless you actually ran them successfully.

## 11. Final report

At completion, provide:

1. A summary of the implemented features.
2. The final file structure and the purpose of important files.
3. The cache-then-network lifecycle and pagination behavior.
4. Which skills were verified and used, including any unavailable skills.
5. Tests executed and their actual results.
6. Production build status.
7. Any known limitations or incomplete requirements.
8. Important tradeoffs I should be prepared to explain during an assignment review.
