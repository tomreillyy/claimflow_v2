# ClaimFlow System Documentation

**Version:** 2.1 (Automatic R&D Evidence Engine)
**Last Updated:** January 18, 2025
**Status:** Production-Ready (pending RLS policies)

## Overview

**ClaimFlow** is an R&D evidence collection platform designed for Australian R&D Tax Incentive (RDTI) compliance under ITAA 1997 s.355-25. The system allows teams to collect evidence in real-time through multiple channels (web forms, file uploads, email) and generates organized claim packs categorized by R&D stages.

**Recent Updates:**
- ✅ **Automatic R&D evidence capture from GitHub** (Jan 18, 2025)
- ✅ **Pull request syncing alongside commits** (Jan 18, 2025)
- ✅ **Keyword-based R&D filtering** (zero AI cost) (Jan 18, 2025)
- ✅ **R&D claim export endpoint** (Jan 18, 2025)
- ✅ Authentication & authorization on all evidence routes (Jan 17, 2025)
- ✅ File upload validation with magic byte verification (Jan 17, 2025)
- ✅ Webhook signature verification for SendGrid (Jan 17, 2025)
- ✅ CSRF protection on cron endpoints (Jan 17, 2025)
- ✅ Comprehensive security hardening (See SECURITY_FIXES.md)

---

## System Architecture

### Technology Stack

- **Frontend**: Next.js 15 with React 19 (App Router)
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **Email**: SendGrid (outbound nudges + inbound email parsing)
- **AI Classification**: OpenAI GPT-4o-mini (optional, for evidence classification)
- **Authentication**: Supabase Auth (magic link email authentication)
- **Security**: Custom auth middleware, file validation, webhook verification
- **Styling**: Inline React styles (no CSS framework)

---

## Data Model

### Database Tables

#### 1. **projects** table
Stores R&D project information and access control.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `name` | TEXT | Project name (e.g., "AI Chatbot Development") |
| `year` | TEXT | Tax year (e.g., "2024-2025") |
| `project_token` | TEXT | Unique URL-safe token (~32 chars, base64url) for public access |
| `inbound_email_local` | TEXT | Unique email local part (e.g., "p_ab12cd34") for receiving evidence via email |
| `participants` | TEXT[] | Array of participant email addresses who can contribute |
| `owner_id` | UUID | Foreign key to `auth.users.id` (can be NULL for legacy projects) |
| `created_at` | TIMESTAMP | Project creation timestamp |

**Key Points:**
- **project_token**: Generated via `crypto.randomBytes(24).toString('base64url')` - provides URL access at `/p/{token}`
- **inbound_email_local**: Generated via `'p_' + crypto.randomBytes(5).toString('hex')` - creates unique inbox like `p_ab12cd34@yourdomain.com`
- **owner_id**: Links to authenticated user who created the project (NULL for old public projects)

#### 2. **evidence** table
Stores all evidence items collected for projects.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `project_id` | UUID | Foreign key to `projects.id` |
| `author_email` | TEXT | Email of person who submitted evidence (optional) |
| `content` | TEXT | Text content of the evidence (for notes and email bodies) |
| `file_url` | TEXT | Public URL to uploaded file in Supabase Storage |
| `source` | TEXT | Origin of evidence: 'note', 'upload', 'email' |
| `category` | TEXT | R&D category (legacy field, mostly unused) |
| `systematic_step_primary` | TEXT | AI-classified step: 'Hypothesis', 'Experiment', 'Observation', 'Evaluation', 'Conclusion', 'Unknown' |
| `systematic_step_source` | TEXT | Classification source: 'auto' (AI) or 'manual' (user override) |
| `classified_at` | TIMESTAMP | When AI classification was performed |
| `soft_deleted` | BOOLEAN | Soft delete flag (NULL or false = active) |
| `created_at` | TIMESTAMP | When evidence was created |

**Key Points:**
- Evidence can have `content` (text), `file_url` (attachment), or both
- **systematic_step_primary**: Follows the scientific method for Australian RDTI compliance
- **soft_deleted**: Items are never hard-deleted, only flagged for filtering
- **source**: Tracks how evidence entered the system for audit purposes

---

## Data Flow & User Journey

### 1. Project Creation Flow

**User Actions:**
1. User visits homepage → clicks "Start your first project"
2. Redirected to `/auth/login` (if not authenticated)
3. Enters email → receives magic link → clicks link → redirected to `/auth/callback` → session created
4. Redirected to `/admin/new-project`
5. Fills in project details:
   - Project name (e.g., "Mobile App Performance Optimization")
   - Tax year (e.g., "2024-2025")
   - Participant emails (comma-separated)

**Technical Flow:**
```
POST /api/admin/projects
├─ Extract { name, year, participants, owner_email } from request body
├─ Verify user authentication via Authorization header
├─ Generate project_token = crypto.randomBytes(24).toString('base64url')
├─ Generate inbound_email_local = 'p_' + crypto.randomBytes(5).toString('hex')
├─ Insert into Supabase 'projects' table with owner_id
└─ Return:
   ├─ timelineUrl: /p/{project_token}
   ├─ uploadUrl: /p/{project_token}/upload
   └─ inboundEmail: {inbound_email_local}@{PUBLIC_INBOUND_DOMAIN}
```

**Data Storage:**
```javascript
// Stored in projects table
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Mobile App Performance",
  year: "2024-2025",
  project_token: "Xy7mK3pQr8vN2hB9tL6fW1cD4eA5gH0j",
  inbound_email_local: "p_9a3f7e2b1c",
  participants: ["dev1@company.com", "dev2@company.com"],
  owner_id: "auth-user-uuid-here",
  created_at: "2024-10-01T10:30:00Z"
}
```

---

### 2. Evidence Collection - Quick Note

**User Actions:**
1. User visits `/p/{token}` (project timeline)
2. Sees project header with inbound email address
3. Fills quick note form:
   - Author email (optional)
   - Content (text)
4. Submits form

**Technical Flow:**
```
POST /api/evidence/{token}/add
├─ Extract { author_email, content, category } from request body
├─ Look up project by project_token
├─ Insert into 'evidence' table:
│  ├─ project_id (from lookup)
│  ├─ author_email
│  ├─ content
│  ├─ source: 'note'
│  └─ category (optional)
├─ Trigger AI classification (async, happens client-side later)
└─ Return { ok: true, id: evidence_id }
```

**Data Storage:**
```javascript
// Stored in evidence table
{
  id: "evidence-uuid-123",
  project_id: "550e8400-e29b-41d4-a716-446655440000",
  author_email: "dev1@company.com",
  content: "Implemented caching layer. Reduced API response time from 800ms to 120ms.",
  file_url: null,
  source: "note",
  category: null,
  systematic_step_primary: null, // Will be classified later
  systematic_step_source: null,
  classified_at: null,
  soft_deleted: false,
  created_at: "2024-10-01T14:22:00Z"
}
```

---

### 3. Evidence Collection - File Upload

**User Actions:**
1. User clicks "Upload file" or visits `/p/{token}/upload`
2. Selects file from computer
3. Optionally enters author email
4. Submits

**Technical Flow:**
```
POST /api/evidence/{token}/upload
├─ Parse FormData: file, author_email
├─ Look up project by project_token
├─ Upload file to Supabase Storage:
│  ├─ Bucket: 'evidence'
│  ├─ Path: {project_id}/{timestamp}_{filename}
│  └─ Example: "550e8400.../1696158120000_screenshot.png"
├─ Get public URL from storage
├─ Insert into 'evidence' table:
│  ├─ project_id
│  ├─ author_email
│  ├─ file_url (public URL)
│  └─ source: 'upload'
└─ Return { ok: true, url: public_url }
```

