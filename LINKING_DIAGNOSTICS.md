# Auto-Link Diagnostics Guide

## Quick Check: Why Isn't My Evidence Linking?

### Method 1: Use the Diagnostics API (Recommended)

```bash
# Get diagnostics for entire project
curl "http://localhost:3000/api/evidence/auto-link/diagnostics?project_token=YOUR_PROJECT_TOKEN" | jq

# Get diagnostics for specific evidence item
curl "http://localhost:3000/api/evidence/auto-link/diagnostics?project_token=YOUR_PROJECT_TOKEN&evidence_id=EVIDENCE_ID" | jq
```

**Response shows:**
- ✅ Budget status (attempted today vs limit)
- ✅ Per-evidence blocking reasons
- ✅ Keyword overlap analysis
- ✅ Rule scores for each activity
- ✅ Cooldown status
- ✅ Content hash changes

### Method 2: SQL Queries (Direct Database)

#### Check if columns exist (after migration)
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'evidence'
  AND column_name IN ('linked_activity_id', 'link_source', 'link_reason', 'link_attempted_at', 'content_hash');
```

#### View linking status for all evidence
```sql
SELECT
  e.id,
  e.created_at::date,
  e.systematic_step_primary as step,
  LEFT(e.content, 80) as content_preview,
  ca.name as linked_activity,
  e.link_source,
  e.link_reason,
  e.link_updated_at,
  e.link_attempted_at,
  LENGTH(e.content) as content_length
FROM evidence e
LEFT JOIN core_activities ca ON e.linked_activity_id = ca.id
WHERE e.project_id = 'YOUR_PROJECT_ID'
  AND (e.soft_deleted IS NULL OR e.soft_deleted = false)
ORDER BY e.created_at DESC;
```

#### Check why items haven't been attempted yet
```sql
SELECT
  id,
  created_at::date,
  systematic_step_primary,
  link_source,
  link_attempted_at,
  LENGTH(content) as content_length,
  CASE
    WHEN link_source = 'manual' THEN 'SKIP: Manual link'
    WHEN LENGTH(content) < 20 THEN 'FAIL: Content too short'
    WHEN link_attempted_at IS NULL THEN 'NEVER ATTEMPTED'
    WHEN link_attempted_at > NOW() - INTERVAL '1 hour' THEN 'COOLDOWN: Attempted < 1h ago'
    ELSE 'READY for retry'
  END as status
FROM evidence
WHERE project_id = 'YOUR_PROJECT_ID'
  AND linked_activity_id IS NULL
  AND (soft_deleted IS NULL OR soft_deleted = false)
ORDER BY created_at DESC;
```

#### Check daily budget usage
```sql
SELECT
  COUNT(*) as attempted_today,
  100 as daily_limit,
  100 - COUNT(*) as remaining
FROM evidence
WHERE project_id = 'YOUR_PROJECT_ID'
  AND link_attempted_at >= NOW() - INTERVAL '24 hours';
