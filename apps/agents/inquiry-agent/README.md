# SafeAI Inquiry Agent

Standalone LangGraph agent that classifies user support inquiries (category + urgency),
drafts replies, runs drafts through a GuardRails check, and sends a reply only after
explicit admin approval (human-in-the-loop).

This agent has no direct dependency on `client/` or `server/` code and no shared
database. It integrates with the existing SafeAI-613 site exclusively through the
server's REST API (`SAFEAI_API_BASE_URL`).

## Setup

```
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # then fill in real values
```

## Graph

```
fetch_node -> classify_node -> present_node
  -> [GATE 1: selection_gate, HITL - admin picks inquiry IDs]
  -> draft_node -> guardrails_node
       -> [GATE 2: guardrails_gate, automated - fail loops back to draft_node]
  -> evaluator_node
       -> [GATE 3: evaluator_gate, HITL - admin approves/edits/rejects]
  -> send_node
```

The graph compiles with a checkpointer keyed by `thread_id`, since gates 1 and 3
pause execution across separate CLI invocations.

## GuardRails

`guardrails_node` checks each draft before it reaches the admin:

- **Email / phone leakage** - plain regex (`guardrails.py`'s `_EMAIL_RE` / `_PHONE_RE`).
  This is intentionally exact-match: an email or phone number either appears in the
  draft or it doesn't, so a regex is the right tool and there's no ambiguity for an
  LLM to resolve.
- **Unsupported promises** - a semantic check via Gemini (`_check_overpromise`),
  not exact-phrase matching. A support reply can overpromise ("we'll have this
  fixed within the hour", "you'll get a full refund, no questions asked") without
  using any fixed keyword, so a phrase list would miss most real cases; the
  semantic check only runs when the regex checks already passed, to avoid an
  extra LLM call on a draft that's already rejected.

A failed check routes back to `draft_node` for another attempt, up to
`_MAX_DRAFT_RETRIES` (2) retries per inquiry, before falling through to
`evaluator_node` regardless.

## LLM provider

Classification and drafting run on Gemini via `google-genai` (`GEMINI_API_KEY`,
`LLM_MODEL` in `.env`). This is the project's only LLM provider - there is no
OpenAI dependency anywhere in this agent.

## Checkpointer

Graph run state (thread checkpoints) is persisted to MongoDB Atlas via
`MongoDBSaver`, not kept in local memory - runs must survive across separate
CLI invocations (gates 1 and 3 each end a process). Requires `MONGODB_ATLAS_URI`
in `.env`, pointing at a cluster fully separate from the SafeAI-613 website's
own database.

## CLI usage

```
python run_agent.py list
python run_agent.py process --thread-id <id> --ids 12,7,3
python run_agent.py process --thread-id <id> --edit <inquiry_id>
```

`list` runs the graph up to gate 1 and prints inquiries sorted by urgency.
`process --ids` resumes a paused run with the selected IDs, drafts + guardrails-checks
replies, and pauses again at gate 3 for admin review/approval. `process --edit` lets the
admin rewrite a drafted reply's text before approving it at gate 3.

## LangSmith

Tracing is optional and controlled by `LANGCHAIN_TRACING_V2` in `.env`
(along with `LANGCHAIN_API_KEY` / `LANGCHAIN_PROJECT`). Used for monitoring
graph runs during development; the agent works without it.

## Token usage tracking

`usage_tracker` accumulates Gemini token counts per `thread_id` in-process and
prints the running total after each CLI invocation ("טוקנים בריצה זו: ...").
It resets at the start of every `list`/`process` command - it's a
per-invocation counter, not a persisted usage log.

## Evals

Each eval lives in its own file under `evals/`, and writes its results as CSV to
the gitignored `evals/output/` directory.

## Backend dependency (tracked separately, not part of this agent's code)

The server now provides everything this agent needs:
- `urgency` and `category` fields on `ContactMessage`, set via
  `PATCH /contact/my-requests/:id/classification` - `classify_node` calls this
  (through `SafeAIClient.update_classification`) right after classifying each
  inquiry, so the admin's own request list shows the same classification this
  agent used to sort and pick drafts, not just this process's in-memory state.
- A real service-account auth mechanism: set `SAFEAI_AGENT_API_TOKEN` to the
  server's `AGENT_SERVICE_TOKEN` value (see `apps/server/.env.example`), a
  static, independently-rotatable shared secret - not a personal admin JWT,
  which expires every 15 minutes and ties the agent to one human's session.
  `requireAdminOrServiceToken`/`authenticateTokenOrServiceToken`
  (`apps/server/src/middleware/auth.ts`) accept either this token or a normal
  admin JWT on every route this agent calls.
- `GET /contact/all` now accepts `?status=open` server-side; `fetch_open_inquiries`
  sends it but still also filters client-side, so this agent keeps working
  unchanged against an older server deployment that hasn't picked up that change.
- An email notification sent to the request's owner once an admin (or this
  agent, after approval) posts a reply (`sendContactReplyEmail`, triggered from
  `addReply` in `contactMessageController.ts`).
