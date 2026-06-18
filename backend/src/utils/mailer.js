import nodemailer from "nodemailer";

let transporter = null;

const initMailer = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
};

initMailer().catch(console.error);

export const sendSignatureEmail = async (
  toEmail,
  documentName,
  link
) => {
  const subject = `Signature Request • ${documentName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Signature Request</title>
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Inter,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 20px;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="max-width:600px;background:#ffffff;border-radius:16px;
overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">

<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);
padding:32px;text-align:center;">

<h1 style="margin:0;color:white;font-size:28px;">
📄 DocSign
</h1>

<p style="margin-top:10px;color:#dbeafe;font-size:15px;">
Secure Digital Signature Platform
</p>

</td>
</tr>

<!-- Content -->
<tr>
<td style="padding:40px;">

<h2 style="margin-top:0;color:#111827;">
Signature Requested
</h2>

<p style="font-size:16px;color:#4b5563;line-height:1.7;">
You have been invited to review and sign the following document:
</p>

<div style="
background:#f8fafc;
border:1px solid #e5e7eb;
padding:18px;
border-radius:12px;
margin:24px 0;
">

<p style="margin:0;font-size:14px;color:#6b7280;">
DOCUMENT
</p>

<p style="margin:6px 0 0 0;
font-size:18px;
font-weight:600;
color:#111827;">
${documentName}
</p>

</div>

<div style="text-align:center;margin:35px 0;">

<a href="${link}"
style="
display:inline-block;
background:#2563eb;
color:#ffffff;
text-decoration:none;
padding:14px 30px;
border-radius:10px;
font-weight:600;
font-size:16px;
">
Review & Sign Document
</a>

</div>

<p style="font-size:14px;color:#6b7280;line-height:1.7;">
For security reasons, this link may expire. Please review and sign the document as soon as possible.
</p>

<hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;">

<p style="font-size:13px;color:#6b7280;">
If the button above doesn't work, copy and paste this URL into your browser:
</p>

<div style="
background:#f9fafb;
border:1px dashed #d1d5db;
padding:14px;
border-radius:10px;
word-break:break-all;
font-size:13px;
color:#374151;
">
${link}
</div>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="
background:#f9fafb;
padding:24px;
text-align:center;
border-top:1px solid #e5e7eb;
">

<p style="
margin:0;
font-size:13px;
color:#6b7280;
">
This email was sent by <strong>DocSign</strong>.
</p>

<p style="
margin-top:8px;
font-size:12px;
color:#9ca3af;
">
Secure • Fast • Paperless
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;

  const text = `
Signature Request

Document: ${documentName}

Review and sign:
${link}

This link may expire. Please complete your signature request as soon as possible.
`;

  if (transporter) {
    const info = await transporter.sendMail({
      from:
        process.env.SMTP_FROM ||
        '"DocSign" <noreply@docsign.com>',
      to: toEmail,
      subject,
      text,
      html,
    });

    console.log(`📧 Email sent to ${toEmail}`);
    return info;
  }

  // Mock mode
  console.log(`
====================================================
📧 MOCK EMAIL DISPATCHED

To: ${toEmail}
Subject: ${subject}

Document: ${documentName}

Signature Link:
${link}

====================================================
`);

  return {
    messageId: `mock-${Date.now()}`,
  };
};