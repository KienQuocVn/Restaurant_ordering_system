const fs = require('fs')
const crypto = require('crypto')
const { DatabaseSync } = require('node:sqlite')
const { DATA_DIR, DATA_FILE, DB_FILE } = require('../config')

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function isoNow() {
  return new Date().toISOString()
}

function createDefaultPermissions(role) {
  if (role === 'owner') {
    return {
      manage_menu: true,
      manage_categories: true,
      manage_staff: true,
      manage_tables: true,
      view_dashboard: true,
      manage_orders: true,
      process_payments: true,
    }
  }

  return {
    manage_menu: false,
    manage_categories: false,
    manage_staff: false,
    manage_tables: false,
    view_dashboard: false,
    manage_orders: true,
    process_payments: true,
  }
}

function createSeedData() {
  const now = isoNow()
  const ownerId = createId('user')
  const staffId = createId('user')
  const restaurantId = 'rest_demo_001'
  const categoryPizza = createId('cat')
  const categoryDrinks = createId('cat')

  return {
    users: [
      {
        id: ownerId,
        email: 'owner@example.com',
        password_hash: hashPassword('123456'),
        name: 'Demo Owner',
        role: 'owner',
        restaurant_id: restaurantId,
        is_active: true,
        permissions: createDefaultPermissions('owner'),
        created_at: now,
      },
      {
        id: staffId,
        email: 'staff@example.com',
        password_hash: hashPassword('123456'),
        name: 'Demo Staff',
        role: 'staff',
        restaurant_id: restaurantId,
        is_active: true,
        permissions: createDefaultPermissions('staff'),
        created_at: now,
      },
    ],
    restaurants: [
      {
        id: restaurantId,
        name: 'Demo QR Restaurant',
        address: '123 Demo Street',
        owner_id: ownerId,
        created_at: now,
      },
    ],
    tables: [
      {
        id: createId('table'),
        restaurant_id: restaurantId,
        table_number: 1,
        zone: 'Tang 1',
        capacity: 4,
        guest_count: 0,
        status: 'empty',
        qr_token: createId('qrtoken'),
        created_at: now,
      },
      {
        id: createId('table'),
        restaurant_id: restaurantId,
        table_number: 2,
        zone: 'Tang 1',
        capacity: 4,
        guest_count: 0,
        status: 'empty',
        qr_token: createId('qrtoken'),
        created_at: now,
      },
      {
        id: createId('table'),
        restaurant_id: restaurantId,
        table_number: 3,
        zone: 'VIP',
        capacity: 6,
        guest_count: 0,
        status: 'empty',
        qr_token: createId('qrtoken'),
        created_at: now,
      },
    ],
    categories: [
      {
        id: categoryPizza,
        restaurant_id: restaurantId,
        name: 'Pizza',
        sort_order: 1,
        is_active: true,
      },
      {
        id: categoryDrinks,
        restaurant_id: restaurantId,
        name: 'Drinks',
        sort_order: 2,
        is_active: true,
      },
    ],
    menu_items: [
      {
        id: createId('item'),
        restaurant_id: restaurantId,
        category_id: categoryPizza,
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato and mozzarella',
        price: 129000,
        image_url: '',
        is_available: true,
        display_order: 1,
        options: [
          {
            name: 'Size',
            values: [
              { label: 'M', price: 0 },
              { label: 'L', price: 20000 },
            ],
          },
        ],
      },
      {
        id: createId('item'),
        restaurant_id: restaurantId,
        category_id: categoryPizza,
        name: 'Pepperoni Pizza',
        description: 'Pepperoni and cheese',
        price: 149000,
        image_url: '',
        is_available: true,
        display_order: 2,
        options: [],
      },
      {
        id: createId('item'),
        restaurant_id: restaurantId,
        category_id: categoryDrinks,
        name: 'Iced Tea',
        description: 'Refreshing iced tea',
        price: 29000,
        image_url: '',
        is_available: true,
        display_order: 1,
        options: [
          {
            name: 'Sugar',
            values: [
              { label: '100%', price: 0 },
              { label: '50%', price: 0 },
              { label: '0%', price: 0 },
            ],
          },
        ],
      },
    ],
    sessions: [],
    orders: [],
    order_items: [],
    payments: [],
    activity_logs: [],
  }
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(createSeedData(), null, 2), 'utf8')
  }
}