**Data Storage:**
```javascript
// File stored in Supabase Storage at:
// evidence/550e8400-e29b-41d4-a716-446655440000/1696158120000_performance-metrics.png

// Evidence record in database
{
  id: "evidence-uuid-456",
  project_id: "550e8400-e29b-41d4-a716-446655440000",
  author_email: "dev2@company.com",
  content: null,
  file_url: "https://xyz.supabase.co/storage/v1/object/public/evidence/550e8400.../1696158120000_performance-metrics.png",
  source: "upload",
  systematic_step_primary: null,
  created_at: "2024-10-01T15:45:00Z"
}
```

---

### 4. Evidence Collection - Inbound Email

**User Actions:**
1. Participant sends email to project's inbound address
   - To: `p_9a3f7e2b1c@yourdomain.com`
   - Subject: "Test results from yesterday"
   - Body: "Hypothesis confirmed: caching reduces load time by 85%"
   - Attachments: `test-results.csv`, `graph.png`

**Technical Flow:**
```
SendGrid Inbound Parse → POST /api/inbound/sendgrid
├─ Parse FormData from SendGrid:
│  ├─ to: "p_9a3f7e2b1c@yourdomain.com"
│  ├─ from: "dev1@company.com"
│  ├─ text: email body (plain text)
│  ├─ attachments: count
│  └─ attachment1, attachment2, ... (files)
├─ Extract local part: "p_9a3f7e2b1c"
├─ Look up project by inbound_email_local
├─ Insert email body as evidence:
│  ├─ project_id
│  ├─ author_email: from
│  ├─ content: text
│  └─ source: 'email'
├─ For each attachment:
│  ├─ Upload to Supabase Storage
│  └─ Insert as separate evidence item with file_url
└─ Return { ok: true }
```

**Data Storage:**
```javascript
// Email body stored as:
{
  id: "evidence-uuid-789",
  project_id: "550e8400...",
  author_email: "dev1@company.com",
  content: "Hypothesis confirmed: caching reduces load time by 85%",
  file_url: null,
  source: "email",
  created_at: "2024-10-02T09:15:00Z"
}

// Each attachment stored separately:
{
  id: "evidence-uuid-790",
  project_id: "550e8400...",
  author_email: "dev1@company.com",
  content: null,
  file_url: "https://xyz.supabase.co/.../test-results.csv",
  source: "email",
  created_at: "2024-10-02T09:15:00Z"
}
```

**External Configuration Required:**
- **SendGrid Inbound Parse Webhook**: Configure at `https://yourapp.com/api/inbound/sendgrid`
- **MX Records**: Point domain to SendGrid's mail servers
- **Domain Authentication**: Verify domain ownership in SendGrid

---

### 5. Evidence Collection - GitHub Sync (Automatic R&D Capture)

**Purpose:** Automatically capture R&D evidence from GitHub commits and pull requests with zero manual input.

**User Actions:**
1. User visits project settings (GitHub integration tab)
2. Clicks "Connect GitHub"
3. Authorizes OAuth app
4. Selects repository to sync
5. Clicks "Sync Now" (or runs automatically on schedule)

**Technical Flow:**
```
POST /api/projects/{token}/github/sync
├─ Fetch project GitHub access token from project_github_tokens
├─ Call lib/githubSync.syncGitHubData():
│  ├─ Fetch commits since last_synced_at (or 30 days if first sync)
│  ├─ Fetch pull requests since last_synced_at
│  ├─ Pre-filter commits with keyword-based R&D detection:
│  │  ├─ Keep if contains: perf, optimize, experiment, benchmark, investigate, etc.
│  │  ├─ Keep if has metrics: "40%", "2.3s", "150ms", etc.
│  │  ├─ Skip if contains: "fix typo", "update readme", "bump version", etc.
│  │  └─ Skip if message length < 15 chars
│  ├─ Pre-filter pull requests with same R&D heuristics
│  ├─ Check for duplicates via content_hash (SHA-256)
│  ├─ Bulk insert commits as evidence:
│  │  ├─ source: 'note'
│  │  ├─ content: commit message
│  │  └─ meta: {
│  │       type: 'commit',
│  │       sha: 'abc123...',
│  │       commit_url: 'https://github.com/...',
│  │       repo: 'owner/name',
│  │       files_changed: 5,
│  │       additions: 42,
│  │       deletions: 8,
│  │       committed_at: '2025-01-18T...'
│  │     }
│  ├─ Bulk insert pull requests as evidence:
│  │  ├─ source: 'note'
│  │  ├─ content: PR title + body
│  │  └─ meta: {
│  │       type: 'pr',
│  │       pr_number: 42,
│  │       pr_url: 'https://github.com/.../pull/42',
│  │       repo: 'owner/name',
│  │       state: 'merged',
│  │       merged: true,
│  │       files_changed: 12,
│  │       additions: 145,
│  │       deletions: 38,
│  │       pr_created_at: '2025-01-15T...'
│  │     }
│  ├─ Update github_repos.last_synced_at
│  └─ Trigger auto-link and auto-classify (existing system)
└─ Return { synced: 15, skipped: 8, reasons: {...} }
```

**R&D Keyword Filter (Zero AI Cost):**

The system uses a keyword-based heuristic to identify R&D work without AI API calls:

**Keep if contains:**
- Performance keywords: `perf`, `performance`, `optimize`, `benchmark`, `latency`, `throughput`
- Experimental keywords: `attempt`, `experiment`, `test`, `investigate`, `prototype`, `spike`
- Improvement keywords: `reduce`, `improve`, `faster`, `slower`, `measure`, `metric`
- Scientific keywords: `hypothesis`, `trial`, `evaluate`, `compare`, `alternative`

**Skip if contains:**
- Noise keywords: `fix typo`, `update readme`, `bump version`, `dependency update`, `merge pull request`
- Has metrics: Regular numbers with units (e.g., `40%`, `2.3s`, `150ms`)

**Content Hash Deduplication:**
- Each commit/PR gets a SHA-256 hash: `hash(content + type + identifier)`
- Before insert, checks if hash exists in project's evidence
- Skips exact duplicates silently
- Prevents re-syncing same commits/PRs

**Data Storage:**
```javascript
// Commit stored as evidence:
{
  id: "evidence-uuid-123",
  project_id: "550e8400...",
  author_email: "dev@company.com",
  content: "perf: optimize database query, reduced latency from 2.3s to 0.8s",
  file_url: null,
  source: "note",
  meta: {
    type: "commit",
    sha: "abc123def456...",
    commit_url: "https://github.com/owner/repo/commit/abc123...",
    repo: "owner/repo",
    files_changed: 3,
    additions: 45,
    deletions: 12,
    committed_at: "2025-01-18T10:30:00Z"
  },
  content_hash: "f3a2b1c...",
  systematic_step_primary: null, // Will be classified later
  created_at: "2025-01-18T10:30:00Z"
}

// Pull request stored as evidence:
{
  id: "evidence-uuid-456",
  project_id: "550e8400...",
  author_email: "dev@company.com",
  content: "Investigate Redis caching layer\n\nBenchmarked three approaches...",
  file_url: null,
  source: "note",
  meta: {
    type: "pr",
    pr_number: 42,
    pr_url: "https://github.com/owner/repo/pull/42",
    repo: "owner/repo",
    state: "merged",
    merged: true,
    files_changed: 8,
    additions: 125,
    deletions: 34,
    pr_created_at: "2025-01-15T14:00:00Z"
  },
  content_hash: "c4d5e6f...",
  systematic_step_primary: null,
  created_at: "2025-01-15T14:00:00Z"
}
```

