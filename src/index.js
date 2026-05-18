const express = require('express');
const cors = require('cors');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profile');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const wishlistRoutes = require('./routes/wishlist');

const app = express();

app.use(cors());
app.use(express.json());

// Routes — register /me before /:id to avoid param conflict
app.use('/api/auth', authRoutes);
app.use('/api/users', profileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ code: 200, message: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Vercel serverless export
module.exports = app;

// Local development server
if (config.localDev) {
  const port = config.port;
  app.listen(port, () => {
    console.log(`TrendShop API running at http://localhost:${port}`);
  });
}