let dbInstance = null

function ensureColumn(db, tableName, columnName, sqlDefinition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all()
  const exists = columns.some((column) => column.name === columnName)
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlDefinition};`)
  }
}

function getDb() {
  ensureDataFile()
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_FILE)
    dbInstance.exec('PRAGMA journal_mode = WAL;')
    dbInstance.exec('PRAGMA foreign_keys = ON;')
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        restaurant_id TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        permissions_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        owner_id TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tables (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        table_number INTEGER NOT NULL,
        zone TEXT,
        capacity INTEGER,
        guest_count INTEGER,
        status TEXT,
        qr_token TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL DEFAULT 0,
        image_url TEXT,
        is_available INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 0,
        options_json TEXT NOT NULL DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        table_id TEXT NOT NULL,
        status TEXT NOT NULL,
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        total_amount INTEGER NOT NULL DEFAULT 0,
        paid_amount INTEGER NOT NULL DEFAULT 0,
        payment_method TEXT
      );
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        restaurant_id TEXT NOT NULL,
        table_id TEXT NOT NULL,
        customer_id TEXT,
        status TEXT NOT NULL,
        total_amount INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        cancel_reason TEXT,
        created_at TEXT NOT NULL,
        confirmed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        menu_item_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        unit_price INTEGER NOT NULL DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 0,
        selected_options_json TEXT NOT NULL DEFAULT '[]',
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        order_id TEXT,
        method TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        qr_code_url TEXT,
        created_at TEXT NOT NULL,
        paid_at TEXT
      );
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        actor_id TEXT,
        restaurant_id TEXT,
        action TEXT NOT NULL,
        detail TEXT
      );
    `)
    ensureColumn(dbInstance, 'users', 'permissions_json', "TEXT NOT NULL DEFAULT '{}'")

    const count = dbInstance.prepare('SELECT COUNT(*) AS count FROM users').get().count
    if (count === 0) {
      const source = fs.existsSync(DATA_FILE)
        ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
        : createSeedData()
      writeStore(source)
    }
  }

  return dbInstance
}

function normalizeRows(data) {
  if (!Array.isArray(data.activity_logs)) data.activity_logs = []
  if (!Array.isArray(data.users)) data.users = []
  if (!Array.isArray(data.tables)) data.tables = []

  data.users = data.users.map((user) => ({
    is_active: true,
    ...user,
    is_active: Boolean(user.is_active),
    permissions: {
      ...createDefaultPermissions(user.role),
      ...(user.permissions || {}),
    },
  }))
  data.tables = data.tables.map((table) => ({
    guest_count: 0,
    zone: 'Main',
    capacity: 4,
    ...table,
  }))
  data.categories = (data.categories || []).map((category) => ({
    ...category,
    is_active: Boolean(category.is_active),
  }))
  data.menu_items = (data.menu_items || []).map((item) => ({
    ...item,
    price: Number(item.price || 0),
    is_available: Boolean(item.is_available),
    options: Array.isArray(item.options) ? item.options : [],
  }))
  data.sessions = (data.sessions || []).map((session) => ({
    ...session,
    total_amount: Number(session.total_amount || 0),
    paid_amount: Number(session.paid_amount || 0),
  }))
  data.orders = (data.orders || []).map((order) => ({
    cancel_reason: '',
    ...order,
    total_amount: Number(order.total_amount || 0),
  }))
  data.order_items = (data.order_items || []).map((item) => ({
    ...item,
    unit_price: Number(item.unit_price || 0),
    quantity: Number(item.quantity || 0),
    selected_options: Array.isArray(item.selected_options) ? item.selected_options : [],
  }))
  data.payments = (data.payments || []).map((payment) => ({
    ...payment,
    amount: Number(payment.amount || 0),
  }))

  return data
}