**GitHub OAuth Flow:**
```
1. User clicks "Connect GitHub"
   → GET /api/github/auth/start?project_token=ABC
   → Redirect to GitHub OAuth

2. GitHub OAuth consent screen
   → User authorizes app (scope: repo)

3. GitHub redirects back
   → GET /api/github/auth/callback?code=...&state=ABC
   → Exchange code for access token
   → Store in project_github_tokens table (encrypted)

4. User selects repository
   → GET /api/projects/{token}/github/repos
   → Returns list of accessible repos

5. User clicks "Sync Now"
   → POST /api/projects/{token}/github/sync
   → Runs syncGitHubData() as described above
```

**Database Tables (GitHub Integration):**

```sql
-- Repository connections
CREATE TABLE github_repos (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  repo_owner TEXT,
  repo_name TEXT,
  last_synced_at TIMESTAMPTZ,
  last_synced_sha TEXT,
  created_at TIMESTAMPTZ,
  UNIQUE(project_id, repo_owner, repo_name)
);

-- OAuth tokens (encrypted at rest by Supabase)
CREATE TABLE project_github_tokens (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) UNIQUE,
  access_token TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Benefits:**
- **Zero manual input**: Evidence flows automatically from version control
- **Zero AI cost**: Keyword filtering is deterministic and free
- **Contemporaneous**: Evidence timestamped at commit/PR time
- **Traceable**: Each item links back to GitHub URL
- **Deduplicated**: Content hash prevents double-counting
- **Filtered**: Only R&D work captured, noise discarded

**Sync Statistics Example:**
```
[githubSync] Sync complete:
- Commits fetched: 25
- PRs fetched: 8
- Total synced: 15
- Total skipped: 18
  - not_rd: 12 (filtered as noise)
  - duplicate: 4 (already in database)
  - too_short: 2 (message < 15 chars)
```

---

### 6. AI Evidence Classification

**Purpose:** Automatically classify evidence into Australian RDTI systematic progression steps:
- Hypothesis
- Experiment
- Observation
- Evaluation
- Conclusion
- Unknown (if unclear or non-R&D)

**Technical Flow:**
```
POST /api/classify?id={evidence_id}
├─ Fetch evidence from database
├─ Check if already classified (idempotent) → return cached if yes
├─ Check if manually classified → skip AI
├─ Sanitize content:
│  ├─ Strip HTML tags
│  ├─ Remove email signatures
│  ├─ Remove quoted replies (>)
│  └─ Collapse whitespace
├─ Validate content length (>10 chars)
├─ Call OpenAI API:
│  ├─ Model: gpt-4o-mini
│  ├─ Prompt: Classification instructions for RDTI compliance
│  └─ Response format: {"step":"Hypothesis","confidence":0.85}
├─ Apply confidence threshold (0.7):
│  └─ If confidence < 0.7 → set step to 'Unknown'
├─ Update evidence table:
│  ├─ systematic_step_primary: classified step
│  ├─ systematic_step_source: 'auto'
│  └─ classified_at: timestamp
└─ Return { ok: true, step, confidence }
```

**Example Classification:**
```javascript
// Input content
"We tested three different cache strategies: Redis, Memcached, and in-memory.
Redis showed 95% hit rate vs 82% for Memcached."

// OpenAI Response
{
  step: "Experiment",
  confidence: 0.92
}

// Updated database record
{
  ...existing fields,
  systematic_step_primary: "Experiment",
  systematic_step_source: "auto",
  classified_at: "2024-10-02T10:30:00Z"
}
```

**Manual Override:**
Users can re-classify evidence via UI kebab menu → triggers:
```
PATCH /api/evidence/{token}/set-step
└─ Updates systematic_step_primary and sets systematic_step_source: 'manual'
```

---

### 6. Viewing Evidence Timeline

**User Actions:**
1. User visits `/p/{token}`
2. If not authenticated → shown login form to join project
3. If authenticated → sees timeline with all evidence

**Technical Flow:**
```
GET /p/{token} (Server Component)
├─ Look up project by project_token
├─ Fetch all evidence for project_id
│  └─ Filter: soft_deleted IS NULL OR soft_deleted = false
│  └─ Order by: created_at DESC
├─ Fetch step counts (for gap hint)
├─ Render AuthenticatedTimeline with:
│  ├─ Project details
│  ├─ Evidence items
│  └─ Token
└─ Client component handles:
   ├─ Real-time step updates
   ├─ Soft deletion (optimistic UI)
   └─ Classification triggers
```

**Data Displayed Per Evidence Item:**
- Date & time
- Source badge (Note/Upload/Email)
- Author email
- Content (if present)
- File attachment link (if present)
- Category badge (if present)
- Systematic step badge with icon:
  - 🖥️ = Auto-classified
  - 👤 = Manually classified
- Kebab menu (⋮) for re-classify/delete

---

### 7. R&D Claim Export (Automatic Document Generation)

**Purpose:** Generate audit-ready R&D claim documents on-demand with zero manual effort.

**User Actions:**
1. Navigate to `/api/projects/{token}/export-rd` (or click "Export R&D Claim" button)
2. File downloads automatically as plain text: `rd-claim-ProjectName-2024.txt`
3. Open in text editor
4. Copy/paste sections into RDTI claim document

**Technical Flow:**
```
GET /api/projects/{token}/export-rd
├─ Verify user authentication + project access
├─ Fetch core activities with activity_narratives
│  └─ Filter to confidence = 'high' only
├─ Fetch all evidence for project
│  └─ Group by linked_activity_id
├─ Count evidence types (total, Git, manual)
├─ Build plain text document:
│  ├─ Header (project name, year, generation date)
│  ├─ Core Activities section:
│  │  └─ For each activity:
│  │     ├─ Activity name
│  │     ├─ Technical uncertainty
│  │     ├─ R&D narrative (from activity_narratives)
│  │     ├─ Evidence summary (counts by type)
│  │     └─ Missing steps warning (if any)
│  ├─ Contemporaneous Evidence Statement
│  │  └─ Statutory disclaimer citing ITAA 1997 s 355-25
│  └─ Evidence sources list
└─ Return as downloadable .txt file
```

**Generated Document Structure:**
```
R&D Tax Incentive Claim - ClaimFlow
Financial Year: 2024
Generated: 2025-01-18

================================================================================

CORE R&D ACTIVITIES

1. Invoice Processing Latency Optimization
--------------------------------------------------------------------------------

Technical Uncertainty:
Whether batched database inserts can reduce invoice processing latency to <1s
while maintaining data integrity and ACID compliance.

R&D Narrative:
Initial experiments [2025-01-10] investigated three batching approaches:
single-transaction bulk insert, parallel batched inserts, and async queue-based
processing. Benchmarking revealed single-transaction approach achieved 65%
latency reduction (2.3s → 0.8s) but failed rollback testing. Subsequent
iterations [2025-01-15] implemented compensating transactions, achieving
target <1s latency with full ACID compliance. Final validation [2025-01-18]
confirmed 1000+ invoice batch processing under 850ms average.

Evidence Summary:
- Total evidence items: 18
- Git commits/PRs: 12
- Manual notes: 6

*Note: Missing systematic steps - Conclusion*

2. Redis Caching Layer Integration
--------------------------------------------------------------------------------
[... additional activities ...]

================================================================================

CONTEMPORANEOUS EVIDENCE STATEMENT

All evidence referenced in this document was automatically captured and
contemporaneously recorded in ClaimFlow at the time
activities were conducted. This demonstrates systematic progression of
R&D work in accordance with ITAA 1997 s 355-25.

Evidence sources include:
- Version control commits and pull requests
- Engineering notes and documentation
- Email correspondence
- File uploads and attachments

