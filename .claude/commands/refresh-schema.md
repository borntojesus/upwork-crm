---
description: Re-introspect Upwork GraphQL schema and regenerate capability map + codegen types
---

Run in order:

1. `pnpm cli refresh-schema` — fetches SDL into `schema/schema.graphql` and emits `schema/capabilities.md`.
2. `pnpm codegen` — regenerates `schema/types.ts` from the SDL.

After both complete, read `schema/capabilities.md` and give me a ≤10-line diff vs the previous version (what queries/mutations appeared or disappeared). If `schema/schema.graphql` didn't change, say so and skip the diff.
