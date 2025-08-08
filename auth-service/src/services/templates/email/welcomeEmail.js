function welcomeEmailTemplate({ firstName, dashboardUrl }) {
  const subject = 'Welcome to Our Platform!';
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Welcome ${firstName}!</h1>
        <p>Hello ${firstName},</p>
        <p>Welcome to our platform! We're excited to have you on board.</p>
        <p>Your account has been successfully created and verified. You can now enjoy all the features we offer.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" 
             style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Get Started
          </a>
        </div>
        <p>If you have any questions or need assistance, feel free to contact our support team.</p>
        <p>Best regards,<br>The Team</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated email. Please do not reply to this email.
        </p>
      </div>
    `;

  const text = `
      Welcome ${firstName}!
      
      Hello ${firstName},
      
      Welcome to our platform! We're excited to have you on board.
      
      Your account has been successfully created and verified. You can now enjoy all the features we offer.
      
      Visit ${dashboardUrl} to get started.
      
      If you have any questions or need assistance, feel free to contact our support team.
      
      Best regards,
      The Team
    `;

  return { subject, html, text };
}

module.exports = { welcomeEmailTemplate };


