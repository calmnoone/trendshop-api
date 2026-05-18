const config = require('../config');
const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client/http');

let client = null;
let initPromise = null;

function getClient() {
  if (!client) {
    if (!config.tursoDbUrl || !config.tursoAuthToken) {
      throw new Error('TURSO_DB_URL and TURSO_AUTH_TOKEN must be set in .env');
    }
    client = createClient({
      url: config.tursoDbUrl,
      authToken: config.tursoAuthToken,
    });
  }
  return client;
}

function formatDate(d) {
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

// ─── Schema DDL ──────────────────────────────────────────────────────────────

const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
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
  )`,
  `CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    nickname TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    gender TEXT DEFAULT 'secret' CHECK(gender IN ('male','female','secret')),
    birthday TEXT DEFAULT '',
    address TEXT DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS products (
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
  )`,
  `CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    added_at TEXT,
    UNIQUE(user_id, product_id)
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    address TEXT DEFAULT '',
    note TEXT DEFAULT '',
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    name TEXT,
    price REAL,
    quantity INTEGER,
    subtotal REAL
  )`,
  `CREATE TABLE IF NOT EXISTS wishlists (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, product_id)
  )`,
];

// ─── Lazy init (idempotent) ──────────────────────────────────────────────────

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const c = getClient();

        // Run schema DDL (idempotent: IF NOT EXISTS)
        await c.batch(DDL, 'write');

        const now = formatDate(new Date());

        // Seed admin user if users table is empty
        const adminRs = await c.execute('SELECT COUNT(*) AS c FROM users');
        if (adminRs.rows[0].c === 0) {
          const hashed = await bcrypt.hash('admin123', 10);
          const result = await c.execute({
            sql: "INSERT INTO users (username, email, password, role, created_at, updated_at) VALUES (?, ?, ?, 'admin', ?, ?)",
            args: ['admin', 'admin@trendshop.com', hashed, now, now],
          });
          await c.execute({
            sql: 'INSERT INTO user_profiles (user_id, nickname) VALUES (?, ?)',
            args: [Number(result.lastInsertRowid), '超级管理员'],
          });
        }

        // Seed products if products table is empty
        const prodRs = await c.execute('SELECT COUNT(*) AS c FROM products');
        if (prodRs.rows[0].c === 0) {
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
          const insertStmts = products.map(p => ({
            sql: 'INSERT INTO products (name, category, price, original_price, image, badge, badge_type, rating, reviews, stock, description, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            args: [...p, now],
          }));
          await c.batch(insertStmts, 'write');
        }
      } catch (err) {
        initPromise = null;
        throw err;
      }
    })();
  }
  return initPromise;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  // ── Users ────────────────────────────────────────────────────────────────

  async findUser(id) {
    await ensureInitialized();
    const rs = await getClient().execute({ sql: USER_SELECT + ' WHERE u.id = ?', args: [id] });
    return userRow(rs.rows[0]);
  },

  async findUserByUsername(username) {
    await ensureInitialized();
    const rs = await getClient().execute({ sql: USER_SELECT + ' WHERE u.username = ?', args: [username] });
    return userRow(rs.rows[0]);
  },

  async findUserByEmail(email) {
    await ensureInitialized();
    const rs = await getClient().execute({ sql: USER_SELECT + ' WHERE u.email = ?', args: [email] });
    return userRow(rs.rows[0]);
  },

  async createUser({ username, email, password }) {
    await ensureInitialized();
    const c = getClient();
    const now = formatDate(new Date());
    const tx = await c.transaction('write');
    try {
      const result = await tx.execute({
        sql: 'INSERT INTO users (username, email, password, created_at, updated_at) VALUES (?,?,?,?,?)',
        args: [username, email, password, now, now],
      });
      const userId = Number(result.lastInsertRowid);
      await tx.execute({
        sql: 'INSERT INTO user_profiles (user_id) VALUES (?)',
        args: [userId],
      });
      await tx.commit();
      return self.findUser(userId);
    } finally {
      tx.close();
    }
  },

  async updateUser(id, fields) {
    await ensureInitialized();
    const user = await self.findUser(id);
    if (!user) return null;
    const sets = [];
    const vals = [];
    for (const k of ['username', 'email', 'avatar', 'phone', 'role', 'status']) {
      if (fields[k] !== undefined) { sets.push(`${k} = ?`); vals.push(fields[k]); }
    }
    if (sets.length > 0) {
      sets.push('updated_at = ?'); vals.push(formatDate(new Date()));
      vals.push(id);
      await getClient().execute({ sql: `UPDATE users SET ${sets.join(', ')} WHERE id = ?`, args: vals });
    }
    return self.findUser(id);
  },

  async updateProfile(id, fields) {
    await ensureInitialized();
    const user = await self.findUser(id);
    if (!user) return null;
    const sets = [];
    const vals = [];
    for (const k of ['nickname', 'bio', 'gender', 'birthday', 'address']) {
      if (fields[k] !== undefined) { sets.push(`${k} = ?`); vals.push(fields[k]); }
    }
    if (sets.length > 0) {
      vals.push(id);
      await getClient().execute({ sql: `UPDATE user_profiles SET ${sets.join(', ')} WHERE user_id = ?`, args: vals });
    }
    return self.findUser(id);
  },

  async deleteUser(id) {
    await ensureInitialized();
    const user = await self.findUser(id);
    if (!user) return false;
    await getClient().execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
    return true;
  },

  async listUsers({ page, pageSize, keyword, role, status }) {
    await ensureInitialized();
    const c = getClient();
    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) {
      where += ' AND (u.username LIKE ? OR u.email LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (role) { where += ' AND u.role = ?'; params.push(role); }
    if (status !== undefined && status !== '') { where += ' AND u.status = ?'; params.push(parseInt(status)); }

    const totalRs = await c.execute({ sql: `SELECT COUNT(*) AS c FROM users u ${where}`, args: params });
    const total = totalRs.rows[0].c;
    const offset = (page - 1) * pageSize;
    const rs = await c.execute({
      sql: USER_SELECT + ` ${where} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
      args: [...params, pageSize, offset],
    });
    return {
      list: rs.rows.map(userRow).map(u => { const { password, ...rest } = u; return rest; }),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  // ── Products ─────────────────────────────────────────────────────────────

  async findProduct(id) {
    await ensureInitialized();
    const rs = await getClient().execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [id] });
    return productRow(rs.rows[0]);
  },

  async listProducts({ page, pageSize, category, keyword, sort }) {
    await ensureInitialized();
    const c = getClient();
    let where = 'WHERE 1=1';
    const params = [];
    if (category && category !== '全部') { where += ' AND category = ?'; params.push(category); }
    if (keyword) { where += ' AND (name LIKE ? OR category LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }

    let orderBy = 'ORDER BY id DESC';
    if (sort === 'price-asc') orderBy = 'ORDER BY price ASC';
    if (sort === 'price-desc') orderBy = 'ORDER BY price DESC';
    if (sort === 'rating') orderBy = 'ORDER BY rating DESC';
    if (sort === 'sales') orderBy = 'ORDER BY reviews DESC';

    const totalRs = await c.execute({ sql: `SELECT COUNT(*) AS c FROM products ${where}`, args: params });
    const total = totalRs.rows[0].c;
    const offset = (page - 1) * pageSize;
    const rs = await c.execute({
      sql: `SELECT * FROM products ${where} ${orderBy} LIMIT ? OFFSET ?`,
      args: [...params, pageSize, offset],
    });
    return {
      list: rs.rows.map(productRow),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async getCategories() {
    await ensureInitialized();
    const rs = await getClient().execute('SELECT DISTINCT category FROM products ORDER BY category');
    return rs.rows.map(r => r.category);
  },

  // ── Cart ─────────────────────────────────────────────────────────────────

  async addToCart(userId, { productId, quantity = 1 }) {
    await ensureInitialized();
    const c = getClient();
    const product = await self.findProduct(productId);
    if (!product) return { error: '商品不存在' };
    const existingRs = await c.execute({
      sql: 'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
      args: [userId, productId],
    });
    if (existingRs.rows[0]) {
      await c.execute({
        sql: 'UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
        args: [quantity, userId, productId],
      });
    } else {
      await c.execute({
        sql: 'INSERT INTO cart_items (user_id, product_id, quantity, added_at) VALUES (?,?,?,?)',
        args: [userId, productId, quantity, formatDate(new Date())],
      });
    }
    return self.getCartDetail(userId);
  },

  async updateCartItem(userId, productId, quantity) {
    await ensureInitialized();
    const c = getClient();
    const existingRs = await c.execute({
      sql: 'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
      args: [userId, productId],
    });
    if (!existingRs.rows[0]) return { error: '购物车中无此商品' };
    if (quantity <= 0) return self.removeCartItem(userId, productId);
    await c.execute({
      sql: 'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?',
      args: [quantity, userId, productId],
    });
    return self.getCartDetail(userId);
  },

  async removeCartItem(userId, productId) {
    await ensureInitialized();
    await getClient().execute({
      sql: 'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
      args: [userId, productId],
    });
    return self.getCartDetail(userId);
  },

  async clearCart(userId) {
    await ensureInitialized();
    await getClient().execute({ sql: 'DELETE FROM cart_items WHERE user_id = ?', args: [userId] });
  },

  async getCartDetail(userId) {
    await ensureInitialized();
    const rs = await getClient().execute({
      sql: `SELECT ci.product_id, ci.quantity, p.name, p.image, p.price
            FROM cart_items ci JOIN products p ON p.id = ci.product_id
            WHERE ci.user_id = ? ORDER BY ci.added_at DESC`,
      args: [userId],
    });
    const items = rs.rows.map(r => ({
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

  // ── Orders ───────────────────────────────────────────────────────────────

  async createOrder(userId, { items, address, note }) {
    await ensureInitialized();
    const c = getClient();
    const user = await self.findUser(userId);
    if (!user) return { error: '用户不存在' };

    const tx = await c.transaction('write');
    try {
      const orderItems = [];
      let total = 0;

      for (const { productId, quantity } of items) {
        // Look up product inside the transaction for consistency
        const prodRs = await tx.execute({
          sql: 'SELECT * FROM products WHERE id = ?',
          args: [productId],
        });
        const product = prodRs.rows[0];
        if (!product) {
          await tx.rollback();
          return { error: `商品 ID ${productId} 不存在` };
        }
        if (product.stock < quantity) {
          await tx.rollback();
          return { error: `${product.name} 库存不足` };
        }
        orderItems.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
          subtotal: product.price * quantity,
        });
        total += product.price * quantity;

        // Decrement stock
        await tx.execute({
          sql: 'UPDATE products SET stock = stock - ? WHERE id = ?',
          args: [quantity, productId],
        });
      }

      const orderId = Date.now();
      await tx.execute({
        sql: 'INSERT INTO orders (id, user_id, total, status, address, note, created_at) VALUES (?,?,?,?,?,?,?)',
        args: [orderId, userId, total, 'pending', address || user.profile.address || '', note || '', formatDate(new Date())],
      });

      for (const item of orderItems) {
        await tx.execute({
          sql: 'INSERT INTO order_items (order_id, product_id, name, price, quantity, subtotal) VALUES (?,?,?,?,?,?)',
          args: [orderId, item.productId, item.name, item.price, item.quantity, item.subtotal],
        });
      }

      // Clear cart
      await tx.execute({ sql: 'DELETE FROM cart_items WHERE user_id = ?', args: [userId] });

      await tx.commit();

      // Fetch the created order outside the transaction
      return self.getOrder(orderId);
    } finally {
      tx.close();
    }
  },

  async listOrders(userId, { page, pageSize }) {
    await ensureInitialized();
    const c = getClient();
    const totalRs = await c.execute({ sql: 'SELECT COUNT(*) AS c FROM orders WHERE user_id = ?', args: [userId] });
    const total = totalRs.rows[0].c;
    const offset = (page - 1) * pageSize;
    const ordersRs = await c.execute({
      sql: 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      args: [userId, pageSize, offset],
    });

    const list = [];
    for (const o of ordersRs.rows) {
      const itemsRs = await c.execute({
        sql: 'SELECT product_id, name, price, quantity, subtotal FROM order_items WHERE order_id = ?',
        args: [o.id],
      });
      list.push({
        id: o.id,
        userId: o.user_id,
        items: itemsRs.rows.map(i => ({
          productId: i.product_id, name: i.name, price: i.price, quantity: i.quantity, subtotal: i.subtotal,
        })),
        total: o.total,
        status: o.status,
        address: o.address,
        note: o.note,
        createdAt: o.created_at,
      });
    }
    return { list, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  },

  async getOrder(orderId) {
    await ensureInitialized();
    const c = getClient();
    const oRs = await c.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [orderId] });
    const o = oRs.rows[0];
    if (!o) return null;
    const itemsRs = await c.execute({
      sql: 'SELECT product_id, name, price, quantity, subtotal FROM order_items WHERE order_id = ?',
      args: [o.id],
    });
    return {
      id: o.id,
      userId: o.user_id,
      items: itemsRs.rows.map(i => ({
        productId: i.product_id, name: i.name, price: i.price, quantity: i.quantity, subtotal: i.subtotal,
      })),
      total: o.total,
      status: o.status,
      address: o.address,
      note: o.note,
      createdAt: o.created_at,
    };
  },

  // ── Wishlist ─────────────────────────────────────────────────────────────

  async getWishlist(userId) {
    await ensureInitialized();
    const rs = await getClient().execute({
      sql: 'SELECT p.* FROM wishlists w JOIN products p ON p.id = w.product_id WHERE w.user_id = ?',
      args: [userId],
    });
    return rs.rows.map(productRow);
  },

  async addToWishlist(userId, productId) {
    await ensureInitialized();
    const product = await self.findProduct(productId);
    if (!product) return { error: '商品不存在' };
    await getClient().execute({
      sql: 'INSERT OR IGNORE INTO wishlists (user_id, product_id) VALUES (?,?)',
      args: [userId, productId],
    });
    return self.getWishlist(userId);
  },

  async removeFromWishlist(userId, productId) {
    await ensureInitialized();
    await getClient().execute({
      sql: 'DELETE FROM wishlists WHERE user_id = ? AND product_id = ?',
      args: [userId, productId],
    });
    return self.getWishlist(userId);
  },

  close() {
    if (client) {
      client.close();
      client = null;
      initPromise = null;
    }
  },
};

// Self-reference for internal calls (createUser → findUser, etc.)
const self = module.exports;
