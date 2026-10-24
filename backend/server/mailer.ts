import nodemailer from 'nodemailer';

export function isEmailConfigured(): boolean {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  return Boolean(user && pass);
}

export async function sendVerificationEmail(email: string, code: string): Promise<{ sent: boolean; previewCode?: string }> {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (!user || !pass) {
    console.log(`\n======================================================`);
    console.log(`[Foodlink Auth] Verification Code for ${email}: ${code}`);
    console.log(`(Configure EMAIL_USER and EMAIL_PASS to send real emails)`);
    console.log(`======================================================\n`);
    return { sent: false, previewCode: code };
  }

  const transporter = nodemailer.createTransport({
    service: process.env.SMTP_HOST ? undefined : 'gmail',
    host: process.env.SMTP_HOST || undefined,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });

  const mailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Foodlink Verification Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #064e3b, #047857); padding: 32px 24px; text-align: center; color: #ffffff; }
        .logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .sublogo { font-size: 13px; opacity: 0.9; margin-top: 4px; }
        .content { padding: 32px 24px; text-align: center; }
        .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        .text { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
        .code-box { background: #ecfdf5; border: 2px dashed #10b981; border-radius: 16px; padding: 18px 24px; display: inline-block; margin-bottom: 24px; }
        .code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #065f46; letter-spacing: 8px; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 12px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">🌿 Foodlink</div>
          <div class="sublogo">Campus Food Rescue & Redistribution</div>
        </div>
        <div class="content">
          <div class="title">Verify Your Email Address</div>
          <p class="text">Thank you for joining Foodlink. Please enter this 6-digit verification code to complete creating your account:</p>
          <div class="code-box">
            <span class="code">${code}</span>
          </div>
          <p class="text" style="font-size: 12px; margin-bottom: 0;">This code is valid for <strong>10 minutes</strong>. If you did not request this verification code, please ignore this email.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Foodlink Campus Network · Safe, zero-waste campus dining
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Foodlink Campus Network" <${user}>`,
    to: email,
    subject: `Your Foodlink Verification Code: ${code}`,
    text: `Your Foodlink verification code is: ${code}. This code expires in 10 minutes.`,
    html: mailHtml,
  });

  return { sent: true };
}
