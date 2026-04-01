'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsCharts } from '@/components/owner/analytics-charts'
import { MenuEditor } from '@/components/owner/menu-editor'
import { CategoryManager } from '@/components/owner/category-manager'
import { StaffManager } from '@/components/owner/staff-manager'
import { OrderManager } from '@/components/owner/order-manager'
import {
  apiFetch,
  clearAuthSession,
  formatCurrency,
  getStoredUser,
} from '@/lib/api'

interface MenuItem {
  id: string
  category_id: string
  name: string
  description: string
  price: number
  is_available: boolean
  image_url?: string
  display_order?: number
  options?: Array<{
    name: string
    multi?: boolean
    values: Array<{ label: string; price: number }>
  }>
}

interface MenuCategory {
  id: string
  name: string
  is_active?: boolean
}

type AnalyticsRange = 'today' | 'week' | 'month' | 'all'

const defaultAnalytics = {
  stats: {
    totalOrders: 0,
    totalRevenue: 0,
    completedOrders: 0,
    averageOrderValue: 0,
    customerCount: 0,
    servedTables: 0,
    averageServiceMinutes: 0,
  },
  topSellingItems: [],
  paymentMethods: {},
  revenueByDate: [],
  recentOrders: [],
  range: 'today',
}

export default function OwnerPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('today')
  const [analytics, setAnalytics] = useState<any>(defaultAnalytics)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])

  useEffect(() => {
    const parsedUser = getStoredUser()
    if (!parsedUser) {
      router.push('/login')
      return
    }

    if (parsedUser.role !== 'owner') {
      router.push('/')
      return
    }
    if (!parsedUser.restaurant_id) {
      router.push('/login')
      return
    }

    setUser(parsedUser)
    loadAll(parsedUser.restaurant_id, analyticsRange)
  }, [router])

  const loadAll = async (restaurantId: string, range: AnalyticsRange) => {
    await Promise.all([
      loadAnalytics(restaurantId, range),
      loadMenu(restaurantId),
      loadOrders(restaurantId),
      loadStaff(restaurantId),
    ])
  }

  const loadAnalytics = async (restaurantId: string, range: AnalyticsRange) => {
    try {
      const response = await apiFetch(
        `/api/owner/analytics?restaurant_id=${restaurantId}&range=${range}`,
        {},
        true
      )
      if (!response.ok) throw new Error('Failed to load analytics')

      const data = await response.json()
      setAnalytics({ ...defaultAnalytics, ...data })
      setError('')
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError('Failed to load analytics')
    }
  }

  const loadMenu = async (restaurantId: string) => {
    try {
      const response = await apiFetch(
        `/api/owner/menu?restaurant_id=${restaurantId}`,
        {},
        true
      )
      if (!response.ok) throw new Error('Failed to load menu')

      const data = await response.json()
      setCategories(data.categories || [])
      setMenuItems(data.items || [])
    } catch (err) {
      console.error('Error loading menu:', err)
    }
  }

  const loadOrders = async (restaurantId: string) => {
    try {
      const response = await apiFetch(
        `/api/owner/orders?restaurant_id=${restaurantId}`,
        {},
        true
      )
      if (!response.ok) throw new Error('Failed to load orders')
      const data = await response.json()
      setOrders(data || [])
    } catch (err) {
      console.error('Error loading orders:', err)
    }
  }

  const loadStaff = async (restaurantId: string) => {
    try {
      const response = await apiFetch(
        `/api/owner/staff?restaurant_id=${restaurantId}`,
        {},
        true
      )
      if (!response.ok) throw new Error('Failed to load staff')
      const data = await response.json()
      setStaff(data.staff || [])
      setActivityLogs(data.logs || [])
    } catch (err) {
      console.error('Error loading staff:', err)
    }
  }

  const refreshAnalytics = async () => {
    if (user) {
      await loadAnalytics(user.restaurant_id, analyticsRange)
    }
  }

  const handleAddMenuItem = async (item: any) => {
    setLoading(true)
    setError('')

    try {
      const response = await apiFetch(
        '/api/owner/menu',
        {
          method: 'POST',
          body: JSON.stringify({
            restaurantId: user.restaurant_id,
            type: 'item',
            data: item,
          }),
        },
        true
      )

      if (!response.ok) throw new Error('Failed to add item')
      loadMenu(user.restaurant_id)
    } catch (err) {
      console.error('Error adding item:', err)
      setError('Failed to add item')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMenuItem = async (itemId: string, item: any) => {
    setLoading(true)
    setError('')

    try {
      const response = await apiFetch(
        '/api/owner/menu',
        {
          method: 'PATCH',
          body: JSON.stringify({
            itemId,
            type: 'item',
            data: item,
          }),
        },
        true
      )

      if (!response.ok) throw new Error('Failed to update item')
      loadMenu(user.restaurant_id)
    } catch (err) {
      console.error('Error updating item:', err)
      setError('Failed to update item')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    setLoading(true)
    setError('')

    try {
      const response = await apiFetch(
        `/api/owner/menu?item_id=${itemId}`,
        {
          method: 'DELETE',
        },
        true
      )

      if (!response.ok) throw new Error('Failed to delete item')
      loadMenu(user.restaurant_id)
    } catch (err) {
      console.error('Error deleting item:', err)
      setError('Failed to delete item')
    } finally {
      setLoading(false)
    }
  }

  const handleReorderMenuItems = async (itemIds: string[]) => {
    setLoading(true)
    try {
      const response = await apiFetch(
        '/api/owner/menu/reorder',
        {
          method: 'POST',
          body: JSON.stringify({
            restaurantId: user.restaurant_id,
            itemIds,
          }),
        },
        true
      )
      if (!response.ok) throw new Error('Failed to reorder menu items')
      loadMenu(user.restaurant_id)
    } catch (err) {
      console.error(err)
      setError('Failed to reorder menu items')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async (name: string) => {
    setLoading(true)
    try {
      const response = await apiFetch(
        '/api/owner/categories',
        {
          method: 'POST',
          body: JSON.stringify({
            restaurantId: user.restaurant_id,
            name,
          }),
        },
        true
      )
      if (!response.ok) throw new Error('Failed to add category')
      loadMenu(user.restaurant_id)
    } catch (err) {
      console.error(err)
      setError('Failed to add category')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCategory = async (categoryId: string, name: string) => {
    setLoading(true)
    try {
      const response = await apiFetch(
        '/api/owner/categories',
        {
          method: 'PATCH',
          body: JSON.stringify({ categoryId, name }),
        },
        true
      )
      if (!response.ok) throw new Error('Failed to update category')
      loadMenu(user.restaurant_id)
    } catch (err) {
      console.error(err)
      setError('Failed to update category')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleCategory = async (categoryId: string, isActive: boolean) => {
    setLoading(true)
    try {
      const response = await apiFetch(
        '/api/owner/categories',
        {
          method: 'PATCH',
          body: JSON.stringify({ categoryId, isActive }),
        },
        true
      )
      if (!response.ok) throw new Error('Failed to update category status')
      loadMenu(user.restaurant_id)
    } catch (err) {
      console.error(err)
      setError('Failed to update category status')
    } finally {
      setLoading(false)
    }
  }

  const handleReorderCategories = async (categoryIds: string[]) => {
    setLoading(true)
    try {
      const response = await apiFetch(
        '/api/owner/categories/reorder',
        {
          method: 'POST',
          body: JSON.stringify({
            restaurantId: user.restaurant_id,
            categoryIds,
          }),
        },
        true
      )
      if (!response.ok) throw new Error('Failed to reorder categories')
      loadMenu(user.restaurant_id)
    } catch (err) {
      console.error(err)
      setError('Failed to reorder categories')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    setLoading(true)
    try {
      const response = await apiFetch(
        `/api/owner/categories?category_id=${categoryId}`,
        { method: 'DELETE' },
        true
      )
      if (!response.ok) throw new Error('Failed to delete category')
      loadMenu(user.restaurant_id)
    } catch (err) {
      console.error(err)
      setError('Failed to delete category')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStaff = async (payload: {
    name: string
    email: string
    password: string
  }) => {
    setLoading(true)
    try {
      const response = await apiFetch(
        '/api/owner/staff',
        {
          method: 'POST',
          body: JSON.stringify({
            restaurantId: user.restaurant_id,
            ...payload,
          }),
        },
        true
      )
      if (!response.ok) throw new Error('Failed to create staff')
      loadStaff(user.restaurant_id)
    } catch (err) {
      console.error(err)
      setError('Failed to create staff')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStaff = async (staffId: string, isActive: boolean) => {
    setLoading(true)
    try {
      const response = await apiFetch(
        '/api/owner/staff',
        {
          method: 'PATCH',
          body: JSON.stringify({ staffId, isActive }),
        },
        true
      )
      if (!response.ok) throw new Error('Failed to update staff')
      loadStaff(user.restaurant_id)
    } catch (err) {
      console.error(err)
      setError('Failed to update staff')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePermissions = async (
    staffId: string,
    permissions: Record<string, boolean>
  ) => {
    setLoading(true)
    try {
      const response = await apiFetch(
        '/api/owner/staff',
        {
          method: 'PATCH',
          body: JSON.stringify({ staffId, permissions }),
        },
        true
      )
      if (!response.ok) throw new Error('Failed to update permissions')
      loadStaff(user.restaurant_id)
    } catch (err) {
      console.error(err)
      setError('Failed to update permissions')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStaff = async (staffId: string) => {
    setLoading(true)
    try {
      const response = await apiFetch(
        `/api/owner/staff?staff_id=${staffId}`,
        { method: 'DELETE' },
        true
      )
      if (!response.ok) throw new Error('Failed to disable staff')
      loadStaff(user.restaurant_id)
    } catch (err) {
      console.error(err)
      setError('Failed to disable staff')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async (orderId: string, reason: string) => {
    setLoading(true)
    try {
      const response = await apiFetch(
        '/api/owner/orders',
        {
          method: 'PATCH',
          body: JSON.stringify({
            orderId,
            status: 'cancelled',
            cancelReason: reason,
          }),
        },
        true
      )
      if (!response.ok) throw new Error('Failed to cancel order')
      loadOrders(user.restaurant_id)
      refreshAnalytics()
    } catch (err) {
      console.error(err)
      setError('Failed to cancel order')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCsv = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Range', analytics.range],
      ['Total Orders', analytics.stats.totalOrders],
      ['Total Revenue', analytics.stats.totalRevenue],
      ['Completed Orders', analytics.stats.completedOrders],
      ['Average Order Value', analytics.stats.averageOrderValue],
      ['Customer Count', analytics.stats.customerCount],
      ['Served Tables', analytics.stats.servedTables],
      ['Average Service Minutes', analytics.stats.averageServiceMinutes],
      [],
      ['Date', 'Revenue'],
      ...(analytics.revenueByDate || []).map((entry: any) => [entry.date, entry.amount]),
    ]
      .map((row: any[]) => row.join(','))
      .join('\n')

    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics-${analytics.range}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportPdf = () => {
    window.print()
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

  const handlePrintBill = (order: any) => {
    const items = order.order_items
      .map(
        (item: any) =>
          `<div class="row"><span>${item.quantity}x ${item.product_name || item.menu_items?.name}</span><span>${formatCurrency(
            item.quantity * item.unit_price
          )}</span></div>`
      )
      .join('')

    printHtml(
      `Bill - Table ${order.table_number}`,
      `
        <h1>Customer Bill</h1>
        <div class="section">
          <p>Table: ${order.table_number}</p>
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

  const handlePrintKitchenSlip = (order: any) => {
    const items = order.order_items
      .map(
        (item: any) =>
          `<div class="row"><span>${item.quantity}x ${item.product_name || item.menu_items?.name}</span><span></span></div>`
      )
      .join('')

    printHtml(
      `Kitchen Slip - Table ${order.table_number}`,
      `
        <h1>Kitchen Slip</h1>
        <div class="section">
          <p>Table: ${order.table_number}</p>
          <p>Order: ${order.id}</p>
          <p>Time: ${new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div class="section">${items}</div>
      `
    )
  }

  const handleLogout = () => {
    clearAuthSession()
    router.push('/login')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#2ad38b]">
              Restaurant Owner Dashboard
            </h1>
            <p className="text-sm text-gray-600">{user.name}</p>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="menu">Menu Management</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={analyticsRange}
                  onChange={(event) => {
                    const nextRange = event.target.value as AnalyticsRange
                    setAnalyticsRange(nextRange)
                    loadAnalytics(user.restaurant_id, nextRange)
                  }}
                  className="rounded-md border border-input bg-white px-3 py-2 text-sm"
                >
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                  <option value="all">All time</option>
                </select>
                <Button variant="outline" onClick={refreshAnalytics}>
                  Refresh
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExportCsv}>
                  Export CSV
                </Button>
                <Button variant="outline" onClick={handleExportPdf}>
                  Export PDF
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-6 border">
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-[#2ad38b]">
                  {analytics.stats.totalOrders}
                </p>
                <p className="text-xs text-gray-500 mt-2">{analytics.range}</p>
              </div>

              <div className="bg-white rounded-lg p-6 border">
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(analytics.stats.totalRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-2">{analytics.range}</p>
              </div>

              <div className="bg-white rounded-lg p-6 border">
                <p className="text-sm text-gray-600 mb-1">Customers</p>
                <p className="text-3xl font-bold text-blue-600">
                  {analytics.stats.customerCount}
                </p>
                <p className="text-xs text-gray-500 mt-2">Current served guests</p>
              </div>

              <div className="bg-white rounded-lg p-6 border">
                <p className="text-sm text-gray-600 mb-1">Served Tables</p>
                <p className="text-3xl font-bold text-orange-600">
                  {analytics.stats.servedTables}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Avg {analytics.stats.averageServiceMinutes.toFixed(1)} min/session
                </p>
              </div>
            </div>

            <AnalyticsCharts
              topSellingItems={analytics.topSellingItems}
              paymentMethods={analytics.paymentMethods}
              revenueByDate={analytics.revenueByDate}
            />
          </TabsContent>

          <TabsContent value="menu">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <MenuEditor
                categories={categories.filter((category) => category.is_active !== false)}
                items={menuItems}
                onAddItem={handleAddMenuItem}
                onUpdateItem={handleUpdateMenuItem}
                onDeleteItem={handleDeleteMenuItem}
                onReorderItems={handleReorderMenuItems}
                loading={loading}
              />
              <CategoryManager
                categories={categories}
                onAddCategory={handleAddCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                onToggleCategory={handleToggleCategory}
                onReorderCategories={handleReorderCategories}
                loading={loading}
              />
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <OrderManager
              orders={orders}
              onCancelOrder={handleCancelOrder}
              onPrintBill={handlePrintBill}
              onPrintKitchenSlip={handlePrintKitchenSlip}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="staff">
            <StaffManager
              staff={staff}
              logs={activityLogs}
              onCreateStaff={handleCreateStaff}
              onToggleStaff={handleToggleStaff}
              onDeleteStaff={handleDeleteStaff}
              onUpdatePermissions={handleUpdatePermissions}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="settings">
            <div className="bg-white rounded-lg p-6 border space-y-4">
              <h2 className="text-lg font-bold">Restaurant Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Account ID</label>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {user.id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Restaurant ID
                  </label>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {user.restaurant_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Owner Name</label>
                  <p className="text-sm text-gray-600">{user.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Are you sure you want to logout?')) {
                      handleLogout()
                    }
                  }}
                >
                  Logout
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
