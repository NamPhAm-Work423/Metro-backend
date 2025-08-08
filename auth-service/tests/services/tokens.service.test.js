const tokensService = require('../../src/services/tokens.service');
const jwt = require('jsonwebtoken');

describe('TokensService', () => {
  test('createTokens returns access and refresh tokens with payload', async () => {
    const { accessToken, refreshToken } = await tokensService.createTokens('u1', 'john', ['passenger']);

    const access = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    const refresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    expect(access.userId).toBe('u1');
    expect(access.username).toBe('john');
    expect(access.roles).toEqual(['passenger']);
    expect(refresh.userId).toBe('u1');
  });

  test('refreshAccessToken validates token and returns new access token', async () => {
    const { refreshToken } = await tokensService.createTokens('u2', 'alice', ['staff']);
    const { accessToken } = await tokensService.refreshAccessToken(refreshToken, {
      id: 'u2', username: 'alice', roles: ['staff']
    });
    const access = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    expect(access.userId).toBe('u2');
  });

  test('refreshAccessToken throws on mismatched subject', async () => {
    const { refreshToken } = await tokensService.createTokens('u3', 'bob', ['passenger']);
    await expect(tokensService.refreshAccessToken(refreshToken, { id: 'wrong', username: 'bob', roles: [] }))
      .rejects.toThrow('Invalid refresh token');
  });

  test('createTokens defaults roles to ["passenger"] when roles not provided', async () => {
    const { accessToken } = await tokensService.createTokens('u4', 'noRoles');
    const access = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    expect(access.roles).toEqual(['passenger']);
  });

  test('refreshAccessToken propagates error when jwt.verify throws', async () => {
    const { refreshToken } = await tokensService.createTokens('u5', 'err', ['staff']);
    const original = jwt.verify;
    jwt.verify = jest.fn(() => { throw new Error('bad token'); });
    await expect(tokensService.refreshAccessToken(refreshToken, { id: 'u5', username: 'err', roles: ['staff'] }))
      .rejects.toThrow('bad token');
    jwt.verify = original;
  });
});


