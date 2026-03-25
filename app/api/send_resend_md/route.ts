import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateEmailTemplate } from '@/app/lib/email-template';

const TO_EMAIL = 'paolo.piccoli@docplanner.it';
const CC_EMAIL = 'oloapiccoli@gmail.com';

export async function POST(request: Request) {
  try {
    const resendApiKey = process.env.RESEND_MD;
    if (!resendApiKey) {
      return NextResponse.json(
        { error: 'Missing RESEND_MD env var' },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    // Accept either JSON { text } / { content } or raw text body.
    const contentType = request.headers.get('content-type') || '';
    let markdownText = '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      markdownText = body?.text ?? body?.content ?? '';
    } else {
      markdownText = await request.text();
    }

    if (!markdownText || typeof markdownText !== 'string' || !markdownText.trim()) {
      return NextResponse.json(
        { error: 'Missing required body text' },
        { status: 400 }
      );
    }

    const subject = 'NUOVO LEAD DA NOA PRO! -> GESTISCILO MANUALMENTE';

    const escapeHtml = (input: string) =>
      input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const html = generateEmailTemplate({
      title: subject,
      // Il nome della route include `_md`, ma se ti basta testo semplice
      // lo inviamo come "preformatted" per preservare a capo/spazi.
      content: `<pre style="white-space: pre-wrap; word-break: break-word; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 14px; line-height: 21px; color: #374151;">${escapeHtml(
        markdownText
      )}</pre>`,
    });

    const from =
      process.env.RESEND_MD_FROM ?? 'Vetrinae <team@vetrinae.xyz>';

    const { data, error } = await resend.emails.send({
      from,
      to: TO_EMAIL,
      cc: [CC_EMAIL],
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: error.message ?? 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error sending Resend MD email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

