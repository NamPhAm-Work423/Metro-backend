module.exports = {
  authorizeRoles: () => [(req, res, next) => next()],
  verifyServiceAuth: (req, res, next) => next(),
  legacyAuthorizeRoles: () => [(req, res, next) => next()],
  extractUser: (req, res, next) => next(),
};


