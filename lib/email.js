/**
 * Send an email via Mailjet API v3.1
 * Requires MAILJET_API_KEY and MAILJET_SECRET_KEY env vars
 */
export async function sendEmail({ to, subject, text }) {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@claimflow.ai';

  if (!apiKey || !secretKey) {
    console.warn('[Email] MAILJET_API_KEY or MAILJET_SECRET_KEY not set, skipping email');
    return;
  }

  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${secretKey}`).toString('base64'),
    },
    body: JSON.stringify({
      Messages: [{
        From: { Email: fromEmail, Name: 'ClaimFlow' },
        To: [{ Email: to }],
        Subject: subject,
        TextPart: text,
      }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mailjet error ${response.status}: ${body}`);
  }
}
