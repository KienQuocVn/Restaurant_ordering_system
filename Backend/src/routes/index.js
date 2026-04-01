const { readStore, writeStore, hashPassword, createId, isoNow } = require('../data/store')
const { parseBody, sendJson, notFound } = require('../utils/http')
const {
  getActiveSession,
  getSessionOrders,
  recalculateSessionTotals,
  getTablePayload,
  logActivity,
  createUser,
} = require('../services/business')

async function handleAuthSignup(req, res) {
  const body = await parseBody(req)
  const { email, password, name, role, restaurantId, restaurantName } = body
  if (!email || !password || !name || !role) return sendJson(res, 400, { error: 'Missing required fields' })
  if (!['staff', 'owner'].includes(role)) return sendJson(res, 400, { error: 'Only staff and owner accounts are allowed' })

  const data = readStore()
  if (data.users.find((user) => user.email === email)) return sendJson(res, 400, { error: 'Email already exists' })
  if (role === 'staff' && !restaurantId) return sendJson(res, 400, { error: 'Restaurant ID is required for staff' })

  const user = createUser(data, { email, password, name, role, restaurantId, restaurantName })
  logActivity(data, {
    actor_id: user.id,
    restaurant_id: user.restaurant_id,
    action: 'signup',
    detail: `${role} account created`,
  })
  writeStore(data)
  return sendJson(res, 201, { success: true, userId: user.id, restaurant_id: user.restaurant_id })
}

async function handleAuthSignin(req, res) {
  const body = await parseBody(req)
  const { email, password } = body
  if (!email || !password) return sendJson(res, 400, { error: 'Email and password required' })

  const data = readStore()
  const user = data.users.find((item) => item.email === email && item.is_active !== false)
  if (!user || user.password_hash !== hashPassword(password)) {
    return sendJson(res, 401, { error: 'Invalid credentials' })
  }

  return sendJson(res, 200, {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurant_id: user.restaurant_id,
      created_at: user.created_at,
    },
  })
}

function handleMenu(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  const categories = data.categories
    .filter((category) => category.restaurant_id === restaurantId && category.is_active !== false)
    .sort((a, b) => a.sort_order - b.sort_order)
  const items = data.menu_items
    .filter((item) => item.restaurant_id === restaurantId && item.is_available !== false)
    .sort((a, b) => a.display_order - b.display_order)
  return sendJson(res, 200, { categories, items })
}

function handlePublicTable(req, res, url) {
  const token = url.searchParams.get('token')
  if (!token) return sendJson(res, 400, { error: 'QR token required' })
  const data = readStore()
  const table = data.tables.find((item) => item.qr_token === token)
  if (!table) return sendJson(res, 404, { error: 'Table not found' })

  const restaurant = data.restaurants.find((item) => item.id === table.restaurant_id)
  const session = getActiveSession(data, table.id)
  return sendJson(res, 200, {
    restaurant: restaurant || null,
    table,
    session,
    orders: session ? getSessionOrders(data, session.id) : [],
  })
}

function handleCurrentSession(req, res, url) {
  const tableId = url.searchParams.get('table_id')
  if (!tableId) return sendJson(res, 400, { error: 'Table ID required' })
  const data = readStore()
  const session = getActiveSession(data, tableId)
  return sendJson(res, 200, { session, orders: session ? getSessionOrders(data, session.id) : [] })
}

async function handlePaymentRequest(req, res) {
  const body = await parseBody(req)
  const { sessionId } = body
  if (!sessionId) return sendJson(res, 400, { error: 'Session ID required' })

  const data = readStore()
  const session = data.sessions.find((item) => item.id === sessionId)
  if (!session) return sendJson(res, 404, { error: 'Session not found' })
  session.status = 'payment_requested'
  const table = data.tables.find((item) => item.id === session.table_id)
  if (table) table.status = 'payment_requested'
  writeStore(data)
  return sendJson(res, 200, { success: true, session })
}

