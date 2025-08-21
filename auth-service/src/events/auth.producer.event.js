const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

const AUTH_WELCOME_EMAIL = process.env.AUTH_WELCOME_EMAIL || 'auth.welcome.email';
const AUTH_VERIFICATION_EMAIL = process.env.AUTH_VERIFICATION_EMAIL || 'auth.verification.email';
const AUTH_PASSWORD_RESET_EMAIL = process.env.AUTH_PASSWORD_RESET_EMAIL || 'auth.password.reset.email';


class AuthNotificationProducer {
  constructor(options = {}) {
    this.topics = {
      welcome: options.welcomeTopic || AUTH_WELCOME_EMAIL,
      verification: options.verificationTopic || AUTH_VERIFICATION_EMAIL,
      passwordReset: options.passwordResetTopic || AUTH_PASSWORD_RESET_EMAIL
    };
  }

  async publishEmail({ to, subject, html, text, template, variables, from }) {
    if (!to) throw new Error('Recipient (to) is required');
    if (!template) throw new Error('Template is required to select the correct topic');

    const payload = {
      channel: 'email',
      to,
      subject,
      html,
      text,
      template,
      variables,
      from
    };

    // Route by template
    const topic =
      template === 'verificationEmail' ? this.topics.verification :
      template === 'passwordResetEmail' ? this.topics.passwordReset :
      template === 'welcomeEmail' ? this.topics.welcome : null;

    if (!topic) {
      throw new Error(`Unsupported template '${template}' for auth notification`);
    }

    await publish(topic, to, payload);
    logger.info('AuthNotificationProducer published email event', { to, subject, template, topic });
    return { messageId: 'queued', info: 'Notification event published' };
  }

  async publishVerificationEmail({ email, verifyUrl }) {
    const payload = {
      channel: 'email',
      to: email,
      subject: 'Email Verification',
      template: 'verificationEmail',
      variables: { verifyUrl }
    };
    await publish(this.topics.verification, email, payload);
    logger.info('AuthNotificationProducer published verification email event', { email, topic: this.topics.verification });
    return { messageId: 'queued', info: 'Verification notification event published' };
  }

  async publishPasswordResetEmail({ email, resetUrl }) {
    const payload = {
      channel: 'email',
      to: email,
      subject: 'Password Reset Request',
      template: 'passwordResetEmail',
      variables: { resetUrl }
    };
    await publish(this.topics.passwordReset, email, payload);
    logger.info('AuthNotificationProducer published password reset email event', { email, topic: this.topics.passwordReset });
    return { messageId: 'queued', info: 'Password reset notification event published' };
  }

  async publishWelcomeEmail({ email, firstName, dashboardUrl }) {
    const payload = {
      channel: 'email',
      to: email,
      subject: 'Welcome to Our Platform!',
      template: 'welcomeEmail',
      variables: { firstName, dashboardUrl }
    };
    await publish(this.topics.welcome, email, payload);
    logger.info('AuthNotificationProducer published welcome email event', { email, topic: this.topics.welcome });
    return { messageId: 'queued', info: 'Welcome notification event published' };
  }
}

module.exports = new AuthNotificationProducer();


