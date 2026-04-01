'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OrderCard } from '@/components/staff/order-card'
import { PaymentDialog } from '@/components/staff/payment-dialog'
import {
  apiFetch,
  apiUrl,
  clearAuthSession,
  formatCurrency,
  getStoredRealtimeToken,
  getStoredUser,
} from '@/lib/api'

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  special_instructions?: string
  menu_items: {
    name: string
  }
}

interface Order {
  id: string
  session_id: string
  table_id: string
  status: string
  total_amount: number
  created_at: string
  order_items: OrderItem[]
  dining_tables: {
    table_number: number
  }
}

interface DiningTable {
  id: string
  table_number: number
  status?: string
  guest_count?: number
  session?: {
    id: string
    status: string
    total_amount: number
  } | null
  orders: Order[]
}

interface MenuItem {
  id: string
  name: string
  price: number
  category_id: string
}

interface Voucher {
  id: string
  code: string
  name: string
  type: string
  value: number
  is_active?: boolean
}

function playNotificationTone() {
  const AudioCtx =
    typeof window !== 'undefined'
      ? (window.AudioContext || (window as any).webkitAudioContext)
      : null
  if (!AudioCtx) return
  const context = new AudioCtx()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = 880
  gain.gain.value = 0.04
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.2)
}

export default function StaffPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [activeTab, setActiveTab] = useState('orders')
  const [paymentDialog, setPaymentDialog] = useState({
    open: false,
    orderId: '',
    tableNumber: 0,
    totalAmount: 0,
    qrCodeUrl: '',
  })
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [staffOrderDraft, setStaffOrderDraft] = useState({
    itemId: '',
    quantity: 1,
    note: '',
  })
  const knownOrdersRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    getStoredUser().then((parsedUser) => {
      if (cancelled) return
      if (!parsedUser) {
        router.push('/login')
        return
      }

      if (parsedUser.role !== 'staff') {
        router.push('/')
        return
      }
      if (!parsedUser.restaurant_id) {
        router.push('/login')
        return
      }

      setUser(parsedUser)
      loadOrders(parsedUser.restaurant_id)
      loadTables(parsedUser.restaurant_id)
      loadMenu(parsedUser.restaurant_id)
      loadVouchers(parsedUser.restaurant_id)
    })

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (!user?.restaurant_id) return

    let events: EventSource | null = null
    let disposed = false

    getStoredRealtimeToken().then((token) => {
      if (disposed || !token) return

      events = new EventSource(
        apiUrl(
          `/api/events?restaurant_id=${user.restaurant_id}&role=staff&token=${encodeURIComponent(
            token
          )}`
        )
      )

      events.addEventListener('order.created', (event) => {
        const payload = JSON.parse((event as MessageEvent).data)
        if (!knownOrdersRef.current.has(payload.orderId)) {
          playNotificationTone()
        }
        setNotice(`New order for table ${payload.tableNumber}`)
        loadOrders(user.restaurant_id)
        loadTables(user.restaurant_id)
      })

      events.addEventListener('order.updated', () => {
        loadOrders(user.restaurant_id)
        loadTables(user.restaurant_id)
      })

      events.addEventListener('table.updated', () => {
        loadTables(user.restaurant_id)
      })

      events.addEventListener('session.updated', () => {
        loadTables(user.restaurant_id)
      })

      events.addEventListener('payment.completed', () => {
        loadOrders(user.restaurant_id)
        loadTables(user.restaurant_id)
      })

      events.onerror = () => {
        setNotice('Realtime connection interrupted, retrying...')
      }
    })

    return () => {
      disposed = true
      events?.close()
    }
  }, [user])

  const loadOrders = async (restaurantId: string) => {
    try {
      const response = await apiFetch(
        `/api/staff/orders?restaurant_id=${restaurantId}`,
        {},
        true
      )
      if (!response.ok) throw new Error('Failed to load orders')

      const data = await response.json()
      setOrders(data || [])
      knownOrdersRef.current = new Set((data || []).map((order: Order) => order.id))
      setError('')
    } catch (err) {
      console.error('Error loading orders:', err)
      setError('Failed to load orders')
    }
  }

  const loadTables = async (restaurantId: string) => {
    try {
      const response = await apiFetch(
        `/api/staff/tables?restaurant_id=${restaurantId}`,
        {},
        true
      )
      if (!response.ok) throw new Error('Failed to load tables')

      const data = await response.json()
      setTables(data || [])
      if (selectedTable) {
        const nextSelected = (data || []).find((table: DiningTable) => table.id === selectedTable.id)
        setSelectedTable(nextSelected || null)
      }
    } catch (err) {
      console.error('Error loading tables:', err)
    }
  }

  const loadMenu = async (restaurantId: string) => {
    try {
      const response = await apiFetch(`/api/menu?restaurant_id=${restaurantId}`)
      if (!response.ok) throw new Error('Failed to load menu')
      const data = await response.json()
      setMenuItems(data.items || [])
      setStaffOrderDraft((prev) => ({
        ...prev,
        itemId: prev.itemId || data.items?.[0]?.id || '',
      }))
    } catch (err) {
      console.error('Error loading menu:', err)
    }
  }

  const loadVouchers = async (restaurantId: string) => {
    try {
      const response = await apiFetch(`/api/vouchers?restaurant_id=${restaurantId}`, {}, true)
      if (!response.ok) throw new Error('Failed to load vouchers')
      const data = await response.json()
      setVouchers(data || [])
    } catch (err) {
      console.error('Error loading vouchers:', err)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setLoading(true)
    try {
      const response = await apiFetch(
        '/api/staff/orders',
        {
          method: 'PATCH',
          body: JSON.stringify({ orderId, status: newStatus }),
        },
        true
      )

      if (!response.ok) throw new Error('Failed to update order')

      if (user) {
        loadOrders(user.restaurant_id)
        loadTables(user.restaurant_id)
      }
    } catch (err) {
      console.error('Error updating order:', err)
      setError('Failed to update order')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentClick = (order: Order) => {
    const relatedTable = tables.find((table) => table.id === order.table_id)
    setPaymentDialog({
      open: true,
      orderId: order.id,
      tableNumber: order.dining_tables.table_number,
      totalAmount: relatedTable?.session?.total_amount || order.total_amount,
      qrCodeUrl: '',
    })
  }

  const handlePaymentSubmit = async (paymentMethod: string, voucherCode: string) => {
    setLoading(true)
    try {
      const response = await apiFetch(
        '/api/payments',
        {
          method: 'POST',
          body: JSON.stringify({
            orderId: paymentDialog.orderId,
            paymentMethod,
            amount: paymentDialog.totalAmount,
            voucherCode,
          }),
        },
        true
      )

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to process payment')

      if (user) {
        loadOrders(user.restaurant_id)
        loadTables(user.restaurant_id)
        loadVouchers(user.restaurant_id)
      }

      if (data.payment?.qr_code_url) {
        setPaymentDialog((prev) => ({
          ...prev,
          qrCodeUrl: data.payment?.qr_code_url || '',
        }))
      } else {
        setPaymentDialog({
          open: false,
          orderId: '',
          tableNumber: 0,
          totalAmount: 0,
          qrCodeUrl: '',
        })
      }
    } catch (err) {
      console.error('Error processing payment:', err)
      setError('Failed to process payment')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStaffOrder = async () => {
    if (!user || !selectedTable || !staffOrderDraft.itemId) return
    const menuItem = menuItems.find((item) => item.id === staffOrderDraft.itemId)
    if (!menuItem) return

    setLoading(true)
    try {
      const response = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          restaurantId: user.restaurant_id,
          tableId: selectedTable.id,
          guestCount: selectedTable.guest_count || 1,
          items: [
            {
              menuItemId: menuItem.id,
              quantity: Number(staffOrderDraft.quantity || 1),
              price: menuItem.price,
              note: staffOrderDraft.note,
              selectedOptions: [],
            },
          ],
          notes: 'Staff entered order on behalf of customer',
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create order')
      setStaffOrderDraft((prev) => ({ ...prev, quantity: 1, note: '' }))
      loadOrders(user.restaurant_id)
      loadTables(user.restaurant_id)
      setNotice(`Da them mon cho ban ${selectedTable.table_number}`)
    } catch (err) {
      console.error('Error creating manual order:', err)
      setError('Khong the nhap mon thay khach')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearAuthSession()
    router.push('/login')
  }

  const printHtml = (title: string, body: string) => {
    const popup = window.open('', '_blank', 'width=800,height=600')
    if (!popup) return
    popup.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1,h2,p { margin: 0 0 8px; }
            .section { margin-bottom: 16px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          </style>
        </head>
        <body>${body}</body>
      </html>
    `)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  const handlePrintBill = (order: Order) => {
    const items = order.order_items
      .map(
        (item) =>
          `<div class="row"><span>${item.quantity}x ${item.menu_items.name}</span><span>${formatCurrency(
            item.quantity * item.unit_price
          )}</span></div>`
      )
      .join('')

    printHtml(
      `Bill - Table ${order.dining_tables.table_number}`,
      `
        <h1>Customer Bill</h1>
        <div class="section">
          <p>Table: ${order.dining_tables.table_number}</p>
          <p>Status: ${order.status}</p>
          <p>Time: ${new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div class="section">${items}</div>
        <hr />
        <div class="row"><strong>Total</strong><strong>${formatCurrency(
          order.total_amount
        )}</strong></div>
      `
    )
  }

  const handlePrintKitchenSlip = (order: Order) => {
    const items = order.order_items
      .map(
        (item) =>
          `<div class="row"><span>${item.quantity}x ${item.menu_items.name}</span><span>${
            item.special_instructions || ''
          }</span></div>`
      )
      .join('')

    printHtml(
      `Kitchen Slip - Table ${order.dining_tables.table_number}`,
      `
        <h1>Kitchen Slip</h1>
        <div class="section">
          <p>Table: ${order.dining_tables.table_number}</p>
          <p>Order: ${order.id}</p>
          <p>Time: ${new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div class="section">${items}</div>
      `
    )
  }

  if (!user) return null

  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const inProgressOrders = orders.filter((o) =>
    ['acknowledged', 'sent_to_kitchen', 'preparing'].includes(o.status)
  )
  const completedOrders = orders.filter((o) => o.status === 'completed')
  const occupiedTables = tables.filter((t) => t.orders.length > 0)
  const canManageOrders = user.permissions?.manage_orders !== false
  const canProcessPayments = Boolean(user.permissions?.process_payments)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#2ad38b]">Staff Dashboard</h1>
            <p className="text-sm text-gray-600">{user.name}</p>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            Logout
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-sm text-gray-600 mb-1">Pending Orders</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingOrders.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-sm text-gray-600 mb-1">In Progress</p>
          <p className="text-3xl font-bold text-blue-600">{inProgressOrders.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-sm text-gray-600 mb-1">Completed Today</p>
          <p className="text-3xl font-bold text-green-600">{completedOrders.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-sm text-gray-600 mb-1">Occupied Tables</p>
          <p className="text-3xl font-bold text-[#2ad38b]">{occupiedTables.length}</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {notice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded mb-4">
            {notice}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {!canManageOrders && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded mb-4">
            Tai khoan nay dang o che do xem. Ban can owner cap them quyen xu ly order.
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="tables">Table Map</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Pending Orders</h3>
              {pendingOrders.length === 0 ? (
                <p className="text-gray-500">No pending orders</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      orderId={order.id}
                      tableNumber={order.dining_tables.table_number}
                      status={order.status}
                      items={order.order_items}
                      totalAmount={order.total_amount}
                      createdAt={order.created_at}
                      onStatusChange={handleStatusChange}
                      onPrintBill={() => handlePrintBill(order)}
                      onPrintKitchenSlip={() => handlePrintKitchenSlip(order)}
                      loading={loading || !canManageOrders}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 mt-8">
              <h3 className="text-lg font-bold">In Progress</h3>
              {inProgressOrders.length === 0 ? (
                <p className="text-gray-500">No orders in progress</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inProgressOrders.map((order) => (
                    <div key={order.id} className="relative">
                      <OrderCard
                        orderId={order.id}
                        tableNumber={order.dining_tables.table_number}
                        status={order.status}
                        items={order.order_items}
                        totalAmount={order.total_amount}
                        createdAt={order.created_at}
                        onStatusChange={handleStatusChange}
                        onPrintBill={() => handlePrintBill(order)}
                        onPrintKitchenSlip={() => handlePrintKitchenSlip(order)}
                        loading={loading || !canManageOrders}
                      />
                      {canProcessPayments && (
                        <Button
                          onClick={() => handlePaymentClick(order)}
                          className="w-full mt-2 bg-[#2ad38b] hover:bg-[#0cceb0] text-white"
                          disabled={loading}
                        >
                          Process Payment
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tables" className="space-y-4">
            <h3 className="text-lg font-bold mb-4">Table Status Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tables.map((table) => {
                const latestOrder = table.orders[0]
                const resolvedStatus = table.status || latestOrder?.status || 'empty'
                const statusColors: Record<string, string> = {
                  pending: 'bg-yellow-100 border-yellow-300',
                  acknowledged: 'bg-amber-100 border-amber-300',
                  sent_to_kitchen: 'bg-indigo-100 border-indigo-300',
                  preparing: 'bg-blue-100 border-blue-300',
                  completed: 'bg-green-100 border-green-300',
                  payment_requested: 'bg-orange-100 border-orange-300',
                  payment_pending: 'bg-purple-100 border-purple-300',
                  occupied: 'bg-sky-100 border-sky-300',
                  empty: 'bg-white border-gray-300',
                }

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className={`cursor-pointer p-4 rounded-lg border-2 text-center ${
                      statusColors[resolvedStatus] || statusColors.empty
                    }`}
                  >
                    <p className="text-sm font-bold">Table {table.table_number}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {resolvedStatus.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-lg font-bold mt-1">
                      {formatCurrency(table.session?.total_amount || 0)}
                    </p>
                  </div>
                )
              })}
            </div>

            {selectedTable && (
              <div className="mt-6 rounded-lg border bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">
                    Table {selectedTable.table_number} details
                  </h4>
                  <Button size="sm" variant="outline" onClick={() => setSelectedTable(null)}>
                    Close
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="rounded border bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Session status</p>
                    <p className="font-medium">{selectedTable.session?.status || 'empty'}</p>
                  </div>
                  <div className="rounded border bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Subtotal</p>
                    <p className="font-medium">
                      {formatCurrency((selectedTable.session as any)?.subtotal_amount || selectedTable.session?.total_amount || 0)}
                    </p>
                  </div>
                  <div className="rounded border bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Current total</p>
                    <p className="font-medium">
                      {formatCurrency(selectedTable.session?.total_amount || 0)}
                    </p>
                  </div>
                  <div className="rounded border bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Guest count</p>
                    <p className="font-medium">{selectedTable.guest_count || 0}</p>
                  </div>
                </div>

                <div className="rounded-lg border bg-emerald-50 p-4 mb-4">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <h5 className="font-semibold">Nhap mon thay khach</h5>
                      <p className="text-sm text-gray-600">
                        Staff co the them nhanh mon vao session hien tai cua ban.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select
                      value={staffOrderDraft.itemId}
                      onChange={(event) =>
                        setStaffOrderDraft((prev) => ({ ...prev, itemId: event.target.value }))
                      }
                      className="rounded-md border border-input bg-white px-3 py-2 text-sm"
                      disabled={loading}
                    >
                      {menuItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} - {formatCurrency(item.price)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={staffOrderDraft.quantity}
                      onChange={(event) =>
                        setStaffOrderDraft((prev) => ({
                          ...prev,
                          quantity: Math.max(1, Number(event.target.value || 1)),
                        }))
                      }
                      className="rounded-md border border-input bg-white px-3 py-2 text-sm"
                      disabled={loading}
                    />
                    <input
                      value={staffOrderDraft.note}
                      onChange={(event) =>
                        setStaffOrderDraft((prev) => ({ ...prev, note: event.target.value }))
                      }
                      placeholder="Ghi chu mon"
                      className="rounded-md border border-input bg-white px-3 py-2 text-sm md:col-span-2"
                      disabled={loading}
                    />
                  </div>
                  <Button
                    className="mt-3 bg-[#2ad38b] hover:bg-[#0cceb0]"
                    onClick={handleCreateStaffOrder}
                    disabled={loading || !staffOrderDraft.itemId}
                  >
                    Them Mon Cho Ban Nay
                  </Button>
                </div>

                <div className="space-y-3">
                  {selectedTable.orders.length === 0 ? (
                    <p className="text-sm text-gray-500">No orders for this table</p>
                  ) : (
                    selectedTable.orders.map((order) => (
                      <div key={order.id} className="rounded border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{order.status}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>
                                {item.quantity}x {item.menu_items.name}
                              </span>
                              <span>{formatCurrency(item.quantity * item.unit_price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <h3 className="text-lg font-bold">Completed Orders</h3>
            {completedOrders.length === 0 ? (
              <p className="text-gray-500">No completed orders</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    orderId={order.id}
                    tableNumber={order.dining_tables.table_number}
                    status={order.status}
                    items={order.order_items}
                    totalAmount={order.total_amount}
                    createdAt={order.created_at}
                    onStatusChange={handleStatusChange}
                    onPrintBill={() => handlePrintBill(order)}
                    onPrintKitchenSlip={() => handlePrintKitchenSlip(order)}
                    loading={loading}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <PaymentDialog
        open={paymentDialog.open}
        orderId={paymentDialog.orderId}
        tableNumber={paymentDialog.tableNumber}
        totalAmount={paymentDialog.totalAmount}
        qrCodeUrl={paymentDialog.qrCodeUrl}
        vouchers={vouchers.filter((voucher) => voucher.is_active !== false)}
        onClose={() =>
          setPaymentDialog({
            open: false,
            orderId: '',
            tableNumber: 0,
            totalAmount: 0,
            qrCodeUrl: '',
          })
        }
        onPaymentSubmit={handlePaymentSubmit}
        loading={loading}
      />
    </div>
  )
}