async function handleCreateOrder(req, res) {
  const body = await parseBody(req)
  const { userId, restaurantId, tableId, items, notes } = body
  if (!restaurantId || !tableId || !items || items.length === 0) return sendJson(res, 400, { error: 'Missing required fields' })
  const data = readStore()
  const table = data.tables.find((item) => item.id === tableId)
  if (!table) return sendJson(res, 404, { error: 'Table not found' })

  let session = getActiveSession(data, tableId)
  if (!session) {
    session = {
      id: createId('session'),
      restaurant_id: restaurantId,
      table_id: tableId,
      status: 'active',
      opened_at: isoNow(),
      closed_at: null,
      total_amount: 0,
      paid_amount: 0,
      payment_method: null,
    }
    data.sessions.push(session)
  }

  const orderId = createId('order')
  let totalAmount = 0
  const orderItems = items.map((item) => {
    const menuItem = data.menu_items.find((menu) => menu.id === item.id)
    const unitPrice = Number(item.price || menuItem?.price || 0)
    const quantity = Number(item.quantity || 0)
    totalAmount += unitPrice * quantity
    return {
      id: createId('order_item'),
      order_id: orderId,
      menu_item_id: item.id,
      product_name: menuItem?.name || item.name || 'Unknown Item',
      unit_price: unitPrice,
      quantity,
      selected_options: item.selectedOptions || [],
      note: item.note || '',
      created_at: isoNow(),
    }
  })

  const order = {
    id: orderId,
    session_id: session.id,
    restaurant_id: restaurantId,
    table_id: tableId,
    customer_id: userId || null,
    status: 'pending',
    total_amount: totalAmount,
    notes: notes || '',
    cancel_reason: '',
    created_at: isoNow(),
    confirmed_at: null,
  }

  data.orders.push(order)
  data.order_items.push(...orderItems)
  recalculateSessionTotals(data, session.id)
  table.status = 'occupied'
  table.guest_count = Math.max(table.guest_count || 0, 1)
  writeStore(data)
  return sendJson(res, 201, { success: true, order, session })
}

function decorateOrders(data, orders) {
  return orders
    .map((order) => {
      const table = data.tables.find((item) => item.id === order.table_id)
      const session = data.sessions.find((item) => item.id === order.session_id)
      return {
        ...order,
        session_id: order.session_id,
        session_status: session?.status || 'active',
        table_number: table?.table_number || 0,
        dining_tables: { table_number: table?.table_number || 0 },
        order_items: data.order_items
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            id: item.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            special_instructions: item.note || '',
            menu_items: { name: item.product_name },
            product_name: item.product_name,
          })),
      }
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function handleGetOrders(req, res, url) {
  const sessionId = url.searchParams.get('session_id')
  const restaurantId = url.searchParams.get('restaurant_id')
  const userId = url.searchParams.get('user_id')
  const data = readStore()
  let orders = data.orders
  if (sessionId) orders = orders.filter((order) => order.session_id === sessionId)
  if (restaurantId) orders = orders.filter((order) => order.restaurant_id === restaurantId)
  if (userId) orders = orders.filter((order) => order.customer_id === userId)
  return sendJson(res, 200, decorateOrders(data, orders))
}

function handleStaffOrders(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  const status = url.searchParams.get('status')
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  let orders = data.orders.filter((order) => order.restaurant_id === restaurantId)
  if (status) orders = orders.filter((order) => order.status === status)
  return sendJson(res, 200, decorateOrders(data, orders))
}

async function handlePatchStaffOrders(req, res) {
  const body = await parseBody(req)
  const { orderId, status } = body
  if (!orderId || !status) return sendJson(res, 400, { error: 'Order ID and status required' })
  const data = readStore()
  const order = data.orders.find((item) => item.id === orderId)
  if (!order) return sendJson(res, 404, { error: 'Order not found' })
  order.status = status
  if (status === 'preparing' && !order.confirmed_at) order.confirmed_at = isoNow()
  writeStore(data)
  return sendJson(res, 200, { success: true, order })
}

