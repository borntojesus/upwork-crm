# HANDOFF — upwork-crm discovery MVP

_Станом на: 2026-04-20_

---

## Де ми зараз

**Phase 1 завершена фактично.** Весь основний pipeline витягнуто, дані є у `fixtures/`, Next.js viewer (`viewer/`) працює на `:4417` з 25+ маршрутами. Ми не переходимо до Phase 3 (CRM) — тільки після явного greenlight.

Viewer: `cd viewer && pnpm dev` → http://localhost:4417  
CLI: `pnpm cli <command>` з кореня проєкту

---

## Що вже зроблено

### Auth & client

- OAuth2 Authorization Code flow (`src/auth/oauth.ts`) — токени у `tokens.json` (gitignored)
- Token store з in-process cache (`src/auth/token-store.ts`) — без повторних refresh під час bulk fetch
- GraphQL client з partial-data tolerance (`src/client/graphql-client.ts`) — якщо `data` не null але є `errors[]`, логує і повертає дані замість throw
- `X-Upwork-API-TenantId` header — обов'язковий, вшитий у клієнт

### Data pipeline (fixtures/)

| Артефакт         | Шлях                                                 | Кількість        |
| ---------------- | ---------------------------------------------------- | ---------------- |
| Rooms            | `fixtures/tenants/agency-vendor/rooms/all.json`      | 231              |
| Stories/messages | `fixtures/tenants/agency-vendor/stories/`            | по room          |
| Contracts        | `fixtures/tenants/agency-vendor/contracts.json`      | 79               |
| Offers           | `fixtures/tenants/agency-vendor/offers/`             | 39               |
| Jobs             | `fixtures/tenants/agency-vendor/jobs/`               | ~100             |
| Leads enriched   | `fixtures/tenants/agency-vendor/leads-enriched.json` | 195              |
| Top freelancers  | `fixtures/agent/top-freelancers.json`                | 40 (4 категорії) |
| Transactions     | `fixtures/tenants/agency-vendor/transactions/`       | є                |

### CLI команди

```
pnpm cli research:rooms       # fetch rooms → fixtures
pnpm cli research:stories     # fetch stories для всіх rooms
pnpm cli research:contracts   # contractList(ids) по contractId з rooms
pnpm cli research:offers      # vendorProposal(id) × 39
pnpm cli research:jobs        # jobs по jobId з rooms
pnpm cli research:graph       # cross-join → leads-enriched + jobs-enriched
pnpm cli research:top-freelancers  # search + profile fetch × 4 категорій
pnpm cli research:all         # rooms + stories послідовно
```

### Viewer routes

| Маршрут                         | Що показує                               |
| ------------------------------- | ---------------------------------------- |
| `/`                             | Cockpit: KPI, recent leads/rooms         |
| `/leads`                        | 195 унікальних лідів, фільтр по тенанту  |
| `/leads/[userId]`               | Профіль ліда + rooms + contracts         |
| `/rooms`                        | Всі 231 кімнат                           |
| `/rooms/[roomId]`               | Transcript + учасники                    |
| `/contracts`                    | 79 контрактів, статус/тип/rate           |
| `/contracts/[id]`               | Деталі контракту                         |
| `/offers`                       | 39 пропозалів                            |
| `/jobs`                         | Jobs з фільтром по scanner               |
| `/jobs/[id]`                    | Деталі job                               |
| `/freelancers`                  | Хаб по 4 категоріях                      |
| `/freelancers/[category]`       | Топ-10 фрілансерів                       |
| `/freelancers/[category]/[uid]` | Профіль фрілансера + diff                |
| `/analytics/messages`           | Активність по днях/місяцях               |
| `/analytics/earnings`           | Транзакції, earnings timeline            |
| `/analytics/pipeline`           | Funnel leads→offers→contracts            |
| `/talent-search-stats`          | Google Sheets tracker (3-stage fallback) |
| `/tech-scanner/[tech]`          | Розбивка jobs по технологіях             |

### Design system

- Alpina CRM дизайн: OKLCH palette, primary=indigo, chart-1..5 tokens
- shadcn/ui через base-ui render-prop pattern (не asChild)
- Tailwind v4, `PageHeader`, `KpiCard`, `DataTable` компоненти
- `TenantSwitcher` в TopBar — `?t=` URL param, фільтр по тенанту

### Multi-tenant

- Tenant registry: `src/research/tenants.ts` — `agency-vendor` + `personal`
- Всі fetch scripts параметризовані через `TenantSlug`
- Fixtures пишуться у `fixtures/tenants/<slug>/`
- Viewer фільтрує через `matchesFilter(item, activeTenants)`

---

## Що НЕ завершено

### Критичне (перед наступним запуском)

1. **Personal tenant не витягнуто** — `fixtures/tenants/personal/` не існує. Чати які є тільки на особистому акаунті — не показані.
2. **Synthetic leads з offers** — 69 клієнтів з offers/contracts не потрапили у leads (тому що немає room з ними). Не реалізовано.

### Зупинено в процесі

3. **Ideas KB** (`/ideas` route + 10 PM ideas у Docusaurus-стилі) — агент був запущений але перерваний.
4. **`/freelancers/react`** — може давати 404 якщо dev server не перезапущений після останньої правки.

### Відкладено свідомо

5. **Talent search CSV upload flow** — є UI скелет на `/talent-search-stats`, але upload через Playwright deferred.
6. **Freelancer snapshot diffs** — логіка є у `src/research/freelancers-analyze.ts`, але UI diff не підключений.

---

## Ключові рішення

| Рішення                                       | Чому                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `contractList(ids)` замість `vendorContracts` | `vendorContracts` завжди повертав 0 — баг або scope                                                    |
| `vendorProposal(id)` × N замість bulk         | `vendorProposals` bulk повертав VJCA-6 "incorrect value"                                               |
| Partial-data tolerance у gql()                | Upwork null-bubbles на `String!` полях видаляли/системних юзерів — кидав помилку де були валідні дані  |
| 7 filter passes для rooms                     | Default повертає тільки дефолтні чати; subscribed_eq:false + includeHidden + типи дали 231 замість ~80 |
| `client_id` + `client_secret` у body          | Upwork вимагає обидва: Basic Auth header І body params для token refresh                               |
| Fixtures gitignored                           | Можуть містити PII клієнтів, занадто великі, легко регенеруються                                       |

---

## Наступні кроки

1. **Перезапустити dev server** → перевірити `/freelancers/react` і всі нові маршрути
2. **Витягти personal tenant** — `pnpm cli research:rooms --tenant personal`, потім stories
3. **Synthetic leads** — окремий скрипт: агрегувати унікальних клієнтів з offers + contracts що не в leads
4. **Ideas KB** — `/ideas` маршрут з 10 PM idea cards (Docusaurus-стиль)
5. **Phase 2 gate-review** з Дмитром → або greenlight на Phase 3 (CRM), або ще один round exploration

---

## Відкриті питання

- **Personal org ID** — потрібен `UPWORK_PERSONAL_ORG_ID` у `.env` для personal tenant fetch. Є?
- **Аватари клієнтів** — GraphQL повертає `null` на `photoUrl` для більшості. Чи варто показувати заглушки?
- **Lead dedup між тенантами** — якщо один userId є і в agency, і в personal — як показувати в UI?
- **Google Sheets для talent-search** — яка структура таблиці? `/talent-search-stats` чекає конкретний формат.
- **Phase 3 scope** — після greenlight: що першим іде в CRM? Scoring, outreach templates, deal stages?
