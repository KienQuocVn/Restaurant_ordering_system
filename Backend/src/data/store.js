const fs = require('fs')
const crypto = require('crypto')
const { DATA_DIR, DATA_FILE } = require('../config')

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function isoNow() {
  return new Date().toISOString()
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (!fs.existsSync(DATA_FILE)) {
    const now = isoNow()
    const ownerId = createId('user')
    const staffId = createId('user')
    const restaurantId = 'rest_demo_001'
    const categoryPizza = createId('cat')
    const categoryDrinks = createId('cat')

    const seed = {
      users: [
        {
          id: ownerId,
          email: 'owner@example.com',
          password_hash: hashPassword('123456'),
          name: 'Demo Owner',
          role: 'owner',
          restaurant_id: restaurantId,
          is_active: true,
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
          options: [],
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
          options: [],
        },
      ],
      sessions: [],
      orders: [],
      order_items: [],
      payments: [],
      activity_logs: [],
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf8')
  }
}

function readStore() {
  ensureDataFile()
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  if (!Array.isArray(data.activity_logs)) data.activity_logs = []
  if (!Array.isArray(data.users)) data.users = []
  if (!Array.isArray(data.tables)) data.tables = []
  data.users = data.users.map((user) => ({
    is_active: true,
    ...user,
  }))
  data.tables = data.tables.map((table) => ({
    guest_count: 0,
    zone: 'Main',
    capacity: 4,
    ...table,
  }))
  return data
}

function writeStore(data) {
  ensureDataFile()
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

module.exports = {
  createId,
  hashPassword,
  isoNow,
  ensureDataFile,
  readStore,
  writeStore,
}
