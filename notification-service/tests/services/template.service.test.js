const fs = require('fs');
jest.mock('fs');

jest.mock('../../src/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const path = require('path');
const TemplateService = require('../../src/services/template.service');

describe('TemplateService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.NODE_ENV;
  });

  test('resolve returns absolute path under baseDir', () => {
    const svc = new TemplateService('/base');
    const p = svc.resolve('email/x.hbs');
    expect(p).toBe(path.join('/base', 'email/x.hbs'));
  });

  test('render compiles and returns content', () => {
    const svc = new TemplateService('/base');
    fs.readFileSync.mockReturnValueOnce('Hello {{name}}');
    const out = svc.render('email/x.hbs', { name: 'World' });
    expect(out).toContain('Hello World');
  });

  test('loadTemplate tries fallbacks and throws when missing', () => {
    const svc = new TemplateService('/base');
    fs.readFileSync.mockImplementation(() => { throw new Error('nope'); });
    expect(() => svc.loadTemplate('email/missing.hbs')).toThrow('Template not found');
  });

  test('cache stores compiled template in production', () => {
    process.env.NODE_ENV = 'production';
    const svc = new TemplateService('/base');
    fs.readFileSync.mockReturnValueOnce('Hi');
    const compiled1 = svc.loadTemplate('email/a.hbs');
    fs.readFileSync.mockClear();
    const compiled2 = svc.loadTemplate('email/a.hbs');
    expect(typeof compiled1).toBe('function');
    expect(compiled2).toBe(compiled1);
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });
});

