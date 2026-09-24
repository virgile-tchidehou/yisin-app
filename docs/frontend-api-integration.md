# YISIN App — Frontend API Integration Audit

**Date:** 2026-09-24  
**Workspace:** `/media/dodji/Disqueù1/projet_yisin`  
**Frontend:** `yisin-app` (branche `feat/yisin-foundation`)  
**Backend:** `yisin-api`  

---

## 0. Décisions de consolidation après audit

Cette section fait autorité sur les propositions exploratoires plus bas dans le document.

- La fondation `app/services/yisin-api/` est désormais implémentée sur `feat/yisin-foundation`.
- Le streaming YISIN utilise `fetch() + ReadableStream` et un parseur SSE natif au projet. `EventSource` n'est pas la stratégie retenue, car le flux doit pouvoir envoyer `Authorization`, `Last-Event-ID` et un `AbortSignal`.
- Aucun endpoint de login YISIN n'est inventé. L'API observée exige un Bearer token ; la fondation reçoit donc un `getToken()` injectable. Une future intégration OIDC/BFF devra partir d'un contrat backend réellement disponible.
- Aucun fichier `.env` local n'est modifié. La clé `NUXT_PUBLIC_YISIN_API_BASE_URL` est documentée dans `.env.example` et exposée via le runtime config Nuxt.
- `@ai-sdk/vue` n'est pas une dépendance architecturale de la couche YISIN. La future UI de chat privilégiera des composables YISIN natifs ; l'AI SDK pourra être retiré lorsqu'il ne sera plus utilisé par le template.
- Lorsqu'une route existe mais que son schéma de réponse n'est pas établi par les contrats audités, la fondation retourne `unknown` au lieu d'inventer un type.
- Les symboles ✅ dans l'ordre de migration ci-dessous décrivent la cible/ordre prévu dans l'audit initial et ne doivent pas être interprétés comme un état d'implémentation des phases ultérieures.

### Fondation actuellement présente

```text
app/services/yisin-api/
├── client.ts
├── conversations.ts
├── documents.ts
├── errors.ts
├── identity.ts
├── index.ts
├── legal-runs.ts
├── streaming.ts
└── types.ts
```

## 1. Routes yisin-api trouvées

### 1.1 Conversations — STABLE/RECENT

| Méthode | Route | Auth | Classe | Objectif |
|---------|-------|------|--------|----------|
| `POST` | `/api/v1/conversations` | bearer + `conversation:create` | STABLE | Créer conversation vide explicite (optionnel) |
| `POST` | `/api/v1/conversations/messages` | bearer + `Idempotency-Key` | RECENT/NATIVE | Première question (crée conversation implicite) |
| `POST` | `/api/v1/conversations/{id}/messages` | bearer + `Idempotency-Key` | RECENT/NATIVE | Continuer une conversation |
| `GET` | `/api/v1/conversations` | bearer | STABLE | Liste paginée avec filtres |
| `GET` | `/api/v1/conversations/{id}` | bearer | STABLE | Détail d'une conversation |
| `GET` | `/api/v1/conversations/{id}/messages` | bearer | STABLE | Messages persistés |
| `PATCH` | `/api/v1/conversations/{id}` | bearer | STABLE | Rename/archive |
| `DELETE` | `/api/v1/conversations/{id}` | bearer | STABLE | Suppression |
| `PATCH` | `/api/v1/conversations/{cid}/messages/{mid}/feedback` | bearer | RECENT | Vote positive/negative |
| `POST` | `/api/v1/conversations/{cid}/messages/{mid}/retry` | bearer + `Idempotency-Key` | RECENT/NATIVE | Retry d'un message assistant |

### 1.2 Legal Runs — RECENT/NATIVE

| Méthode | Route | Auth | Classe | Objectif |
|---------|-------|------|--------|----------|
| `POST` | `/api/v1/legal-runs` | bearer + `Idempotency-Key` | RECENT/NATIVE | Créer directement un run |
| `GET` | `/api/v1/legal-runs/{id}` | bearer | RECENT/NATIVE | Snapshot autoritaire |
| `GET` | `/api/v1/legal-runs/{id}/events` | bearer | RECENT/NATIVE | SSE streaming |
| `POST` | `/api/v1/legal-runs/{id}/cancel` | bearer | RECENT/NATIVE | Annuler |
| `POST` | `/api/v1/legal-runs/{id}/retry` | bearer + `Idempotency-Key` | RECENT/NATIVE | Retry d'un run |

### 1.3 Documents — STABLE

| Méthode | Route | Auth | Classe | Objectif |
|---------|-------|------|--------|----------|
| `POST` | `/api/v1/documents` | bearer + `document:upload` | STABLE | Upload multipart (10 MB max) |
| `GET` | `/api/v1/documents` | bearer | STABLE | Liste paginée |
| `GET` | `/api/v1/documents/{id}` | bearer + `document:read` | STABLE | État document |
| `DELETE` | `/api/v1/documents/{id}` | bearer + `document:delete` | STABLE | Suppression |
| `GET` | `/api/v1/documents/{id}/download` | bearer + `document:read` | STABLE | Téléchargement binaire |
| `POST` | `/api/v1/documents/{id}/process` | bearer + `Idempotency-Key` | STABLE | Lancer extraction/analyse |
| `GET` | `/api/v1/documents/{id}/analysis` | bearer | STABLE | Dernière analyse |

### 1.4 Document Analysis — RECENT/NATIVE

| Méthode | Route | Auth | Classe | Objectif |
|---------|-------|------|--------|----------|
| `POST` | `/api/v1/document-analyses` | bearer + `Idempotency-Key` | RECENT/NATIVE | Conversation document-first (1-10 docs) |

### 1.5 Identité et Usage — STABLE

| Méthode | Route | Auth | Classe | Objectif |
|---------|-------|------|--------|----------|
| `GET` | `/api/v1/me` | bearer | STABLE | Identité, workspaces, permissions |
| `GET` | `/api/v1/platform/usage` | bearer | STABLE | Soldes capacités |

### 1.6 Contenu — STABLE

