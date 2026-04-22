# upwork-crm (discovery MVP)

Мета Phase 0–2: зрозуміти що Upwork GraphQL API реально віддає для agency-контексту, перш ніж будувати CRM. Не будуємо пайплайн, лідскоринг, автоматизації. Тільки: auth → probes → fixtures → візуалізація.

## Hard rules

- **Discovery first.** Не додавай CRM-фічі поки Phase 0–2 не затверджений. Фази — жорсткі стопи.
- Усі API-виклики — через `gql()` з `src/client/graphql-client.ts`. Без прямого `fetch` до Upwork.
- GraphQL помилки парсяться з `errors` масиву, **не** з HTTP status. API завжди віддає 200.
- `X-Upwork-API-TenantId` обов'язковий для agency-даних. Якщо пропустити — мовчки повернеться freelancer-контекст. Перевіряй у клієнті.
- **Не роби автоматичних заявок на jobs.** Це ban-hammer від Upwork.
- Rate limit: 1 req/sec default, 40K/day cap. З запасом.
- Token store тільки через `src/auth/token-store.ts` (API: `getAccessToken()`). Не читай `tokens.json` напряму.
- Fixtures і notes — ніколи в git. Обидві теки у `.gitignore`.
- Local-only tool. Ніякого Vercel/деплою/multi-user auth. CLI через `pnpm cli`, viewer — локальний Next.js dev на `:4417`.
- GraphQL помилки: якщо Upwork повертає partial data + errors, `gql()` логує і повертає data. Fatal = тільки коли data немає зовсім.

## Scope priorities (Phase 1)

1. **Conversations** (rooms, messages, threads, attachments) — основний фокус.
2. Contracts (active + history).
3. Proposals funnel.
4. Earnings timeseries.
5. Job/talent search — тонкий охоплювальний зонд, без глибокого витягання.

## Stack

Node 22, TS strict, ESM. pnpm. `graphql-codegen`, `zod`. OAuth через native `fetch` + локальний `http` сервер. GraphQL client — власний у `src/client/graphql-client.ts` (leaky-bucket rate limit + Bearer + tenant header + partial-data tolerance).

Viewer (`viewer/`) — Next.js 16 (App Router, React 19, Turbopack) + Tailwind v4 + лок shadcn-style компоненти. Порт `:4417` (унікальний, не конфліктує з типовими 3000/5173/4321). Читає `fixtures/agent/*.json` напряму з диска у Server Components.

## Directory map

- `src/auth/` — OAuth2 (Authorization Code + Client Credentials), token rotation
- `src/client/` — GraphQL клієнт + rate limiting
- `src/probes/` — один файл = один query (номеровані 01–11+)
- `src/introspect/` — schema → SDL + capability map
- `src/research/` — chunked full-sweep: rooms + stories + export (leads index, MD, agent-JSON)
- `fixtures/` — сирі responses (gitignored). `fixtures/agent/` — flat JSON для LLM/агент-інжесту
- `notes/` — MD vault з `[[wikilinks]]` (gitignored). `notes/leads/` + `notes/rooms/` = per-subject transcripts
- `schema/` — SDL + codegen types + capabilities.md
- `viewer/` — Next.js 16 dashboard (`:4417`)

## CLI

- `pnpm cli login` — Authorization Code OAuth flow, один раз
- `pnpm cli whoami` — статус токена
- `pnpm cli refresh-schema` — introspect + regenerate `schema/capabilities.md`
- `pnpm cli probe <name>` / `probe-all` — discovery probes
- `pnpm cli research:rooms` — paginate всі rooms
- `pnpm cli research:stories` — per-room stories (resumable, чекпоінти по file)
- `pnpm cli research:all` — rooms + stories
- `pnpm cli research:export` — fixtures → `fixtures/agent/*.json` + `notes/leads/*.md` + `notes/rooms/*.md`
- viewer: `cd viewer && pnpm dev` — Next.js на `http://localhost:4417`

## Phase gate

- Phase 0 done коли: login працює, `schema/capabilities.md` згенерований, я його затвердив.
- Phase 1 done коли: усі probes мають fixture (або задокументований fail), `SAMPLE_REPORT.md` зроблений.
- Phase 2 done коли: `viewer/` Next.js відкривається з реальними даними на `:4417`, `notes/` наповнений.
- **Phase 3 (CRM) — тільки після явного greenlight від мене.**
