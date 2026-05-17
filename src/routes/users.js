const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// GET /api/users - list users (admin only)
router.get('/', auth, adminOnly, (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 10));
    const { keyword, role, status } = req.query;

    const result = db.listUsers({ page, pageSize, keyword, role, status });
    res.json({ code: 200, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id - get user detail (admin only)
router.get('/:id', auth, adminOnly, (req, res, next) => {
  try {
    const user = db.findUser(parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const { password, ...userInfo } = user;
    res.json({ code: 200, data: userInfo });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id - update user (admin only)
router.put('/:id', auth, adminOnly, validate([
  { field: 'email', type: 'email', message: '邮箱格式不正确' },
  { field: 'role', max: 10 },
  { field: 'username', min: 3, max: 20 },
]), (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, email, avatar, phone, role, status } = req.body;

    const existing = db.findUser(userId);
    if (!existing) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const fields = {};
    if (username !== undefined) fields.username = username;
    if (email !== undefined) fields.email = email;
    if (avatar !== undefined) fields.avatar = avatar;
    if (phone !== undefined) fields.phone = phone;
    if (role !== undefined) fields.role = role;
    if (status !== undefined) fields.status = status;

    db.updateUser(userId, fields);

    // Check for profile fields
    const { nickname, bio, gender, birthday, address: addr } = req.body;
    const profileFields = {};
    if (nickname !== undefined) profileFields.nickname = nickname;
    if (bio !== undefined) profileFields.bio = bio;
    if (gender !== undefined) profileFields.gender = gender;
    if (birthday !== undefined) profileFields.birthday = birthday;
    if (addr !== undefined) profileFields.address = addr;
    if (Object.keys(profileFields).length > 0) {
      db.updateProfile(userId, profileFields);
    }

    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id - delete user (admin only)
router.delete('/:id', auth, adminOnly, (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId === req.user.id) {
      return res.status(400).json({ code: 400, message: '不能删除自己的账号' });
    }

    if (!db.findUser(userId)) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    db.deleteUser(userId);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