| Méthode | Route | Auth | Classe | Objectif |
|---------|-------|------|--------|----------|
| `GET` | `/api/v1/guides` | bearer | STABLE | Liste guides juridiques |
| `GET` | `/api/v1/guides/{slug}` | bearer | STABLE | Détail guide |
| `GET` | `/api/v1/procedures` | bearer | STABLE | Liste démarches |
| `GET` | `/api/v1/procedures/{slug}` | bearer | STABLE | Détail démarche |
| `GET` | `/api/v1/institutions` | bearer | STABLE | Liste institutions |
| `GET` | `/api/v1/content-categories` | bearer | STABLE | Catégories contenu |

### 1.7 Favoris et Notifications — STABLE

| Méthode | Route | Auth | Classe | Objectif |
|---------|-------|------|--------|----------|
| `GET/POST` | `/api/v1/me/favorites` | bearer | STABLE | Favoris |
| `DELETE` | `/api/v1/me/favorites/{type}/{id}` | bearer | STABLE | Retirer favori |
| `POST` | `/api/v1/me/favorites/status` | bearer | STABLE | Statut batch |
| `GET` | `/api/v1/me/notifications` | bearer | STABLE | Liste notifications |
| `GET` | `/api/v1/me/notifications/unread-count` | bearer | STABLE | Compteur non lus |
| `PATCH` | `/api/v1/me/notifications/{id}/read` | bearer | STABLE | Marquer lu |
| `POST` | `/api/v1/me/notifications/read-all` | bearer | STABLE | Tout marquer lu |

### 1.8 Paiements — STABLE (sans abonnement actif)

| Méthode | Route | Auth | Classe | Objectif |
|---------|-------|------|--------|----------|
| `POST` | `/api/v1/payments` | bearer + `Idempotency-Key` | STABLE | Créer paiement |
| `GET` | `/api/v1/payments` | bearer | STABLE | Liste paiements |
| `GET` | `/api/v1/payments/{id}` | bearer | STABLE | Détail paiement |
| `POST` | `/api/v1/payments/{id}/refresh` | bearer | STABLE | Refresh statut provider |

---

## 2. Payloads Request/Response

### 2.1 Conversations

**ConversationCreateRequest:**
```typescript
{
  workspace_id: UUID;
  title?: string | null;      // max 500
  ephemeral?: boolean;
  document_id?: UUID | null;
}
```

**ConversationSummaryResponse:**
```typescript
{
  conversation_id: UUID;
  title: string;
  created_at: string;         // ISO 8601
  updated_at: string;
  workspace_id: UUID | null;
  last_message_at: string | null;
  ephemeral: boolean;
  archived: boolean;
  document_id: UUID | null;
  document_ids: UUID[];
  mode: string;               // "chat" | "document_analysis"
}
```

**ChatMessageCreateRequest:**
```typescript
{
  workspace_id: UUID;
  conversation_id?: UUID | null;
  content: string;            // 1..20_000 caractères
  document_id?: UUID | null;
}
```

**ConversationMessageCreateRequest:**
```typescript
{
  content: string;            // 1..20_000 caractères
}
```

**ChatSubmissionResponse:**
```typescript
{
  conversation_id: UUID;
  run: LegalRunResponse | null;
  assistant_message: ChatMessageResponse | null;
}
```

**ChatMessageResponse:**
```typescript
{
  message_id: UUID;
  role: string;               // "user" | "assistant" | "system"
  content: string;
  created_at: string;
  run_id: UUID | null;
  response_status: string | null;
  citations: PublicCitation[];
  feedback_rating: "positive" | "negative" | null;
  metadata: Record<string, unknown>;
}
```

**ConversationHistoryResponse:**
```typescript
{
  items: ConversationSummaryResponse[];
  limit: number;
  offset: number;
  has_more: boolean;
}
```

### 2.2 Legal Runs

**LegalRunResponse:**
```typescript
{
  run_id: UUID;
  conversation_id: UUID;
  workspace_id: UUID;
  status: RunStatus;
  question: string;
  result_text: string | null;
  failure_code: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
  citations: PublicCitation[];
  validation_diagnostics: object | null;
  action: RunAction | null;
  message: string | null;
  clarification: Clarification | null;
  document_request: DocumentRequest | null;
  matter: Matter | null;
  answer_contract: object | null;
  warnings: string[];
  replayed: boolean;
}
```

**RunStatus:**
```typescript
type RunStatus = 
  | "created" 
  | "executing"
  | "needs_input"           // Terminal - clarification/document
  | "completed"             // Terminal - réponse finale
  | "cancelled"             // Terminal
  | "failed"                // Terminal
  | "cancellation_requested"
  // Legacy compatibility:
  | "needs_clarification"
  | "insufficient_evidence"
  | "validation_rejected";
```

**RunAction:**
```typescript
type RunAction = 
  | "answer_directly"       // status: completed
  | "ask_clarification"     // status: needs_input
  | "ask_for_document"      // status: needs_input
  | "refuse"                // status: completed
  | "escalate";             // status: completed
```

**Clarification:**
```typescript
{
  question_id: string;
  question: string;
  kind: "free_text" | "yes_no" | "single_choice" | "multi_choice" | "date";
  options: string[];
  allow_other: boolean;
  step_index: number | null;
  fact_key: string | null;
}
```

**DocumentRequest:**
```typescript
{
  request_id: string;
  purpose: string;
  accepted_document_categories: string[];
  required: boolean;
  multiple_allowed: boolean;
}
```

**Matter:**
```typescript
{
  matter_id: string;
  status: "understanding" | "clarifying" | "researching" | "reasoning" 
        | "answering" | "answered" | "resolved" | "closed";
  goal: string | null;
  clarification_count: number;
  answered_at: string | null;
  resolved_at: string | null;
  mode: string;
  analysis_intent: string | null;
  document_kinds: string[];
  authority_statuses: string[];
}
```