function handleStaffTables(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  return sendJson(res, 200, getTablePayload(data, restaurantId))
}

async function handleCreateTables(req, res) {
  const body = await parseBody(req)
  const { restaurantId, count } = body
  if (!restaurantId || !count) return sendJson(res, 400, { error: 'Restaurant ID and count required' })
  const data = readStore()
  const existingTables = data.tables.filter((table) => table.restaurant_id === restaurantId)
  const maxTableNumber = existingTables.reduce((max, table) => Math.max(max, table.table_number), 0)
  const newTables = Array.from({ length: Number(count) }, (_, index) => ({
    id: createId('table'),
    restaurant_id: restaurantId,
    table_number: maxTableNumber + index + 1,
    zone: 'Main',
    capacity: 4,
    guest_count: 0,
    status: 'empty',
    qr_token: createId('qrtoken'),
    created_at: isoNow(),
  }))
  data.tables.push(...newTables)
  writeStore(data)
  return sendJson(res, 201, newTables)
}

async function handleUpdateTable(req, res) {
  const body = await parseBody(req)
  const { tableId, zone, capacity, status, guestCount } = body
  const data = readStore()
  const table = data.tables.find((item) => item.id === tableId)
  if (!table) return sendJson(res, 404, { error: 'Table not found' })
  if (zone !== undefined) table.zone = zone
  if (capacity !== undefined) table.capacity = Number(capacity)
  if (status !== undefined) table.status = status
  if (guestCount !== undefined) table.guest_count = Number(guestCount)
  writeStore(data)
  return sendJson(res, 200, { success: true, table })
}

function handleDeleteTable(req, res, url) {
  const tableId = url.searchParams.get('table_id')
  if (!tableId) return sendJson(res, 400, { error: 'Table ID required' })
  const data = readStore()
  const activeSession = data.sessions.find(
    (session) =>
      session.table_id === tableId &&
      ['active', 'payment_requested'].includes(session.status)
  )
  if (activeSession) {
    return sendJson(res, 400, { error: 'Cannot delete a table with active session' })
  }
  data.tables = data.tables.filter((table) => table.id !== tableId)
  writeStore(data)
  return sendJson(res, 200, { success: true })
}

function handleOwnerMenu(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  const categories = data.categories
    .filter((category) => category.restaurant_id === restaurantId)
    .sort((a, b) => a.sort_order - b.sort_order)
  const items = data.menu_items
    .filter((item) => item.restaurant_id === restaurantId)
    .sort((a, b) => a.display_order - b.display_order)
  return sendJson(res, 200, { categories, items })
}

async function handleOwnerMenuPost(req, res) {
  const body = await parseBody(req)
  const { restaurantId, type, data: payload } = body
  const store = readStore()
  if (type !== 'item') return sendJson(res, 400, { error: 'Invalid type' })

  const item = {
    id: createId('item'),
    restaurant_id: restaurantId,
    category_id: payload.categoryId,
    name: payload.name,
    description: payload.description || '',
    price: Number(payload.price || 0),
    image_url: payload.imageUrl || '',
    is_available: true,
    display_order: payload.displayOrder || store.menu_items.length + 1,
    options: payload.options || [],
  }
  store.menu_items.push(item)
  writeStore(store)
  return sendJson(res, 201, { success: true, item })
}

async function handleOwnerMenuPatch(req, res) {
  const body = await parseBody(req)
  const { itemId, type, data: payload } = body
  const store = readStore()
  if (type !== 'item') return sendJson(res, 400, { error: 'Invalid type' })
  const item = store.menu_items.find((entry) => entry.id === itemId)
  if (!item) return sendJson(res, 404, { error: 'Item not found' })
  item.name = payload.name
  item.description = payload.description || ''
  item.price = Number(payload.price || 0)
  item.is_available = payload.isAvailable
  writeStore(store)
  return sendJson(res, 200, { success: true, item })
}

