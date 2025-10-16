# GitHub Integration - Setup Guide

## Overview

The GitHub integration allows you to automatically sync commit messages from a GitHub repository as evidence in your R&D project. Commits are treated like any other evidence - they get AI-classified into systematic steps (H/E/O/Ev/C) and auto-linked to core activities.

## Features

- **Simple OAuth Connection**: One-click GitHub authentication
- **Repository Sync**: Manually sync commits with a button click
- **Smart Filtering**: Automatically filters out noise commits (merges, typos, formatting, etc.)
- **Team Filtering**: Only syncs commits from project participants
- **AI Processing**: Commits are automatically classified and linked to activities
- **Rich Metadata**: Stores commit SHA, URL, files changed, additions/deletions

## Setup Instructions

### 1. Create GitHub OAuth App

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: ClaimFlow (or your app name)
   - **Homepage URL**: `https://www.getaird.com` (your production domain)
   - **Authorization callback URL**: `https://www.getaird.com/api/github/auth/callback`
4. Click "Register application"
5. Note your **Client ID** and generate a **Client Secret**

**IMPORTANT**: The callback URL must match your exact domain including:
- Protocol (`https://` not `http://`)
- Subdomain (`www.` if your app uses it)
- No trailing slash

If you're testing locally, you'll need to create a separate OAuth app for development:
- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:3000/api/github/auth/callback`

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```bash
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/auth/callback

# Also ensure you have:
NEXT_PUBLIC_APP_URL=http://localhost:3000  # For background auto-processing
```

### 3. Run Database Migration

Run the new migration to add GitHub tables:

```bash
# In your Supabase SQL editor, run:
supabase/migrations/20250116_add_github_integration.sql
```

Or if using Supabase CLI:

```bash
supabase db push
```

### 4. Test the Integration

1. Start your dev server: `npm run dev`
2. Navigate to a project timeline: `/p/{token}`
3. Click "Connect to GitHub"
4. Authorize ClaimFlow on GitHub
5. Enter your repository: `owner/repo-name`
6. Click "Sync now" to pull in commits

## How It Works

### Commit Filtering

The integration automatically filters out:
- ✅ **Kept**: Technical commits describing R&D work
- ❌ **Filtered**: Merge commits, version bumps, dependency updates
- ❌ **Filtered**: Formatting/linting commits
- ❌ **Filtered**: README/docs updates
- ❌ **Filtered**: Commits shorter than 15 characters
- ❌ **Filtered**: Commits from non-participants

### AI Classification

After syncing, commits are automatically:
1. **Classified** into systematic steps (Hypothesis, Experiment, Observation, Evaluation, Conclusion)
2. **Auto-linked** to relevant core activities based on keyword matching and AI analysis

### Example Good Commits

These will be synced and classified:

- `"Fixed race condition in payment processor"` → Observation/Evaluation
- `"Tested Redis caching for session storage"` → Experiment
- `"Analyzed query performance, found N+1 issue"` → Evaluation
- `"Implemented JWT refresh token rotation"` → Experiment
- `"Added hypothesis: Can we scale to 10K concurrent users?"` → Hypothesis

### Example Filtered Commits

These will be automatically skipped:

- `"merge branch develop"` → Merge commit
- `"fix typo"` → Too short
- `"bump version to 1.2.3"` → Version bump
- `"update dependencies"` → Dependency update
- `"prettier format"` → Formatting

## Database Schema

### `github_repos`
Stores repository connections per project.

### `project_github_tokens`
Stores GitHub OAuth access tokens (one per project).

### `evidence.meta` (JSONB)
For GitHub commits, contains:
```json
{
  "sha": "abc123...",
  "commit_url": "https://github.com/owner/repo/commit/abc123",
  "repo": "owner/repo-name",
  "files_changed": 5,
  "additions": 42,
  "deletions": 8,
  "committed_at": "2025-01-16T10:30:00Z"
}
```

## API Endpoints

- `GET /api/github/auth/start` - Initiates OAuth flow
- `GET /api/github/auth/callback` - Handles OAuth callback
- `GET /api/projects/[token]/github/connect` - Fetches connection status
- `POST /api/projects/[token]/github/connect` - Connects a repository
- `POST /api/projects/[token]/github/disconnect` - Removes connection
- `POST /api/projects/[token]/github/sync` - Syncs commits

## UI Components

### Not Connected State
Shows a "Connect to GitHub" button at the top of the project page.

### Connected State
Shows:
- Repository name (owner/repo)
- Last sync timestamp
- "Sync now" button
- "Disconnect" button

### Timeline
GitHub commits display with:
- GitHub icon
- Commit SHA (clickable link to GitHub)
- Files changed count
- Additions/deletions (+42 / -8)

## Troubleshooting

### "GitHub not authenticated"
- Ensure OAuth app is created and credentials are in `.env.local`
- Check that callback URL matches exactly

### "Repository not found"
- Check repository name spelling (case-sensitive)
- Ensure the GitHub user has access to the repository
- For private repos, make sure OAuth scope includes `repo`

### "No commits synced"
- Check that project participants' emails match their GitHub commit emails
- Verify commits are within the last 30 days (first sync only)
- Check that commits don't match filter patterns

### Auto-linking not working
- Ensure `OPENAI_API_KEY` is set in `.env.local`
- Check that core activities exist for the project
- Verify commit messages have technical keywords

## Future Enhancements (Not in MVP)

- Auto-sync on page load (if >24h since last sync)
- Support multiple repos per project
- Filter by branch (only sync specific branches)
- PR descriptions as evidence
- Code diff previews in timeline
- Webhooks for real-time sync

## Security Notes

- Access tokens are stored in `project_github_tokens` table
- Consider encrypting tokens in production
- OAuth scope is set to `repo` (full repository access)
- Can be restricted to `public_repo` if only public repos needed
- No RLS policies implemented yet (Priority #1 in CONTEXT_PACK)

## Support

For issues or questions:
1. Check this documentation
2. Review CONTEXT_PACK.md for system architecture
3. Check GitHub API rate limits (5000 requests/hour for authenticated)
4. Review server logs for detailed error messages