**PublicCitation:**
```typescript
{
  evidence_id: string;
  reference: string;
  document_title: string | null;
  excerpt: string;
  source_type: string;        // "legal_source" | "institutional_web" | "user_document" | "user_provided_text"
  source_url: string | null;
  page: number | null;
  authority_level: string | null;  // "OFFICIAL_PRIMARY" | "OFFICIAL_SECONDARY" | "USER_DOCUMENT" | "UNKNOWN"
}
```

### 2.3 Documents

**DocumentResponse:**
```typescript
{
  document_id: UUID;
  workspace_id: UUID;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  status: "uploaded" | "scanning" | "ready" | "infected" | "scan_failed";
  quarantine_status: "not_scanned" | "scanning" | "clean" | "infected" | "scan_failed";
  analysis_status: "pending" | "queued" | "processing" | "completed" | "partial" | "failed";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  conversation_eligible: boolean;
}
```

**DocumentAnalysisStartRequest:**
```typescript
{
  workspace_id: UUID;
  document_ids: UUID[];       // 1..10
  instruction?: string | null;  // max 20_000
}
```

**DocumentAnalysisStartResponse:**
```typescript
{
  mode: "document_analysis";
  conversation_id: UUID;
  document_ids: UUID[];
  run: LegalRunResponse;
}
```

### 2.4 Identité

**MeResponse:**
```typescript
{
  account_id: UUID;
  status: "active" | "suspended" | "closed";
  workspaces: Workspace[];
}
```

**Workspace:**
```typescript
{
  workspace_id: UUID;
  kind: "personal" | "family" | "professional" | "organization";
  name: string;
  roles: string[];            // ["owner"] | ["member"] | ["admin"]
  permissions: string[];      // ["conversation:create", "document:upload", ...]
}
```

---

## 3. Protocole de streaming

### 3.1 Type : Server-Sent Events (SSE)

**Endpoint:** `GET /api/v1/legal-runs/{run_id}/events`

**Headers:**
```http
Accept: text/event-stream
Authorization: Bearer {token}
Last-Event-ID: {sequence}     // Optionnel, défaut 0
```

**Réponse:**
```http
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no
```

### 3.2 Format événement

```text
id: 4
event: run.executing
data: {"status":"executing","data":{},"created_at":"2026-09-23T10:00:01+00:00"}

```

**Structure JSON data:**
```typescript
{
  status: RunStatus;
  data: {
    capabilities?: string[];
    freshness?: string;
    response_mode?: string;
    submitted_document_ids?: UUID[];
    entry_mode?: string;
    citations?: PublicCitation[];  // Pour run.completed
  };
  created_at: string;
}
```

### 3.3 Types d'événements

- `run.queued`
- `run.executing`
- `run.needs_input`
- `run.completed`
- `run.failed`
- `run.cancellation_requested`
- `run.cancelled`
- Phases legacy détaillées (si émises)

### 3.4 Keep-alive

Commentaire `: keep-alive` envoyé toutes les ~15 secondes.

### 3.5 Reconnexion

1. Conserver le dernier `id` reçu
2. Rouvrir avec `Last-Event-ID: {id}`
3. Dédupliquer par `(run_id, sequence)`
4. Après événement terminal ou coupure, lire `GET /legal-runs/{id}` pour snapshot autoritaire

### 3.6 Particularité

**Pas de `message.delta` token-level.** Le streaming transmet les transitions d'état, pas les tokens progressifs. Le `result_text` complet apparaît dans le snapshot `GET /legal-runs/{id}`.

---

## 4. Auth observée

### 4.1 Mécanisme

**Bearer token:** OIDC ou session locale `ysn_local_*`

```http
Authorization: Bearer {token}
```

### 4.2 Validation backend

- Résout `account_id`
- Vérifie état du compte (active/suspended/closed)
- Charge grants workspace
- Vérifie permissions requises

### 4.3 Pas de CSRF côté API

Les routes bearer n'utilisent pas de protection CSRF. Si un BFF conserve le token dans un cookie, c'est au BFF d'implémenter sa protection CSRF.

### 4.4 Cookie MFA

`yisin_mfa_session` est utilisé uniquement pour élévation MFA des fonctions admin. Ne remplace pas le bearer token.

### 4.5 Frontend actuel (template)

Utilise `nuxt-auth-utils` avec GitHub OAuth. **À remplacer par l'auth YISIN.**

---

## 5. Gestion des fichiers

### 5.1 Upload

**Multipart/form-data:**
```http
POST /api/v1/documents
Authorization: Bearer {token}
Content-Type: multipart/form-data

workspace_id={uuid}
file=@document.pdf
metadata={"origin":"chat"}
```

### 5.2 Validation

- **Taille max:** 10 MB
- **Types acceptés (détection magique):**
  - PDF (`%PDF-`)
  - DOCX (ZIP contenant `word/`)
  - TXT (UTF-8 sans octet NUL)
- **Extension non fiable:** validation par contenu binaire

### 5.3 Cycle de vie

```
1. Upload → status: uploaded, quarantine_status: not_scanned
2. Scan automatique → status: scanning, quarantine_status: scanning
3a. Succès → status: ready, quarantine_status: clean
3b. Échec → status: infected/scan_failed
4. Process manuel → POST /documents/{id}/process
5. Extraction → analysis_status: queued → processing → completed/partial/failed
```

### 5.4 Éligibilité conversationnelle

```typescript
conversation_eligible = 
  product === "yisin" &&
  case_id === null &&
  status === "ready" &&
  quarantine_status === "clean" &&
  analysis_status in ["completed", "partial"] &&
  // + analyse persistée avec sections textuelles exploitables
```

### 5.5 Polling recommandé

1. `GET /documents/{id}` après upload jusqu'à `ready/clean` ou échec
2. Lancer `POST /documents/{id}/process`
3. `GET /documents/{id}` ou `/analysis` jusqu'à `completed|partial|failed`

Intervalle recommandé : 1-2s avec backoff exponentiel, timeout contrôlé côté client.

### 5.6 Téléchargement

```http
GET /api/v1/documents/{id}/download
Authorization: Bearer {token}
```

Retourne le binaire, streamé par l'API après vérification ownership. Pas d'URL signée exposée.

---

## 6. Mapping Frontend → Backend

### 6.1 Créer une conversation

