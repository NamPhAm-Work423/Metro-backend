const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-secret-key';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

class TokensService {
  /**
   * Create access and refresh tokens for a user
   * @param {string} userId
   * @param {string} username
   * @param {string[]} roles
   * @returns {{ accessToken: string, refreshToken: string }}
   */
  async createTokens(userId, username, roles) {
    const tokenPayload = {
      id: userId,
      userId,
      username,
      roles: roles || ['passenger']
    };

    const [accessToken, refreshToken] = await Promise.all([
      new Promise((resolve) => {
        const token = jwt.sign(
          tokenPayload,
          ACCESS_TOKEN_SECRET,
          { expiresIn: ACCESS_TOKEN_EXPIRES_IN, algorithm: 'HS256' }
        );
        resolve(token);
      }),

      new Promise((resolve) => {
        const token = jwt.sign(
          { userId, username },
          REFRESH_TOKEN_SECRET,
          { expiresIn: REFRESH_TOKEN_EXPIRES_IN, algorithm: 'HS256' }
        );
        resolve(token);
      })
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Verify a refresh token and create a new access token
   * @param {string} refreshToken
   * @param {{ id: string, username: string, roles: string[] }} user
   * @returns {{ accessToken: string }}
   */
  async refreshAccessToken(refreshToken, user) {
    // Verify provided refresh token belongs to the same user
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    if (!decoded || decoded.userId !== user.id) {
      throw new Error('Invalid refresh token');
    }

    const accessToken = jwt.sign(
      { id: user.id, userId: user.id, username: user.username, roles: user.roles },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    return { accessToken };
  }
}

module.exports = new TokensService();


