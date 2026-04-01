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

function recalculateSessionTotals(data, sessionId) {
  const session = data.sessions.find((item) => item.id === sessionId)
  if (!session) return null
  session.total_amount = data.orders
    .filter((order) => order.session_id === sessionId && order.status !== 'cancelled')
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
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
    })
  }

  const user = {
    id: userId,
    email,
    password_hash: hashPassword(password),
    name,
    role,
    restaurant_id: resolvedRestaurantId,
    is_active: true,
    permissions: createDefaultPermissions(role),
    created_at: isoNow(),
  }
  data.users.push(user)
  return user
}

module.exports = {
  getActiveSession,
  getSessionOrders,
  recalculateSessionTotals,
  getTablePayload,
  logActivity,
  createUser,
}