**Template actuel:**
```typescript
POST /api/chats
{ id, message: { role: "user", parts: [...] } }
```

**YISIN natif:**
```typescript
// Option 1 (recommandée) : création implicite au premier message
POST /api/v1/conversations/messages
{
  workspace_id: UUID,
  conversation_id: null,
  content: string,
  document_id?: UUID
}

// Option 2 : création explicite vide
POST /api/v1/conversations
{
  workspace_id: UUID,
  title?: string,
  ephemeral?: boolean,
  document_id?: UUID
}
```

### 6.2 Liste conversations

**Template:**
```typescript
GET /api/chats
```

**YISIN:**
```typescript
GET /api/v1/conversations?limit=20&offset=0&search=&archived=false
```

### 6.3 Récupérer une conversation

**Template:**
```typescript
GET /api/chats/{id}
// Retourne { id, title, messages, ... }
```

**YISIN:**
```typescript
// 1. Métadonnées conversation
GET /api/v1/conversations/{id}

// 2. Messages persistés
GET /api/v1/conversations/{id}/messages

// 3. Si besoin détail run
GET /api/v1/legal-runs/{run_id}
```

### 6.4 Envoyer un message

**Template:**
```typescript
POST /api/chats/{id}
{
  model: string,
  messages: UIMessage[],
  webSearch: boolean,
  reasoning: boolean
}
// Retourne stream AI SDK
```

**YISIN:**
```typescript
POST /api/v1/conversations/{id}/messages
Headers: { "Idempotency-Key": string }
{ content: string }
// Retourne { conversation_id, run, assistant_message }

// Puis suivre le run
GET /api/v1/legal-runs/{run.run_id}/events
// SSE stream
```

### 6.5 Renommer

**Template:**
```typescript
PATCH /api/chats/{id}/title
{ title: string }
```

**YISIN:**
```typescript
PATCH /api/v1/conversations/{id}
{ title?: string, archived?: boolean }
```

### 6.6 Supprimer

**Template:**
```typescript
DELETE /api/chats/{id}
```

**YISIN:**
```typescript
DELETE /api/v1/conversations/{id}
// 204 No Content
```

### 6.7 Feedback/Vote

**Template:**
```typescript
POST /api/chats/{id}/votes
{ messageId: UUID, isUpvoted?: boolean }
```

**YISIN:**
```typescript
PATCH /api/v1/conversations/{cid}/messages/{mid}/feedback
{ rating: "positive" | "negative" }
```

### 6.8 Upload fichier

**Template:**
```typescript
POST /api/upload
FormData: { file, chatId }
// Retourne Vercel Blob URL
```

**YISIN:**
```typescript
POST /api/v1/documents
FormData: { workspace_id, file, metadata }
// Retourne DocumentResponse

// Puis scanner + processus
GET /api/v1/documents/{id}  // Attendre ready/clean
POST /api/v1/documents/{id}/process
```

---

## 7. Composants KEEP

Préserver l'UX/UI mature du template :

- ✅ `app/components/chat/*` (rendus messages, prompt, indicateurs)
- ✅ `app/components/chat/message/*` (contenus, actions)
- ✅ `app/components/drag-drop/*` (upload UX)
- ✅ `app/layouts/*`
- ✅ `app/assets/*`
- ✅ `app/composables/useChats.ts` (groupement temporel)
- ✅ Dépendances UI : Nuxt UI, VueUse, Comark, Shiki, motion-v, Tailwind

**Évolutions prévues:**
- Branding YISIN (couleurs, logo, wording)
- Renderers spécifiques : clarifications, sources juridiques, documents YISIN

---

## 8. Composants ADAPT

Fichiers couplés au backend template, à adapter pour YISIN :

### 8.1 Pages

**`app/pages/index.vue`**
- **Actuel:** Appelle `POST /api/chats` avec `ai/UIMessage`
- **YISIN:** Appeler `POST /api/v1/conversations/messages` avec workspace sélectionné
- **Changements:**
  - Sélecteur workspace (depuis `GET /me`)
  - Payload simplifié (content + workspace_id + document_id optionnel)
  - Gérer `ChatSubmissionResponse` → rediriger vers `/chat/{conversation_id}`

**`app/pages/chat/[id].vue`**
- **Actuel:** `@ai-sdk/vue` + `DefaultChatTransport`
- **YISIN:** Créer `YisinChatTransport` ou adapter transport
- **Changements:**
  - Charger conversation + messages via API YISIN
  - Submit via `/conversations/{id}/messages` + `Idempotency-Key`
  - Streaming via SSE `/legal-runs/{run_id}/events`
  - Interpréter `run.status`, `action`, `clarification`, `document_request`
  - Gérer états terminaux (completed, failed, needs_input)

### 8.2 Composables

**`app/composables/useChatActions.ts`**
- **Actuel:** `PATCH /api/chats/{id}/title`, `DELETE /api/chats/{id}`
- **YISIN:** `PATCH /api/v1/conversations/{id}`, `DELETE /api/v1/conversations/{id}`
- **Changements minimes:** chemins et schémas

**`app/composables/useFileUpload.ts`**
- **Actuel:** Upload vers Vercel Blob, retourne URL directe
- **YISIN:** Upload vers `/api/v1/documents`, gérer cycle scan/process
- **Changements:**
  - FormData avec workspace_id
  - Polling `/documents/{id}` pour statut
  - Lancer `/process` quand `ready/clean`
  - Vérifier `conversation_eligible`

**`app/composables/useChatSettings.ts`**
- **Actuel:** `model`, `webSearch`, `reasoning` envoyés au backend
- **YISIN:** Backend gère orchestration, pas de sélection provider
- **Changements:**
  - Retirer ou simplifier : pas de sélection modèle public
  - Conserver éventuellement modes/préférences YISIN (à définir)

### 8.3 Composants

**`app/components/ModelSelect.vue`**
- **Actuel:** Dropdown Anthropic/OpenAI/Google
- **YISIN:** Pas de sélection provider en UI standard
- **Action:** Retirer ou remplacer par modes YISIN (chat standard / analyse documentaire / etc.)

