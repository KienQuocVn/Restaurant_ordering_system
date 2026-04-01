const { createId, hashPassword, isoNow } = require('../data/store')

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

function getActiveSession(data, tableId) {
  return (
    data.sessions.find(
      (session) =>
        session.table_id === tableId &&
        ['active', 'payment_requested'].includes(session.status)
    ) || null
  )
}

function getSessionOrders(data, sessionId) {
  return data.orders
    .filter((order) => order.session_id === sessionId)
    .map((order) => ({
      ...order,
      order_items: data.order_items
        .filter((item) => item.order_id === order.id)
        .map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          special_instructions: item.note || '',
          menu_items: { name: item.product_name },
        })),
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function getVoucherByCode(data, restaurantId, code) {
  if (!code) return null
  return (
    data.vouchers.find(
      (voucher) =>
        voucher.restaurant_id === restaurantId &&
        voucher.is_active !== false &&
        voucher.code.toLowerCase() === String(code).trim().toLowerCase()
    ) || null
  )
}

function calculateVoucherDiscount(subtotalAmount, voucher) {
  if (!voucher) return 0
  const subtotal = Number(subtotalAmount || 0)
  if (subtotal <= 0) return 0
  if (subtotal < Number(voucher.min_order_value || 0)) return 0

  let discount = 0
  if (voucher.type === 'percent') {
    discount = Math.round((subtotal * Number(voucher.value || 0)) / 100)
  } else {
    discount = Number(voucher.value || 0)
  }

  if (voucher.max_discount_amount !== null && voucher.max_discount_amount !== undefined) {
    discount = Math.min(discount, Number(voucher.max_discount_amount || 0))
  }

  return Math.max(0, Math.min(discount, subtotal))
}

function applyVoucherToSession(data, session, voucherCode) {
  if (!session) return { session: null, voucher: null, discountAmount: 0 }
  if (!voucherCode) {
    session.voucher_id = null
    session.voucher_code = null
    return { session, voucher: null, discountAmount: 0 }
  }

  const voucher = getVoucherByCode(data, session.restaurant_id, voucherCode)
  if (!voucher) {
    throw new Error('Voucher khong hop le hoac da ngung su dung')
  }

  const discountAmount = calculateVoucherDiscount(session.subtotal_amount, voucher)
  if (discountAmount <= 0) {
    throw new Error('Hoa don chua du dieu kien ap dung voucher')
  }

  session.voucher_id = voucher.id
  session.voucher_code = voucher.code
  return { session, voucher, discountAmount }
}

function recalculateSessionTotals(data, sessionId) {
  const session = data.sessions.find((item) => item.id === sessionId)
  if (!session) return null
  session.subtotal_amount = data.orders
    .filter((order) => order.session_id === sessionId && order.status !== 'cancelled')
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
  session.discount_amount = 0

  if (session.voucher_code) {
    const voucher = getVoucherByCode(data, session.restaurant_id, session.voucher_code)
    session.discount_amount = calculateVoucherDiscount(session.subtotal_amount, voucher)
    if (!voucher || session.discount_amount <= 0) {
      session.voucher_id = null
      session.voucher_code = null
      session.discount_amount = 0
    } else {
      session.voucher_id = voucher.id
    }
  }

  session.total_amount = Math.max(0, session.subtotal_amount - session.discount_amount)
  return session
}

function getTablePayload(data, restaurantId) {
  return data.tables
    .filter((table) => table.restaurant_id === restaurantId)
    .sort((a, b) => a.table_number - b.table_number)
    .map((table) => {
      const activeSession = getActiveSession(data, table.id)
      const orders = activeSession ? getSessionOrders(data, activeSession.id) : []
      return {
        ...table,
        session: activeSession
          ? {
              id: activeSession.id,
              status: activeSession.status,
          total_amount: activeSession.total_amount,
          subtotal_amount: activeSession.subtotal_amount,
          discount_amount: activeSession.discount_amount,
          voucher_code: activeSession.voucher_code || null,
          opened_at: activeSession.opened_at,
        }
          : null,
        orders,
      }
    })
}

function logActivity(data, payload) {
  if (!Array.isArray(data.activity_logs)) {
    data.activity_logs = []
  }
  data.activity_logs.push({
    id: createId('log'),
    created_at: isoNow(),
    ...payload,
  })
}

function createUser(data, { email, password, name, role, restaurantId, restaurantName }) {
  let resolvedRestaurantId = restaurantId || null
  const userId = createId('user')

  if (role === 'owner') {
    resolvedRestaurantId = createId('rest')
    data.restaurants.push({
      id: resolvedRestaurantId,
      name: restaurantName || `${name}'s Restaurant`,
      address: '',
      owner_id: userId,
      created_at: isoNow(),
      updated_at: isoNow(),
    })
  }

  const user = {
    id: userId,
    email,
    password_hash: hashPassword(password),
    full_name: name,
    name,
    role,
    restaurant_id: resolvedRestaurantId,
    is_active: true,
    permissions: createDefaultPermissions(role),
    created_at: isoNow(),
    updated_at: isoNow(),
  }
  data.users.push(user)
  return user
}

module.exports = {
  getActiveSession,
  getSessionOrders,
  getVoucherByCode,
  calculateVoucherDiscount,
  applyVoucherToSession,
  recalculateSessionTotals,
  getTablePayload,
  logActivity,
  createUser,
}
