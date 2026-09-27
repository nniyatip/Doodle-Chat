# Doodle Chat

A responsive, accessible chat for the
[Doodle frontend challenge](https://github.com/DoodleScheduling/hiring-challenges/tree/master/frontend-engineer),
built with React 19, TypeScript, Vite and TanStack Query. It shows the latest messages from
everyone, picks up new ones every 3 seconds and sends messages under the name you choose.

## Getting started

Requirements: Node.js 22 (see `.nvmrc`), npm and Docker.

1. Start the [chat API](https://github.com/DoodleScheduling/frontend-challenge-chat-api) and
   check <http://localhost:3000/health>:

   ```bash
   git clone https://github.com/DoodleScheduling/frontend-challenge-chat-api.git
   cd frontend-challenge-chat-api
   docker compose up -d
   ```

2. Start the app and open <http://localhost:5173>:

   ```bash
   git clone https://github.com/nniyatip/Doodle-Chat.git
   cd Doodle-Chat
   cp .env.example .env   # Windows: copy .env.example .env
   npm ci
   npm run dev
   ```

`.env` sets `VITE_API_URL` and `VITE_API_TOKEN`; the example values work with the local API. A
missing or invalid value shows what to fix instead of a blank page, and "Can't reach the chat
server" means nothing answers at `VITE_API_URL`.

| Command                             | What it does                                    |
| ----------------------------------- | ----------------------------------------------- |
| `npm run dev`                       | Dev server                                      |
| `npm run build` / `npm run preview` | Production build / serve it locally             |
| `npm test`                          | Run the tests once (`npm run test:watch` watch) |
| `npm run check`                     | Typecheck, lint, format check and tests, as CI  |

## How it works

```text
src/
  api/             fetch client (auth, 10 s timeout, errors), messages API, query client
  config/          validates the .env values
  features/user/   name form, validation, localStorage
  features/chat/   page and components; hooks to load, poll, send and scroll; pure helpers (lib/)
  components/      error boundary
  styles/          design tokens, global styles and shared building blocks (ui.css)
```

All messages live in one TanStack Query cache entry, together with a sync point: the newest
`createdAt` that `GET /messages` has returned. Three hooks feed it through the pure helpers in
`lib/chatMessages.ts`, and every update de-duplicates by `_id` and keeps chronological order:

- `useMessages` loads the latest 50 with `before=<far future>&limit=50`; without a filter the
  API returns the oldest messages.
- `usePollNewMessages` asks every 3 seconds for everything after the sync point minus 5 seconds.
  The overlap catches messages saved late (the API stamps `createdAt` before writing) or sharing
  a millisecond. A full page means more are waiting, so it reads on. It pauses while the tab is
  hidden and never overlaps requests.
- `useSendMessage` adds the reply from `POST /messages` without moving the sync point: someone
  else's message can be older than yours and not fetched yet.

## Decisions

- Polling, not push: the API has no WebSocket or server-sent events. Polling uses the server's
  timestamps, so the device clock never matters.
- No optimistic sending: a message appears once the server confirms it, so there is no rollback.
  The draft stays in the field, read-only, while it sends; it clears on success and stays
  editable next to the error on failure.
- Identity is the name: the API has no user ids, so a message is yours when its author matches
  your current name. A name change reaches other open tabs straight away.
- Retries: network errors, timeouts and server errors are retried twice; a wrong token or invalid
  input is shown at once. Polling shows a notice after two failures, or immediately when retrying
  can't help. Sending is never retried: a timed-out send may still have been saved, and the
  error says so rather than inviting a duplicate.
- Scrolling: the chat opens at the newest message and follows new ones, including ones that land
  above yours and when the keyboard opens or the screen rotates. If you have scrolled up, it
  stays put and shows an "N new messages" button.
- HTML entities: a seed message contains `It&#39;s`. Common entities are decoded, and text is
  always rendered as plain text.
- Small footprint: three runtime dependencies, CSS Modules with design tokens, system fonts, and
  the 526 KB background PNG cut to a 12 KB WebP tile. The production JavaScript is about 85 KB
  gzipped.

## Accessibility

- Landmarks and headings. The message list is a `log` live region, so new messages are
  announced, and each message is an article named after its author and time.
- Keyboard: the history can be focused and scrolled, and focus moves sensibly between the name
  form, the message input and "Change name".
- Labelled inputs, errors in `role="alert"`, visible focus rings, WCAG AA contrast, touch targets
  of at least 44 px, and `prefers-reduced-motion` support.
- Linted with `eslint-plugin-jsx-a11y` (strict); axe and keyboard checks at phone, tablet and
  desktop sizes are manual, not in CI.

## Security

The bearer token is the challenge API's public, hardcoded one; anything in a `VITE_` variable
ends up in the JavaScript bundle. Messages are always rendered as text, never as HTML. A
production version would need real sign-in instead of a shared token, server-side identity
(anyone can post under any name today), rate limiting, and a Content-Security-Policy at the host.

## Testing

`npm test` runs Vitest with Testing Library and jsdom; `fetch` is mocked, so no API is needed.
Unit tests cover the HTTP client, validation, storage and the pure helpers. Component tests
cover the name form, chat page and composer, including polling and scrolling with fake timers
and accessibility roles, names and focus. The sync tests run against an in-memory fake of the
API with its real query rules, for the timing cases that matter: a message posted just before
yours, a late write, more than a page at once, and a server that ignores the filter. ESLint is
type-aware (`strictTypeChecked`). GitHub Actions runs `npm run check` and the build on pull
requests and pushes to `main`.

## Limitations and next steps

- Only the latest 50 messages are loaded; older history (`before=<oldest createdAt>`) and list
  virtualisation are not implemented.
- The 5-second overlap is best-effort: a write that appears later than that is missed, and a
  full page sharing one millisecond ends that poll's catch-up early. Exact sync needs a server
  cursor that includes a unique id, not just a timestamp.
- Two people with the same name both count as "you": the API has no accounts.
- An unsent draft is lost on reload or when changing the name.
- Not verified on physical devices or with screen readers; the design is close to the mock-ups
  but not pixel-perfect.
- Next: browser tests in CI, older-history pagination, durable drafts, message grouping.

## Credits and licence

The code is [MIT](LICENSE) licensed. The design, background pattern and API are © Doodle AG,
provided for the challenge, and not covered by that licence.