All evidence items are timestamped and traceable to their original sources.
```

**Key Features:**
- **High-confidence only**: Filters to narratives with `confidence = 'high'`
- **Evidence counts**: Shows total, Git, and manual evidence separately
- **Statutory compliance**: Includes ITAA 1997 s 355-25 citation
- **Audit trail**: Declares contemporaneous capture
- **Copy-pasteable**: Plain text format for easy integration
- **Missing steps warning**: Highlights gaps in systematic progression

**API Endpoint:**
```
GET /api/projects/{token}/export-rd
```

**Response:**
```
Content-Type: text/plain; charset=utf-8
Content-Disposition: attachment; filename="rd-claim-ProjectName-2024.txt"

[File contents as shown above]
```

**Error Handling:**
- No activities → Returns message: "No high-confidence R&D narratives available yet"
- No narratives → Same message with suggestion to process evidence
- Auth failure → 403 Forbidden
- Project not found → 403 Forbidden

---

### 8. Claim Pack Generation (Legacy PDF Format)

**User Actions:**
1. User visits `/p/{token}/pack`
2. Sees formatted document organized by R&D categories
3. Clicks "Print this pack" → browser print dialog → Save as PDF

**Technical Flow:**
```
GET /p/{token}/pack (Server Component)
├─ Look up project by project_token
├─ Fetch all non-deleted evidence
├─ Group evidence by category field
├─ Render structured document:
│  ├─ Title page (project name, year, generation date)
│  ├─ Summary (total evidence count)
│  ├─ 9 predefined R&D sections:
│  │  ├─ Project scope & eligibility
│  │  ├─ Technical uncertainty & hypothesis
│  │  ├─ Systematic experiments & iterations
│  │  ├─ Supporting activities
│  │  ├─ Personnel & time linkage
│  │  ├─ Costs & invoices
│  │  ├─ Constraints & risks
│  │  ├─ Governance & approvals
│  │  └─ Evidence → claim mapping
│  ├─ Uncategorised section (for items without category)
│  └─ Footer
└─ Apply print CSS:
   ├─ Hide header/navigation
   ├─ Page break rules
   └─ Professional typography
```

**R&D Categories (Predefined):**
```javascript
const SECTIONS = [
  ['project_scope', 'Project identification & eligibility'],
  ['hypothesis', 'Technical uncertainty & hypothesis'],
  ['experiment', 'Systematic experiments, iterations & results'],
  ['supporting', 'Supporting activities (direct nexus)'],
  ['people_time', 'Personnel & time linkage'],
  ['costs', 'Costs, invoices & apportionment'],
  ['risks', 'Constraints, risks & trade-offs'],
  ['governance', 'Governance, reviews & approvals'],
  ['mapping', 'Evidence → claim mapping']
];
```

**Generated PDF Structure:**
```
R&D Evidence Pack
Mobile App Performance
Tax Year 2024-2025

Summary
├─ Total evidence items: 47

Project identification & eligibility
├─ [Empty or contains categorized evidence]

Technical uncertainty & hypothesis
├─ Oct 1, 2024 • dev1@company.com
│  └─ "Unclear if caching can reduce API calls by 80%..."
├─ Oct 2, 2024 • dev2@company.com
│  └─ 📎 Attachment: hypothesis-doc.pdf

[... other sections ...]

Uncategorised Evidence
├─ Oct 15, 2024 • dev3@company.com
│  └─ "Quick update on progress..."
```

---

### 8. Email Nudges (Periodic Reminders)

**Purpose:** Send periodic reminder emails to all project participants asking for evidence updates.

**Technical Flow:**
```
GET /api/cron/nudge (triggered by cron job or manual access)
├─ Fetch ALL projects from database
├─ For each project:
│  └─ For each participant email:
│     └─ Queue email via SendGrid:
│        ├─ to: participant email
│        ├─ from: FROM_EMAIL env var
│        ├─ replyTo: {inbound_email_local}@{domain}
│        ├─ subject: "[{project_name}] Quick R&D check-in"
│        └─ body:
│           "What experiment or technical hurdle did you touch since last prompt?
│            Reply to this email with 1-3 lines and any screenshots/logs.
│            Or post a quick note: {timeline_url}"
├─ Send all queued messages
└─ Return { sent: total_count }
```

**Example Nudge Email:**
```
From: noreply@yourdomain.com
Reply-To: p_9a3f7e2b1c@yourdomain.com
To: dev1@company.com
Subject: [Mobile App Performance] Quick R&D check-in

What experiment or technical hurdle did you touch since last prompt?

Reply to this email with 1-3 lines and any screenshots/logs.

Or post a quick note: https://yourapp.com/p/Xy7mK3pQr8vN2hB9tL6fW1cD4eA5gH0j
```

**Deployment Setup:**
- Vercel Cron: Add to `vercel.json` to run daily
- Or manual curl: `curl -X GET https://yourapp.com/api/cron/nudge`

---

### 9. Evidence Management (Delete/Re-classify)

**Soft Delete:**
```
DELETE /api/evidence/{token}/delete
├─ Verify project_token and evidence ownership
├─ Update evidence.soft_deleted = true
└─ UI optimistically removes from timeline
```

**Manual Re-classification:**
```
PATCH /api/evidence/{token}/set-step
├─ Accept { evidence_id, step }
├─ Validate step is in: Hypothesis/Experiment/Observation/Evaluation/Conclusion/Unknown
├─ Update:
│  ├─ systematic_step_primary = step
│  ├─ systematic_step_source = 'manual'
│  └─ classified_at = now
└─ UI optimistically updates badge
```

**Step Gap Hint:**
```
GET /api/evidence/{token}/step-counts
├─ Fetch all evidence for project
├─ Count occurrences of each step (excluding 'Unknown')
├─ Return { hypothesis: 5, experiment: 12, observation: 8, evaluation: 3, conclusion: 2 }
└─ UI shows: "Missing: Evaluation, Conclusion" if counts are zero
```

---

## Authentication & Access Control

### Magic Link Flow

**Supabase Auth** handles passwordless authentication:

1. **User Login/Signup:**
```javascript
supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: `${origin}/auth/callback?project_token={token}`
  }
})
```

2. **Email Sent:**
   - Supabase sends magic link email
   - User clicks link → redirected to `/auth/callback`

3. **Callback Handling:**
```javascript
// /auth/callback/page.jsx
supabase.auth.exchangeCodeForSession(code)
├─ Create session
├─ Check if project_token in query params
├─ If yes → add user to participants → redirect to /p/{token}
└─ If no → redirect to /admin/new-project or dashboard
```

### Project Access Control

**Row Level Security (RLS) in Supabase:**
- Projects table: Users can only read projects they own or are participants in
- Evidence table: Users can read evidence for projects they have access to

**Current Implementation:**
- Public timeline access via `project_token` (anyone with link can view)
- Auth required for:
  - Creating new projects
  - Joining existing projects (adds to participants array)
  - Future: Admin features, editing, analytics

---

## External Integrations

### 1. Supabase

**Database:**
- PostgreSQL with automatic backups
- Connection via `@supabase/supabase-js` client
- Two modes:
  - **supabaseAdmin**: Server-side with service role key (full access)
  - **supabaseClient**: Client-side with anon key (RLS enforced)

**Storage:**
- Bucket: `evidence`
- Public access enabled
- Path structure: `{project_id}/{timestamp}_{filename}`
- Max file size: Configurable in Supabase dashboard

**Authentication:**
- Magic link email provider
- Session management with auto-refresh
- Rate limiting: 5 emails per hour per address

**Environment Variables:**
```env
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_KEY=eyJhb... (server-side only)
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb... (client-side safe)
```

### 2. SendGrid