**`app/components/chat/Prompt.vue`**
- **Actuel:** Inclut contrôles model/settings
- **YISIN:** Conserver UX prompt, retirer contrôles infra
- **Changements:** Simplifier barre d'actions

**`app/components/chat/tool/*`**
- **Actuel:** Renderers génériques (weather, chart)
- **YISIN:** Créer renderers spécifiques :
  - `ClarificationPrompt.vue` (free_text, yes_no, single_choice, multi_choice, date)
  - `DocumentRequestPrompt.vue`
  - `LegalSourceCitation.vue`
  - `DocumentReference.vue`
  - `MatterSummary.vue` (optionnel)

---

## 9. Composants REPLACE

Backend template à remplacer par `yisin-api` :

### 9.1 Routes Nuxt serveur

**À terme supprimables (après migration complète) :**

- `server/api/chats.get.ts` → `GET /api/v1/conversations`
- `server/api/chats.post.ts` → `POST /api/v1/conversations/messages`
- `server/api/chats/[id].get.ts` → `GET /api/v1/conversations/{id}` + `/messages`
- `server/api/chats/[id].post.ts` → `POST /api/v1/conversations/{id}/messages` + SSE
- `server/api/chats/[id].delete.ts` → `DELETE /api/v1/conversations/{id}`
- `server/api/chats/[id]/title.patch.ts` → `PATCH /api/v1/conversations/{id}`
- `server/api/chats/[id]/votes.{get,post}.ts` → `PATCH .../messages/{mid}/feedback`
- `server/api/chats/[id]/messages.delete.ts` → `/legal-runs/{id}/retry`
- `server/api/upload/*` → `POST /api/v1/documents`
- `server/api/transcription/*` → (fonctionnalité à évaluer séparément)

### 9.2 Base de données

**Actuellement:**
- `server/db/*` (Drizzle + libSQL)
- Schémas : `chats`, `messages`, `votes`

**YISIN:**
- Persistance gérée par `yisin-api` (PostgreSQL)
- Frontend ne possède plus de DB propre pour conversations
- Possible état local : cache, preferences UI uniquement

### 9.3 Providers IA directs

**Actuellement:**
- `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`
- Appels directs depuis serveur Nuxt

**YISIN:**
- Routage providers géré par `yisin-api` → `yisin-ia`
- Frontend ne doit jamais appeler providers directement

---

## 10. Composants REMOVE LATER

Ne pas supprimer immédiatement (garder UI fonctionnelle) :

### 10.1 Dépendances à retirer après migration

**Providers IA:**
- `@ai-sdk/anthropic`
- `@ai-sdk/google`
- `@ai-sdk/openai`

**Base de données:**
- `@libsql/client`
- `drizzle-orm`
- `drizzle-kit`

**Stockage:**
- `@vercel/blob`

**Auth template:**
- Auth GitHub si remplacée par auth YISIN propre

### 10.2 À conserver

**`@ai-sdk/vue`** et **`ai`** :
- Évaluer si réutilisable pour plomberie UI/stream
- `useChat` hook peut être adapté avec transport custom
- Alternative : créer composables YISIN natifs purs

**`nuxt-auth-utils`** :
- Conserver si compatible avec auth YISIN
- Ou remplacer par mécanisme YISIN dédié

**`nuxt-csurf`** :
- Conserver pour protection routes Nuxt serveur (si BFF conservé)

### 10.3 Ordre de suppression

1. ✅ Brancher fondation API YISIN (création service/types)
2. ✅ Remplacer routes conversations (list, create, get, messages)
3. ✅ Implémenter streaming SSE YISIN
4. ✅ Remplacer upload/documents
5. ✅ Remplacer auth
6. ✅ Vérifier build/lint/typecheck
7. 🔄 Supprimer routes `server/api/chats/*`
8. 🔄 Supprimer `server/db/*`
9. 🔄 Supprimer dépendances providers IA
10. 🔄 Supprimer Drizzle/libSQL
11. 🔄 Supprimer Vercel Blob

---

## 11. Dépendances conservées

### 11.1 Framework & UI

✅ **Conserver:**
- `nuxt` (^4.5.2)
- `@nuxt/ui` (^4.11.1)
- `@nuxt/eslint`
- `vue`, `typescript`
- `tailwindcss` (^4.3.3)

### 11.2 Contenu & Rendu

✅ **Conserver:**
- `@comark/nuxt` (markdown)
- `shiki`, `@shikijs/langs` (syntax highlighting)
- `@vueuse/core` (utilities Vue)
- `date-fns` (dates)
- `motion-v` (animations)
- `zod` (validation)
- `striptags` (sanitization)

### 11.3 Sécurité & Auth

✅ **Conserver:**
- `nuxt-csurf` (si BFF avec cookies)
- `nuxt-auth-utils` (si compatible auth YISIN)

⚠️ **À évaluer:**
- Si auth YISIN nécessite remplacement complet

### 11.4 Charts (optionnel)

✅ **Conserver:**
- `nuxt-charts` (si fonctionnalité produit)

### 11.5 Infrastructure

❌ **Retirer après migration:**
- `@nuxthub/core` (spécifique NuxtHub)
- `@libsql/client`, `drizzle-orm`, `drizzle-kit`
- `@vercel/blob`

### 11.6 AI SDK

