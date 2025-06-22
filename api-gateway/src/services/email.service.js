const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }

  async sendEmail(to, subject, html, text) {
    try {
      const mailOptions = {
        from: `"${config.email.fromName}" <${config.email.from}>`,
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendVerificationEmail(email, token) {
    const subject = 'Email Verification';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Email Verification</h1>
        <p>Hello,</p>
        <p>Thank you for registering with us. Please use the verification code below to verify your email address:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <h2 style="color: #007bff; letter-spacing: 5px; margin: 0;">${token}</h2>
        </div>
        <p>This code will expire in 24 hours.</p>
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
      
      Thank you for registering with us. Please use the verification code below to verify your email address:
      
      ${token}
      
      This code will expire in 24 hours.
      
      If you didn't register for an account, please ignore this email.
    `;

    return this.sendEmail(email, subject, html, text);
  }

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${config.app.frontendUrl}/reset-password?token=${token}`;
    
    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Password Reset</h1>
        <p>Hello,</p>
        <p>You have requested to reset your password. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated email. Please do not reply to this email.
        </p>
      </div>
    `;
    
    const text = `
      Password Reset
      
      Hello,
      
      You have requested to reset your password. Use the link below to reset your password:
      
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email.
    `;

    return this.sendEmail(email, subject, html, text);
  }

  async sendWelcomeEmail(email, firstName) {
    const subject = 'Welcome to Our Platform!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Welcome ${firstName}!</h1>
        <p>Hello ${firstName},</p>
        <p>Welcome to our platform! We're excited to have you on board.</p>
        <p>Your account has been successfully created and verified. You can now enjoy all the features we offer.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${config.app.frontendUrl}/dashboard" 
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
      
      Visit ${config.app.frontendUrl}/dashboard to get started.
      
      If you have any questions or need assistance, feel free to contact our support team.
      
      Best regards,
      The Team
    `;

    return this.sendEmail(email, subject, html, text);
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified successfully');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService(); 