**Outbound Email (Nudges):**
```javascript
sgMail.send({
  to: 'participant@example.com',
  from: process.env.FROM_EMAIL,
  replyTo: 'p_xxx@domain.com',
  subject: 'R&D check-in',
  text: 'Message body...'
})
```

**Inbound Email Parsing:**
- SendGrid Parse webhook configured to POST to `/api/inbound/sendgrid`
- Sends FormData with:
  - `to`, `from`, `subject`, `text`, `html`
  - `attachments` (count)
  - `attachment1`, `attachment2`, ... (File objects)

**Environment Variables:**
```env
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=noreply@yourdomain.com
PUBLIC_INBOUND_DOMAIN=yourdomain.com
```

**DNS Configuration:**
```
MX Record: @ → mx.sendgrid.net (priority 10)
Inbound Parse: yourdomain.com → https://yourapp.com/api/inbound/sendgrid
```

### 3. OpenAI (Optional)

**Evidence Classification:**
- Model: `gpt-4o-mini`
- Endpoint: `https://api.openai.com/v1/chat/completions`
- Timeout: 10 seconds
- Fallback: Returns 'Unknown' on error

**Environment Variable:**
```env
OPENAI_API_KEY=sk-xxx (optional)
```

**Cost Optimization:**
- Only classifies text evidence
- Idempotent (checks `classified_at` to avoid re-classification)
- Respects manual overrides (skips if `systematic_step_source = 'manual'`)

---

## Key System Features

### 1. Real-time Evidence Collection
- Multiple input methods (web form, file upload, email)
- No friction - participants can email from anywhere
- All evidence timestamped and attributed

### 2. AI-Powered Classification
- Automatic categorization into RDTI compliance steps
- Manual override capability
- Gap detection (missing steps highlighted)

### 3. Claim Pack Automation
- Pre-formatted PDF generation
- Evidence organized by R&D categories
- Print-optimized styling
- Professional document layout

### 4. Email Integration
- Unique inbox per project
- Automatic parsing of email body + attachments
- Periodic nudge reminders to keep evidence flowing

### 5. Soft Deletion
- Evidence never permanently deleted
- Supports audit trail
- Can be recovered if needed

### 6. Optimistic UI
- Immediate feedback on user actions
- Background API calls don't block interface
- Better perceived performance

---

## Security Architecture (Updated January 2025)

### Overview
ClaimFlow now implements a **defense-in-depth** security model with multiple layers of protection. See [SECURITY_FIXES.md](SECURITY_FIXES.md) and [AUTHENTICATION_ADDED.md](AUTHENTICATION_ADDED.md) for complete details.

### 1. Authentication & Authorization

**Authentication Model:**
- Supabase Auth with magic link email authentication
- JWT-based session tokens with auto-refresh
- Bearer token required for all API requests

**Authorization Model:**
- **Participant-based access control**: Users must be in project's `participants` array
- **Server-side verification**: All routes verify user identity + project access
- **No public write access**: All evidence mutations require authentication

**Implementation:**
```javascript
// lib/serverAuth.js provides:
verifyUserAndProjectAccess(req, projectToken)
├─ Authenticates user via Bearer token
├─ Verifies user.email in project.participants
└─ Returns { user, project, error }

// Used in all protected routes:
POST /api/evidence/[token]/add
POST /api/evidence/[token]/upload
DELETE /api/evidence/[token]/delete
```

**Protected Routes:**
| Route | Method | Auth Required | Authorization |
|-------|--------|---------------|---------------|
| `/api/evidence/[token]/add` | POST | ✅ Yes | Must be participant |
| `/api/evidence/[token]/upload` | POST | ✅ Yes | Must be participant |
| `/api/evidence/[token]/delete` | DELETE | ✅ Yes | Must be participant |
| `/api/admin/projects` | POST | ✅ Yes | Authenticated user |
| `/api/projects` | GET | ✅ Yes | Own projects only |
| `/api/cron/nudge` | GET | ✅ Yes | CRON_SECRET required |
| `/api/cron/process-narratives` | POST | ✅ Yes | CRON_SECRET required |
| `/api/inbound/sendgrid` | POST | ✅ Yes | Webhook signature |

### 2. File Upload Security

**Multi-Layer Validation:**
1. **File size limits:**
   - Evidence files: 10MB maximum
   - Payroll files: 25MB maximum
   - Email attachments: 10MB maximum

2. **MIME type whitelisting:**
   ```javascript
   Allowed types:
   - Images: PNG, JPEG, GIF, WebP
   - Documents: PDF
   - Spreadsheets: CSV, XLS, XLSX
   - Text: Plain text
   ```

3. **Magic byte verification:**
   - Reads first 12 bytes of file
   - Validates file signature matches declared MIME type
   - Prevents MIME type spoofing attacks

4. **Filename sanitization:**
   - Removes path traversal sequences (`../`, `..\\`)
   - Strips special characters
   - Prevents hidden files (removes leading dots)
   - Enforces 255 character maximum

**Implementation:**
```javascript
// lib/serverAuth.js
validateFileUpload(file, options)
├─ Check file.size ≤ maxSizeMB
├─ Verify MIME type in allowedMimeTypes
├─ Read magic bytes and verify signature
└─ Return { valid: true/false, error: string }

sanitizeFilename(filename)
├─ Remove slashes and parent references
├─ Replace special chars with underscore
├─ Truncate to 255 chars
└─ Return safe filename
```

### 3. Webhook Security

**SendGrid Inbound Email Protection:**
- HMAC signature verification using `SENDGRID_WEBHOOK_SECRET`
- Timestamp validation (10-minute window to prevent replay attacks)
- Fails closed in production (rejects unsigned webhooks)

**Implementation:**
```javascript
POST /api/inbound/sendgrid
├─ Extract signature and timestamp from headers
├─ Verify timestamp is within 10 minutes
├─ Compute HMAC-SHA256(timestamp + body, secret)
├─ Compare with provided signature (constant-time)
└─ Reject if invalid (403 Forbidden)
```

**Configuration Required:**
```env
SENDGRID_WEBHOOK_SECRET=<base64-secret>
```

SendGrid Dashboard:
- Settings → Inbound Parse → Enable signature verification
- Enter webhook secret

### 4. CSRF Protection (Cron Endpoints)

**Bearer Token Authentication:**
- All cron endpoints require `Authorization: Bearer <CRON_SECRET>` header
- Constant-time comparison prevents timing attacks
- Fails closed in production (rejects unauthenticated requests)

**Protected Endpoints:**
```javascript
GET  /api/cron/nudge
POST /api/cron/process-narratives
```

**Configuration:**
```env
CRON_SECRET=<base64-secret>
```

**Usage:**
```bash
# Vercel Cron (automatic)
curl https://yourapp.com/api/cron/nudge \
  -H "Authorization: Bearer <CRON_SECRET>"
```

### 5. Rate Limiting

**Current Implementation:**
- Supabase Auth: 5 magic links per hour per email
- SendGrid: Configurable sending limits
- In-memory rate limiting framework ready (not yet enforced)

**Future Enhancement:**
```javascript
// lib/serverAuth.js provides:
checkRateLimit(key, maxRequests, windowMs)
// Ready for Redis integration in production
```

### 6. Data Privacy & Access Control

**Current Model:**
- **Project data**: Visible only to participants
- **Evidence**: Scoped to project participants
- **File storage**: Public URLs (authenticated routes required to get URLs)
- **Sessions**: HttpOnly cookies, auto-refresh tokens

**Row Level Security (RLS) - TODO:**
```sql
-- Required before production (see SECURITY_FIXES.md)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
-- + policies for each table
```

### 7. Input Validation & Sanitization

**API Request Validation:**
- All routes validate required fields
- Type checking on inputs
- Email format validation
- Content length limits on text fields

