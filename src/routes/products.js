const express = require('express');
const db = require('../db');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/products/categories - get all categories
router.get('/categories', (_req, res) => {
  res.json({ code: 200, data: db.getCategories() });
});

// GET /api/products - list products (public)
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 12));
  const { category, keyword, sort } = req.query;
  const result = db.listProducts({ page, pageSize, category, keyword, sort });
  res.json({ code: 200, data: result });
});

// GET /api/products/:id - product detail (public)
router.get('/:id', (req, res) => {
  const product = db.findProduct(parseInt(req.params.id));
  if (!product) {
    return res.status(404).json({ code: 404, message: '商品不存在' });
  }
  res.json({ code: 200, data: product });
});

module.exports = router;