function handleOwnerMenuDelete(req, res, url) {
  const itemId = url.searchParams.get('item_id')
  if (!itemId) return sendJson(res, 400, { error: 'Item ID required' })
  const store = readStore()
  store.menu_items = store.menu_items.filter((item) => item.id !== itemId)
  writeStore(store)
  return sendJson(res, 200, { success: true })
}

function handleOwnerCategories(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  const categories = data.categories
    .filter((item) => item.restaurant_id === restaurantId)
    .sort((a, b) => a.sort_order - b.sort_order)
  return sendJson(res, 200, categories)
}

async function handleOwnerCategoriesPost(req, res) {
  const body = await parseBody(req)
  const { restaurantId, name } = body
  if (!restaurantId || !name) return sendJson(res, 400, { error: 'Restaurant ID and name required' })
  const data = readStore()
  const category = {
    id: createId('cat'),
    restaurant_id: restaurantId,
    name,
    sort_order: data.categories.filter((item) => item.restaurant_id === restaurantId).length + 1,
    is_active: true,
  }
  data.categories.push(category)
  writeStore(data)
  return sendJson(res, 201, { success: true, category })
}

async function handleOwnerCategoriesPatch(req, res) {
  const body = await parseBody(req)
  const { categoryId, name, isActive } = body
  const data = readStore()
  const category = data.categories.find((item) => item.id === categoryId)
  if (!category) return sendJson(res, 404, { error: 'Category not found' })
  if (name !== undefined) category.name = name
  if (isActive !== undefined) category.is_active = isActive
  writeStore(data)
  return sendJson(res, 200, { success: true, category })
}

function handleOwnerCategoriesDelete(req, res, url) {
  const categoryId = url.searchParams.get('category_id')
  const data = readStore()
  data.categories = data.categories.filter((item) => item.id !== categoryId)
  data.menu_items = data.menu_items.filter((item) => item.category_id !== categoryId)
  writeStore(data)
  return sendJson(res, 200, { success: true })
}

function handleOwnerOrders(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  const orders = decorateOrders(
    data,
    data.orders.filter((order) => order.restaurant_id === restaurantId)
  )
  return sendJson(res, 200, orders)
}

async function handleOwnerOrdersPatch(req, res) {
  const body = await parseBody(req)
  const { orderId, status, cancelReason } = body
  const data = readStore()
  const order = data.orders.find((item) => item.id === orderId)
  if (!order) return sendJson(res, 404, { error: 'Order not found' })
  if (status !== undefined) order.status = status
  if (cancelReason !== undefined) order.cancel_reason = cancelReason
  recalculateSessionTotals(data, order.session_id)
  writeStore(data)
  return sendJson(res, 200, { success: true, order })
}

function handleOwnerStaff(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  const data = readStore()
  const staff = data.users.filter(
    (item) => item.restaurant_id === restaurantId && item.role === 'staff'
  )
  const logs = data.activity_logs
    .filter((item) => item.restaurant_id === restaurantId)
    .slice(-20)
    .reverse()
  return sendJson(res, 200, { staff, logs })
}

async function handleOwnerStaffPost(req, res) {
  const body = await parseBody(req)
  const { restaurantId, email, password, name } = body
  if (!restaurantId || !email || !password || !name) return sendJson(res, 400, { error: 'Missing required fields' })
  const data = readStore()
  if (data.users.find((user) => user.email === email)) return sendJson(res, 400, { error: 'Email already exists' })
  const user = createUser(data, { email, password, name, role: 'staff', restaurantId, restaurantName: '' })
  logActivity(data, {
    actor_id: user.id,
    restaurant_id: restaurantId,
    action: 'create_staff',
    detail: `Staff ${user.email} created`,
  })
  writeStore(data)
  return sendJson(res, 201, { success: true, user })
}

async function handleOwnerStaffPatch(req, res) {
  const body = await parseBody(req)
  const { staffId, name, isActive } = body
  const data = readStore()
  const staff = data.users.find((user) => user.id === staffId && user.role === 'staff')
  if (!staff) return sendJson(res, 404, { error: 'Staff not found' })
  if (name !== undefined) staff.name = name
  if (isActive !== undefined) staff.is_active = isActive
  writeStore(data)
  return sendJson(res, 200, { success: true, staff })
}

