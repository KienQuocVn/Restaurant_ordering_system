'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { QRScanner } from '@/components/customer/qr-scanner'
import { MenuDisplay } from '@/components/customer/menu-display'
import { Cart } from '@/components/customer/cart'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category_id: string
  image_url?: string
  is_available: boolean
}

interface MenuCategory {
  id: string
  name: string
}

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export default function CustomerPage() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'scan' | 'menu' | 'confirmation'>('scan')
  const [restaurantId, setRestaurantId] = useState('')
  const [tableId, setTableId] = useState('')
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const restaurantParam = searchParams.get('restaurant')
    const tableParam = searchParams.get('table')

    if (restaurantParam && tableParam) {
      setRestaurantId(restaurantParam)
      setTableId(tableParam)
      setStep('menu')
    }
  }, [searchParams])

  // Load menu when restaurant is selected
  useEffect(() => {
    if (!restaurantId) return

    const loadMenu = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/menu?restaurant_id=${restaurantId}`)
        if (!response.ok) throw new Error('Failed to load menu')

        const data = await response.json()
        setCategories(data.categories || [])
        setItems(data.items || [])
      } catch (err) {
        setError('Failed to load menu. Please try again.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadMenu()
  }, [restaurantId])

  const handleQRScan = (scannedRestaurantId: string, scannedTableId: string) => {
    setRestaurantId(scannedRestaurantId)
    setTableId(scannedTableId)
    setStep('menu')
  }

  const handleAddToCart = (item: MenuItem, quantity: number) => {
    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.id === item.id)
      if (existing) {
        return prev.map((ci) =>
          ci.id === item.id ? { ...ci, quantity: ci.quantity + quantity } : ci
        )
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity,
        },
      ]
    })
  }

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    )
  }

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) return

    setLoading(true)
    setError('')

    try {
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          tableId,
          items: cartItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount,
          notes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to place order')
        return
      }

      setStep('confirmation')
      setCartItems([])
      setNotes('')

      // Redirect after 3 seconds
      setTimeout(() => {
        setStep('menu')
      }, 3000)
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#2ad38b]">Order System</h1>
          <div className="flex items-center gap-2">
            {tableId && (
              <span className="text-sm text-gray-600">Table: {tableId}</span>
            )}
            {step !== 'scan' && (
              <Button onClick={() => setStep('scan')} variant="outline" size="sm">
                Change Table
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {step === 'scan' ? (
          <div className="max-w-md mx-auto">
            <QRScanner onScan={handleQRScan} loading={loading} />
          </div>
        ) : step === 'menu' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
              <MenuDisplay
                categories={categories}
                items={items}
                onAddToCart={handleAddToCart}
                loading={loading}
              />
            </div>

            <div>
              <Cart
                items={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onCheckout={handleCheckout}
                loading={loading}
                notes={notes}
                onNotesChange={setNotes}
              />
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-green-700 mb-2">
                Order Placed Successfully!
              </h2>
              <p className="text-green-600">
                Your order has been sent to the kitchen.
              </p>
              <p className="text-sm text-green-500 mt-4">
                Redirecting in a few seconds...
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
