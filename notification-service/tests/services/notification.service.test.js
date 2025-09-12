jest.mock('../../src/config/metrics', () => ({
  notificationsSent: { inc: jest.fn() },
}));

jest.mock('../../src/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/models', () => ({
  Email: { create: jest.fn().mockResolvedValue({ id: 1 }) },
  SMS: { create: jest.fn().mockResolvedValue({ id: 1 }) },
}));

const NotificationService = require('../../src/services/notification.service');

const makeDeps = ({ emailSendResult, smsSendResult } = {}) => {
  return {
    emailProvider: {
      sendEmail: jest.fn().mockResolvedValue(emailSendResult ?? { success: true, id: 'e-1' }),
    },
    smsProvider: {
      sendSms: jest.fn().mockResolvedValue(smsSendResult ?? { success: true, id: 's-1' }),
    },
    templateService: {
      render: jest.fn((tpl, vars) => `rendered:${tpl}`),
    },
  };
};

describe('NotificationService - email', () => {
  test('sends email using provider and logs success', async () => {
    const deps = makeDeps();
    const svc = new NotificationService(deps);
    const res = await svc.sendEmail({ to: 'a@test.com', subject: 'Hi', template: 'auth_template/verificationEmail', variables: { name: 'A' }, from: 'noreply@test.com' });
    expect(deps.templateService.render).toHaveBeenCalledWith('email/auth_template/verificationEmail.hbs', { name: 'A' });
    expect(deps.emailProvider.sendEmail).toHaveBeenCalled();
    const { Email } = require('../../src/models');
    expect(Email.create).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });

  test('fails when neither html nor text is provided and no template', async () => {
    const deps = makeDeps();
    const svc = new NotificationService(deps);
    await expect(
      svc.sendEmail({ to: 'a@test.com', subject: 'Hi', from: 'noreply@test.com' })
    ).rejects.toThrow('Email requires either HTML or text content');
    const { Email } = require('../../src/models');
    expect(Email.create).toHaveBeenCalled();
  });

  test('logs and throws when HTML template rendering fails', async () => {
    const deps = makeDeps();
    deps.templateService.render.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const svc = new NotificationService(deps);
    await expect(
      svc.sendEmail({ to: 'a@test.com', subject: 'Hi', template: 'x', variables: {}, from: 'noreply@test.com' })
    ).rejects.toThrow('Template rendering failed: boom');
    const { Email } = require('../../src/models');
    expect(Email.create).toHaveBeenCalled();
  });

  test('increments failure metric and logs when provider throws', async () => {
    const deps = makeDeps({ emailSendResult: null });
    deps.emailProvider.sendEmail.mockRejectedValueOnce(new Error('provider down'));
    const svc = new NotificationService(deps);
    await expect(
      svc.sendEmail({ to: 'a@test.com', subject: 'Hi', html: '<b>x</b>', from: 'noreply@test.com' })
    ).rejects.toThrow('provider down');
    const { Email } = require('../../src/models');
    expect(Email.create).toHaveBeenCalled();
    const { notificationsSent } = require('../../src/config/metrics');
    expect(notificationsSent.inc).toHaveBeenCalledWith({ channel: 'email', status: 'failure' });
  });
});

describe('NotificationService - sms', () => {
  test('sends sms using provider and logs success', async () => {
    const deps = makeDeps();
    const svc = new NotificationService(deps);
    const res = await svc.sendSms({ to: '+84123456789', template: 'otp', variables: { code: '123456' }, from: 'SYS' });
    expect(deps.templateService.render).toHaveBeenCalledWith('sms/otp.hbs', { code: '123456' });
    expect(deps.smsProvider.sendSms).toHaveBeenCalled();
    const { SMS } = require('../../src/models');
    expect(SMS.create).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });

  test('fails when no text after rendering', async () => {
    const deps = makeDeps();
    deps.templateService.render.mockReturnValueOnce('');
    const svc = new NotificationService(deps);
    await expect(
      svc.sendSms({ to: '+84123456789', template: 'otp', variables: {}, from: 'SYS' })
    ).rejects.toThrow('SMS requires text content');
    const { SMS } = require('../../src/models');
    expect(SMS.create).toHaveBeenCalled();
  });

  test('logs and throws when template render throws', async () => {
    const deps = makeDeps();
    deps.templateService.render.mockImplementationOnce(() => { throw new Error('tpl'); });
    const svc = new NotificationService(deps);
    await expect(
      svc.sendSms({ to: '+84123456789', template: 'otp', variables: {}, from: 'SYS' })
    ).rejects.toThrow('SMS template rendering failed: tpl');
    const { SMS } = require('../../src/models');
    expect(SMS.create).toHaveBeenCalled();
  });

  test('increments failure metric and logs when provider throws', async () => {
    const deps = makeDeps({ smsSendResult: null });
    deps.smsProvider.sendSms.mockRejectedValueOnce(new Error('sms down'));
    const svc = new NotificationService(deps);
    await expect(
      svc.sendSms({ to: '+84123456789', text: 'hello', from: 'SYS' })
    ).rejects.toThrow('sms down');
    const { SMS } = require('../../src/models');
    expect(SMS.create).toHaveBeenCalled();
    const { notificationsSent } = require('../../src/config/metrics');
    expect(notificationsSent.inc).toHaveBeenCalledWith({ channel: 'sms', status: 'failure' });
  });

  test('extractCountryCode returns country for known prefixes', () => {
    const svc = new NotificationService(makeDeps());
    expect(svc.extractCountryCode('+841234')).toBe('VN');
    expect(svc.extractCountryCode('+11234')).toBe('US');
    expect(svc.extractCountryCode('+441234')).toBe('GB');
    expect(svc.extractCountryCode('+861234')).toBe('CN');
    expect(svc.extractCountryCode('+911234')).toBe('IN');
    expect(svc.extractCountryCode('+999999')).toBe('999');
    expect(svc.extractCountryCode(null)).toBeNull();
  });
});