function handleOwnerStaffDelete(req, res, url) {
  const staffId = url.searchParams.get('staff_id')
  const data = readStore()
  const staff = data.users.find((user) => user.id === staffId && user.role === 'staff')
  if (!staff) return sendJson(res, 404, { error: 'Staff not found' })
  staff.is_active = false
  logActivity(data, {
    actor_id: staff.id,
    restaurant_id: staff.restaurant_id,
    action: 'disable_staff',
    detail: `Staff ${staff.email} disabled`,
  })
  writeStore(data)
  return sendJson(res, 200, { success: true })
}

async function handlePayments(req, res) {
  const body = await parseBody(req)
  const { orderId, paymentMethod, amount } = body
  if (!orderId || !paymentMethod || !amount) return sendJson(res, 400, { error: 'Missing required fields' })
  const data = readStore()
  const order = data.orders.find((item) => item.id === orderId)
  if (!order) return sendJson(res, 404, { error: 'Order not found' })
  const session = data.sessions.find((item) => item.id === order.session_id)
  if (!session) return sendJson(res, 404, { error: 'Session not found' })

  const payment = {
    id: createId('payment'),
    session_id: session.id,
    order_id: order.id,
    method: paymentMethod,
    amount: Number(amount),
    status: 'success',
    qr_code_url:
      paymentMethod === 'bank_transfer'
        ? `https://img.vietqr.io/image/970422-123456789-compact2.png?amount=${Number(amount)}&addInfo=${session.id}`
        : paymentMethod === 'momo'
          ? `momo://pay?amount=${Number(amount)}&session=${session.id}`
          : '',
    created_at: isoNow(),
    paid_at: isoNow(),
  }

  data.payments.push(payment)
  session.status = 'paid'
  session.paid_amount = Number(amount)
  session.payment_method = paymentMethod
  session.closed_at = isoNow()
  const table = data.tables.find((item) => item.id === session.table_id)
  if (table) {
    table.status = 'empty'
    table.guest_count = 0
  }
  data.orders
    .filter((item) => item.session_id === session.id)
    .forEach((item) => {
      if (item.status !== 'cancelled') item.status = 'completed'
    })
  writeStore(data)
  return sendJson(res, 200, { success: true, payment })
}

function handleGetPayments(req, res, url) {
  const sessionId = url.searchParams.get('session_id')
  const orderId = url.searchParams.get('order_id')
  const data = readStore()
  let payments = data.payments
  if (sessionId) payments = payments.filter((item) => item.session_id === sessionId)
  if (orderId) payments = payments.filter((item) => item.order_id === orderId)
  return sendJson(res, 200, payments)
}

function handleOwnerAnalytics(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  const restaurantOrders = data.orders.filter((order) => order.restaurant_id === restaurantId)
  const sessionIds = data.sessions.filter((session) => session.restaurant_id === restaurantId).map((session) => session.id)
  const restaurantPayments = data.payments.filter((payment) => sessionIds.includes(payment.session_id))
  const totalOrders = restaurantOrders.length
  const totalRevenue = restaurantPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const completedOrders = restaurantOrders.filter((order) => order.status === 'completed').length
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const topMap = {}
  data.order_items.forEach((item) => {
    const order = data.orders.find((entry) => entry.id === item.order_id)
    if (!order || order.restaurant_id !== restaurantId) return
    if (!topMap[item.product_name]) {
      topMap[item.product_name] = { name: item.product_name, quantity: 0, price: item.unit_price }
    }
    topMap[item.product_name].quantity += item.quantity
  })

  const paymentMethods = {}
  restaurantPayments.forEach((payment) => {
    paymentMethods[payment.method] =
      (paymentMethods[payment.method] || 0) + Number(payment.amount || 0)
  })

  return sendJson(res, 200, {
    stats: { totalOrders, totalRevenue, completedOrders, averageOrderValue },
    topSellingItems: Object.values(topMap).sort((a, b) => b.quantity - a.quantity),
    paymentMethods,
    recentOrders: restaurantOrders.slice(-10).reverse(),
  })
}