⚠️ **À évaluer:**
- `@ai-sdk/vue` : peut être conservé si transport custom YISIN fonctionne
- `ai` : idem
- `@ai-sdk/anthropic|google|openai` : **supprimer** (pas d'appels directs providers)

---

## 12. Dépendances à supprimer plus tard

```json
{
  "dependencies_to_remove": [
    "@ai-sdk/anthropic",
    "@ai-sdk/google",
    "@ai-sdk/openai",
    "@libsql/client",
    "@vercel/blob",
    "drizzle-orm",
    "@nuxthub/core"
  ],
  "devDependencies_to_remove": [
    "drizzle-kit"
  ],
  "dependencies_to_evaluate": [
    "@ai-sdk/vue",
    "ai",
    "nuxt-auth-utils"
  ]
}
```

---

## 13. Contrats backend manquants

### 13.1 Streaming token-level

**Observation:** SSE yisin-api émet transitions d'état, pas deltas de tokens.

**Besoin frontend:** Affichage progressif du texte de réponse (UX typewriter).

**Options:**
1. Backend ajoute événements `message.delta` avec chunks de texte
2. Frontend affiche uniquement au statut `completed` (sans progression)
3. Simuler progression côté client (non recommandé)

**Recommandation:** Demander événements `message.delta` si UX critique.

### 13.2 Titre auto-généré

**Template:** Titre généré automatiquement au premier message via LLM.

**YISIN:** Pas de contrat explicite dans docs observées.

**Options:**
1. Backend génère titre automatiquement (comme template)
2. Frontend génère titre localement (moins fiable)
3. Pas de titre auto (utilisateur renomme manuellement)

**Recommandation:** Backend devrait générer titre comme comportement standard.

### 13.3 Notifications temps réel

**Observation:** Notifications disponibles via polling `GET /me/notifications`.

**Besoin:** Notifications push temps réel (WebSocket/SSE).

**Statut:** Non critique pour MVP, polling acceptable.

### 13.4 Partage de conversations

**Template:** Conversations publiques/privées avec URL partageable.

**YISIN:** Pas de contrat observé dans routes actuelles.

**Statut:** Fonctionnalité produit à spécifier si nécessaire.

---

## 14. Risques

### 14.1 Technique

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **SSE sans delta tokens** | UX moins fluide | Afficher au `completed` ou demander événements delta |
| **Streaming SSE côté client** | Compatibilité navigateurs | Polyfill EventSource, fallback polling |
| **Gestion reconnexion SSE** | Messages perdus/dupliqués | Implémenter `Last-Event-ID` correctement + déduplication |
| **Idempotence key** | Rejeux indésirables | Générer UUIDs uniques par intention, gérer `409` |
| **Upload 10MB max** | Fichiers volumineux rejetés | Communiquer limite clairement, validation frontend |
| **Cycle scan/process async** | UX polling complexe | Feedback visuel clair, timeouts raisonnables |
| **Multi-document limitation** | 1 doc/conversation chat, 10 docs analyse | Clarifier limite UI, empêcher attachements multiples |
| **Titre non généré auto** | Conversations "Sans titre" | Générer côté backend ou frontend temporaire |

### 14.2 Architecture

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Double backend temporaire** | Complexité, bugs | Migration par tranches, tests systématiques |
| **Auth incompatibilité** | Refonte complète nécessaire | Audit auth YISIN tôt, adaptateur si possible |
| **Workspace requis partout** | UX perturbée sans workspace | Workspace personnel par défaut, sélecteur contextuel |
| **Permissions granulaires** | Fonctionnalités bloquées | Gérer états désactivés, messages clairs |
| **Capacités/quotas** | Blocage utilisateur | Afficher soldes, proposer upgrade |

### 14.3 Produit

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **UX différente du template** | Perte fluidité | Préserver interactions clés, tester avec utilisateurs |
| **Clarifications multiples** | Frustration utilisateur | UI claire, progression visible, max 3 tours |
| **Documents multiples complexes** | Confusion limite 1 vs 10 | Modes séparés : chat (1 doc) / analyse (10 docs) |
| **Échec scan/process** | Blocage workflow | Messages explicites, suggestions alternatives |

---

## 15. Ordre exact de migration

### Phase 0 : Préparation (non destructive)

1. ✅ Créer `app/services/yisin-api/`
2. ✅ Créer types TypeScript depuis contrats observés
3. ✅ Configurer variable `NUXT_PUBLIC_YISIN_API_BASE_URL`
4. ✅ Conserver template fonctionnel en parallèle

### Phase 1 : Fondation API

5. ✅ Implémenter `YisinApiClient` avec auth bearer
6. ✅ Implémenter wrappers typés :
   - `getMe()`
   - `listConversations(params)`
   - `getConversation(id)`
   - `getConversationMessages(id)`
7. ✅ Tester lecture seule (pas de mutations)
8. ✅ Vérifier typecheck, lint

### Phase 2 : Conversations CRUD

9. ✅ Brancher `POST /conversations/messages` (première question)
10. ✅ Brancher `POST /conversations/{id}/messages` (follow-up)
11. ✅ Brancher `PATCH /conversations/{id}` (rename/archive)
12. ✅ Brancher `DELETE /conversations/{id}`
13. ✅ Adapter `app/pages/index.vue` vers API YISIN
14. ✅ Adapter `useChatActions.ts`
15. ✅ Tester cycle création/liste/rename/delete
16. ✅ Build, lint, typecheck

### Phase 3 : Streaming SSE (critique)

17. ✅ Créer `YisinStreamTransport` ou adapter `DefaultChatTransport`
18. ✅ Implémenter client SSE avec `EventSource`
19. ✅ Gérer `Last-Event-ID`, reconnexion, déduplication
20. ✅ Parser événements `run.*`
21. ✅ Mettre à jour UI selon statuts (executing, needs_input, completed, failed)
22. ✅ Adapter `app/pages/chat/[id].vue`
23. ✅ Tester scénario complet question → streaming → réponse
24. ✅ Build, lint, typecheck

### Phase 4 : Run management

25. ✅ Brancher `GET /legal-runs/{id}` (snapshot autoritaire)
26. ✅ Brancher `POST /legal-runs/{id}/cancel`
27. ✅ Brancher `POST /legal-runs/{id}/retry`
28. ✅ Créer composant `RunStatusIndicator.vue`
29. ✅ Tester retry, cancel
30. ✅ Build, lint, typecheck

### Phase 5 : Clarifications & Actions

31. ✅ Créer `ClarificationPrompt.vue` (tous types)
32. ✅ Créer `DocumentRequestPrompt.vue`
33. ✅ Interpréter `action` dans run terminal
34. ✅ Gérer workflow clarification → nouveau message
35. ✅ Tester scénarios needs_input
36. ✅ Build, lint, typecheck

### Phase 6 : Documents

37. ✅ Brancher `POST /documents` (upload)
38. ✅ Créer composant `DocumentUploadStatus.vue`
39. ✅ Polling `GET /documents/{id}` (scan)
40. ✅ Brancher `POST /documents/{id}/process`
41. ✅ Polling analyse
42. ✅ Vérifier `conversation_eligible`
43. ✅ Adapter `useFileUpload.ts`
44. ✅ Tester upload → scan → process → attach conversation
45. ✅ Build, lint, typecheck

### Phase 7 : Citations & Sources

46. ✅ Créer `LegalSourceCitation.vue`
47. ✅ Créer `DocumentReference.vue`
48. ✅ Distinguer `source_type` visuellement
49. ✅ Afficher citations depuis run.completed + messages
50. ✅ Tester affichage sources
51. ✅ Build, lint, typecheck

### Phase 8 : Feedback

52. ✅ Brancher `PATCH .../messages/{mid}/feedback`
53. ✅ Adapter UI vote (thumbs up/down)
54. ✅ Tester feedback
55. ✅ Build, lint, typecheck

### Phase 9 : Auth YISIN

56. ✅ Intégrer mécanisme auth YISIN
57. ✅ Gérer bearer token (storage, refresh)
58. ✅ Workspace selector depuis `GET /me`
59. ✅ Permissions UI (désactiver fonctions sans permission)
60. ✅ Tester cycle login → workspace → conversation
61. ✅ Build, lint, typecheck

### Phase 10 : Document Analysis

62. ✅ Brancher `POST /document-analyses`
63. ✅ Créer page/mode analyse documentaire
64. ✅ Multi-sélection documents (max 10)
65. ✅ Tester workflow analyse
66. ✅ Build, lint, typecheck

### Phase 11 : Nettoyage

67. ✅ Supprimer routes `server/api/chats/*`
68. ✅ Supprimer `server/db/*`
69. ✅ Désinstaller providers IA
70. ✅ Désinstaller Drizzle, libSQL
71. ✅ Désinstaller Vercel Blob
72. ✅ Nettoyer imports inutilisés
73. ✅ Build, lint, typecheck final
74. ✅ Tests E2E si disponibles

### Phase 12 : Polish

75. ✅ Branding YISIN (couleurs, logo)
76. ✅ Wording produit français
77. ✅ Messages erreur contextuels
78. ✅ Loading states, skeleton loaders
79. ✅ Optimisations performances
80. ✅ Audit accessibilité
81. ✅ Documentation utilisateur

---

## 16. Prochaine étape recommandée

### Implémentation immédiate (non destructive)

**Créer la couche de service YISIN :**

```
app/services/yisin-api/
├── client.ts                 # YisinApiClient avec auth
├── types.ts                  # Types from backend contracts
├── conversations.ts          # Conversations API
├── legal-runs.ts             # Legal runs API
├── documents.ts              # Documents API
├── streaming.ts              # SSE client
└── errors.ts                 # Error handling
```

**Fichiers à créer :**

1. **`app/services/yisin-api/types.ts`**
   - Tous les types depuis section 2 de ce document
   - Exporter interfaces TypeScript

2. **`app/services/yisin-api/client.ts`**
   - Client HTTP avec bearer token
   - Gestion erreurs
   - Base URL depuis runtime config

3. **`app/services/yisin-api/conversations.ts`**
   - `listConversations(params)`
   - `getConversation(id)`
   - `getConversationMessages(id)`
   - `createConversation(payload)`
   - `submitMessage(payload, idempotencyKey)`
   - `submitConversationMessage(id, payload, idempotencyKey)`
   - `updateConversation(id, payload)`
   - `deleteConversation(id)`

4. **Configuration runtime**
   - Ajouter `NUXT_PUBLIC_YISIN_API_BASE_URL` dans `.env`
   - Configurer dans `nuxt.config.ts`

**Tests manuels initiaux :**

```bash
# NE PAS lancer ces services (règle du brief)
# Documenter seulement les commandes

# Services requis (à lancer manuellement par l'utilisateur) :
# - yisin-api sur http://localhost:8000
# - PostgreSQL
# - Redis
# - Qdrant (si nécessaire)

# Tests frontend :
pnpm lint
pnpm typecheck
pnpm build
```

**Validation phase 1 :**

- ✅ Types TypeScript compilent
- ✅ Client API construit correctement
- ✅ Aucune régression template existant
- ✅ Build/lint/typecheck passent

---

## 17. Tests/Lint/Typecheck/Build

### 17.1 Commandes disponibles

```json
{
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "lint": "eslint .",
    "typecheck": "nuxt typecheck",
    "db:generate": "nuxt db generate",
    "db:migrate": "nuxt db migrate"
  }
}
```

### 17.2 État actuel

- ✅ `pnpm lint` — À tester après implémentation
- ✅ `pnpm typecheck` — À tester après implémentation
- ✅ `pnpm build` — À tester après implémentation

### 17.3 Tests absents

❌ Pas de suite de tests automatisés dans le template actuel.

**Recommandation future :**
- Ajouter Vitest
- Tests unitaires services YISIN
- Tests composants critiques
- Tests E2E avec Playwright

---

## 18. Streaming strategy

### 18.1 Architecture proposée

```typescript
// app/services/yisin-api/streaming.ts

export class YisinStreamClient {
  private eventSource: EventSource | null = null;
  
  connect(runId: string, lastEventId?: number): void {
    const url = new URL(`/api/v1/legal-runs/${runId}/events`, baseURL);
    
    this.eventSource = new EventSource(url.toString());
    
    if (lastEventId !== undefined) {
      // Note: EventSource doesn't support custom headers for Last-Event-ID
      // Need to append to URL or use fetch-based SSE polyfill
    }
    
    this.eventSource.addEventListener('run.executing', (event) => {
      const data = JSON.parse(event.data);
      this.handleEvent('run.executing', data, event.lastEventId);
    });
    
    // ... autres événements
  }
  
  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }
}
```

### 18.2 Alternative : fetch-based SSE

Pour supporter `Last-Event-ID` header :

```typescript
async function* streamSSE(runId: string, lastEventId?: number) {
  const response = await fetch(`/api/v1/legal-runs/${runId}/events`, {
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${token}`,
      ...(lastEventId && { 'Last-Event-ID': lastEventId.toString() })
    }
  });
  
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    // Parse SSE format
    // ...
  }
}
```

### 18.3 Intégration avec `@ai-sdk/vue`

**Option 1 : Custom transport**

```typescript
class YisinChatTransport implements Transport {
  async send(messages: UIMessage[]) {
    // POST /conversations/{id}/messages
    const result = await submitMessage(...);
    
    // Return async generator streaming SSE
    return streamSSE(result.run.run_id);
  }
}
```

**Option 2 : Composable natif**

```typescript
export function useYisinChat(conversationId: string) {
  const messages = ref<ChatMessage[]>([]);
  const status = ref<'idle' | 'loading' | 'streaming' | 'error'>('idle');
  
  async function send(content: string) {
    status.value = 'loading';
    
    const result = await apiClient.submitConversationMessage(
      conversationId,
      { content },
      generateIdempotencyKey()
    );
    
    status.value = 'streaming';
    
    const stream = new YisinStreamClient();
    stream.connect(result.run.run_id);
    
    stream.on('run.completed', (data) => {
      status.value = 'idle';
      messages.value.push({
        role: 'assistant',
        content: data.message,
        citations: data.citations
      });
    });
  }
  
  return { messages, status, send };
}
```

### 18.4 Recommandation

**Phase 3 (Streaming) :**
1. Commencer avec composable natif YISIN pour contrôle total
2. Évaluer `@ai-sdk/vue` si transport custom viable
3. Privilégier clarté/maintenabilité sur réutilisation AI SDK

---

## 19. Auth strategy

### 19.1 État actuel template

- **Mécanisme:** `nuxt-auth-utils` + GitHub OAuth
- **Session:** Cookie côté serveur
- **Routes protégées:** Middleware Nuxt

### 19.2 YISIN auth requis

**Backend attend:**
```http
Authorization: Bearer {token}
```

**Types de tokens :**
- OIDC (production)
- Session locale `ysn_local_*` (développement)

### 19.3 Options d'intégration

**Option A : BFF Pattern (recommandé pour production)**

```
Browser → Nuxt Server (BFF) → yisin-api
         ↑ Cookie session  ↑ Bearer token