**SQL Injection Protection:**
- Supabase client uses parameterized queries
- No raw SQL with user input

**XSS Protection:**
- React auto-escapes all rendered content
- No `dangerouslySetInnerHTML` usage
- File URLs sanitized before storage

**Path Traversal Protection:**
- All filenames sanitized via `sanitizeFilename()`
- Storage paths use UUIDs, not user input

### 8. Security Headers (TODO)

**Recommended Headers:**
```javascript
// next.config.js
headers: [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline';"
  }
]
```

### 9. Secrets Management

**Environment Variables:**
```env
# Database
SUPABASE_URL=<url>
SUPABASE_SERVICE_KEY=<service-key>
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Security (NEW - Required for production)
SENDGRID_WEBHOOK_SECRET=<base64-secret>
CRON_SECRET=<base64-secret>

# Email
SENDGRID_API_KEY=<api-key>
FROM_EMAIL=<email>
PUBLIC_INBOUND_DOMAIN=<domain>

# AI
OPENAI_API_KEY=<api-key>
```

**Best Practices:**
- Never commit `.env.local` to git (verified in `.gitignore`)
- Rotate all keys regularly
- Use different keys for dev/staging/production
- Store production secrets in Vercel environment variables

### 10. Audit Logging

**Current Implementation:**
- All security events logged to console
- Timestamps on all database records
- Soft deletion preserves audit trail

**Logged Events:**
```javascript
// Authentication failures
[Evidence/Add] Access denied: User not authorized

// Webhook rejections
[Inbound] Invalid SendGrid webhook signature

// Cron abuse attempts
[Cron/Nudge] Unauthorized access attempt

// File validation failures
[Inbound] Skipping invalid attachment: File too large
```

### 11. Known Security Gaps (TODO Before Production)

**CRITICAL:**
1. ❌ **Missing RLS Policies**: Database tables lack Row Level Security
   - Impact: Service role key bypasses application security
   - Fix: See SECURITY_FIXES.md for SQL migration

2. ❌ **API Keys in .env.local**: Production keys need rotation
   - Impact: If committed to git, keys are compromised
   - Fix: Rotate all keys in Supabase, SendGrid, OpenAI

**IMPORTANT:**
3. ⚠️ **Service Role Overuse**: 30+ routes use admin client
   - Impact: Bypasses RLS even when added
   - Fix: Migrate to user-scoped Supabase client

4. ⚠️ **No Rate Limiting on APIs**: Potential DoS vulnerability
   - Impact: Abuse could exhaust resources
   - Fix: Implement rate limiting on public routes

### 12. Security Utilities

**lib/serverAuth.js** provides:
```javascript
// Authentication
getAuthenticatedUser(req)
verifyProjectAccess(token, userEmail)
verifyUserAndProjectAccess(req, projectToken)

// Authorization
verifyCronSecret(req)

// File validation
validateFileUpload(file, options)
sanitizeFilename(filename)
verifyMagicBytes(bytes, mimeType)

// Rate limiting
checkRateLimit(key, maxRequests, windowMs)
```

### 13. Security Testing Checklist

**Before Production Deploy:**
- [ ] Rotate all API keys (Supabase, SendGrid, OpenAI)
- [ ] Verify `.env.local` not in git history
- [ ] Add `SENDGRID_WEBHOOK_SECRET` to environment
- [ ] Add `CRON_SECRET` to environment
- [ ] Configure SendGrid webhook signature verification
- [ ] Implement RLS policies on all tables
- [ ] Test authentication on evidence routes
- [ ] Test webhook signature validation
- [ ] Test cron endpoint protection
- [ ] Test file upload validation (malware, size, type)
- [ ] Verify error messages don't leak sensitive data
- [ ] Check security headers are set
- [ ] Review all console.error() for info disclosure

---

## Security Incident Response

**If Security Issue Detected:**

1. **Immediate Actions:**
   - Rotate compromised API keys
   - Review access logs for suspicious activity
   - Disable affected endpoints if necessary

2. **Investigation:**
   - Check Supabase dashboard for unusual queries
   - Review SendGrid activity logs
   - Examine Vercel function logs
   - Check file storage for malicious uploads

3. **Remediation:**
   - Apply security patches
   - Update documentation
   - Notify affected users if data breach
   - Implement additional controls

4. **Post-Incident:**
   - Conduct root cause analysis
   - Update security documentation
   - Add monitoring/alerting for similar issues

---

## Security Compliance

**Australian R&D Tax Incentive Requirements:**
- Evidence must be authentic and attributable
- Audit trail required for all evidence
- Secure storage of sensitive business information
- Compliance with Australian Privacy Principles (APP)

**ClaimFlow Implementation:**
- ✅ All evidence timestamped and attributed
- ✅ Soft deletion maintains audit trail
- ✅ Authentication ensures attributable contributions
- ✅ Encryption in transit (HTTPS)
- ⚠️ Encryption at rest (via Supabase)
- ⚠️ Data residency controls (Supabase region)

---

## Deployment Architecture

### Hosting: Vercel (or similar)
```
Production: yourapp.com
├─ /api/* → Edge Functions (auto-deployed from Next.js)
├─ /p/{token} → Server-rendered pages
└─ Static assets → CDN

Database: Supabase
├─ PostgreSQL (projects, evidence tables)
└─ Storage (evidence files)

Email: SendGrid
├─ Outbound: Nudge emails
└─ Inbound: Parse webhook → /api/inbound/sendgrid

AI: OpenAI
└─ Classification API calls
```

### Environment Configuration

**Updated for Security (January 2025)**

```env
# Database
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_KEY=service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key

# Application
NEXT_PUBLIC_BASE=https://yourapp.com
PUBLIC_INBOUND_DOMAIN=yourapp.com
NEXT_PUBLIC_APP_URL=https://yourapp.com

# Email
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=noreply@yourapp.com

# Security (NEW - Required for production)
SENDGRID_WEBHOOK_SECRET=<generate with: openssl rand -base64 32>
CRON_SECRET=<generate with: openssl rand -base64 32>

# AI (optional)
OPENAI_API_KEY=sk-xxx
```

**Generating Secrets:**
```bash
# Generate SendGrid webhook secret
openssl rand -base64 32

# Generate cron protection secret
openssl rand -base64 32
```

**Vercel Configuration:**
1. Go to Project Settings → Environment Variables
2. Add both `SENDGRID_WEBHOOK_SECRET` and `CRON_SECRET`
3. Select all environments (Production, Preview, Development)
4. Save and redeploy

---

## Complete User Journey Example

### Scenario: A small dev team building an AI chatbot

**Day 1 - Project Setup:**
1. Project lead visits ClaimFlow.com
2. Clicks "Start your first project"
3. Authenticates via magic link (dev-lead@company.com)
4. Creates project:
   - Name: "AI Chatbot Performance Optimization"
   - Year: "2024-2025"
   - Participants: dev1@company.com, dev2@company.com, dev3@company.com
5. Receives:
   - Timeline URL: `/p/Xy7mK3...`
   - Inbound email: `p_9a3f7e@claimflow.com`
6. Shares timeline URL + inbound email in team Slack

**Day 2 - Evidence Starts Flowing:**
1. Dev1 replies to nudge email:
   ```
   To: p_9a3f7e@claimflow.com
   Subject: Progress update
   Body: "Tested 3 NLP models. BERT shows 15% better accuracy than GPT-2 on our dataset."
   Attachment: comparison-chart.png
   ```
   → **2 evidence items created** (email body + attachment)

2. Dev2 uploads screenshot via web:
   - Visits `/p/Xy7mK3.../upload`
   - Uploads `error-logs.txt`
   → **1 evidence item created**

