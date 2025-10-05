# ClaimFlow System Documentation

## Overview

**ClaimFlow** is an R&D evidence collection platform designed for Australian R&D Tax Incentive (RDTI) compliance under ITAA 1997 s.355-25. The system allows teams to collect evidence in real-time through multiple channels (web forms, file uploads, email) and generates organized claim packs categorized by R&D stages.

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

### 5. AI Evidence Classification

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

### 7. Claim Pack Generation

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

## Security Considerations

### 1. Access Control
- **Projects**: Token-based access (anyone with link can view)
- **Admin Functions**: Require authentication
- **Future**: Add participant verification, 2FA

### 2. Rate Limiting
- Supabase auth: 5 magic links per hour per email
- SendGrid: Configurable sending limits
- API routes: No rate limiting (consider adding)

### 3. Data Privacy
- Evidence contains potentially sensitive business info
- File uploads are publicly accessible (no signed URLs currently)
- No PII encryption at rest
- **Recommendation**: Add file access control for production

### 4. Input Validation
- All API routes validate required fields
- File type checking (basic MIME type validation)
- Email sanitization for inbound parsing
- **Recommendation**: Add content-length limits, stricter validation

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
```env
# Database
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_KEY=service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key

# Application
NEXT_PUBLIC_BASE=https://yourapp.com
PUBLIC_INBOUND_DOMAIN=yourapp.com

# Email
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=noreply@yourapp.com

# AI (optional)
OPENAI_API_KEY=sk-xxx
```

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

API routes:
POST   /api/admin/projects       → Create project
POST   /api/evidence/{token}/add → Add text note
POST   /api/evidence/{token}/upload → Upload file
POST   /api/inbound/sendgrid     → Receive email
GET    /api/cron/nudge           → Send reminders
POST   /api/classify?id={id}     → Classify evidence
PATCH  /api/evidence/{token}/set-step → Manual classification
DELETE /api/evidence/{token}/delete → Soft delete
GET    /api/evidence/{token}/step-counts → Count steps
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