```

- Nuxt server possède bearer token
- Cookie HTTP-only côté client
- Protection CSRF avec `nuxt-csurf`
- Routes Nuxt server proxy vers yisin-api

**Option B : Direct client (développement)**

```
Browser → yisin-api
       ↑ Bearer token in localStorage/sessionStorage
```

- Token stocké côté client
- Simplifie développement
- Moins sécurisé (XSS risk)

### 19.4 Implémentation recommandée

**Phase 9 (Auth) :**

```typescript
// app/composables/useYisinAuth.ts
export function useYisinAuth() {
  const token = useCookie('yisin_token', { httpOnly: true });
  const identity = useState<MeResponse | null>('identity', () => null);
  
  async function login(credentials: LoginCredentials) {
    // Option A: POST to Nuxt server route → yisin-api
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: credentials
    });
    
    // Server sets HTTP-only cookie
    await loadIdentity();
  }
  
  async function loadIdentity() {
    identity.value = await $fetch('/api/auth/me');
  }
  
  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' });
    identity.value = null;
  }
  
  return { identity, login, logout, loadIdentity };
}
```

**Routes serveur Nuxt :**

```typescript
// server/api/auth/login.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  // Call yisin-api auth endpoint
  const response = await $fetch('http://yisin-api/auth/token', {
    method: 'POST',
    body
  });
  
  // Store bearer token in HTTP-only cookie
  setCookie(event, 'yisin_bearer', response.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: response.expires_in
  });
  
  return { success: true };
});

