const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// GET /api/wishlist - get wishlist
router.get('/', async (req, res, next) => {
  try {
    const list = await db.getWishlist(req.user.id);
    res.json({ code: 200, data: list });
  } catch (err) {
    next(err);
  }
});

// POST /api/wishlist - add to wishlist
router.post('/', async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ code: 400, message: '商品ID不能为空' });
    }
    const result = await db.addToWishlist(req.user.id, productId);
    if (result.error) {
      return res.status(400).json({ code: 400, message: result.error });
    }
    res.json({ code: 200, message: '已收藏', data: result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/wishlist/:productId - remove from wishlist
router.delete('/:productId', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId);
    const result = await db.removeFromWishlist(req.user.id, productId);
    res.json({ code: 200, message: '已取消收藏', data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