```

#### Check keyword overlap manually
```sql
-- Get evidence terms (simplified - you'd need to extract keywords)
SELECT
  e.id,
  LEFT(e.content, 100) as content,
  ca.name as activity_name,
  ca.uncertainty
FROM evidence e
CROSS JOIN core_activities ca
WHERE e.project_id = 'YOUR_PROJECT_ID'
  AND ca.project_id = 'YOUR_PROJECT_ID'
  AND e.linked_activity_id IS NULL
  AND LENGTH(e.content) >= 20
ORDER BY e.created_at DESC;
```

## Common Blocking Reasons

### 1. No Core Activities
**Check:**
```sql
SELECT COUNT(*) FROM core_activities WHERE project_id = 'YOUR_PROJECT_ID';
```
**Fix:** Add at least one core activity via the UI

### 2. Content Too Short
**Check:**
```sql
SELECT id, LENGTH(content) FROM evidence
WHERE project_id = 'YOUR_PROJECT_ID' AND LENGTH(content) < 20;
```
**Fix:** Evidence must have ≥20 characters

### 3. No Keyword Overlap
**Check:** Use diagnostics API to see term extraction and scores
**Fix:** Either:
- Add more specific content to evidence
- Update activity name/uncertainty to include relevant terms

### 4. Daily Budget Exceeded
**Check:**
```sql
SELECT COUNT(*) FROM evidence
WHERE project_id = 'YOUR_PROJECT_ID'
  AND link_attempted_at >= NOW() - INTERVAL '24 hours';
```
**Fix:** Wait 24 hours or increase `MAX_ITEMS_PER_DAY_PER_PROJECT` in code

### 5. Cooldown Active
**Check:**
```sql
SELECT
  id,
  link_attempted_at,
  EXTRACT(HOUR FROM NOW() - link_attempted_at) as hours_since_attempt
FROM evidence
WHERE project_id = 'YOUR_PROJECT_ID'
  AND link_attempted_at > NOW() - INTERVAL '1 hour';
```
**Fix:** Wait for cooldown to expire (1 hour for failed attempts, 24 hours for successful links)

### 6. Outside Recency Window
**Check:**
```sql
SELECT
  id,
  created_at,
  EXTRACT(DAY FROM NOW() - created_at) as age_days
FROM evidence
WHERE project_id = 'YOUR_PROJECT_ID'
  AND created_at < NOW() - INTERVAL '60 days';
```
**Fix:** Evidence must be <60 days old (unless activity is <14 days old for backfill)

### 7. Rule Score Too Low
**Check:** Use diagnostics API to see Jaccard scores
**Fix:**
- Score must be ≥0.15 (15% term overlap)
- Add more relevant keywords to evidence or activity descriptions

### 8. AI Confidence Too Low
**Check:** This happens during AI processing (not visible in DB)
**Fix:** AI must return confidence="high". Add clearer, more specific content.

## Manual Trigger (for Testing)

```bash
# Manually trigger auto-linking for a project
curl -X POST http://localhost:3000/api/evidence/auto-link \
  -H "Content-Type: application/json" \
  -d '{"project_id": "YOUR_PROJECT_ID"}'

# Response shows:
# - linked: number of items successfully linked
# - processed: number of items sent to AI
# - ai_links: number of links AI suggested
# - final_links: number passing dual-gate confidence
# - conflicts: number rejected due to ties
```

## Example Diagnostics Output

```json
{
  "project": {
    "id": "...",
    "name": "Invoice System",
    "activities_count": 3
  },
  "budget": {
    "attempted_today": 5,
    "daily_limit": 100,
    "within_budget": true
  },
  "evidence": [
    {
      "id": "abc123",
      "created_at": "2025-10-05",
      "current_link": "UNLINKED",
      "blocking_reasons": [
        "No keyword overlap with any activity"
      ],
      "evidence_terms": ["model", "accuracy", "test", "classifier"],
      "activity_scores": [
        {
          "activity_name": "ML Model Training",
          "activity_terms": ["training", "neural", "network", "optimization"],
          "jaccard_score": 0.0,
          "passes_threshold": false
        }
      ]
    }
  ]
}
```

## Debugging Workflow

1. **Check migration ran:** Verify columns exist (SQL above)
2. **Check activities exist:** Must have ≥1 activity
3. **Run diagnostics API:** See blocking reasons per evidence
4. **Check keyword overlap:** Look at term extraction in diagnostics
5. **Manually trigger:** Force a linking attempt
6. **Check logs:** Look for `[Auto-Link]` messages in server console
7. **Check DB after trigger:** Verify `link_attempted_at` was set

## Pro Tips

- **Best results:** Write evidence with specific technical terms that match activity names
- **Activity names:** Use 3-6 concrete technical words (e.g., "Gradient Boosting Model Training")
- **Evidence content:** Include specific metrics, method names, tool names
- **Minimum viable:** 20+ chars, 1+ keyword match, created within 60 days
