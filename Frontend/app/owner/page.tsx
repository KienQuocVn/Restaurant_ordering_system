'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsCharts } from '@/components/owner/analytics-charts'
import { MenuEditor } from '@/components/owner/menu-editor'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  is_available: boolean
}

interface MenuCategory {
  id: string
  name: string
}

export default function OwnerPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [analytics, setAnalytics] = useState({
    stats: {
      totalOrders: 0,
      totalRevenue: 0,
      completedOrders: 0,
      averageOrderValue: 0,
    },
    topSellingItems: [],
    paymentMethods: {},
  })
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])

  // Check if user is logged in and is owner
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'owner') {
      router.push('/')
      return
    }

    setUser(parsedUser)
    loadAnalytics(parsedUser.id)
    loadMenu(parsedUser.id)
  }, [])

  const loadAnalytics = async (restaurantId: string) => {
    try {
      const response = await fetch(
        `/api/owner/analytics?restaurant_id=${restaurantId}`
      )
      if (!response.ok) throw new Error('Failed to load analytics')

      const data = await response.json()
      setAnalytics(data)
      setError('')
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError('Failed to load analytics')
    }
  }

  const loadMenu = async (restaurantId: string) => {
    try {
      const response = await fetch(
        `/api/owner/menu?restaurant_id=${restaurantId}`
      )
      if (!response.ok) throw new Error('Failed to load menu')

      const data = await response.json()
      setCategories(data.categories || [])
      setMenuItems(data.items || [])
    } catch (err) {
      console.error('Error loading menu:', err)
    }
  }

  const handleAddMenuItem = async (item: any) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/owner/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: user.id,
          type: 'item',
          data: {
            categoryId: categories[0]?.id || 'uncategorized',
            ...item,
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to add item')

      if (user) {
        loadMenu(user.id)
      }
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
      const response = await fetch('/api/owner/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          type: 'item',
          data: item,
        }),
      })

      if (!response.ok) throw new Error('Failed to update item')

      if (user) {
        loadMenu(user.id)
      }
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
      const response = await fetch(`/api/owner/menu?item_id=${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete item')

      if (user) {
        loadMenu(user.id)
      }
    } catch (err) {
      console.error('Error deleting item:', err)
      setError('Failed to delete item')
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#2ad38b]">
              Restaurant Owner Dashboard
            </h1>
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="menu">Menu Management</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-6 border">
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-[#2ad38b]">
                  {analytics.stats.totalOrders}
                </p>
                <p className="text-xs text-gray-500 mt-2">Today</p>
              </div>

              <div className="bg-white rounded-lg p-6 border">
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">
                  ${analytics.stats.totalRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Today</p>
              </div>

              <div className="bg-white rounded-lg p-6 border">
                <p className="text-sm text-gray-600 mb-1">Completed Orders</p>
                <p className="text-3xl font-bold text-blue-600">
                  {analytics.stats.completedOrders}
                </p>
                <p className="text-xs text-gray-500 mt-2">Today</p>
              </div>

              <div className="bg-white rounded-lg p-6 border">
                <p className="text-sm text-gray-600 mb-1">
                  Average Order Value
                </p>
                <p className="text-3xl font-bold text-orange-600">
                  ${analytics.stats.averageOrderValue.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Today</p>
              </div>
            </div>

            {/* Charts */}
            <AnalyticsCharts
              topSellingItems={analytics.topSellingItems}
              paymentMethods={analytics.paymentMethods}
            />
          </TabsContent>

          {/* Menu Management Tab */}
          <TabsContent value="menu">
            <MenuEditor
              items={menuItems}
              onAddItem={handleAddMenuItem}
              onUpdateItem={handleUpdateMenuItem}
              onDeleteItem={handleDeleteMenuItem}
              loading={loading}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="bg-white rounded-lg p-6 border space-y-4">
              <h2 className="text-lg font-bold">Restaurant Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Restaurant ID
                  </label>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {user.id}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Owner Name
                  </label>
                  <p className="text-sm text-gray-600">{user.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Number of Dining Tables
                  </label>
                  <p className="text-sm text-gray-600 text-center bg-gray-50 p-3 rounded">
                    Configure tables in your restaurant setup
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (
                      confirm(
                        'Are you sure you want to logout? This will end your session.'
                      )
                    ) {
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
