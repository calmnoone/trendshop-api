const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// POST /api/orders - create order
router.post('/', async (req, res, next) => {
  try {
    const { items, address, note } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ code: 400, message: '订单商品不能为空' });
    }
    for (const item of items) {
      if (!item.productId || !item.quantity) {
        return res.status(400).json({ code: 400, message: '商品ID和数量不能为空' });
      }
    }
    const result = await db.createOrder(req.user.id, { items, address, note });
    if (result.error) {
      return res.status(400).json({ code: 400, message: result.error });
    }
    res.status(201).json({ code: 201, message: '下单成功', data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders - list my orders
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));
    const result = await db.listOrders(req.user.id, { page, pageSize });
    res.json({ code: 200, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id - order detail
router.get('/:id', async (req, res, next) => {
  try {
    const order = await db.getOrder(parseInt(req.params.id));
    if (!order || order.userId !== req.user.id) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }
    res.json({ code: 200, data: order });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
