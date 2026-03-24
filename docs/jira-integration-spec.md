# Jira Integration — Feature Spec

## Overview

Import R&D activities and evidence directly from a client's Jira workspace into ClaimFlow. AI analyses epics and issues, identifies which work qualifies as RDTI-eligible R&D, rewords them for AusIndustry, and imports them as draft activities with evidence pre-linked.

This replaces the current workflow where consultants manually create activities from interviews, with an automated pipeline that produces stronger claims backed by contemporaneous Jira records.

### Inspiration

RDTI Tracka (Jira Cloud app by Rimon Advisory) validated the concept of tracking R&D in Jira but failed on execution (33 users). Key failures: required devs to self-tag (they won't), Jira-only, no intelligence, no cost linkage, still needed consultants. ClaimFlow's approach: pull everything, let AI sort, consultant confirms.

---

## Design Decisions

### What to Pull

- **Pull all issues** from client-selected Jira projects. Don't pre-filter by epic or label.
- Client scopes by **Jira project** (e.g. PLATFORM, ML-ENGINE) — not by epic. This keeps volume manageable without requiring RDTI knowledge.
- AI classification is cheap. Better to classify 500 tickets and surface 40 than ask the client to guess.

### Date Range

- Auto-set to the **claim FY** (1 July – 30 June) based on the ClaimFlow project's claim year.
- Filter on **activity dates**, not creation date. An epic created in March with work in October is claimable.
- JQL: issues where `statusCategoryChangedDate` or `updated` falls within the FY window.
- Allow consultant to override the date range if needed.

### Completed vs In-Progress

- **Pull both.** RDTI doesn't require work to be finished.
- In-progress items flagged in the UI so consultant can note the activity spans FYs.

### Hierarchy: Epics → Issues → Sub-tasks

- **Epics** map to RDTI Activities (roughly 1:1, but consultant can merge/split)
- **Issues** under the epic become evidence items, slotted into systematic steps
- **Sub-tasks** pulled for context but not classified individually
- **Orphan issues** (no epic) grouped under "Ungrouped" — AI may suggest groupings

---

## AI Classification & Rewording

### Step 1: Filter — Is This R&D?

Each epic assessed against RDTI criteria:
- Is there **technical uncertainty**? (genuinely unknown technical outcome, not just "new to us")
- Does it produce **new knowledge**? (not applying known solutions)
- Was there **systematic experimentation**? (not just trial and error)

AI examines: epic title + description, child issue titles/descriptions/comments, linked commits/PRs, issue types (spikes, prototypes, POCs are strong signals), time-in-progress patterns.

Output: **Likely Core R&D** / **Likely Supporting** / **Not R&D** — with reasoning.

### Step 2: Reword for RDTI

Jira epics are written for developers. RDTI activities must be written for AusIndustry assessors. The AI rewords to:

- **Lead with the uncertainty**, not the business goal
- **Use RDTI language** — "investigation", "systematic", "novel approach", "unknown outcome"
- **Strip commercial framing** — not "reduce churn by 20%" but "predict churn from sparse data"
- **Keep it accurate** — rewording, not fabricating

Example:
| Jira Epic | AI-Reworded Activity |
|---|---|
| "Event-driven architecture migration" | "Investigation of scalable event-driven messaging patterns to achieve reliable message ordering under high-throughput conditions" |
| "ML model for churn prediction" | "Development of novel classification approach to predict customer churn from sparse behavioural data with limited training samples" |

### Step 3: Draft Full Activity

For each qualifying epic, AI generates:
- **Name** — RDTI-framed (3-10 words)
- **Uncertainty** — the specific technical unknown
- **Hypothesis** — what was hypothesised
- **Conclusion** — what was learned (if work is complete)
- **Evidence mapping** — each child issue assigned to a systematic step (Hypothesis, Experiment, Observation, Evaluation, Conclusion)
- **Classification reasoning** — why this qualifies as R&D

All drafted from actual Jira content (descriptions, comments, status changes).

---

## User Flow

### 1. Connect Jira

- OAuth 2.0 (3LO) flow with Atlassian
- Scopes: `read:jira-work` (issues, epics, comments, worklogs)
- Client clicks "Connect Jira" from the project activities page
- After auth, ClaimFlow fetches available Jira projects

### 2. Select Projects & Date Range

```
"Which Jira projects should we analyse?"
  [x] PLATFORM  (342 issues)
  [x] ML-ENGINE (89 issues)
  [ ] SUPPORT   (1,204 issues)
  [ ] MARKETING (56 issues)

Claim period: 1 Jul 2025 — 30 Jun 2026 [Edit]

[Analyse →]
```

### 3. AI Analysis (background job)

- Pull all issues from selected projects within date range
- Group by epic
- Classify each epic + its issues
- Generate draft activities for qualifying epics
- Takes ~30-60 seconds for typical projects

### 4. Triage View

```
AI analysed 4 epics (67 issues) from PLATFORM project

Recommended as R&D Activities (2)

  "Investigation of event-driven messaging patterns"
  From epic: PLAT-EP-12 "Event-driven migration"
  12 issues mapped | Core R&D
  [Preview] [Edit] [Reject]

  "Development of adaptive ML classification for..."
  From epic: PLAT-EP-15 "Churn prediction model"
  8 issues mapped | Core R&D
  [Preview] [Edit] [Reject]

Not R&D (2)

  PLAT-EP-18 "Customer onboarding redesign"
  Reason: UX improvement using established patterns
  [Override -> Import as R&D]

  PLAT-EP-20 "Q3 bug fixes"
  Reason: Maintenance work, no technical uncertainty
  [Override -> Import as R&D]

            [Import Selected Activities]
```

### 5. Import to Activities Page

Imported activities land as **drafts** in the existing ActivitiesView with:
- AI-generated name, uncertainty, hypothesis, conclusion
- Evidence (Jira issues) pre-linked to systematic steps
- Source marked as `'jira'`
- Jira key + URL stored in `meta` JSONB

Consultant can then: adopt, edit, merge, split, reject — same workflow as today.

---

## Schema Changes

### New Table: `jira_connections`

```sql
CREATE TABLE jira_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  jira_site_url TEXT NOT NULL,          -- e.g. "https://acme.atlassian.net"
  access_token TEXT NOT NULL,           -- encrypted
  refresh_token TEXT NOT NULL,          -- encrypted
  token_expires_at TIMESTAMPTZ NOT NULL,
  selected_jira_projects JSONB,         -- ["PLATFORM", "ML-ENGINE"]
  connected_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id)
);
```

### New Table: `jira_imports`

```sql
CREATE TABLE jira_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  jira_connection_id UUID NOT NULL REFERENCES jira_connections(id),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, analysing, ready, imported
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  jira_projects JSONB NOT NULL,            -- ["PLATFORM", "ML-ENGINE"]
  raw_data JSONB,                          -- cached Jira API response
  analysis_result JSONB,                   -- AI classification results
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Existing Table Changes

**`core_activities`** — no migration needed:
- `source`: add `'jira'` as valid value (currently 'ai' or 'human', stored as TEXT)
- `meta` JSONB: store `{ jira_epic_key, jira_epic_url, jira_import_id }`

**`evidence`** — minimal change:
- New evidence items created from Jira issues
- `meta` or new column to store `jira_issue_key`, `jira_issue_url`
- `source` / `source_type` to indicate Jira origin

---

## API Routes

### Jira OAuth
- `GET /api/jira/auth` — initiate OAuth flow, redirect to Atlassian
- `GET /api/jira/callback` — handle OAuth callback, store tokens
- `GET /api/projects/[token]/jira/status` — check connection status

### Jira Data
- `GET /api/projects/[token]/jira/projects` — list available Jira projects
- `POST /api/projects/[token]/jira/analyse` — trigger AI analysis of selected projects
- `GET /api/projects/[token]/jira/analyse/[importId]` — poll analysis status/results

### Triage & Import
- `GET /api/projects/[token]/jira/triage/[importId]` — get triage data (classified epics)
- `PATCH /api/projects/[token]/jira/triage/[importId]` — update classifications (confirm/reject/override)
- `POST /api/projects/[token]/jira/import/[importId]` — import confirmed activities + evidence

---

## Technical Notes

### Jira API
- Use Jira Cloud REST API v3
- Auth: OAuth 2.0 (3LO) via Atlassian Connect
- Key endpoints: `/rest/api/3/search` (JQL), `/rest/api/3/issue/{key}` (detail + comments)
- Rate limits: ~100 req/sec for OAuth apps — more than enough
- Pagination: maxResults=100, use startAt for paging

### AI Classification
- Use existing OpenAI integration (same pattern as activity generation)
- Single prompt per epic: include epic details + all child issue summaries
- Model: GPT-4o (needs nuanced RDTI understanding)
- Include RDTI criteria in system prompt (from memory/rdti_guidance.md)
- Output: structured JSON with classification, reasoning, draft activity fields, evidence-to-step mapping

### Token Refresh
- Atlassian OAuth tokens expire (typically 1 hour)
- Refresh token flow needed before each API call batch
- Store encrypted tokens in `jira_connections`

---

## Future Enhancements (Not MVP)

- **Linear / GitHub Issues / Azure DevOps** connectors (same pattern, different API)
- **Time tracking integration** (Tempo, Jira worklogs) → auto-populate cost apportionment
- **Git commit analysis** → supplementary evidence from commit messages
- **Ongoing sync** — not just one-off import, but periodic re-sync during the FY
- **Slack/Teams bot** — for teams without project management tools
- **"Is this R&D?" standalone tool** — paste a ticket description, get instant classification (marketing lead-gen)

---

## Success Criteria

1. Consultant can connect a client's Jira in < 2 minutes
2. AI correctly identifies R&D epics with > 80% precision (consultant overrides < 20%)
3. Imported activities require < 50% of the editing that manually-created ones do
4. Jira evidence timestamps provide stronger audit trail than interview-based evidence
5. End-to-end time from Jira connection to draft activities: < 5 minutes
