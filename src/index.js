const express = require('express');
const cors = require('cors');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

// Ensure db is initialized (creates data file, seeds products & default admin)
const db = require('./db');

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

const server = app.listen(config.port, () => {
  console.log(`TrendShop API running at http://localhost:${config.port}`);
});

// Graceful shutdown — close DB so WAL is checkpointed to .db file
function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  server.close(() => {
    db.close();
    console.log('Database closed. Goodbye.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000); // force exit after 5s
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
