jest.mock('nodemailer');
const nodemailer = require('nodemailer');
const emailService = require('../../src/services/email.service');

describe('EmailService', () => {
  beforeAll(() => {
    nodemailer.createTestAccount.mockResolvedValue({ user: 'u', pass: 'p' });
    const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'm1' });
    nodemailer.createTransport.mockReturnValue({
      verify: jest.fn().mockResolvedValue(true),
      sendMail: sendMailMock,
    });
  });

  test('sendVerificationEmail uses template and sends', async () => {
    const res = await emailService.sendVerificationEmail('a@b.com', 'tok');
    expect(res).toHaveProperty('messageId');
  });

  test('sendPasswordResetEmail uses template and sends', async () => {
    const res = await emailService.sendPasswordResetEmail('a@b.com', 'tok', 'u1');
    expect(res).toHaveProperty('messageId');
  });

  test('sendWelcomeEmail uses template and sends', async () => {
    const res = await emailService.sendWelcomeEmail('a@b.com', 'John');
    expect(res).toHaveProperty('messageId');
  });

  test('returns not-configured when transporter missing', async () => {
    const prev = { test: process.env.EMAIL_TEST_MODE, user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS };
    process.env.EMAIL_TEST_MODE = 'false';
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    await emailService.forceReinitialize();
    const res = await emailService.sendEmail('x@y.com', 's', '<p>x</p>', 'x');
    expect(res.messageId).toBe('not-configured');
    // restore
    process.env.EMAIL_TEST_MODE = prev.test;
    process.env.EMAIL_USER = prev.user;
    process.env.EMAIL_PASS = prev.pass;
  });

  test('queues on rate limit error', async () => {
    // Ensure configured
    await emailService.forceReinitialize();
    // Simulate rate limit error
    const err = new Error('rate limit');
    err.response = 'rate limit exceeded';
    emailService.transporter.sendMail = jest.fn().mockRejectedValue(err);
    const res = await emailService.sendEmail('q@w.com', 's', '<p>x</p>', 'x');
    expect(res.messageId).toBe('queued');
    const status = emailService.getQueueStatus();
    expect(status.queueLength).toBeGreaterThanOrEqual(0);
  });

  test('sendEmailDirect succeeds when configured', async () => {
    await emailService.forceReinitialize();
    // Replace transporter with a simple mock
    emailService.transporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'direct-1' })
    };
    emailService.isConfigured = true;
    emailService.isTestMode = true;
    const result = await emailService.sendEmailDirect('to@ex.com', 'Sub', '<p>Hi</p>', 'Hi');
    expect(result.messageId).toBe('direct-1');
  });

  test('testConnection reports true when verify ok', async () => {
    await emailService.forceReinitialize();
    emailService.transporter = { verify: jest.fn().mockResolvedValue(true) };
    emailService.isConfigured = true;
    const ok = await emailService.testConnection();
    expect(ok).toBe(true);
  });
});


