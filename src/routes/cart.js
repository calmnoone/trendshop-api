const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All cart routes require auth
router.use(auth);

// GET /api/cart - get cart
router.get('/', async (req, res, next) => {
  try {
    const cart = await db.getCartDetail(req.user.id);
    res.json({ code: 200, data: cart });
  } catch (err) {
    next(err);
  }
});

// POST /api/cart - add to cart
router.post('/', async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId) {
      return res.status(400).json({ code: 400, message: '商品ID不能为空' });
    }
    const result = await db.addToCart(req.user.id, { productId, quantity: quantity || 1 });
    if (result.error) {
      return res.status(400).json({ code: 400, message: result.error });
    }
    res.json({ code: 200, message: '已添加到购物车', data: result });
  } catch (err) {
    next(err);
  }
});

// PUT /api/cart/:productId - update cart item quantity
router.put('/:productId', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId);
    const { quantity } = req.body;
    if (quantity === undefined) {
      return res.status(400).json({ code: 400, message: '数量不能为空' });
    }
    const result = await db.updateCartItem(req.user.id, productId, quantity);
    if (result.error) {
      return res.status(400).json({ code: 400, message: result.error });
    }
    res.json({ code: 200, message: '已更新', data: result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart/:productId - remove from cart
router.delete('/:productId', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId);
    const result = await db.removeCartItem(req.user.id, productId);
    res.json({ code: 200, message: '已移除', data: result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart - clear cart
router.delete('/', async (req, res, next) => {
  try {
    await db.clearCart(req.user.id);
    res.json({ code: 200, message: '购物车已清空', data: { items: [], total: 0, count: 0 } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