3. Dev3 adds quick note:
   - Visits `/p/Xy7mK3...`
   - Fills quick note form: "Initial hypothesis: Can we reduce response latency to <200ms?"
   → **1 evidence item created**

**Day 5 - AI Classification Runs:**
- Background job or manual trigger classifies all evidence:
  - "Tested 3 NLP models..." → **Experiment** (confidence: 0.92)
  - "Initial hypothesis..." → **Hypothesis** (confidence: 0.88)
  - comparison-chart.png → **Unknown** (no text content)

**Day 30 - Timeline Review:**
- Project lead visits `/p/Xy7mK3...`
- Sees 47 evidence items
- Gap hint shows: "Missing: Conclusion"
- Manually re-classifies 3 items that were auto-classified incorrectly

**End of Tax Year - Claim Pack:**
1. Visits `/p/Xy7mK3.../pack`
2. Reviews formatted document with evidence organized into 9 R&D categories
3. Clicks "Print this pack"
4. Saves as PDF: `AI-Chatbot-RD-Evidence-2024-2025.pdf`
5. Submits to accountant for tax filing

**Ongoing - Nudge Emails:**
- Every week, cron job runs → all 3 devs receive email reminder
- Devs reply directly from Gmail/Outlook → evidence automatically added

---

## Technical Implementation Details

### File Naming Conventions
```
projects table: projects
evidence table: evidence
storage bucket: evidence

API routes (Updated January 18, 2025):
POST   /api/admin/projects       → Create project (🔒 Auth required)
GET    /api/projects             → List user's projects (🔒 Auth required)
DELETE /api/projects/delete      → Soft delete project (🔒 Auth required)

POST   /api/evidence/{token}/add → Add text note (🔒 Auth + Participant)
POST   /api/evidence/{token}/upload → Upload file (🔒 Auth + Participant)
DELETE /api/evidence/{token}/delete → Soft delete (🔒 Auth + Participant)
PATCH  /api/evidence/{token}/set-step → Manual classification
GET    /api/evidence/{token}/step-counts → Count steps

POST   /api/inbound/sendgrid     → Receive email (🔒 Webhook signature)
GET    /api/cron/nudge           → Send reminders (🔒 CRON_SECRET)
POST   /api/cron/process-narratives → Generate narratives (🔒 CRON_SECRET)

POST   /api/classify?id={id}     → Classify evidence
GET    /api/evidence/auto-link   → Link evidence to activities

GET    /api/github/auth/start    → Start GitHub OAuth (🔒 Auth required)
GET    /api/github/auth/callback → Handle OAuth callback
GET    /api/projects/{token}/github/repos → List accessible repos (🔒 Auth + Participant)
POST   /api/projects/{token}/github/sync → Sync commits + PRs (🔒 Auth + Participant)
GET    /api/projects/{token}/github/connect → Connection status (🔒 Auth + Participant)
POST   /api/projects/{token}/github/disconnect → Disconnect repo (🔒 Auth + Participant)

GET    /api/projects/{token}/export-rd → Export R&D claim (🔒 Auth + Participant) [NEW]

🔒 = Authentication/authorization required (see Security Architecture)
```

### Database Queries (Common Patterns)

**Fetch Project Timeline:**
```sql
SELECT * FROM evidence
WHERE project_id = $1
  AND (soft_deleted IS NULL OR soft_deleted = false)
ORDER BY created_at DESC;
```

**Fetch Evidence for Classification:**
```sql
SELECT id, content, systematic_step_primary, classified_at
FROM evidence
WHERE id = $1
  AND (classified_at IS NULL OR systematic_step_source != 'manual');
```

**Count Systematic Steps:**
```sql
SELECT systematic_step_primary, COUNT(*)
FROM evidence
WHERE project_id = $1
  AND (soft_deleted IS NULL OR soft_deleted = false)
  AND systematic_step_primary != 'Unknown'
GROUP BY systematic_step_primary;
```

### Error Handling

**API Routes:**
- All routes return `{ error: message }` with appropriate HTTP status
- Database errors logged to console (server-side)
- Client shows generic error messages (no sensitive info leaked)

**Classification:**
- OpenAI timeout → Returns 'Unknown'
- No API key → Returns 'Unknown'
- Invalid JSON response → Returns 'Unknown'
- Always updates database even on error (prevents retry loops)

**File Uploads:**
- Supabase storage error → Returns error to user
- Invalid file type → Currently allowed (no strict validation)
- File size limit → Handled by Supabase

---

## Performance Optimizations

1. **Server Components**: Timeline and claim pack use Next.js server components (no client JS for initial render)
2. **Optimistic UI**: Evidence deletion and re-classification update UI immediately
3. **Incremental Static Regeneration**: Not used (all pages dynamic due to auth)
4. **Database Indexing**:
   - Index on `projects.project_token` (lookup by URL)
   - Index on `projects.inbound_email_local` (email routing)
   - Index on `evidence.project_id` (fetch timeline)
5. **Caching**:
   - No application-level caching
   - Browser caching for static assets
   - Supabase connection pooling

---

## Future Enhancements (Not Yet Implemented)

1. **Participant Authentication**: Require login to view timelines (currently public with link)
2. **Rich Text Editor**: Support markdown/formatting in notes
3. **Bulk Classification**: Classify all project evidence at once
4. **Export Formats**: Word/Excel export (currently PDF only)
5. **Analytics Dashboard**: Evidence trends, participation stats
6. **Category Auto-tagging**: AI suggests R&D categories (not just steps)
7. **File Preview**: View images/PDFs inline (currently download-only)
8. **Search & Filter**: Filter evidence by date/author/step
9. **Webhooks**: Notify external systems when evidence added
10. **Multi-tenancy**: Separate workspaces for different companies

---

## Troubleshooting Guide

### Issue: Emails not arriving at project inbox

**Check:**
1. SendGrid MX records configured correctly
2. Inbound Parse webhook URL is correct
3. Check SendGrid dashboard for parsing errors
4. Verify `PUBLIC_INBOUND_DOMAIN` env var matches actual domain

### Issue: Magic link emails not sending

**Check:**
1. Supabase auth SMTP configured
2. Email rate limit not exceeded (5/hour)
3. Check spam folder
4. Verify `NEXT_PUBLIC_SUPABASE_URL` and anon key are correct

### Issue: Classification not working

**Check:**
1. `OPENAI_API_KEY` environment variable set
2. OpenAI account has credits
3. Check console logs for API errors
4. Verify evidence has `content` (not just file_url)

### Issue: File uploads failing

**Check:**
1. Supabase storage bucket `evidence` exists
2. Bucket has public read access
3. Service role key has storage permissions
4. File size under Supabase limits

---

## Summary

**ClaimFlow** is a specialized evidence management system designed for R&D tax compliance. It combines:

- **Multiple evidence inputs** (web, email, file upload)
- **AI-powered classification** (OpenAI for RDTI step categorization)
- **Automated claim pack generation** (print-ready PDFs)
- **Email integration** (unique inbox per project, automated nudges)
- **Passwordless auth** (Supabase magic links)

**Data flows from:**
```
User Input → API Routes → Supabase Database/Storage → Timeline Display → Claim Pack PDF
     ↓
Email Replies → SendGrid Parse → Evidence Storage
     ↓
AI Classification → Updated Step Labels
```

The system prioritizes **ease of use** (no friction for evidence collection) and **compliance** (RDTI-aligned categorization) to help small teams build strong R&D tax claims without administrative overhead.

---

## System Changelog

### Version 2.1 - Automatic R&D Evidence Engine (January 18, 2025)

**Major Features:**

