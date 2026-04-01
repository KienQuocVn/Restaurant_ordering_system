'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OrderCard } from '@/components/staff/order-card'
import { PaymentDialog } from '@/components/staff/payment-dialog'

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
  orders: Order[]
}

export default function StaffPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('orders')
  const [paymentDialog, setPaymentDialog] = useState({
    open: false,
    orderId: '',
    tableNumber: 0,
    totalAmount: 0,
  })

  // Check if user is logged in and is staff
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'staff') {
      router.push('/')
      return
    }

    setUser(parsedUser)
    loadOrders(parsedUser.restaurant_id)
    loadTables(parsedUser.restaurant_id)

    // Refresh orders every 5 seconds
    const interval = setInterval(() => {
      loadOrders(parsedUser.restaurant_id)
      loadTables(parsedUser.restaurant_id)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const loadOrders = async (restaurantId: string) => {
    try {
      const response = await fetch(`/api/staff/orders?restaurant_id=${restaurantId}`)
      if (!response.ok) throw new Error('Failed to load orders')

      const data = await response.json()
      setOrders(data || [])
      setError('')
    } catch (err) {
      console.error('Error loading orders:', err)
      setError('Failed to load orders')
    }
  }

  const loadTables = async (restaurantId: string) => {
    try {
      const response = await fetch(`/api/staff/tables?restaurant_id=${restaurantId}`)
      if (!response.ok) throw new Error('Failed to load tables')

      const data = await response.json()
      setTables(data || [])
    } catch (err) {
      console.error('Error loading tables:', err)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/staff/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      })

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
    setPaymentDialog({
      open: true,
      orderId: order.id,
      tableNumber: order.dining_tables.table_number,
      totalAmount: order.total_amount,
    })
  }

  const handlePaymentSubmit = async (paymentMethod: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: paymentDialog.orderId,
          paymentMethod,
          amount: paymentDialog.totalAmount,
        }),
      })

      if (!response.ok) throw new Error('Failed to process payment')

      if (user) {
        loadOrders(user.restaurant_id)
        loadTables(user.restaurant_id)
      }

      setPaymentDialog({ open: false, orderId: '', tableNumber: 0, totalAmount: 0 })
    } catch (err) {
      console.error('Error processing payment:', err)
      setError('Failed to process payment')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!user) {
    return null
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const inProgressOrders = orders.filter((o) => o.status === 'preparing')
  const completedOrders = orders.filter((o) => o.status === 'completed')
  const occupiedTables = tables.filter((t) => t.orders.length > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#2ad38b]">Staff Dashboard</h1>
            <p className="text-sm text-gray-600">{user.name}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
          >
            Logout
          </Button>
        </div>
      </header>

      {/* KPI Cards */}
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

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="tables">Table Map</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
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
                      loading={loading}
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
                        loading={loading}
                      />
                      <Button
                        onClick={() => handlePaymentClick(order)}
                        className="w-full mt-2 bg-[#2ad38b] hover:bg-[#0cceb0] text-white"
                        disabled={loading}
                      >
                        Process Payment
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-4">
            <h3 className="text-lg font-bold mb-4">Table Status Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tables.map((table) => {
                const latestOrder = table.orders[0]
                const statusColors: Record<string, string> = {
                  pending: 'bg-yellow-100 border-yellow-300',
                  preparing: 'bg-blue-100 border-blue-300',
                  completed: 'bg-green-100 border-green-300',
                  empty: 'bg-white border-gray-300',
                }

                return (
                  <div
                    key={table.id}
                    className={`p-4 rounded-lg border-2 text-center ${
                      latestOrder
                        ? statusColors[latestOrder.status] || statusColors.empty
                        : statusColors.empty
                    }`}
                  >
                    <p className="text-sm font-bold">Table {table.table_number}</p>
                    {latestOrder ? (
                      <>
                        <p className="text-xs text-gray-600 mt-1">
                          {latestOrder.status.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-lg font-bold mt-1">
                          ${latestOrder.total_amount.toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">Empty</p>
                    )}
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* Completed Tab */}
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
                    loading={loading}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialog.open}
        orderId={paymentDialog.orderId}
        tableNumber={paymentDialog.tableNumber}
        totalAmount={paymentDialog.totalAmount}
        onClose={() =>
          setPaymentDialog({ open: false, orderId: '', tableNumber: 0, totalAmount: 0 })
        }
        onPaymentSubmit={handlePaymentSubmit}
        loading={loading}
      />
    </div>
  )
}
