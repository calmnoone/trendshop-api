const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// GET /api/users/me - get current user profile
router.get('/me', auth, (req, res, next) => {
  try {
    const user = db.findUser(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const { password, ...userInfo } = user;
    res.json({ code: 200, data: userInfo });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/me - update current user profile
router.put('/me', auth, validate([
  { field: 'avatar', max: 255 },
  { field: 'phone', max: 20 },
  { field: 'nickname', max: 30 },
  { field: 'bio', max: 200 },
  { field: 'gender', max: 10 },
  { field: 'birthday', max: 20 },
  { field: 'address', max: 100 },
]), (req, res, next) => {
  try {
    const { avatar, phone, nickname, bio, gender, birthday, address } = req.body;

    const userFields = {};
    if (avatar !== undefined) userFields.avatar = avatar;
    if (phone !== undefined) userFields.phone = phone;
    if (Object.keys(userFields).length > 0) {
      db.updateUser(req.user.id, userFields);
    }

    const profileFields = {};
    if (nickname !== undefined) profileFields.nickname = nickname;
    if (bio !== undefined) profileFields.bio = bio;
    if (gender !== undefined) profileFields.gender = gender;
    if (birthday !== undefined) profileFields.birthday = birthday;
    if (address !== undefined) profileFields.address = address;
    if (Object.keys(profileFields).length > 0) {
      db.updateProfile(req.user.id, profileFields);
    }

    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
