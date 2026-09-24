# YISIN App — Frontend migration map

This repository is a fork of `nuxt-ui-templates/chat`.

The goal is to preserve the mature Nuxt/Vue/Nuxt UI user experience while replacing the template's AI/backend stack with YISIN's own backend contracts.

## Architecture target

```text
Nuxt 4 / Vue / Nuxt UI
        |
        | HTTPS / streaming
        v
     yisin-api
        |
        +--> orchestration
        +--> yisin-ia
        +--> corpus / retrieval / other services
```

The browser must not call model providers directly.

## KEEP

Primarily presentation and interaction code:

- `app/components/chat/*`
- `app/components/chat/message/*`
- `app/components/drag-drop/*`
- `app/layouts/*`
- `app/assets/*`
- `app/composables/useChats.ts`
- Nuxt UI, VueUse, Comark, Shiki, motion-v, Tailwind, Zod

These files may still receive YISIN branding, wording and event rendering changes.

## ADAPT

Files that are valuable but coupled to the template backend:

- `app/pages/index.vue`
  - currently creates chats through `POST /api/chats`
  - must later call the YISIN conversation API
- `app/pages/chat/[id].vue`
  - currently uses `@ai-sdk/vue` + `DefaultChatTransport`
  - must later consume YISIN streaming/events
- `app/composables/useChatActions.ts`
  - rename/delete calls currently target local Nuxt API routes
- `app/composables/useFileUpload.ts`
  - must later upload through YISIN document endpoints
- `app/components/chat/Prompt.vue`
  - preserve UX, replace model/provider controls with YISIN-specific actions
- `app/components/ModelSelect.vue`
  - should not expose infrastructure provider selection in the normal product UI
- `app/components/chat/tool/*`
  - replace generic demo tools with YISIN event/source/document/clarification renderers

## REPLACE

Template backend behavior that must be owned by `yisin-api`:

- chat creation/persistence
- conversation history
- message persistence
- title generation
- streaming orchestration
- model/provider routing
- web search orchestration
- reasoning controls
- votes/feedback persistence
- document persistence
- authentication/session ownership rules

Current template files involved include:

- `server/api/chats.get.ts`
- `server/api/chats.post.ts`
- `server/api/chats/[id].get.ts`
- `server/api/chats/[id].post.ts`
- `server/api/chats/[id].delete.ts`
- nested chat message/title/vote endpoints
- `server/db/*`

## REMOVE LATER

Do not delete these until their YISIN replacements are wired and the UI is verified:

- direct AI provider adapters
- Vercel/NuxtHub-specific persistence
- libSQL / Drizzle chat storage
- demo model selector behavior
- generic weather/chart demo tools
- template-specific GitHub auth behavior if YISIN auth differs

Likely dependencies to remove after migration:

- `@ai-sdk/anthropic`
- `@ai-sdk/google`
- `@ai-sdk/openai`
- `@libsql/client`
- `@vercel/blob`
- `drizzle-orm`
- provider-specific backend pieces from `ai`

`@ai-sdk/vue` should be evaluated separately: it may remain useful for UI/stream plumbing even when YISIN owns the backend.

## YISIN-specific UI events

The UI should render product-level events, not STCG internals.

Candidate frontend event concepts:

- `assistant.delta`
- `assistant.completed`
- `clarification.required`
- `document.processing`
- `document.ready`
- `legal_sources.available`
- `web_search.started`
- `web_search.completed`
- `error`

Exact payload contracts must come from `yisin-api`; they are not defined in this frontend repository yet.

## Migration order

1. Preserve the fork as an upstream baseline.
2. Add YISIN branding without touching behavior.
3. Add a typed `yisin-api` client boundary.
4. Replace chat list/create/load actions.
5. Replace the chat streaming transport.
6. Replace upload/document flows.
7. Replace auth/session integration.
8. Add YISIN-specific clarification/source/document renderers.
9. Remove unused template server/database/provider code.
10. Re-run build, lint and typecheck after each slice.

## Guardrails

- Do not bypass `yisin-api`.
- Do not call model providers from the browser.
- Do not duplicate YISIN business logic in Nuxt server routes.
- Keep UI-specific state in the frontend; keep domain/cognitive decisions in YISIN backend.
- Prefer typed contracts generated from or aligned with the backend API once those contracts are accessible.
