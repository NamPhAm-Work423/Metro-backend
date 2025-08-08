function verificationEmailTemplate({ verifyUrl }) {
  const subject = 'Email Verification';
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Email Verification</h1>
        <p>Hello,</p>
        <p>Thank you for registering with us. Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't register for an account, please ignore this email.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated email. Please do not reply to this email.
        </p>
      </div>
    `;

  const text = `
      Email Verification
      
      Hello,
      
      Thank you for registering with us. Please use the link below to verify your email address:
      
      ${verifyUrl}
      
      This link will expire in 24 hours.
      
      If you didn't register for an account, please ignore this email.
    `;

  return { subject, html, text };
}

module.exports = { verificationEmailTemplate };


