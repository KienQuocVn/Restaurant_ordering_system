const crypto = require('crypto')
const { readStore, writeStore, hashPassword, createId, isoNow } = require('../data/store')
const {
  parseBody,
  sendJson,
  notFound,
  createSessionCookie,
  clearAuthCookies,
} = require('../utils/http')
const {
  signAccessToken,
  signRealtimeToken,
  signRefreshJwt,
  verifyJwt,
  verifyRefreshJwt,
  getBearerToken,
  getRefreshToken,
  createOpaqueToken,
  hashToken,
} = require('../utils/auth')
const { subscribe, publishRestaurantEvent } = require('../realtime')
const {
  getActiveSession,
  getSessionOrders,
  recalculateSessionTotals,
  getTablePayload,
  logActivity,
  createUser,
  applyVoucherToSession,
} = require('../services/business')
const {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  REALTIME_TOKEN_TTL_SECONDS,
} = require('../config')

const PAYMENT_IPN_SECRET = process.env.PAYMENT_IPN_SECRET || 'qr-ordering-ipn-secret'

function getSessionRecord(data, sessionId) {
  if (!sessionId) return null
  return (
    data.auth_sessions.find(
      (item) =>
        item.id === sessionId &&
        !item.revoked_at &&
        new Date(item.expires_at).getTime() > Date.now()
    ) || null
  )
}

function toAuthUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.full_name || user.name,
    role: user.role,
    restaurant_id: user.restaurant_id,
    permissions: user.permissions || {},
    created_at: user.created_at,
  }
}

function buildRealtimeToken(user, sessionId) {
  return signRealtimeToken({
    sub: user.id,
    sid: sessionId,
    role: user.role,
    restaurant_id: user.restaurant_id,
    scope: 'realtime',
  })
}

function issueAccessToken(user, sessionId) {
  return signAccessToken({
    sub: user.id,
    sid: sessionId,
    role: user.role,
    restaurant_id: user.restaurant_id,
  })
}

function createSessionResponse(user, sessionId) {
  return {
    user: toAuthUser(user),
    realtimeToken: buildRealtimeToken(user, sessionId),
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    realtimeTokenExpiresIn: REALTIME_TOKEN_TTL_SECONDS,
  }
}

function requireAuth(req, res, allowedRoles = []) {
  const token = getBearerToken(req)
  const payload = verifyJwt(token)
  if (!payload?.sub || !payload?.sid) {
    sendJson(res, 401, { error: 'Unauthorized' })
    return null
  }
  const data = readStore()
  const authSession = getSessionRecord(data, payload.sid)
  if (!authSession || authSession.user_id !== payload.sub) {
    sendJson(res, 401, { error: 'Unauthorized' })
    return null
  }
  const user = data.users.find((item) => item.id === payload.sub && item.is_active !== false)
  if (!user) {
    sendJson(res, 401, { error: 'Unauthorized' })
    return null
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    sendJson(res, 403, { error: 'Forbidden' })
    return null
  }
  req.authUser = user
  req.authSession = authSession
  return user
}

function requirePermission(req, res, permission) {
  const user = req.authUser
  if (!user) {
    sendJson(res, 401, { error: 'Unauthorized' })
    return false
  }
  if (user.role === 'owner' || user.permissions?.[permission]) {
    return true
  }
  sendJson(res, 403, { error: `Missing permission: ${permission}` })
  return false
}

function isInRange(value, range) {
  if (range === 'all') return true
  const date = new Date(value)
  const now = new Date()
  const start = new Date(now)
  if (range === 'today') {
    start.setHours(0, 0, 0, 0)
    return date >= start
  }
  if (range === 'week') {
    const day = start.getDay()
    const diff = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diff)
    start.setHours(0, 0, 0, 0)
    return date >= start
  }
  if (range === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return date >= start
  }
  return true
}

function formatDateLabel(value) {
  return new Date(value).toISOString().slice(0, 10)
}

function signPaymentIpn(payload) {
  const raw = [payload.paymentId, payload.sessionId, payload.amount, payload.status].join('|')
  return crypto.createHmac('sha256', PAYMENT_IPN_SECRET).update(raw).digest('hex')
}

function buildPaymentQrUrl(paymentMethod, session, amount, paymentId) {
  if (paymentMethod === 'bank_transfer') {
    const addInfo = encodeURIComponent(`${session.id}|${paymentId}`)
    return `https://img.vietqr.io/image/970422-123456789-compact2.png?amount=${Number(amount)}&addInfo=${addInfo}`
  }
  if (paymentMethod === 'momo') {
    return `momo://pay?amount=${Number(amount)}&session=${session.id}&payment=${paymentId}`
  }
  return ''
}

