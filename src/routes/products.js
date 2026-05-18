const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/products/categories - get all categories
router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await db.getCategories();
    res.json({ code: 200, data: categories });
  } catch (err) {
    next(err);
  }
});

// GET /api/products - list products (public)
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 12));
    const { category, keyword, sort } = req.query;
    const result = await db.listProducts({ page, pageSize, category, keyword, sort });
    res.json({ code: 200, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id - product detail (public)
router.get('/:id', async (req, res, next) => {
  try {
    const product = await db.findProduct(parseInt(req.params.id));
    if (!product) {
      return res.status(404).json({ code: 404, message: '商品不存在' });
    }
    res.json({ code: 200, data: product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
