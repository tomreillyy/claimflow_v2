# ClaimFlow - R&D Evidence Collection MVP

A simple web application for collecting R&D evidence and generating draft claim packs for grant applications.

## Features

- **Admin Interface**: Create new R&D projects with unique tokens
- **Evidence Timeline**: Public timeline for each project showing all collected evidence
- **Quick Notes**: Add text notes directly via web interface
- **File Uploads**: Upload supporting documents and files
- **Draft Claim Pack**: Generate print-ready PDF documents organized by R&D categories
- **Email Integration**: Each project gets a unique inbound email for evidence collection
- **Outbound Nudges**: Send reminder emails to project participants
- **Inbound Email Processing**: Automatically process replies and attachments from participants

## Setup

### 1. Supabase Database

1. Create a new Supabase project at https://supabase.com
2. Run the SQL schema in `supabase_schema.sql` in your Supabase SQL editor
3. Get your project URL and service role key from Settings → API

### 2. SendGrid Setup (Optional - for email features)

1. Create a SendGrid account at https://sendgrid.com
2. Create an API key with full access
3. Set up domain authentication for your sending domain
4. For inbound email processing, configure SendGrid Parse webhook

### 3. Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Fill in your credentials:
   ```
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   NEXT_PUBLIC_BASE=http://localhost:3000
   PUBLIC_INBOUND_DOMAIN=yourdomain.com
   SENDGRID_API_KEY=your-sendgrid-api-key
   FROM_EMAIL=noreply@yourdomain.com
   ```

### 4. Run the Application

```bash
npm run dev
```

Visit http://localhost:3000 to see the application.

## Usage

### Creating a Project

1. Go to `/admin/new-project`
2. Fill in project name, year, and participant emails
3. Get your project URLs and inbound email address

### Collecting Evidence

- **Timeline**: Visit `/p/{token}` to see the evidence timeline
- **Add Notes**: Use the quick note form on the timeline page
- **Upload Files**: Click "Upload file" or visit `/p/{token}/upload`
- **Email**: Send emails to the project's inbound email address (requires SendGrid setup)
- **Nudge Participants**: Manually trigger reminder emails by visiting `/api/cron/nudge`

### Generating Claim Pack

1. Visit `/p/{token}/pack` to see the draft claim pack
2. Use your browser's Print → Save as PDF to export

## Architecture

- **Frontend**: Next.js 15 with React 19
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **Styling**: Inline styles (no framework for simplicity)

## File Structure

```
app/
├── admin/new-project/page.jsx     # Create new projects
├── api/
│   ├── admin/projects/route.js    # Project creation API
│   ├── cron/nudge/route.js        # Send reminder emails
│   ├── inbound/sendgrid/route.js  # Process inbound emails
│   └── evidence/[token]/
│       ├── add/route.js           # Add text evidence
│       └── upload/route.js        # Upload files
└── p/[token]/
    ├── page.jsx                   # Evidence timeline
    ├── quick-note-form.jsx        # Note form component
    ├── upload/page.jsx            # File upload page
    └── pack/page.jsx              # Draft claim pack
lib/
└── supabaseAdmin.js               # Server-side Supabase client
```

## Development Notes

- All pages use inline styles for simplicity
- Public access is enabled for ease of use (consider authentication for production)
- File uploads go to Supabase Storage with public URLs
- The draft claim pack organizes evidence by predefined R&D categories
- Categories can be added to evidence items (future enhancement)

## Email Setup (Production)

### SendGrid Parse Webhook Configuration

1. In SendGrid, go to Settings → Inbound Parse
2. Add hostname: `yourdomain.com`
3. Set webhook URL: `https://yourapp.com/api/inbound/sendgrid`
4. Configure MX record for your domain to point to SendGrid

### Cron Job for Nudges

Set up a cron job or scheduled task to hit `/api/cron/nudge` periodically:
```bash
# Daily at 9 AM
0 9 * * * curl -X GET https://yourapp.com/api/cron/nudge
```

## Production Deployment

1. Deploy to Vercel/Netlify/similar
2. Update `NEXT_PUBLIC_BASE` to your production URL
3. Configure SendGrid domain authentication and inbound parsing
4. Set up scheduled nudge emails via cron or service like Vercel Cron
5. Consider adding authentication for admin functions