1. **GitHub Pull Request Syncing**
   - Extended GitHub integration to capture PR titles + descriptions alongside commits
   - Stores PR metadata: number, URL, state, merged status, files changed
   - Same deduplication and R&D filtering as commits
   - File: `lib/githubSync.js` - Added `fetchGitHubPullRequests()`, `preFilterPullRequests()`, `bulkInsertPullRequests()`

2. **Keyword-Based R&D Filtering (Zero AI Cost)**
   - Deterministic keyword detection identifies R&D work without AI API calls
   - Filters ~60-70% of noise automatically (merge commits, typo fixes, dependency updates)
   - Keeps work with R&D signals: perf, optimize, experiment, benchmark, investigate
   - Keeps work with metrics: numbers with units (40%, 2.3s, 150ms)
   - File: `lib/githubSync.js` - Added `isLikelyRD()` function

3. **R&D Claim Export Endpoint**
   - On-demand generation of audit-ready claim documents
   - Plain text format with statutory ITAA 1997 s 355-25 citation
   - Filters to high-confidence narratives only
   - Counts evidence by type (total, Git commits/PRs, manual notes)
   - File: `app/api/projects/[token]/export-rd/route.js` (NEW)

4. **Timeline R&D Filter Toggle**
   - UI button to filter timeline to R&D evidence only
   - Shows only evidence linked to core activities
   - Displays filter count and status
   - File: `app/p/[token]/AuthenticatedTimeline.jsx` - Added showRdOnly state + filtering logic

**Technical Changes:**

- **lib/githubSync.js** (~240 lines added):
  - Renamed `syncCommits()` to `syncGitHubData()` (backwards compatible alias maintained)
  - Added PR fetching and filtering functions
  - Extended content hash deduplication to all evidence types
  - Enhanced sync logging with detailed skip reasons

- **app/api/projects/[token]/export-rd/route.js** (NEW, ~125 lines):
  - GET endpoint returns plain text download
  - Verifies authentication + participant access
  - Generates structured claim document with evidence counts
  - Includes statutory disclaimer for RDTI compliance

- **app/p/[token]/AuthenticatedTimeline.jsx** (~20 lines added):
  - Added `showRdOnly` toggle button
  - Filter chain: deleted → R&D (if enabled) → step filter
  - Visual feedback for filtered count

**New Features:**
- Zero-input R&D evidence capture from version control
- Automatic noise filtering (no manual review required)
- Export claim documents without manual assembly
- View R&D evidence separately from maintenance work

**Benefits:**
- **Zero AI cost**: Keyword filtering is deterministic and free
- **Zero new tables**: Reuses existing evidence + meta JSONB
- **Zero new cron jobs**: All processing inline during sync
- **Backwards compatible**: Old code continues to work
- **MVP lean**: Only essential features, no complexity

**Files Modified:**
- `lib/githubSync.js`
- `app/p/[token]/AuthenticatedTimeline.jsx`

**Files Added:**
- `app/api/projects/[token]/export-rd/route.js`

**Environment Variables:**
- No new environment variables required

**Migration Required:**
- None (backwards compatible)

**Known Limitations:**
- Keyword filtering is ~70% accurate (may miss some R&D, may include some noise)
- Content hash only catches exact duplicates (not near-duplicates)
- Export only includes activities with high-confidence narratives
- No GitHub Issues sync yet (PRs + commits only)

**Next Steps (Future Enhancements):**
- Add semantic deduplication (detect near-duplicate commits/notes)
- Add GitHub Issues sync
- Add AI-based R&D classification (replace keywords)
- Add automatic daily sync cron job
- Add confidence threshold filtering (discard <0.65)

---

### Version 2.0 - Security Hardening (January 17, 2025)

**Major Security Updates:**

1. **Authentication & Authorization System**
   - Added participant-based access control on all evidence routes
   - Implemented `lib/serverAuth.js` with comprehensive security utilities
   - Routes now verify user authentication + project participant status
   - Protected routes: evidence add, upload, delete

2. **File Upload Security**
   - Added file size limits (10MB evidence, 25MB payroll)
   - Implemented magic byte verification to prevent MIME spoofing
   - Added filename sanitization to prevent path traversal
   - Whitelisted file types with signature validation

3. **Webhook Security**
   - Added HMAC signature verification for SendGrid inbound emails
   - Timestamp validation (10-minute window) prevents replay attacks
   - Fails closed in production without `SENDGRID_WEBHOOK_SECRET`

4. **CSRF Protection**
   - Added Bearer token authentication to cron endpoints
   - Requires `CRON_SECRET` environment variable
   - Constant-time comparison prevents timing attacks

5. **New Environment Variables Required:**
   - `SENDGRID_WEBHOOK_SECRET` - For webhook signature verification
   - `CRON_SECRET` - For cron endpoint protection

**Files Added:**
- `lib/serverAuth.js` - Security utilities library
- `SECURITY_FIXES.md` - Comprehensive security audit report
- `AUTHENTICATION_ADDED.md` - Authentication implementation guide
- Updated `.env.example` with new security variables

**Files Modified:**
- `app/api/evidence/[token]/add/route.js` - Added auth check
- `app/api/evidence/[token]/upload/route.js` - Added auth + file validation
- `app/api/evidence/[token]/delete/route.js` - Added auth check
- `app/api/inbound/sendgrid/route.js` - Added webhook signature verification
- `app/api/cron/nudge/route.js` - Added CRON_SECRET check
- `app/api/cron/process-narratives/route.js` - Added CRON_SECRET check
- `app/api/projects/[token]/payroll/upload/route.js` - Added file validation

**Breaking Changes:**
- Evidence API routes now require `Authorization: Bearer <token>` header
- Frontend must include user session token in all evidence API calls
- Webhook endpoints reject unsigned requests in production
- Cron endpoints require Bearer token authentication

**Security Gaps Remaining (TODO):**
- ❌ Row Level Security (RLS) policies not yet implemented
- ⚠️ Service role key still used in most routes (needs migration)
- ⚠️ API rate limiting not yet enforced
- ⚠️ Security headers not yet configured

**Migration Guide:**
See `AUTHENTICATION_ADDED.md` for frontend integration examples and `SECURITY_FIXES.md` for deployment checklist.

---

### Version 1.x - Initial Release (Prior to January 2025)

**Core Features:**
- Project creation and management
- Multi-channel evidence collection (web, email, file upload)
- AI-powered evidence classification
- Claim pack generation
- Email nudges and inbound parsing
- Supabase authentication
- SendGrid integration
- OpenAI classification

**Known Issues (Addressed in v2.0):**
- No authentication on evidence routes
- No file upload validation
- No webhook signature verification
- No CSRF protection on cron endpoints

---

## Related Documentation

**For Developers:**
- [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) (this file) - Complete system overview
- [SECURITY_FIXES.md](SECURITY_FIXES.md) - Security audit and fixes applied
- [AUTHENTICATION_ADDED.md](AUTHENTICATION_ADDED.md) - Auth implementation details
- [README.md](README.md) - Project setup and getting started
- [AUTH_SETUP.md](AUTH_SETUP.md) - Supabase auth configuration
- [GITHUB_INTEGRATION.md](GITHUB_INTEGRATION.md) - GitHub sync feature

**For Security:**
- [SECURITY_FIXES.md](SECURITY_FIXES.md) - Vulnerability report and remediation
- [.env.example](.env.example) - Environment variable template

**For Operations:**
- Deployment checklist in [SECURITY_FIXES.md](SECURITY_FIXES.md)
- Environment configuration in this document
- Troubleshooting guide in this document

---

**Document Version:** 2.0
**Last Updated:** January 17, 2025
**Maintained By:** ClaimFlow Development Team
**Next Review:** Before production deployment (post-RLS implementation)
