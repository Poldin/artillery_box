import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { renderToStaticMarkup } from 'react-dom/server';
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

    // Convert markdown to safe-ish HTML (skipHtml to avoid raw HTML injection).
    const markdownHtml = renderToStaticMarkup(
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {markdownText}
      </ReactMarkdown>
    );

    const html = generateEmailTemplate({
      title: subject,
      content: markdownHtml,
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