async function routeRequest(req, res, url) {
  if (req.method === 'POST' && url.pathname === '/api/auth/signup') return handleAuthSignup(req, res)
  if (req.method === 'POST' && url.pathname === '/api/auth/signin') return handleAuthSignin(req, res)
  if (req.method === 'GET' && url.pathname === '/api/menu') return handleMenu(req, res, url)
  if (req.method === 'GET' && url.pathname === '/api/public/table') return handlePublicTable(req, res, url)
  if (req.method === 'GET' && url.pathname === '/api/sessions/current') return handleCurrentSession(req, res, url)
  if (req.method === 'POST' && url.pathname === '/api/sessions/payment-request') return handlePaymentRequest(req, res)
  if (req.method === 'POST' && url.pathname === '/api/orders') return handleCreateOrder(req, res)
  if (req.method === 'GET' && url.pathname === '/api/orders') return handleGetOrders(req, res, url)
  if (req.method === 'GET' && url.pathname === '/api/staff/orders') return handleStaffOrders(req, res, url)
  if (req.method === 'PATCH' && url.pathname === '/api/staff/orders') return handlePatchStaffOrders(req, res)
  if (req.method === 'GET' && url.pathname === '/api/staff/tables') return handleStaffTables(req, res, url)
  if (req.method === 'POST' && url.pathname === '/api/staff/tables') return handleCreateTables(req, res)
  if (req.method === 'PATCH' && url.pathname === '/api/staff/tables') return handleUpdateTable(req, res)
  if (req.method === 'DELETE' && url.pathname === '/api/staff/tables') return handleDeleteTable(req, res, url)
  if (req.method === 'POST' && url.pathname === '/api/payments') return handlePayments(req, res)
  if (req.method === 'GET' && url.pathname === '/api/payments') return handleGetPayments(req, res, url)
  if (req.method === 'GET' && url.pathname === '/api/owner/menu') return handleOwnerMenu(req, res, url)
  if (req.method === 'POST' && url.pathname === '/api/owner/menu') return handleOwnerMenuPost(req, res)
  if (req.method === 'PATCH' && url.pathname === '/api/owner/menu') return handleOwnerMenuPatch(req, res)
  if (req.method === 'DELETE' && url.pathname === '/api/owner/menu') return handleOwnerMenuDelete(req, res, url)
  if (req.method === 'GET' && url.pathname === '/api/owner/categories') return handleOwnerCategories(req, res, url)
  if (req.method === 'POST' && url.pathname === '/api/owner/categories') return handleOwnerCategoriesPost(req, res)
  if (req.method === 'PATCH' && url.pathname === '/api/owner/categories') return handleOwnerCategoriesPatch(req, res)
  if (req.method === 'DELETE' && url.pathname === '/api/owner/categories') return handleOwnerCategoriesDelete(req, res, url)
  if (req.method === 'GET' && url.pathname === '/api/owner/orders') return handleOwnerOrders(req, res, url)
  if (req.method === 'PATCH' && url.pathname === '/api/owner/orders') return handleOwnerOrdersPatch(req, res)
  if (req.method === 'GET' && url.pathname === '/api/owner/staff') return handleOwnerStaff(req, res, url)
  if (req.method === 'POST' && url.pathname === '/api/owner/staff') return handleOwnerStaffPost(req, res)
  if (req.method === 'PATCH' && url.pathname === '/api/owner/staff') return handleOwnerStaffPatch(req, res)
  if (req.method === 'DELETE' && url.pathname === '/api/owner/staff') return handleOwnerStaffDelete(req, res, url)
  if (req.method === 'GET' && url.pathname === '/api/owner/analytics') return handleOwnerAnalytics(req, res, url)
  return notFound(res)
}

module.exports = {
  routeRequest,
}