// server/api/auth/me.get.ts
export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'yisin_bearer');
  
  if (!token) {
    throw createError({ statusCode: 401 });
  }
  
  return await $fetch('http://yisin-api/api/v1/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
});
```

### 19.5 Workspace management

```typescript
// app/composables/useYisinWorkspace.ts
export function useYisinWorkspace() {
  const { identity } = useYisinAuth();
  const currentWorkspace = useCookie<string>('yisin_workspace');
  
  const workspaces = computed(() => identity.value?.workspaces || []);
  
  const workspace = computed(() => {
    return workspaces.value.find(w => w.workspace_id === currentWorkspace.value)
      || workspaces.value[0]; // Fallback to first (personal)
  });
  
  function selectWorkspace(workspaceId: string) {
    currentWorkspace.value = workspaceId;
  }
  
  return { workspace, workspaces, selectWorkspace };
}
```

---

## Conclusion

### État actuel

✅ **Audit complet effectué**
- Routes yisin-api identifiées et documentées
- Contrats request/response extraits
- Streaming SSE analysé
- Auth backend compris
- Frontend template cartographié
- Mapping frontend ↔ backend établi

### Prochaine action immédiate

**Créer la fondation non destructive (Phase 0-1) :**

1. Structure `app/services/yisin-api/`
2. Types TypeScript complets
3. Client API de base
4. Configuration runtime

**Sans toucher :**
- Routes serveur existantes
- Composables actuels
- Pages template
- Base de données template

### Validation

```bash
pnpm lint     # À exécuter après implémentation
pnpm typecheck # À exécuter après implémentation
pnpm build    # À exécuter après implémentation
```

### Contrats manquants critiques

1. **Streaming token-level** (`message.delta`) — UX typewriter
2. **Titre auto-généré** — Conversations sans titre
3. ~~Notifications temps réel~~ — Polling acceptable MVP

### Risques majeurs à surveiller

1. SSE reconnexion/déduplication
2. Idempotence keys correctement générées
3. Cycle document scan/process async
4. Limite 1 document/conversation chat vs 10/analyse
5. Double backend temporaire durant migration

---

**Document généré le:** 2026-09-24  
**Auteur:** Audit technique Kiro  
**Statut:** Fondation Phase 0-1 implémentée sur `feat/yisin-foundation`; validation locale à effectuer
