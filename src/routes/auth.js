const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const validate = require('../middleware/validate');

const router = express.Router();

// POST /api/auth/register
router.post('/register', validate([
  { field: 'username', required: true, min: 3, max: 20, message: '用户名长度需要3-20位' },
  { field: 'password', required: true, min: 6, max: 32, message: '密码长度需要6-32位' },
  { field: 'email', type: 'email', required: true, message: '邮箱格式不正确' },
]), async (req, res, next) => {
  try {
    const { username, password, email } = req.body;

    if (await db.findUserByUsername(username)) {
      return res.status(409).json({ code: 409, message: '用户名已存在' });
    }
    if (await db.findUserByEmail(email)) {
      return res.status(409).json({ code: 409, message: '邮箱已存在' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await db.createUser({ username, email, password: hashed });

    res.status(201).json({ code: 201, message: '注册成功', data: { id: user.id } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', validate([
  { field: 'username', required: true, message: '用户名不能为空' },
  { field: 'password', required: true, message: '密码不能为空' },
]), async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    if (user.status === 0) {
      return res.status(403).json({ code: 403, message: '账号已被禁用，请联系管理员' });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    const { password: _, ...userInfo } = user;
    res.json({
      code: 200,
      message: '登录成功',
      data: { token, user: userInfo },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