function readStore() {
  const db = getDb()
  const data = {
    users: db.prepare('SELECT * FROM users').all().map((row) => ({
      ...row,
      is_active: Boolean(row.is_active),
      permissions: {
        ...createDefaultPermissions(row.role),
        ...JSON.parse(row.permissions_json || '{}'),
      },
    })),
    restaurants: db.prepare('SELECT * FROM restaurants').all(),
    tables: db.prepare('SELECT * FROM tables').all().map((row) => ({
      ...row,
      guest_count: Number(row.guest_count || 0),
      capacity: Number(row.capacity || 0),
    })),
    categories: db.prepare('SELECT * FROM categories').all().map((row) => ({
      ...row,
      is_active: Boolean(row.is_active),
    })),
    menu_items: db.prepare('SELECT * FROM menu_items').all().map((row) => ({
      id: row.id,
      restaurant_id: row.restaurant_id,
      category_id: row.category_id,
      name: row.name,
      description: row.description || '',
      price: Number(row.price || 0),
      image_url: row.image_url || '',
      is_available: Boolean(row.is_available),
      display_order: Number(row.display_order || 0),
      options: JSON.parse(row.options_json || '[]'),
    })),
    sessions: db.prepare('SELECT * FROM sessions').all().map((row) => ({
      ...row,
      total_amount: Number(row.total_amount || 0),
      paid_amount: Number(row.paid_amount || 0),
    })),
    orders: db.prepare('SELECT * FROM orders').all().map((row) => ({
      ...row,
      total_amount: Number(row.total_amount || 0),
    })),
    order_items: db.prepare('SELECT * FROM order_items').all().map((row) => ({
      id: row.id,
      order_id: row.order_id,
      menu_item_id: row.menu_item_id,
      product_name: row.product_name,
      unit_price: Number(row.unit_price || 0),
      quantity: Number(row.quantity || 0),
      selected_options: JSON.parse(row.selected_options_json || '[]'),
      note: row.note || '',
      created_at: row.created_at,
    })),
    payments: db.prepare('SELECT * FROM payments').all().map((row) => ({
      ...row,
      amount: Number(row.amount || 0),
    })),
    activity_logs: db.prepare('SELECT * FROM activity_logs').all(),
  }

  return normalizeRows(data)
}

