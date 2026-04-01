const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Pool } = require('pg')
const {
  DATA_DIR,
  DATA_FILE,
  DATABASE_URL,
  PGHOST,
  PGPORT,
  PGDATABASE,
  PGUSER,
  PGPASSWORD,
  PGSSL,
  ROOT_DIR,
  EXPORT_JSON_SNAPSHOT,
} = require('../config')

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

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function createSeedData() {
  const now = isoNow()
  const ownerId = 'user_owner_demo'
  const staffId = 'user_staff_demo'
  const restaurantId = 'rest_demo_001'

  return {
    users: [
      {
        id: ownerId,
        email: 'owner@example.com',
        password_hash: hashPassword('123456'),
        full_name: 'Demo Owner',
        name: 'Demo Owner',
        role: 'owner',
        restaurant_id: restaurantId,
        is_active: true,
        permissions: createDefaultPermissions('owner'),
        created_at: now,
        updated_at: now,
      },
      {
        id: staffId,
        email: 'staff@example.com',
        password_hash: hashPassword('123456'),
        full_name: 'Demo Staff',
        name: 'Demo Staff',
        role: 'staff',
        restaurant_id: restaurantId,
        is_active: true,
        permissions: createDefaultPermissions('staff'),
        created_at: now,
        updated_at: now,
      },
    ],
    restaurants: [
      {
        id: restaurantId,
        name: 'Demo QR Restaurant',
        address: '123 Demo Street',
        owner_id: ownerId,
        created_at: now,
        updated_at: now,
      },
    ],
    tables: [
      {
        id: 'table_demo_001',
        restaurant_id: restaurantId,
        table_number: 1,
        zone: 'Tang 1',
        capacity: 4,
        guest_count: 0,
        status: 'empty',
        qr_token: 'qrtoken_demo_001',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'table_demo_002',
        restaurant_id: restaurantId,
        table_number: 2,
        zone: 'Tang 1',
        capacity: 4,
        guest_count: 0,
        status: 'empty',
        qr_token: 'qrtoken_demo_002',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'table_demo_003',
        restaurant_id: restaurantId,
        table_number: 3,
        zone: 'VIP',
        capacity: 6,
        guest_count: 0,
        status: 'empty',
        qr_token: 'qrtoken_demo_003',
        created_at: now,
        updated_at: now,
      },
    ],
    categories: [
      {
        id: 'cat_pizza_demo',
        restaurant_id: restaurantId,
        name: 'Pizza',
        sort_order: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'cat_drinks_demo',
        restaurant_id: restaurantId,
        name: 'Drinks',
        sort_order: 2,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    vouchers: [
      {
        id: 'voucher_welcome_demo',
        restaurant_id: restaurantId,
        code: 'WELCOME10',
        name: 'Giam 10% hoa don',
        type: 'percent',
        value: 10,
        min_order_value: 100000,
        max_discount_amount: 50000,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'voucher_coffee_demo',
        restaurant_id: restaurantId,
        code: 'COFFEE25K',
        name: 'Giam 25.000 VND',
        type: 'fixed',
        value: 25000,
        min_order_value: 120000,
        max_discount_amount: 25000,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    menu_items: [
      {
        id: 'item_margherita_demo',
        restaurant_id: restaurantId,
        category_id: 'cat_pizza_demo',
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
        created_at: now,
        updated_at: now,
      },
      {
        id: 'item_pepperoni_demo',
        restaurant_id: restaurantId,
        category_id: 'cat_pizza_demo',
        name: 'Pepperoni Pizza',
        description: 'Pepperoni and cheese',
        price: 149000,
        image_url: '',
        is_available: true,
        display_order: 2,
        options: [],
        created_at: now,
        updated_at: now,
      },
      {
        id: 'item_iced_tea_demo',
        restaurant_id: restaurantId,
        category_id: 'cat_drinks_demo',
        name: 'Iced Tea',
        description: 'Refreshing iced tea',
        price: 29000,
        image_url: '',
        is_available: true,
        display_order: 3,
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
        created_at: now,
        updated_at: now,
      },
    ],
    sessions: [],
    orders: [],
    order_items: [],
    payments: [],
    activity_logs: [],
    auth_sessions: [],
  }
}

function normalizeRows(data) {
  const normalized = {
    users: Array.isArray(data.users) ? data.users : [],
    restaurants: Array.isArray(data.restaurants) ? data.restaurants : [],
    tables: Array.isArray(data.tables) ? data.tables : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    vouchers: Array.isArray(data.vouchers) ? data.vouchers : [],
    menu_items: Array.isArray(data.menu_items) ? data.menu_items : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    orders: Array.isArray(data.orders) ? data.orders : [],
    order_items: Array.isArray(data.order_items) ? data.order_items : [],
    payments: Array.isArray(data.payments) ? data.payments : [],
    activity_logs: Array.isArray(data.activity_logs) ? data.activity_logs : [],
    auth_sessions: Array.isArray(data.auth_sessions) ? data.auth_sessions : [],
  }

  normalized.users = normalized.users.map((user) => ({
    ...user,
    full_name: user.full_name || user.name || '',
    name: user.name || user.full_name || '',
    is_active: Boolean(user.is_active),
    permissions: {
      ...createDefaultPermissions(user.role),
      ...(user.permissions || {}),
    },
    created_at: user.created_at || isoNow(),
    updated_at: user.updated_at || user.created_at || isoNow(),
  }))

  normalized.restaurants = normalized.restaurants.map((restaurant) => ({
    address: '',
    ...restaurant,
    created_at: restaurant.created_at || isoNow(),
    updated_at: restaurant.updated_at || restaurant.created_at || isoNow(),
  }))

  normalized.tables = normalized.tables.map((table) => ({
    zone: 'Main',
    capacity: 4,
    guest_count: 0,
    status: 'empty',
    ...table,
    capacity: Number(table.capacity || 4),
    guest_count: Number(table.guest_count || 0),
    table_number: Number(table.table_number || 0),
    created_at: table.created_at || isoNow(),
    updated_at: table.updated_at || table.created_at || isoNow(),
  }))

  normalized.categories = normalized.categories.map((category) => ({
    ...category,
    is_active: Boolean(category.is_active),
    sort_order: Number(category.sort_order || 0),
    created_at: category.created_at || isoNow(),
    updated_at: category.updated_at || category.created_at || isoNow(),
  }))

  normalized.vouchers = normalized.vouchers.map((voucher) => ({
    ...voucher,
    value: Number(voucher.value || 0),
    min_order_value: Number(voucher.min_order_value || 0),
    max_discount_amount:
      voucher.max_discount_amount === null ||
      voucher.max_discount_amount === undefined
        ? null
        : Number(voucher.max_discount_amount),
    is_active: Boolean(voucher.is_active),
    created_at: voucher.created_at || isoNow(),
    updated_at: voucher.updated_at || voucher.created_at || isoNow(),
  }))

  normalized.menu_items = normalized.menu_items.map((item) => ({
    ...item,
    price: Number(item.price || 0),
    is_available: Boolean(item.is_available),
    display_order: Number(item.display_order || 0),
    options: Array.isArray(item.options) ? item.options : [],
    created_at: item.created_at || isoNow(),
    updated_at: item.updated_at || item.created_at || isoNow(),
  }))

  normalized.sessions = normalized.sessions.map((session) => ({
    ...session,
    guest_count: Number(session.guest_count || 0),
    subtotal_amount: Number(session.subtotal_amount || 0),
    discount_amount: Number(session.discount_amount || 0),
    total_amount: Number(session.total_amount || 0),
    paid_amount: Number(session.paid_amount || 0),
    created_at: session.created_at || session.opened_at || isoNow(),
    updated_at: session.updated_at || session.created_at || session.opened_at || isoNow(),
  }))

  normalized.orders = normalized.orders.map((order) => ({
    cancel_reason: '',
    notes: '',
    ...order,
    total_amount: Number(order.total_amount || 0),
    created_at: order.created_at || isoNow(),
  }))

  normalized.order_items = normalized.order_items.map((item) => ({
    note: '',
    ...item,
    unit_price: Number(item.unit_price || 0),
    quantity: Number(item.quantity || 0),
    selected_options: Array.isArray(item.selected_options)
      ? item.selected_options
      : [],
    created_at: item.created_at || isoNow(),
  }))

  normalized.payments = normalized.payments.map((payment) => ({
    provider_payload: {},
    ...payment,
    amount: Number(payment.amount || 0),
    received_amount: Number(payment.received_amount || payment.amount || 0),
    provider_payload:
      payment.provider_payload && typeof payment.provider_payload === 'object'
        ? payment.provider_payload
        : {},
    created_at: payment.created_at || isoNow(),
  }))

  normalized.activity_logs = normalized.activity_logs.map((log) => ({
    detail: '',
    ...log,
    created_at: log.created_at || isoNow(),
  }))

  normalized.auth_sessions = normalized.auth_sessions.map((session) => ({
    user_agent: '',
    ip_address: '',
    ...session,
    created_at: session.created_at || isoNow(),
    last_used_at: session.last_used_at || session.created_at || isoNow(),
  }))

  return normalized
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data))
}

let pool = null
let storeCache = null
let initialized = false

function getPool() {
  if (pool) return pool
  const config = DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        ssl: PGSSL ? { rejectUnauthorized: false } : false,
      }
    : {
        host: PGHOST,
        port: PGPORT,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        ssl: PGSSL ? { rejectUnauthorized: false } : false,
      }
  pool = new Pool(config)
  return pool
}

async function runSchema() {
  const schemaPath = path.join(ROOT_DIR, 'Frontend', 'scripts', '01-init-schema.sql')
  const schemaSql = fs.readFileSync(schemaPath, 'utf8')
  const client = await getPool().connect()
  try {
    await client.query(schemaSql)
  } finally {
    client.release()
  }
}

async function maybeSeedFromSnapshot() {
  const client = await getPool().connect()
  try {
    const existingUsers = await client.query('SELECT COUNT(*)::int AS count FROM users')
    if (existingUsers.rows[0].count > 0) return
    const seedData = createSeedData()
    await persistStore(seedData, client)
  } finally {
    client.release()
  }
}

async function loadStoreFromDb() {
  const client = await getPool().connect()
  try {
    const [
      users,
      restaurants,
      tables,
      categories,
      vouchers,
      menuItems,
      sessions,
      orders,
      orderItems,
      payments,
      activityLogs,
      authSessions,
    ] = await Promise.all([
      client.query('SELECT * FROM users ORDER BY created_at ASC'),
      client.query('SELECT * FROM restaurants ORDER BY created_at ASC'),
      client.query('SELECT * FROM tables ORDER BY table_number ASC'),
      client.query('SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC'),
      client.query('SELECT * FROM vouchers ORDER BY code ASC'),
      client.query('SELECT * FROM menu_items ORDER BY display_order ASC, created_at ASC'),
      client.query('SELECT * FROM sessions ORDER BY opened_at ASC'),
      client.query('SELECT * FROM orders ORDER BY created_at ASC'),
      client.query('SELECT * FROM order_items ORDER BY created_at ASC'),
      client.query('SELECT * FROM payments ORDER BY created_at ASC'),
      client.query('SELECT * FROM activity_logs ORDER BY created_at ASC'),
      client.query('SELECT * FROM auth_sessions ORDER BY created_at ASC'),
    ])

    return normalizeRows({
      users: users.rows.map((row) => ({
        ...row,
        full_name: row.full_name,
        name: row.full_name,
        is_active: row.is_active,
        permissions: {
          ...createDefaultPermissions(row.role),
          ...(row.permissions_json || {}),
        },
      })),
      restaurants: restaurants.rows,
      tables: tables.rows,
      categories: categories.rows,
      vouchers: vouchers.rows,
      menu_items: menuItems.rows.map((row) => ({
        ...row,
        options: Array.isArray(row.options_json) ? row.options_json : [],
      })),
      sessions: sessions.rows,
      orders: orders.rows,
      order_items: orderItems.rows.map((row) => ({
        ...row,
        selected_options: Array.isArray(row.selected_options_json)
          ? row.selected_options_json
          : [],
      })),
      payments: payments.rows.map((row) => ({
        ...row,
        provider_payload:
          row.provider_payload_json && typeof row.provider_payload_json === 'object'
            ? row.provider_payload_json
            : {},
      })),
      activity_logs: activityLogs.rows,
      auth_sessions: authSessions.rows,
    })
  } finally {
    client.release()
  }
}

function assertInitialized() {
  if (!initialized || !storeCache) {
    throw new Error('Data store not initialized')
  }
}

function readStore() {
  assertInitialized()
  return cloneData(storeCache)
}

async function persistStore(data, providedClient = null) {
  const normalized = normalizeRows(data)
  const client = providedClient || (await getPool().connect())
  const ownsClient = !providedClient

  try {
    if (ownsClient) await client.query('BEGIN')

    await client.query(`
      TRUNCATE TABLE
        auth_sessions,
        activity_logs,
        payments,
        order_items,
        orders,
        sessions,
        vouchers,
        menu_items,
        categories,
        tables,
        restaurants,
        users
      RESTART IDENTITY CASCADE
    `)

    for (const user of normalized.users) {
      await client.query(
        `
          INSERT INTO users (
            id, email, password_hash, full_name, role, restaurant_id,
            is_active, permissions_json, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)
        `,
        [
          user.id,
          user.email,
          user.password_hash,
          user.full_name || user.name,
          user.role,
          user.restaurant_id || null,
          user.is_active,
          JSON.stringify(user.permissions || createDefaultPermissions(user.role)),
          user.created_at,
          user.updated_at || user.created_at,
        ]
      )
    }

    for (const restaurant of normalized.restaurants) {
      await client.query(
        `
          INSERT INTO restaurants (id, name, address, owner_id, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          restaurant.id,
          restaurant.name,
          restaurant.address || '',
          restaurant.owner_id || null,
          restaurant.created_at,
          restaurant.updated_at || restaurant.created_at,
        ]
      )
    }

    for (const table of normalized.tables) {
      await client.query(
        `
          INSERT INTO tables (
            id, restaurant_id, table_number, zone, capacity, guest_count,
            status, qr_token, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          table.id,
          table.restaurant_id,
          Number(table.table_number || 0),
          table.zone || 'Main',
          Number(table.capacity || 4),
          Number(table.guest_count || 0),
          table.status || 'empty',
          table.qr_token,
          table.created_at,
          table.updated_at || table.created_at,
        ]
      )
    }

    for (const category of normalized.categories) {
      await client.query(
        `
          INSERT INTO categories (
            id, restaurant_id, name, sort_order, is_active, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          category.id,
          category.restaurant_id,
          category.name,
          Number(category.sort_order || 0),
          category.is_active,
          category.created_at,
          category.updated_at || category.created_at,
        ]
      )
    }

    for (const voucher of normalized.vouchers) {
      await client.query(
        `
          INSERT INTO vouchers (
            id, restaurant_id, code, name, type, value,
            min_order_value, max_discount_amount, is_active, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `,
        [
          voucher.id,
          voucher.restaurant_id,
          voucher.code,
          voucher.name,
          voucher.type,
          Number(voucher.value || 0),
          Number(voucher.min_order_value || 0),
          voucher.max_discount_amount === null || voucher.max_discount_amount === undefined
            ? null
            : Number(voucher.max_discount_amount),
          voucher.is_active,
          voucher.created_at,
          voucher.updated_at || voucher.created_at,
        ]
      )
    }

    for (const item of normalized.menu_items) {
      await client.query(
        `
          INSERT INTO menu_items (
            id, restaurant_id, category_id, name, description, price,
            image_url, is_available, display_order, options_json, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12)
        `,
        [
          item.id,
          item.restaurant_id,
          item.category_id,
          item.name,
          item.description || '',
          Number(item.price || 0),
          item.image_url || '',
          item.is_available,
          Number(item.display_order || 0),
          JSON.stringify(item.options || []),
          item.created_at,
          item.updated_at || item.created_at,
        ]
      )
    }

    for (const session of normalized.sessions) {
      await client.query(
        `
          INSERT INTO sessions (
            id, restaurant_id, table_id, status, opened_at, closed_at,
            guest_count, subtotal_amount, discount_amount, total_amount,
            paid_amount, payment_method, voucher_id, voucher_code, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        `,
        [
          session.id,
          session.restaurant_id,
          session.table_id,
          session.status,
          session.opened_at,
          session.closed_at || null,
          Number(session.guest_count || 0),
          Number(session.subtotal_amount || 0),
          Number(session.discount_amount || 0),
          Number(session.total_amount || 0),
          Number(session.paid_amount || 0),
          session.payment_method || null,
          session.voucher_id || null,
          session.voucher_code || null,
          session.created_at || session.opened_at,
          session.updated_at || session.created_at || session.opened_at,
        ]
      )
    }

    for (const order of normalized.orders) {
      await client.query(
        `
          INSERT INTO orders (
            id, session_id, restaurant_id, table_id, customer_id, status,
            total_amount, notes, cancel_reason, created_at, confirmed_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `,
        [
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
          order.confirmed_at || null,
        ]
      )
    }

    for (const item of normalized.order_items) {
      await client.query(
        `
          INSERT INTO order_items (
            id, order_id, menu_item_id, product_name, unit_price,
            quantity, selected_options_json, note, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
        `,
        [
          item.id,
          item.order_id,
          item.menu_item_id,
          item.product_name,
          Number(item.unit_price || 0),
          Number(item.quantity || 0),
          JSON.stringify(item.selected_options || []),
          item.note || '',
          item.created_at,
        ]
      )
    }

    for (const payment of normalized.payments) {
      await client.query(
        `
          INSERT INTO payments (
            id, session_id, order_id, method, provider, amount, received_amount,
            status, qr_code_url, provider_txn_id, provider_payload_json,
            verification_status, verified_at, reconciliation_status, reconciled_at,
            created_at, paid_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16,$17)
        `,
        [
          payment.id,
          payment.session_id,
          payment.order_id || null,
          payment.method,
          payment.provider || 'cash',
          Number(payment.amount || 0),
          Number(payment.received_amount || payment.amount || 0),
          payment.status,
          payment.qr_code_url || '',
          payment.provider_txn_id || null,
          JSON.stringify(payment.provider_payload || {}),
          payment.verification_status || 'pending',
          payment.verified_at || null,
          payment.reconciliation_status || 'pending',
          payment.reconciled_at || null,
          payment.created_at,
          payment.paid_at || null,
        ]
      )
    }

    for (const log of normalized.activity_logs) {
      await client.query(
        `
          INSERT INTO activity_logs (id, actor_id, restaurant_id, action, detail, created_at)
          VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          log.id,
          log.actor_id || null,
          log.restaurant_id || null,
          log.action,
          log.detail || '',
          log.created_at,
        ]
      )
    }

    for (const authSession of normalized.auth_sessions) {
      await client.query(
        `
          INSERT INTO auth_sessions (
            id, user_id, restaurant_id, refresh_token_hash, user_agent,
            ip_address, expires_at, last_used_at, revoked_at, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          authSession.id,
          authSession.user_id,
          authSession.restaurant_id || null,
          authSession.refresh_token_hash,
          authSession.user_agent || '',
          authSession.ip_address || '',
          authSession.expires_at,
          authSession.last_used_at,
          authSession.revoked_at || null,
          authSession.created_at,
        ]
      )
    }

    if (ownsClient) await client.query('COMMIT')

    storeCache = normalized
    ensureDataDir()
    if (EXPORT_JSON_SNAPSHOT) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(normalized, null, 2), 'utf8')
    }
  } catch (error) {
    if (ownsClient) {
      try {
        await client.query('ROLLBACK')
      } catch {}
    }
    throw error
  } finally {
    if (ownsClient) client.release()
  }
}

async function writeStore(data) {
  await persistStore(data)
}

async function initStore() {
  if (initialized) return
  ensureDataDir()
  await runSchema()
  await maybeSeedFromSnapshot()
  storeCache = await loadStoreFromDb()
  if (EXPORT_JSON_SNAPSHOT) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(storeCache, null, 2), 'utf8')
  }
  initialized = true
}

module.exports = {
  createId,
  hashPassword,
  isoNow,
  initStore,
  readStore,
  writeStore,
}