function resolvePaymentProvider(paymentMethod) {
  if (paymentMethod === 'bank_transfer') return 'vietqr'
  if (paymentMethod === 'momo') return 'momo'
  if (paymentMethod === 'card') return 'card'
  return 'cash'
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

function emitSessionUpdate(data, session) {
  const table = data.tables.find((item) => item.id === session.table_id)
  publishRestaurantEvent(session.restaurant_id, 'session.updated', {
    type: 'session.updated',
    restaurantId: session.restaurant_id,
    tableId: session.table_id,
    sessionId: session.id,
    sessionStatus: session.status,
    tableStatus: table?.status || null,
    subtotalAmount: session.subtotal_amount || 0,
    discountAmount: session.discount_amount || 0,
    totalAmount: session.total_amount,
    voucherCode: session.voucher_code || null,
  })
}

function finalizeSessionPayment(data, payment, verificationPayload = {}) {
  const session = data.sessions.find((item) => item.id === payment.session_id)
  if (!session) throw new Error('Session not found')
  payment.status = 'success'
  payment.verification_status = 'verified'
  payment.provider_txn_id = verificationPayload.providerTxnId || payment.provider_txn_id || createId('txn')
  payment.provider_payload = { ...(payment.provider_payload || {}), ...verificationPayload }
  payment.verified_at = isoNow()
  payment.paid_at = payment.paid_at || isoNow()
  payment.received_amount = Number(verificationPayload.receivedAmount || payment.received_amount || payment.amount)
  payment.reconciliation_status = Number(payment.received_amount || 0) === Number(payment.amount || 0) ? 'matched' : 'mismatch'
  payment.reconciled_at = isoNow()
  session.status = 'paid'
  session.paid_amount = Number(payment.received_amount || payment.amount || 0)
  session.payment_method = payment.method
  session.closed_at = isoNow()
  const table = data.tables.find((item) => item.id === session.table_id)
  if (table) {
    table.status = 'empty'
    table.guest_count = 0
  }
  data.orders.filter((item) => item.session_id === session.id).forEach((item) => {
    if (item.status !== 'cancelled') item.status = 'completed'
  })
  publishRestaurantEvent(session.restaurant_id, 'payment.completed', {
    type: 'payment.completed',
    restaurantId: session.restaurant_id,
    tableId: session.table_id,
    sessionId: session.id,
    paymentId: payment.id,
    method: payment.method,
    amount: payment.amount,
    receivedAmount: payment.received_amount,
    reconciliationStatus: payment.reconciliation_status,
  })
  publishRestaurantEvent(session.restaurant_id, 'table.updated', {
    type: 'table.updated',
    restaurantId: session.restaurant_id,
    tableId: session.table_id,
    tableNumber: table?.table_number || null,
    tableStatus: table?.status || null,
    guestCount: table?.guest_count || 0,
  })
  emitSessionUpdate(data, session)
  return { session, table, payment }
}

function autoConfirmPayment(payment) {
  setTimeout(async () => {
    const data = readStore()
    const storedPayment = data.payments.find((item) => item.id === payment.id)
    if (!storedPayment || storedPayment.status !== 'pending') return
    finalizeSessionPayment(data, storedPayment, {
      providerTxnId: `auto_${storedPayment.provider || storedPayment.method}_${Date.now()}`,
      receivedAmount: storedPayment.amount,
      source: 'auto-demo-ipn',
    })
    await writeStore(data)
  }, 2000)
}

async function handleAuthSignup(req, res) {
  const body = await parseBody(req)
  const { email, password, name, role, restaurantId, restaurantName } = body
  if (!email || !password || !name || !role) return sendJson(res, 400, { error: 'Missing required fields' })
  if (!['staff', 'owner'].includes(role)) return sendJson(res, 400, { error: 'Only staff and owner accounts are allowed' })
  const data = readStore()
  if (data.users.find((user) => user.email === email)) return sendJson(res, 400, { error: 'Email already exists' })
  if (role === 'staff' && !restaurantId) return sendJson(res, 400, { error: 'Restaurant ID is required for staff' })
  const user = createUser(data, { email, password, name, role, restaurantId, restaurantName })
  logActivity(data, { actor_id: user.id, restaurant_id: user.restaurant_id, action: 'signup', detail: `${role} account created` })
  await writeStore(data)
  return sendJson(res, 201, { success: true, userId: user.id, restaurant_id: user.restaurant_id })
}

async function handleAuthSignin(req, res) {
  const body = await parseBody(req)
  const { email, password } = body
  if (!email || !password) return sendJson(res, 400, { error: 'Email and password required' })
  const data = readStore()
  const user = data.users.find((item) => item.email === email && item.is_active !== false)
  if (!user || user.password_hash !== hashPassword(password)) return sendJson(res, 401, { error: 'Invalid credentials' })
  const rawRefreshToken = createOpaqueToken()
  const authSession = {
    id: createId('auth_session'),
    user_id: user.id,
    restaurant_id: user.restaurant_id || null,
    refresh_token_hash: hashToken(rawRefreshToken),
    user_agent: req.headers['user-agent'] || '',
    ip_address: req.socket?.remoteAddress || '',
    expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString(),
    last_used_at: isoNow(),
    revoked_at: null,
    created_at: isoNow(),
  }
  data.auth_sessions.push(authSession)
  await writeStore(data)
  const accessToken = issueAccessToken(user, authSession.id)
  const refreshJwt = signRefreshJwt({ sub: user.id, sid: authSession.id, jti: rawRefreshToken })
  return sendJson(res, 200, { success: true, ...createSessionResponse(user, authSession.id) }, {
    'Set-Cookie': [
      createSessionCookie('qr_access_token', accessToken, ACCESS_TOKEN_TTL_SECONDS, true),
      createSessionCookie('qr_refresh_token', refreshJwt, REFRESH_TOKEN_TTL_SECONDS, true),
    ],
  }, req)
}

async function handleAuthRefresh(req, res) {
  const refreshToken = getRefreshToken(req)
  const payload = verifyRefreshJwt(refreshToken)
  if (!payload?.sub || !payload?.sid || !payload?.jti) {
    return sendJson(res, 401, { error: 'Invalid refresh token' }, {}, req)
  }

  const data = readStore()
  const authSession = getSessionRecord(data, payload.sid)
  const user = data.users.find((item) => item.id === payload.sub && item.is_active !== false)
  if (
    !authSession ||
    !user ||
    authSession.user_id !== payload.sub ||
    authSession.refresh_token_hash !== hashToken(payload.jti)
  ) {
    return sendJson(res, 401, { error: 'Invalid refresh token' }, { 'Set-Cookie': clearAuthCookies() }, req)
  }

  const nextRawRefreshToken = createOpaqueToken()
  authSession.refresh_token_hash = hashToken(nextRawRefreshToken)
  authSession.last_used_at = isoNow()
  authSession.expires_at = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString()
  await writeStore(data)

  const accessToken = issueAccessToken(user, authSession.id)
  const refreshJwt = signRefreshJwt({
    sub: user.id,
    sid: authSession.id,
    jti: nextRawRefreshToken,
  })

  return sendJson(res, 200, { success: true, ...createSessionResponse(user, authSession.id) }, {
    'Set-Cookie': [
      createSessionCookie('qr_access_token', accessToken, ACCESS_TOKEN_TTL_SECONDS, true),
      createSessionCookie('qr_refresh_token', refreshJwt, REFRESH_TOKEN_TTL_SECONDS, true),
    ],
  }, req)
}

function handleAuthSession(req, res) {
  const user = requireAuth(req, res, ['staff', 'owner'])
  if (!user) return
  return sendJson(res, 200, { success: true, ...createSessionResponse(user, req.authSession.id) }, {}, req)
}

async function handleAuthSignout(req, res) {
  const refreshToken = getRefreshToken(req)
  const payload = verifyRefreshJwt(refreshToken)
  if (payload?.sid) {
    const data = readStore()
    const authSession = data.auth_sessions.find((item) => item.id === payload.sid)
    if (authSession && !authSession.revoked_at) {
      authSession.revoked_at = isoNow()
      authSession.last_used_at = isoNow()
      await writeStore(data)
    }
  }
  return sendJson(res, 200, { success: true }, { 'Set-Cookie': clearAuthCookies() }, req)
}

function handleMenu(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  const categories = data.categories.filter((category) => category.restaurant_id === restaurantId && category.is_active !== false).sort((a, b) => a.sort_order - b.sort_order)
  const items = data.menu_items.filter((item) => item.restaurant_id === restaurantId && item.is_available !== false).sort((a, b) => a.display_order - b.display_order)
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
  return sendJson(res, 200, { restaurant: restaurant || null, table, session, orders: session ? getSessionOrders(data, session.id) : [] })
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
  await writeStore(data)
  emitSessionUpdate(data, session)
  publishRestaurantEvent(session.restaurant_id, 'table.updated', {
    type: 'table.updated',
    restaurantId: session.restaurant_id,
    tableId: table?.id || null,
    tableNumber: table?.table_number || null,
    tableStatus: table?.status || null,
    guestCount: table?.guest_count || 0,
  })
  return sendJson(res, 200, { success: true, session })
}

async function handleCreateOrder(req, res) {
  const body = await parseBody(req)
  const { userId, restaurantId, tableId, items, notes, guestCount } = body
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
      guest_count: Number(guestCount || table.guest_count || 1),
      subtotal_amount: 0,
      discount_amount: 0,
      total_amount: 0,
      paid_amount: 0,
      payment_method: null,
      voucher_id: null,
      voucher_code: null,
    }
    data.sessions.push(session)
  }
  const orderId = createId('order')
  let totalAmount = 0
  const orderItems = items.map((item) => {
    const menuItemId = item.menuItemId || item.id
    const menuItem = data.menu_items.find((menu) => menu.id === menuItemId)
    const unitPrice = Number(item.price || menuItem?.price || 0)
    const quantity = Number(item.quantity || 0)
    totalAmount += unitPrice * quantity
    return {
      id: createId('order_item'),
      order_id: orderId,
      menu_item_id: menuItemId,
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
  if (guestCount !== undefined) {
    table.guest_count = Math.max(1, Number(guestCount || 1))
    session.guest_count = table.guest_count
  } else {
    table.guest_count = Math.max(table.guest_count || 0, 1)
    session.guest_count = Math.max(session.guest_count || 0, table.guest_count || 1)
  }
  table.status = 'occupied'
  await writeStore(data)
  publishRestaurantEvent(restaurantId, 'order.created', {
    type: 'order.created',
    restaurantId,
    tableId,
    sessionId: session.id,
    orderId: order.id,
    tableNumber: table.table_number,
    totalAmount: order.total_amount,
    createdAt: order.created_at,
  })
  publishRestaurantEvent(restaurantId, 'table.updated', {
    type: 'table.updated',
    restaurantId,
    tableId,
    tableNumber: table.table_number,
    tableStatus: table.status,
    sessionId: session.id,
  })
  emitSessionUpdate(data, session)
  return sendJson(res, 201, { success: true, order, session })
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
  const allowedStatuses = ['pending', 'acknowledged', 'sent_to_kitchen', 'preparing', 'completed', 'cancelled']
  if (!allowedStatuses.includes(status)) return sendJson(res, 400, { error: 'Invalid order status' })
  const data = readStore()
  const order = data.orders.find((item) => item.id === orderId)
  if (!order) return sendJson(res, 404, { error: 'Order not found' })
  order.status = status
  if (['acknowledged', 'sent_to_kitchen', 'preparing'].includes(status) && !order.confirmed_at) order.confirmed_at = isoNow()
  await writeStore(data)
  publishRestaurantEvent(order.restaurant_id, 'order.updated', {
    type: 'order.updated',
    restaurantId: order.restaurant_id,
    tableId: order.table_id,
    sessionId: order.session_id,
    orderId: order.id,
    status: order.status,
    confirmedAt: order.confirmed_at,
  })
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
  await writeStore(data)
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
  if (guestCount !== undefined) {
    table.guest_count = Number(guestCount)
    const activeSession = getActiveSession(data, table.id)
    if (activeSession) activeSession.guest_count = Number(guestCount)
  }
  await writeStore(data)
  publishRestaurantEvent(table.restaurant_id, 'table.updated', {
    type: 'table.updated',
    restaurantId: table.restaurant_id,
    tableId: table.id,
    tableNumber: table.table_number,
    tableStatus: table.status,
    guestCount: table.guest_count,
  })
  const activeSession = getActiveSession(data, table.id)
  if (activeSession) emitSessionUpdate(data, activeSession)
  return sendJson(res, 200, { success: true, table })
}

async function handleDeleteTable(req, res, url) {
  const tableId = url.searchParams.get('table_id')
  if (!tableId) return sendJson(res, 400, { error: 'Table ID required' })
  const data = readStore()
  const activeSession = data.sessions.find((session) => session.table_id === tableId && ['active', 'payment_requested'].includes(session.status))
  if (activeSession) return sendJson(res, 400, { error: 'Cannot delete a table with active session' })
  data.tables = data.tables.filter((table) => table.id !== tableId)
  await writeStore(data)
  return sendJson(res, 200, { success: true })
}

function handleOwnerMenu(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  const categories = data.categories.filter((category) => category.restaurant_id === restaurantId).sort((a, b) => a.sort_order - b.sort_order)
  const items = data.menu_items.filter((item) => item.restaurant_id === restaurantId).sort((a, b) => a.display_order - b.display_order)
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
    is_available: payload.isAvailable !== false,
    display_order: payload.displayOrder || store.menu_items.length + 1,
    options: payload.options || [],
  }
  store.menu_items.push(item)
  await writeStore(store)
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
  item.category_id = payload.categoryId || item.category_id
  item.image_url = payload.imageUrl || ''
  item.options = payload.options || []
  item.display_order = Number(payload.displayOrder || item.display_order || 0)
  item.is_available = payload.isAvailable !== false
  await writeStore(store)
  return sendJson(res, 200, { success: true, item })
}

async function handleOwnerMenuDelete(req, res, url) {
  const itemId = url.searchParams.get('item_id')
  if (!itemId) return sendJson(res, 400, { error: 'Item ID required' })
  const store = readStore()
  store.menu_items = store.menu_items.filter((item) => item.id !== itemId)
  await writeStore(store)
  return sendJson(res, 200, { success: true })
}

function handleOwnerCategories(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  const categories = data.categories.filter((item) => item.restaurant_id === restaurantId).sort((a, b) => a.sort_order - b.sort_order)
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
  await writeStore(data)
  return sendJson(res, 201, { success: true, category })
}

async function handleOwnerCategoriesPatch(req, res) {
  const body = await parseBody(req)
  const { categoryId, name, isActive, sortOrder } = body
  const data = readStore()
  const category = data.categories.find((item) => item.id === categoryId)
  if (!category) return sendJson(res, 404, { error: 'Category not found' })
  if (name !== undefined) category.name = name
  if (isActive !== undefined) category.is_active = isActive
  if (sortOrder !== undefined) category.sort_order = Number(sortOrder)
  await writeStore(data)
  return sendJson(res, 200, { success: true, category })
}

async function handleOwnerCategoriesReorder(req, res) {
  const body = await parseBody(req)
  const { restaurantId, categoryIds } = body
  if (!restaurantId || !Array.isArray(categoryIds) || categoryIds.length === 0) return sendJson(res, 400, { error: 'Restaurant ID and categoryIds are required' })
  const data = readStore()
  const scoped = data.categories.filter((item) => item.restaurant_id === restaurantId)
  categoryIds.forEach((categoryId, index) => {
    const category = scoped.find((item) => item.id === categoryId)
    if (category) category.sort_order = index + 1
  })
  await writeStore(data)
  return sendJson(res, 200, { success: true })
}

async function handleOwnerCategoriesDelete(req, res, url) {
  const categoryId = url.searchParams.get('category_id')
  const data = readStore()
  data.categories = data.categories.filter((item) => item.id !== categoryId)
  data.menu_items = data.menu_items.filter((item) => item.category_id !== categoryId)
  await writeStore(data)
  return sendJson(res, 200, { success: true })
}

function handleOwnerOrders(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  const orders = decorateOrders(data, data.orders.filter((order) => order.restaurant_id === restaurantId))
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
  const session = recalculateSessionTotals(data, order.session_id)
  await writeStore(data)
  publishRestaurantEvent(order.restaurant_id, 'order.updated', {
    type: 'order.updated',
    restaurantId: order.restaurant_id,
    tableId: order.table_id,
    sessionId: order.session_id,
    orderId: order.id,
    status: order.status,
    cancelReason: order.cancel_reason,
  })
  if (session) emitSessionUpdate(data, session)
  return sendJson(res, 200, { success: true, order })
}

function handleOwnerStaff(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  const data = readStore()
  const staff = data.users.filter((item) => item.restaurant_id === restaurantId && item.role === 'staff')
  const logs = data.activity_logs.filter((item) => item.restaurant_id === restaurantId).slice(-20).reverse()
  return sendJson(res, 200, { staff, logs })
}

async function handleOwnerStaffPost(req, res) {
  const body = await parseBody(req)
  const { restaurantId, email, password, name } = body
  if (!restaurantId || !email || !password || !name) return sendJson(res, 400, { error: 'Missing required fields' })
  const data = readStore()
  if (data.users.find((user) => user.email === email)) return sendJson(res, 400, { error: 'Email already exists' })
  const user = createUser(data, { email, password, name, role: 'staff', restaurantId, restaurantName: '' })
  logActivity(data, { actor_id: user.id, restaurant_id: restaurantId, action: 'create_staff', detail: `Staff ${user.email} created` })
  await writeStore(data)
  return sendJson(res, 201, { success: true, user })
}

async function handleOwnerStaffPatch(req, res) {
  const body = await parseBody(req)
  const { staffId, name, isActive, permissions } = body
  const data = readStore()
  const staff = data.users.find((user) => user.id === staffId && user.role === 'staff')
  if (!staff) return sendJson(res, 404, { error: 'Staff not found' })
  if (name !== undefined) staff.name = name
  if (name !== undefined) staff.full_name = name
  if (isActive !== undefined) staff.is_active = isActive
  if (permissions && typeof permissions === 'object') {
    staff.permissions = { ...(staff.permissions || {}), ...permissions }
  }
  await writeStore(data)
  return sendJson(res, 200, { success: true, staff })
}

async function handleOwnerMenuReorder(req, res) {
  const body = await parseBody(req)
  const { restaurantId, itemIds } = body
  if (!restaurantId || !Array.isArray(itemIds) || itemIds.length === 0) return sendJson(res, 400, { error: 'Restaurant ID and itemIds are required' })
  const store = readStore()
  const scoped = store.menu_items.filter((item) => item.restaurant_id === restaurantId)
  itemIds.forEach((itemId, index) => {
    const item = scoped.find((entry) => entry.id === itemId)
    if (item) item.display_order = index + 1
  })
  await writeStore(store)
  return sendJson(res, 200, { success: true })
}

async function handleOwnerStaffDelete(req, res, url) {
  const staffId = url.searchParams.get('staff_id')
  const data = readStore()
  const staff = data.users.find((user) => user.id === staffId && user.role === 'staff')
  if (!staff) return sendJson(res, 404, { error: 'Staff not found' })
  staff.is_active = false
  logActivity(data, { actor_id: staff.id, restaurant_id: staff.restaurant_id, action: 'disable_staff', detail: `Staff ${staff.email} disabled` })
  await writeStore(data)
  return sendJson(res, 200, { success: true })
}

function handleGetVouchers(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  const vouchers = data.vouchers.filter((voucher) => voucher.restaurant_id === restaurantId).sort((a, b) => a.code.localeCompare(b.code))
  return sendJson(res, 200, vouchers)
}

async function handleOwnerVouchersPost(req, res) {
  const body = await parseBody(req)
  const { restaurantId, code, name, type, value, minOrderValue, maxDiscountAmount } = body
  if (!restaurantId || !code || !name || !type || !value) return sendJson(res, 400, { error: 'Missing voucher fields' })
  const data = readStore()
  const duplicated = data.vouchers.find((voucher) => voucher.restaurant_id === restaurantId && voucher.code.toLowerCase() === String(code).trim().toLowerCase())
  if (duplicated) return sendJson(res, 400, { error: 'Voucher code already exists' })
  const voucher = {
    id: createId('voucher'),
    restaurant_id: restaurantId,
    code: String(code).trim().toUpperCase(),
    name: String(name).trim(),
    type,
    value: Number(value),
    min_order_value: Number(minOrderValue || 0),
    max_discount_amount: maxDiscountAmount === '' || maxDiscountAmount === null || maxDiscountAmount === undefined ? null : Number(maxDiscountAmount),
    is_active: true,
    created_at: isoNow(),
  }
  data.vouchers.push(voucher)
  await writeStore(data)
  return sendJson(res, 201, { success: true, voucher })
}

async function handleOwnerVouchersPatch(req, res) {
  const body = await parseBody(req)
  const { voucherId, name, isActive, value, minOrderValue, maxDiscountAmount } = body
  const data = readStore()
  const voucher = data.vouchers.find((item) => item.id === voucherId)
  if (!voucher) return sendJson(res, 404, { error: 'Voucher not found' })
  if (name !== undefined) voucher.name = name
  if (isActive !== undefined) voucher.is_active = Boolean(isActive)
  if (value !== undefined) voucher.value = Number(value)
  if (minOrderValue !== undefined) voucher.min_order_value = Number(minOrderValue)
  if (maxDiscountAmount !== undefined) voucher.max_discount_amount = maxDiscountAmount === '' || maxDiscountAmount === null ? null : Number(maxDiscountAmount)
  await writeStore(data)
  return sendJson(res, 200, { success: true, voucher })
}

async function handleOwnerVouchersDelete(req, res, url) {
  const voucherId = url.searchParams.get('voucher_id')
  const data = readStore()
  data.vouchers = data.vouchers.filter((item) => item.id !== voucherId)
  data.sessions.forEach((session) => {
    if (session.voucher_id === voucherId) {
      session.voucher_id = null
      session.voucher_code = null
      session.discount_amount = 0
      recalculateSessionTotals(data, session.id)
    }
  })
  await writeStore(data)
  return sendJson(res, 200, { success: true })
}

function handleOwnerAnalytics(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  const range = url.searchParams.get('range') || 'today'
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  const restaurantSessions = data.sessions.filter((session) => session.restaurant_id === restaurantId && isInRange(session.opened_at, range))
  const sessionIds = new Set(restaurantSessions.map((session) => session.id))
  const restaurantOrders = data.orders.filter((order) => order.restaurant_id === restaurantId && isInRange(order.created_at, range))
  const restaurantPayments = data.payments.filter((payment) => sessionIds.has(payment.session_id) && isInRange(payment.created_at, range))
  const totalOrders = restaurantOrders.length
  const totalRevenue = restaurantPayments.filter((payment) => payment.status === 'success').reduce((sum, payment) => sum + Number(payment.received_amount || payment.amount || 0), 0)
  const completedOrders = restaurantOrders.filter((order) => order.status === 'completed').length
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const servedTables = new Set(restaurantSessions.map((session) => session.table_id)).size
  const customerCount = restaurantSessions.reduce((sum, session) => sum + Number(session.guest_count || 0), 0)
  const serviceDurations = restaurantSessions.filter((session) => session.closed_at).map((session) => Math.max(0, Math.round((new Date(session.closed_at).getTime() - new Date(session.opened_at).getTime()) / 60000)))
  const averageServiceMinutes = serviceDurations.length > 0 ? serviceDurations.reduce((sum, value) => sum + value, 0) / serviceDurations.length : 0
  const totalDiscount = restaurantSessions.reduce((sum, session) => sum + Number(session.discount_amount || 0), 0)
  const topMap = {}
  data.order_items.forEach((item) => {
    const order = data.orders.find((entry) => entry.id === item.order_id)
    if (!order || order.restaurant_id !== restaurantId || !isInRange(order.created_at, range)) return
    if (!topMap[item.product_name]) topMap[item.product_name] = { name: item.product_name, quantity: 0, price: item.unit_price }
    topMap[item.product_name].quantity += item.quantity
  })
  const paymentMethods = {}
  restaurantPayments.filter((payment) => payment.status === 'success').forEach((payment) => {
    paymentMethods[payment.method] = (paymentMethods[payment.method] || 0) + Number(payment.received_amount || payment.amount || 0)
  })
  const revenueByDate = {}
  restaurantPayments.filter((payment) => payment.status === 'success').forEach((payment) => {
    const key = formatDateLabel(payment.created_at)
    revenueByDate[key] = (revenueByDate[key] || 0) + Number(payment.received_amount || payment.amount || 0)
  })
  return sendJson(res, 200, {
    stats: { totalOrders, totalRevenue, completedOrders, averageOrderValue, customerCount, servedTables, averageServiceMinutes, totalDiscount },
    topSellingItems: Object.values(topMap).sort((a, b) => b.quantity - a.quantity),
    paymentMethods,
    revenueByDate: Object.entries(revenueByDate).sort((a, b) => a[0].localeCompare(b[0])).map(([date, amount]) => ({ date, amount })),
    recentOrders: restaurantOrders.slice(-10).reverse(),
    range,
  })
}

function handleOwnerReconciliation(req, res, url) {
  const restaurantId = url.searchParams.get('restaurant_id')
  if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
  const data = readStore()
  const scopedSessions = data.sessions.filter((session) => session.restaurant_id === restaurantId)
  const sessionMap = new Map(scopedSessions.map((session) => [session.id, session]))
  const tableMap = new Map(data.tables.map((table) => [table.id, table]))
  const payments = data.payments.filter((payment) => sessionMap.has(payment.session_id)).map((payment) => {
    const session = sessionMap.get(payment.session_id)
    const table = session ? tableMap.get(session.table_id) : null
    const expectedAmount = Number(session?.total_amount || payment.amount || 0)
    const receivedAmount = Number(payment.received_amount || payment.amount || 0)
    const matched = expectedAmount === receivedAmount && payment.status === 'success'
    return {
      ...payment,
      session_total: expectedAmount,
      received_amount: receivedAmount,
      table_number: table?.table_number || null,
      voucher_code: session?.voucher_code || null,
      discount_amount: Number(session?.discount_amount || 0),
      matched,
    }
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const summary = {
    totalTransactions: payments.length,
    successfulTransactions: payments.filter((payment) => payment.status === 'success').length,
    pendingTransactions: payments.filter((payment) => payment.status === 'pending').length,
    mismatchedTransactions: payments.filter((payment) => !payment.matched).length,
    totalCollected: payments.filter((payment) => payment.status === 'success').reduce((sum, payment) => sum + Number(payment.received_amount || 0), 0),
  }
  return sendJson(res, 200, { summary, payments })
}

async function handlePayments(req, res) {
  const body = await parseBody(req)
  const { orderId, paymentMethod, amount, voucherCode } = body
  if (!orderId || !paymentMethod) return sendJson(res, 400, { error: 'Missing required fields' })
  const data = readStore()
  const order = data.orders.find((item) => item.id === orderId)
  if (!order) return sendJson(res, 404, { error: 'Order not found' })
  const session = data.sessions.find((item) => item.id === order.session_id)
  if (!session) return sendJson(res, 404, { error: 'Session not found' })
  recalculateSessionTotals(data, session.id)
  if (voucherCode) {
    applyVoucherToSession(data, session, voucherCode)
    recalculateSessionTotals(data, session.id)
  } else if (voucherCode === '') {
    session.voucher_id = null
    session.voucher_code = null
    recalculateSessionTotals(data, session.id)
  }
  const expectedAmount = Number(session.total_amount || amount || 0)
  const provider = resolvePaymentProvider(paymentMethod)
  const payment = {
    id: createId('payment'),
    session_id: session.id,
    order_id: order.id,
    method: paymentMethod,
    provider,
    amount: expectedAmount,
    received_amount: 0,
    status: ['cash', 'card'].includes(paymentMethod) ? 'success' : 'pending',
    qr_code_url: buildPaymentQrUrl(paymentMethod, session, expectedAmount, createId('ref')),
    provider_txn_id: null,
    provider_payload: {},
    verification_status: ['cash', 'card'].includes(paymentMethod) ? 'verified' : 'pending',
    verified_at: ['cash', 'card'].includes(paymentMethod) ? isoNow() : null,
    reconciliation_status: ['cash', 'card'].includes(paymentMethod) ? 'matched' : 'pending',
    reconciled_at: ['cash', 'card'].includes(paymentMethod) ? isoNow() : null,
    created_at: isoNow(),
    paid_at: ['cash', 'card'].includes(paymentMethod) ? isoNow() : null,
  }
  data.payments.push(payment)
  session.status = ['cash', 'card'].includes(paymentMethod) ? 'paid' : 'payment_pending'
  if (payment.status === 'success') {
    payment.received_amount = expectedAmount
    finalizeSessionPayment(data, payment, { providerTxnId: `manual_${provider}_${Date.now()}`, receivedAmount: expectedAmount, source: 'staff-manual' })
  } else {
    const ipnPayload = { paymentId: payment.id, sessionId: session.id, amount: payment.amount, status: 'success' }
    payment.provider_payload = { ipn_signature: signPaymentIpn(ipnPayload), auto_confirm_url: '/api/payments/ipn' }
    autoConfirmPayment(payment)
  }
  await writeStore(data)
  emitSessionUpdate(data, session)
  return sendJson(res, 200, { success: true, payment, session })
}

function handleGetPayments(req, res, url) {
  const sessionId = url.searchParams.get('session_id')
  const orderId = url.searchParams.get('order_id')
  const restaurantId = url.searchParams.get('restaurant_id')
  const data = readStore()
  let payments = data.payments
  if (sessionId) payments = payments.filter((item) => item.session_id === sessionId)
  if (orderId) payments = payments.filter((item) => item.order_id === orderId)
  if (restaurantId) {
    const sessionIds = new Set(data.sessions.filter((session) => session.restaurant_id === restaurantId).map((session) => session.id))
    payments = payments.filter((item) => sessionIds.has(item.session_id))
  }
  return sendJson(res, 200, payments)
}

async function handlePaymentIpn(req, res) {
  const body = await parseBody(req)
  const { paymentId, sessionId, amount, status, signature, providerTxnId, receivedAmount } = body
  if (!paymentId || !sessionId || !amount || !status || !signature) return sendJson(res, 400, { error: 'Invalid IPN payload' })
  const expectedSignature = signPaymentIpn({ paymentId, sessionId, amount, status })
  if (expectedSignature !== signature) return sendJson(res, 401, { error: 'Invalid IPN signature' })
  const data = readStore()
  const payment = data.payments.find((item) => item.id === paymentId && item.session_id === sessionId)
  if (!payment) return sendJson(res, 404, { error: 'Payment not found' })
  if (payment.status === 'success') return sendJson(res, 200, { success: true, payment, alreadyProcessed: true })
  finalizeSessionPayment(data, payment, { providerTxnId: providerTxnId || `ipn_${Date.now()}`, receivedAmount: Number(receivedAmount || amount), source: 'verified-ipn' })
  await writeStore(data)
  return sendJson(res, 200, { success: true, payment })
}

async function routeRequest(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/events') {
    const restaurantId = url.searchParams.get('restaurant_id')
    const role = url.searchParams.get('role') || 'public'
    if (!restaurantId) return sendJson(res, 400, { error: 'Restaurant ID required' })
    if (role === 'staff' || role === 'owner') {
      const queryToken = url.searchParams.get('token')
      if (queryToken && !req.headers.authorization) req.headers.authorization = `Bearer ${queryToken}`
      const user = requireAuth(req, res, ['staff', 'owner'])
      if (!user) return
      subscribe(req, res, { restaurantId: user.restaurant_id, role: user.role, userId: user.id })
      return
    }
    subscribe(req, res, { restaurantId, role: 'public', userId: null })
    return
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/signup') return handleAuthSignup(req, res)
  if (req.method === 'POST' && url.pathname === '/api/auth/signin') return handleAuthSignin(req, res)
  if (req.method === 'POST' && url.pathname === '/api/auth/refresh') return handleAuthRefresh(req, res)
  if (req.method === 'GET' && url.pathname === '/api/auth/session') return handleAuthSession(req, res)
  if (req.method === 'POST' && url.pathname === '/api/auth/signout') return handleAuthSignout(req, res)
  if (req.method === 'GET' && url.pathname === '/api/menu') return handleMenu(req, res, url)
  if (req.method === 'GET' && url.pathname === '/api/public/table') return handlePublicTable(req, res, url)
  if (req.method === 'GET' && url.pathname === '/api/sessions/current') return handleCurrentSession(req, res, url)
  if (req.method === 'POST' && url.pathname === '/api/sessions/payment-request') return handlePaymentRequest(req, res)
  if (req.method === 'POST' && url.pathname === '/api/orders') return handleCreateOrder(req, res)
  if (req.method === 'GET' && url.pathname === '/api/orders') return handleGetOrders(req, res, url)
  if (req.method === 'POST' && url.pathname === '/api/payments/ipn') return handlePaymentIpn(req, res)
  if (req.method === 'GET' && url.pathname === '/api/vouchers') { if (!requireAuth(req, res, ['staff', 'owner'])) return; return handleGetVouchers(req, res, url) }
  if (req.method === 'GET' && url.pathname === '/api/staff/orders') { if (!requireAuth(req, res, ['staff', 'owner'])) return; return handleStaffOrders(req, res, url) }
  if (req.method === 'PATCH' && url.pathname === '/api/staff/orders') { if (!requireAuth(req, res, ['staff', 'owner'])) return; if (!requirePermission(req, res, 'manage_orders')) return; return handlePatchStaffOrders(req, res) }
  if (req.method === 'GET' && url.pathname === '/api/staff/tables') { if (!requireAuth(req, res, ['staff', 'owner'])) return; return handleStaffTables(req, res, url) }
  if (req.method === 'POST' && url.pathname === '/api/staff/tables') { if (!requireAuth(req, res, ['owner'])) return; return handleCreateTables(req, res) }
  if (req.method === 'PATCH' && url.pathname === '/api/staff/tables') { if (!requireAuth(req, res, ['owner', 'staff'])) return; if (!requirePermission(req, res, 'manage_tables')) return; return handleUpdateTable(req, res) }
  if (req.method === 'DELETE' && url.pathname === '/api/staff/tables') { if (!requireAuth(req, res, ['owner'])) return; return handleDeleteTable(req, res, url) }
  if (req.method === 'POST' && url.pathname === '/api/payments') { if (!requireAuth(req, res, ['staff', 'owner'])) return; if (!requirePermission(req, res, 'process_payments')) return; return handlePayments(req, res) }
  if (req.method === 'GET' && url.pathname === '/api/payments') return handleGetPayments(req, res, url)
  if (req.method === 'GET' && url.pathname === '/api/owner/menu') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerMenu(req, res, url) }
  if (req.method === 'POST' && url.pathname === '/api/owner/menu/reorder') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerMenuReorder(req, res) }
  if (req.method === 'POST' && url.pathname === '/api/owner/menu') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerMenuPost(req, res) }
  if (req.method === 'PATCH' && url.pathname === '/api/owner/menu') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerMenuPatch(req, res) }
  if (req.method === 'DELETE' && url.pathname === '/api/owner/menu') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerMenuDelete(req, res, url) }
  if (req.method === 'GET' && url.pathname === '/api/owner/categories') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerCategories(req, res, url) }
  if (req.method === 'POST' && url.pathname === '/api/owner/categories/reorder') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerCategoriesReorder(req, res) }
  if (req.method === 'POST' && url.pathname === '/api/owner/categories') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerCategoriesPost(req, res) }
  if (req.method === 'PATCH' && url.pathname === '/api/owner/categories') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerCategoriesPatch(req, res) }
  if (req.method === 'DELETE' && url.pathname === '/api/owner/categories') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerCategoriesDelete(req, res, url) }
  if (req.method === 'GET' && url.pathname === '/api/owner/orders') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerOrders(req, res, url) }
  if (req.method === 'PATCH' && url.pathname === '/api/owner/orders') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerOrdersPatch(req, res) }
  if (req.method === 'GET' && url.pathname === '/api/owner/staff') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerStaff(req, res, url) }
  if (req.method === 'POST' && url.pathname === '/api/owner/staff') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerStaffPost(req, res) }
  if (req.method === 'PATCH' && url.pathname === '/api/owner/staff') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerStaffPatch(req, res) }
  if (req.method === 'DELETE' && url.pathname === '/api/owner/staff') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerStaffDelete(req, res, url) }
  if (req.method === 'GET' && url.pathname === '/api/owner/analytics') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerAnalytics(req, res, url) }
  if (req.method === 'GET' && url.pathname === '/api/owner/reconciliation') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerReconciliation(req, res, url) }
  if (req.method === 'GET' && url.pathname === '/api/owner/vouchers') { if (!requireAuth(req, res, ['owner'])) return; return handleGetVouchers(req, res, url) }
  if (req.method === 'POST' && url.pathname === '/api/owner/vouchers') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerVouchersPost(req, res) }
  if (req.method === 'PATCH' && url.pathname === '/api/owner/vouchers') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerVouchersPatch(req, res) }
  if (req.method === 'DELETE' && url.pathname === '/api/owner/vouchers') { if (!requireAuth(req, res, ['owner'])) return; return handleOwnerVouchersDelete(req, res, url) }
  return notFound(res)
}

module.exports = { routeRequest }
