const { createAPIToken, hashToken, validateToken, sha256, generateResetToken } = require('../../../src/helpers/crypto.helper');

describe('crypto.helper', () => {
  test('createAPIToken and generateResetToken produce hex strings', () => {
    const t1 = createAPIToken();
    const t2 = generateResetToken();
    expect(t1).toMatch(/^[0-9a-f]+$/i);
    expect(t2).toMatch(/^[0-9a-f]+$/i);
    expect(t1).not.toBe(t2);
  });

  test('hashToken + validateToken round-trip', () => {
    const secret = 's3cr3t';
    const token = 'abc';
    const hashed = hashToken(token, secret);
    expect(typeof hashed).toBe('string');
    expect(validateToken(token, hashed, secret)).toBe(true);
    expect(validateToken('wrong', hashed, secret)).toBe(false);
  });

  test('sha256 returns stable digest', () => {
    expect(sha256('x')).toBe(sha256('x'));
    expect(sha256('x')).not.toBe(sha256('y'));
  });
});