function writeStore(data) {
  const normalized = normalizeRows({
    users: data.users || [],
    restaurants: data.restaurants || [],
    tables: data.tables || [],
    categories: data.categories || [],
    menu_items: data.menu_items || [],
    sessions: data.sessions || [],
    orders: data.orders || [],
    order_items: data.order_items || [],
    payments: data.payments || [],
    activity_logs: data.activity_logs || [],
  })
  const db = getDb()

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, restaurant_id, is_active, permissions_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertRestaurant = db.prepare(`
    INSERT INTO restaurants (id, name, address, owner_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertTable = db.prepare(`
    INSERT INTO tables (id, restaurant_id, table_number, zone, capacity, guest_count, status, qr_token, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, restaurant_id, name, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertMenuItem = db.prepare(`
    INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, image_url, is_available, display_order, options_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertSession = db.prepare(`
    INSERT INTO sessions (id, restaurant_id, table_id, status, opened_at, closed_at, total_amount, paid_amount, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertOrder = db.prepare(`
    INSERT INTO orders (id, session_id, restaurant_id, table_id, customer_id, status, total_amount, notes, cancel_reason, created_at, confirmed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (id, order_id, menu_item_id, product_name, unit_price, quantity, selected_options_json, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertPayment = db.prepare(`
    INSERT INTO payments (id, session_id, order_id, method, amount, status, qr_code_url, created_at, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertActivity = db.prepare(`
    INSERT INTO activity_logs (id, created_at, actor_id, restaurant_id, action, detail)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  db.exec('BEGIN')
  try {
    db.exec(`
      DELETE FROM activity_logs;
      DELETE FROM payments;
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM sessions;
      DELETE FROM menu_items;
      DELETE FROM categories;
      DELETE FROM tables;
      DELETE FROM restaurants;
      DELETE FROM users;
    `)

    normalized.users.forEach((user) => {
      insertUser.run(
        user.id,
        user.email,
        user.password_hash,
        user.name,
        user.role,
        user.restaurant_id || null,
        user.is_active ? 1 : 0,
        JSON.stringify(user.permissions || createDefaultPermissions(user.role)),
        user.created_at
      )
    })
    normalized.restaurants.forEach((restaurant) => {
      insertRestaurant.run(
        restaurant.id,
        restaurant.name,
        restaurant.address || '',
        restaurant.owner_id || null,
        restaurant.created_at
      )
    })
    normalized.tables.forEach((table) => {
      insertTable.run(
        table.id,
        table.restaurant_id,
        Number(table.table_number || 0),
        table.zone || 'Main',
        Number(table.capacity || 4),
        Number(table.guest_count || 0),
        table.status || 'empty',
        table.qr_token,
        table.created_at
      )
    })
    normalized.categories.forEach((category) => {
      insertCategory.run(
        category.id,
        category.restaurant_id,
        category.name,
        Number(category.sort_order || 0),
        category.is_active ? 1 : 0
      )
    })
    normalized.menu_items.forEach((item) => {
      insertMenuItem.run(
        item.id,
        item.restaurant_id,
        item.category_id,
        item.name,
        item.description || '',
        Number(item.price || 0),
        item.image_url || '',
        item.is_available ? 1 : 0,
        Number(item.display_order || 0),
        JSON.stringify(item.options || [])
      )
    })
    normalized.sessions.forEach((session) => {
      insertSession.run(
        session.id,
        session.restaurant_id,
        session.table_id,
        session.status,
        session.opened_at,
        session.closed_at || null,
        Number(session.total_amount || 0),
        Number(session.paid_amount || 0),
        session.payment_method || null
      )
    })
    normalized.orders.forEach((order) => {
      insertOrder.run(
        order.id,
        order.session_id,
        order.restaurant_id,
        order.table_id,
        order.customer_id || null,
        order.status,
        Number(order.total_amount || 0),
        order.notes || '',
        order.cancel_reason || '',
        order.created_at,
        order.confirmed_at || null
      )
    })
    normalized.order_items.forEach((item) => {
      insertOrderItem.run(
        item.id,
        item.order_id,
        item.menu_item_id,
        item.product_name,
        Number(item.unit_price || 0),
        Number(item.quantity || 0),
        JSON.stringify(item.selected_options || []),
        item.note || '',
        item.created_at
      )
    })
    normalized.payments.forEach((payment) => {
      insertPayment.run(
        payment.id,
        payment.session_id,
        payment.order_id || null,
        payment.method,
        Number(payment.amount || 0),
        payment.status,
        payment.qr_code_url || '',
        payment.created_at,
        payment.paid_at || null
      )
    })
    normalized.activity_logs.forEach((log) => {
      insertActivity.run(
        log.id,
        log.created_at,
        log.actor_id || null,
        log.restaurant_id || null,
        log.action,
        log.detail || ''
      )
    })

    db.exec('COMMIT')
    fs.writeFileSync(DATA_FILE, JSON.stringify(normalized, null, 2), 'utf8')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

module.exports = {
  createId,
  hashPassword,
  isoNow,
  ensureDataFile,
  readStore,
  writeStore,
}
