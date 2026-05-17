const jwt = require('jsonwebtoken');
const config = require('../config');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
  }

  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    return res.status(401).json({ code: 401, message: 'token无效或已过期' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], config.jwtSecret);
    } catch { /* ignore invalid token */ }
  }
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '无权限，仅管理员可操作' });
  }
  next();
}

module.exports = { auth, adminOnly, optionalAuth };
