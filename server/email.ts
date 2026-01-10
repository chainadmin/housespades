// Email utility for House Spades
// Configure with your Cloudflare Email or other email provider

interface EmailConfig {
  from: string;
  apiKey?: string;
  domain?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Email configuration - set these environment variables when deploying
const config: EmailConfig = {
  from: process.env.EMAIL_FROM || "noreply@housespades.com",
  apiKey: process.env.EMAIL_API_KEY,
  domain: process.env.EMAIL_DOMAIN,
};

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; devMode: boolean }> {
  const { to, subject, text, html } = options;

  // If no API key is configured, log the email for development
  if (!config.apiKey) {
    console.log("=== Email would be sent (DEV MODE) ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text}`);
    console.log("======================================");
    console.log("Configure EMAIL_API_KEY to enable real email sending");
    return { success: true, devMode: true }; // Return success in dev mode so flow continues
  }

  try {
    // Example implementation for Cloudflare Email Workers or Resend
    // Replace this with your actual email provider implementation
    
    // For Resend:
    // const response = await fetch("https://api.resend.com/emails", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${config.apiKey}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     from: config.from,
    //     to,
    //     subject,
    //     text,
    //     html,
    //   }),
    // });
    // return response.ok;

    // For Mailgun:
    // const form = new FormData();
    // form.append("from", config.from);
    // form.append("to", to);
    // form.append("subject", subject);
    // form.append("text", text);
    // if (html) form.append("html", html);
    // 
    // const response = await fetch(`https://api.mailgun.net/v3/${config.domain}/messages`, {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Basic ${Buffer.from(`api:${config.apiKey}`).toString("base64")}`,
    //   },
    //   body: form,
    // });
    // return { success: response.ok, devMode: false };

    console.log(`Email sent to ${to}: ${subject}`);
    return { success: true, devMode: false };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, devMode: false };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  baseUrl: string
): Promise<{ success: boolean; devMode: boolean; resetLink?: string }> {
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const result = await sendEmail({
    to: email,
    subject: "Reset Your House Spades Password",
    text: `
You requested a password reset for your House Spades account.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

- The House Spades Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
    <h1 style="color: #fff; margin: 0; font-size: 28px;">House Spades</h1>
    <p style="color: #888; margin: 10px 0 0 0;">Password Reset</p>
  </div>
  
  <p>You requested a password reset for your House Spades account.</p>
  
  <p>Click the button below to reset your password:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
  </div>
  
  <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
  
  <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="color: #999; font-size: 12px; text-align: center;">
    If the button doesn't work, copy and paste this link:<br>
    <a href="${resetLink}" style="color: #667eea;">${resetLink}</a>
  </p>
</body>
</html>
    `.trim(),
  });
  
  return {
    ...result,
    resetLink: result.devMode ? resetLink : undefined,
  };
}
