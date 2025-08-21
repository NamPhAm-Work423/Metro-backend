const nodemailer = require('nodemailer');
const { logger } = require('../config/logger');
const authNotifier = require('../events/auth.producer.event');

class EmailService {
  constructor() {
    this.isConfigured = false;
    this.isTestMode = false;
    this.transporter = null;
    this.emailQueue = [];
    this.isProcessingQueue = false;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    // If using test mode, create Ethereal test account
    if (process.env.EMAIL_TEST_MODE === 'true') {
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        this.isConfigured = true;
        this.isTestMode = true;
        logger.info('Email service initialized in TEST mode with Ethereal Email');
        return;
      } catch (error) {
        logger.error('Failed to create test email account:', error);
        this.isConfigured = false;
        this.transporter = null;
        return;
      }
    }

    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logger.warn('Email service not configured - EMAIL_USER and EMAIL_PASS environment variables are required');
      this.isConfigured = false;
      this.transporter = null;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        // Connection pooling for better performance
        pool: true,
        maxConnections: 3, // Reduce connections for faster startup
        maxMessages: 20, // Increase messages per connection
        // Optimized timeout settings
        connectionTimeout: 10000, // 10 seconds (reduced from 60)
        greetingTimeout: 5000, // 5 seconds (reduced from 30)
        socketTimeout: 10000, // 10 seconds (reduced from 60)
        tls: {
          rejectUnauthorized: false
        },
        // Retry configuration
        retry: {
          delay: 500,
          max: 3
        },
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
      });

      this.isConfigured = true;
      this.isTestMode = false;

      // Verify connection on startup
      try {
        await this.transporter.verify();
        logger.info('Email service connection verified successfully');
      } catch (error) {
        logger.error('Email service verification failed:', {
          error: error.message,
          code: error.code,
          command: error.command
        });
        // Don't throw error, but mark as not configured
        this.isConfigured = false;
        // Keep transporter for later retry, don't set to null
      }
    } catch (error) {
      logger.error('Failed to create email transporter:', {
        error: error.message,
        stack: error.stack
      });
      this.isConfigured = false;
      this.transporter = null;
    }
  }

  async sendEmail(to, subject, html, text) {
    // Wait for initialization if not done yet
    if (!this.isConfigured || !this.transporter) {
      await this.initializeTransporter();
    }

    // Double check after initialization
    if (!this.isConfigured || !this.transporter) {
      logger.error(`Email service not properly configured - transporter is null`, {
        isConfigured: this.isConfigured,
        hasTransporter: !!this.transporter,
        to,
        subject
      });
      return { messageId: 'not-configured', info: 'Email service not configured properly' };
    }

    try {
      // Prefer async notification via Kafka -> notification-service
      // Generic sendEmail without a known template will use legacy path

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Metro System'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      if (this.isTestMode) {
        logger.info(`TEST EMAIL sent successfully to ${to}: ${result.messageId}`);
        logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(result)}`);
      } else {
        logger.info(`Email sent successfully to ${to}: ${result.messageId}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, {
        error: error.message,
        stack: error.stack,
        hasTransporter: !!this.transporter,
        isConfigured: this.isConfigured
      });
      
      // For rate limiting errors, add to queue for retry
      if (error.code === 'EDNS' || error.code === 'ETIMEDOUT' || 
          (error.response && error.response.includes('rate limit'))) {
        logger.info(`Adding email to retry queue: ${to}`);
        this.addToQueue({ to, subject, html, text });
        return { messageId: 'queued', info: 'Email queued for retry' };
      }
      
      throw error;
    }
  }

  // Simple email queue for retries
  addToQueue(emailData) {
    this.emailQueue.push({
      ...emailData,
      attempts: 0,
      addedAt: new Date()
    });
    
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.emailQueue.length === 0 || this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;
    logger.info(`Processing email queue: ${this.emailQueue.length} emails`);

    while (this.emailQueue.length > 0) {
      const emailData = this.emailQueue.shift();
      
      try {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, emailData.attempts) * 1000; // 1s, 2s, 4s, 8s...
        if (emailData.attempts > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Send email directly without going through sendEmail to avoid queue recursion
        await this.sendEmailDirect(emailData.to, emailData.subject, emailData.html, emailData.text);
        logger.info(`Queue: Email sent successfully to ${emailData.to}`);
        
      } catch (error) {
        emailData.attempts++;
        
        // Retry up to 3 times
        if (emailData.attempts < 3) {
          logger.warn(`Queue: Retry ${emailData.attempts}/3 for ${emailData.to}`);
          this.emailQueue.unshift(emailData); // Add back to front
        } else {
          logger.error(`Queue: Failed to send email to ${emailData.to} after 3 attempts:`, error.message);
        }
      }
    }

    this.isProcessingQueue = false;
    logger.info('Email queue processing completed');
  }

  // Direct email sending without queue logic (for internal use)
  async sendEmailDirect(to, subject, html, text) {
    if (!this.isConfigured || !this.transporter) {
      throw new Error('Email service not configured or transporter is null');
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Metro System'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text
    };

    const result = await this.transporter.sendMail(mailOptions);
    
    if (this.isTestMode) {
      logger.info(`TEST EMAIL sent successfully to ${to}: ${result.messageId}`);
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(result)}`);
    } else {
      logger.info(`Email sent successfully to ${to}: ${result.messageId}`);
    }
    
    return result;
  }

  // Get queue status
  getQueueStatus() {
    return {
      queueLength: this.emailQueue.length,
      isProcessing: this.isProcessingQueue,
      oldestEmail: this.emailQueue.length > 0 ? this.emailQueue[0].addedAt : null
    };
  }

  // Debug method to check email service status
  getDebugInfo() {
    return {
      isConfigured: this.isConfigured,
      isTestMode: this.isTestMode,
      hasTransporter: !!this.transporter,
      queueStatus: this.getQueueStatus(),
      environment: {
        EMAIL_USER: !!process.env.EMAIL_USER,
        EMAIL_PASS: !!process.env.EMAIL_PASS,
        EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
        EMAIL_PORT: process.env.EMAIL_PORT || 587,
        EMAIL_TEST_MODE: process.env.EMAIL_TEST_MODE
      }
    };
  }

  // Force re-initialization
  async forceReinitialize() {
    logger.info('Forcing email service reinitialization...');
    this.isConfigured = false;
    this.transporter = null;
    await this.initializeTransporter();
    return this.getDebugInfo();
  }

  async sendVerificationEmail(email, token) {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    if (process.env.NOTIFICATION_EVENTS_ENABLED !== 'false') {
      await authNotifier.publishVerificationEmail({ email, verifyUrl });
      logger.info('Verification email event published', { email });
      return { messageId: 'queued', info: 'Verification email published' };
    }
    const { verificationEmailTemplate } = require('./templates/email/verificationEmail');
    const { subject, html, text } = verificationEmailTemplate({ verifyUrl });
    return this.sendEmail(email, subject, html, text);
  }

  async sendPasswordResetEmail(email, token, userId) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}&uid=${userId}`;
    if (process.env.NOTIFICATION_EVENTS_ENABLED !== 'false') {
      await authNotifier.publishPasswordResetEmail({ email, resetUrl });
      logger.info('Password reset email event published', { email });
      return { messageId: 'queued', info: 'Password reset email published' };
    }
    const { passwordResetEmailTemplate } = require('./templates/email/passwordResetEmail');
    const { subject, html, text } = passwordResetEmailTemplate({ resetUrl });
    return this.sendEmail(email, subject, html, text);
  }

  async sendWelcomeEmail(email, firstName) {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;
    if (process.env.NOTIFICATION_EVENTS_ENABLED !== 'false') {
      await authNotifier.publishWelcomeEmail({ email, firstName, dashboardUrl });
      logger.info('Welcome email event published', { email });
      return { messageId: 'queued', info: 'Welcome email published' };
    }
    const { welcomeEmailTemplate } = require('./templates/email/welcomeEmail');
    const { subject, html, text } = welcomeEmailTemplate({ firstName, dashboardUrl });
    return this.sendEmail(email, subject, html, text);
  }

  async testConnection() {
    if (!this.isConfigured) {
      logger.warn('Email service not configured - cannot test connection');
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified successfully');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', {
        error: error.message,
        code: error.code,
        command: error.command,
        response: error.response
      });
      return false;
    }
  }

  // Alternative configuration for Gmail with OAuth2 (if app passwords don't work)
  static createGmailOAuth2Transport(user, clientId, clientSecret, refreshToken) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: user,
        clientId: clientId,
        clientSecret: clientSecret,
        refreshToken: refreshToken
      }
    });
  }
}

module.exports = new EmailService(); 
