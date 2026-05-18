require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  tursoDbUrl: process.env.TURSO_DB_URL,
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN,
  localDev: process.env.LOCAL_DEV === 'true',
};
