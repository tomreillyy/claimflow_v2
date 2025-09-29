# Authentication Setup Guide

This guide walks you through setting up magic-link authentication for ClaimFlow using Supabase.

## Prerequisites

- Supabase project created
- Custom domain for sending emails (optional but recommended)

## 1. Supabase Configuration

### Step 1: Configure Auth Settings

In your Supabase dashboard, go to **Authentication > Settings**:

1. **Site URL**: Set to your domain (e.g., `https://yourdomain.com`)
2. **Redirect URLs**: Add:
   - `http://localhost:3000/auth/callback` (for development)
   - `https://yourdomain.com/auth/callback` (for production)

### Step 2: Configure Email Settings

Go to **Authentication > Email Templates**:

1. **SMTP Settings**: Configure your custom SMTP for branded emails
   - Host: Your email provider's SMTP host
   - Port: Usually 587 or 465
   - Username/Password: Your email credentials

2. **Email Templates**: Customize the magic link email
   - Subject: `Sign in to ClaimFlow`
   - Body: Include your branding and clear call-to-action

### Step 3: Set Rate Limits

Go to **Authentication > Rate Limits**:
- Set email rate limit to 5 per hour per email address
- Set SMS rate limit (if using) to 5 per hour per phone

## 2. Database Migration

Run the SQL migration in your Supabase SQL editor:

```sql
-- Copy and paste contents of supabase_auth_migration.sql
```

## 3. Environment Configuration

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

3. Update your domain settings:
   ```env
   NEXT_PUBLIC_BASE=https://yourdomain.com
   PUBLIC_INBOUND_DOMAIN=yourdomain.com
   ```

## 4. Testing the Flow

### Development Testing

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000`

3. Click "Start a project" → should redirect to `/auth/login`

4. Enter your email → check for magic link email

5. Click magic link → should redirect to `/auth/callback` → then to new project page

### Invite Flow Testing

1. Create a project with participant emails

2. Share the project URL with someone: `/p/[token]`

3. They should see the "Join project" form

4. After entering email and clicking magic link, they should be added to the project

## 5. Security Considerations

### Rate Limiting ✅
- Magic link requests are rate-limited by Supabase
- 5 attempts per hour per email address

### Custom Domain Emails ✅
- Configure SMTP to send from your domain
- Builds trust and reduces spam likelihood

### Session Management ✅
- Sessions are automatically managed by Supabase Auth
- Auto-refresh tokens prevent session expiration

### Audit Trail ✅
- All users are tracked in `auth.users` table
- Project ownership is tracked via `owner_id`
- Participant access is tracked via `participant_ids`

## 6. Migration from Existing Projects

Existing projects (created before auth) will continue to work with public access. To migrate them:

1. Have project owners sign up with their email
2. Run the migration function:
   ```sql
   SELECT migrate_project_to_user('project_token_here', 'owner@email.com');
   ```

## 7. Troubleshooting

### Magic Links Not Working
- Check SMTP configuration in Supabase
- Verify redirect URLs are correct
- Check spam folder

### Users Can't Access Projects
- Verify they've been added as participants
- Check RLS policies are enabled
- Ensure user completed sign-up flow

### Database Errors
- Ensure migration has been run
- Check that auth.users table is accessible
- Verify foreign key constraints

## 8. Production Deployment

1. Update environment variables for production
2. Configure custom domain for emails
3. Set up monitoring for auth failures
4. Test invite flow end-to-end

The system is designed to be backward compatible - existing projects will continue working while new projects get proper authentication.