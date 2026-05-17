const path = require('path');
const fs = require('fs');
const config = require('../config');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.resolve(config.dbPath);

// Ensure data directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = DELETE');
db.exec('PRAGMA foreign_keys = ON');

// ─── Schema ─────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
    status INTEGER NOT NULL DEFAULT 1 CHECK(status IN (0,1)),
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    nickname TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    gender TEXT DEFAULT 'secret' CHECK(gender IN ('male','female','secret')),
    birthday TEXT DEFAULT '',
    address TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    original_price REAL,
    image TEXT DEFAULT '',
    badge TEXT DEFAULT '',
    badge_type TEXT DEFAULT '',
    rating REAL DEFAULT 0,
    reviews INTEGER DEFAULT 0,
    stock INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    added_at TEXT,
    UNIQUE(user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    address TEXT DEFAULT '',
    note TEXT DEFAULT '',
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    name TEXT,
    price REAL,
    quantity INTEGER,
    subtotal REAL
  );

  CREATE TABLE IF NOT EXISTS wishlists (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, product_id)
  );
`);

// ─── Seed data ──────────────────────────────────────────────────────────────

function formatDate(d) {
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

const now = formatDate(new Date());

// Seed admin user
const adminCount = db.prepare('SELECT COUNT(*) AS c FROM users').get();
if (adminCount.c === 0) {
  const hashed = bcrypt.hashSync('admin123', 10);
  const result = db.prepare(
    'INSERT INTO users (username, email, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run('admin', 'admin@trendshop.com', hashed, 'admin', now, now);
  db.prepare(
    'INSERT INTO user_profiles (user_id, nickname) VALUES (?, ?)'
  ).run(result.lastInsertRowid, '超级管理员');
}

// Seed products
const prodCount = db.prepare('SELECT COUNT(*) AS c FROM products').get();
if (prodCount.c === 0) {
  const insert = db.prepare(
    'INSERT INTO products (name, category, price, original_price, image, badge, badge_type, rating, reviews, stock, description, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  );
  const products = [
    ['经典纯棉T恤 男女同款', '男装', 129, 259, 'tshirt', '热卖', 'hot', 4.8, 2300, 200, '舒适透气100%纯棉面料，简约圆领设计'],
    ['时尚斜挎包 简约百搭', '包包', 199, 399, 'bag', '新品', 'new', 4.9, 856, 80, '头层牛皮制作，大容量设计，通勤出游皆宜'],
    ['无线降噪耳机 Pro', '数码', 599, 899, 'headphone', '', '', 4.7, 1500, 50, '主动降噪，40小时续航，Hi-Res音质认证'],
    ['简约石英腕表 男款', '配饰', 899, 1599, 'watch', '限时特惠', 'hot', 4.9, 3100, 30, '进口机芯，蓝宝石镜面，50米防水'],
    ['复古太阳镜 防紫外线', '配饰', 159, 299, 'sunglass', '', '', 4.6, 620, 150, '偏光镜片，UV400防护，轻盈钛合金框架'],
    ['磁吸手机壳 防摔保护', '数码', 79, 129, 'phonecase', '新品', 'new', 4.7, 428, 300, 'MagSafe磁吸，军工级防摔，亲肤手感涂层'],
    ['复古运动鞋 老爹鞋', '鞋履', 459, 699, 'shoe', '爆款', 'hot', 4.8, 4200, 60, 'EVA缓震中底，网面透气鞋面，复古拼色设计'],
    ['微单相机包 防水便携', '包包', 249, 399, 'camera', '', '', 4.5, 198, 45, '防水面料，可调节隔层，一机两镜容量'],
    ['休闲束脚运动裤 男款', '男装', 179, 349, 'pants', '热卖', 'hot', 4.7, 1800, 120, '弹力棉质面料，束脚版型，运动休闲两穿'],
    ['法式碎花连衣裙', '女装', 239, 459, 'dress', '新品', 'new', 4.8, 950, 70, '雪纺面料，收腰A字版型，浪漫碎花印花'],
    ['真皮手提托特包', '女装', 359, 699, 'totebag', '热卖', 'hot', 4.9, 2100, 40, '二层牛皮，极简设计，可放14寸笔记本'],
    ['潮流鸭舌帽 男女同款', '配饰', 89, 159, 'cap', '', '', 4.5, 720, 200, '纯棉斜纹布，可调节头围，刺绣logo'],
  ];
  for (const p of products) {
    insert.run(...p, now);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function userRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    avatar: row.avatar,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    profile: {
      nickname: row.nickname || '',
      bio: row.bio || '',
      gender: row.gender || 'secret',
      birthday: row.birthday || '',
      address: row.address || '',
    },
  };
}

function productRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    originalPrice: row.original_price,
    image: row.image,
    badge: row.badge,
    badgeType: row.badge_type,
    rating: row.rating,
    reviews: row.reviews,
    stock: row.stock,
    desc: row.description,
    createdAt: row.created_at,
  };
}

const USER_SELECT = `SELECT u.*, p.nickname, p.bio, p.gender, p.birthday, p.address
  FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id`;

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  // Raw db for direct SQL access if needed
  get db() { return db; },

  // ── Users ───────────────────────────────────────────────────────────────

  findUser(id) {
    return userRow(db.prepare(USER_SELECT + ' WHERE u.id = ?').get(id));
  },

  findUserByUsername(username) {
    return userRow(db.prepare(USER_SELECT + ' WHERE u.username = ?').get(username));
  },

  findUserByEmail(email) {
    return userRow(db.prepare(USER_SELECT + ' WHERE u.email = ?').get(email));
  },

  createUser({ username, email, password }) {
    const now = formatDate(new Date());
    const result = db.prepare(
      'INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?,?,?,?,?)'
    ).run(username, email, password, now, now);
    db.prepare('INSERT INTO user_profiles (user_id) VALUES (?)').run(result.lastInsertRowid);
    return this.findUser(Number(result.lastInsertRowid));
  },

  updateUser(id, fields) {
    const user = this.findUser(id);
    if (!user) return null;
    const sets = [];
    const vals = [];
    for (const k of ['username', 'email', 'avatar', 'phone', 'role', 'status']) {
      if (fields[k] !== undefined) { sets.push(`${k} = ?`); vals.push(fields[k]); }
    }
    if (sets.length > 0) {
      sets.push('updated_at = ?'); vals.push(formatDate(new Date()));
      vals.push(id);
      db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    }
    return this.findUser(id);
  },

  updateProfile(id, fields) {
    const user = this.findUser(id);
    if (!user) return null;
    const sets = [];
    const vals = [];
    for (const k of ['nickname', 'bio', 'gender', 'birthday', 'address']) {
      if (fields[k] !== undefined) { sets.push(`${k} = ?`); vals.push(fields[k]); }
    }
    if (sets.length > 0) {
      vals.push(id);
      db.prepare(`UPDATE user_profiles SET ${sets.join(', ')} WHERE user_id = ?`).run(...vals);
    }
    return this.findUser(id);
  },

  deleteUser(id) {
    const user = this.findUser(id);
    if (!user) return false;
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return true;
  },

  listUsers({ page, pageSize, keyword, role, status }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) {
      where += ' AND (u.username LIKE ? OR u.email LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (role) { where += ' AND u.role = ?'; params.push(role); }
    if (status !== undefined && status !== '') { where += ' AND u.status = ?'; params.push(parseInt(status)); }

    const total = db.prepare(`SELECT COUNT(*) AS c FROM users u ${where}`).get(...params).c;
    const offset = (page - 1) * pageSize;
    const rows = db.prepare(USER_SELECT + ` ${where} ORDER BY u.id DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);
    return {
      list: rows.map(userRow).map(u => { const { password, ...rest } = u; return rest; }),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  // ── Products ────────────────────────────────────────────────────────────

  findProduct(id) {
    return productRow(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
  },

  listProducts({ page, pageSize, category, keyword, sort }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (category && category !== '全部') { where += ' AND category = ?'; params.push(category); }
    if (keyword) { where += ' AND (name LIKE ? OR category LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }

    let orderBy = 'ORDER BY id DESC';
    if (sort === 'price-asc') orderBy = 'ORDER BY price ASC';
    if (sort === 'price-desc') orderBy = 'ORDER BY price DESC';
    if (sort === 'rating') orderBy = 'ORDER BY rating DESC';
    if (sort === 'sales') orderBy = 'ORDER BY reviews DESC';

    const total = db.prepare(`SELECT COUNT(*) AS c FROM products ${where}`).get(...params).c;
    const offset = (page - 1) * pageSize;
    const rows = db.prepare(`SELECT * FROM products ${where} ${orderBy} LIMIT ? OFFSET ?`).all(...params, pageSize, offset);
    return {
      list: rows.map(productRow),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  getCategories() {
    return db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all().map(r => r.category);
  },

  // ── Cart ────────────────────────────────────────────────────────────────

  addToCart(userId, { productId, quantity = 1 }) {
    const product = this.findProduct(productId);
    if (!product) return { error: '商品不存在' };
    const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, productId);
    if (existing) {
      db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?').run(quantity, userId, productId);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, quantity, added_at) VALUES (?,?,?,?)').run(userId, productId, quantity, formatDate(new Date()));
    }
    return this.getCartDetail(userId);
  },

  updateCartItem(userId, productId, quantity) {
    const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, productId);
    if (!existing) return { error: '购物车中无此商品' };
    if (quantity <= 0) return this.removeCartItem(userId, productId);
    db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?').run(quantity, userId, productId);
    return this.getCartDetail(userId);
  },

  removeCartItem(userId, productId) {
    db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(userId, productId);
    return this.getCartDetail(userId);
  },

  clearCart(userId) {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
  },

  getCartDetail(userId) {
    const rows = db.prepare(
      `SELECT ci.product_id, ci.quantity, p.name, p.image, p.price
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = ? ORDER BY ci.added_at DESC`
    ).all(userId);
    const items = rows.map(r => ({
      productId: r.product_id,
      name: r.name,
      image: r.image,
      price: r.price,
      quantity: r.quantity,
      subtotal: r.price * r.quantity,
    }));
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    return { items, total, count: items.length };
  },

  // ── Orders ──────────────────────────────────────────────────────────────

  createOrder(userId, { items, address, note }) {
    const user = this.findUser(userId);
    if (!user) return { error: '用户不存在' };

    const orderItems = [];
    let total = 0;
    for (const { productId, quantity } of items) {
      const product = this.findProduct(productId);
      if (!product) return { error: `商品 ID ${productId} 不存在` };
      if (product.stock < quantity) return { error: `${product.name} 库存不足` };
      orderItems.push({ productId: product.id, name: product.name, price: product.price, quantity, subtotal: product.price * quantity });
      total += product.price * quantity;
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, productId);
    }

    const orderId = Date.now();
    db.prepare(
      'INSERT INTO orders (id, user_id, total, status, address, note, created_at) VALUES (?,?,?,?,?,?,?)'
    ).run(orderId, userId, total, 'pending', address || user.profile.address || '', note || '', formatDate(new Date()));

    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, name, price, quantity, subtotal) VALUES (?,?,?,?,?,?)'
    );
    for (const item of orderItems) {
      insertItem.run(orderId, item.productId, item.name, item.price, item.quantity, item.subtotal);
    }

    this.clearCart(userId);
    return this.getOrder(orderId);
  },

  listOrders(userId, { page, pageSize }) {
    const total = db.prepare('SELECT COUNT(*) AS c FROM orders WHERE user_id = ?').get(userId).c;
    const offset = (page - 1) * pageSize;
    const orders = db.prepare(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(userId, pageSize, offset);

    const list = orders.map(o => {
      const items = db.prepare(
        'SELECT product_id, name, price, quantity, subtotal FROM order_items WHERE order_id = ?'
      ).all(o.id);
      return {
        id: o.id,
        userId: o.user_id,
        items: items.map(i => ({ productId: i.product_id, name: i.name, price: i.price, quantity: i.quantity, subtotal: i.subtotal })),
        total: o.total,
        status: o.status,
        address: o.address,
        note: o.note,
        createdAt: o.created_at,
      };
    });
    return { list, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  },

  getOrder(orderId) {
    const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!o) return null;
    const items = db.prepare(
      'SELECT product_id, name, price, quantity, subtotal FROM order_items WHERE order_id = ?'
    ).all(o.id);
    return {
      id: o.id,
      userId: o.user_id,
      items: items.map(i => ({ productId: i.product_id, name: i.name, price: i.price, quantity: i.quantity, subtotal: i.subtotal })),
      total: o.total,
      status: o.status,
      address: o.address,
      note: o.note,
      createdAt: o.created_at,
    };
  },

  // ── Wishlist ────────────────────────────────────────────────────────────

  getWishlist(userId) {
    const rows = db.prepare(
      `SELECT p.* FROM wishlists w JOIN products p ON p.id = w.product_id WHERE w.user_id = ?`
    ).all(userId);
    return rows.map(productRow);
  },

  addToWishlist(userId, productId) {
    const product = this.findProduct(productId);
    if (!product) return { error: '商品不存在' };
    db.prepare('INSERT OR IGNORE INTO wishlists (user_id, product_id) VALUES (?,?)').run(userId, productId);
    return this.getWishlist(userId);
  },

  removeFromWishlist(userId, productId) {
    db.prepare('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?').run(userId, productId);
    return this.getWishlist(userId);
  },

  close() {
    db.close();
  },
};
