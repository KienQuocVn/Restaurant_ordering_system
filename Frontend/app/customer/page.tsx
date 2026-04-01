'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { QRScanner } from '@/components/customer/qr-scanner'
import { MenuDisplay } from '@/components/customer/menu-display'
import { Cart } from '@/components/customer/cart'
import { apiUrl, formatCurrency } from '@/lib/api'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category_id: string
  image_url?: string
  is_available: boolean
  options?: Array<{
    name: string
    multi?: boolean
    values: Array<{ label: string; price: number }>
  }>
}

interface MenuCategory {
  id: string
  name: string
}

interface CartItem {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  note?: string
  selectedOptions?: Array<{
    name: string
    value: string
    price_add: number
  }>
}

interface SessionOrder {
  id: string
  status: string
  total_amount: number
  created_at: string
  order_items: Array<{
    id: string
    quantity: number
    unit_price: number
    special_instructions?: string
    menu_items: {
      name: string
    }
  }>
}

export default function CustomerPage() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'scan' | 'menu' | 'confirmation'>('scan')
  const [tableToken, setTableToken] = useState('')
  const [restaurantId, setRestaurantId] = useState('')
  const [tableId, setTableId] = useState('')
  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')
  const [session, setSession] = useState<any>(null)
  const [sessionOrders, setSessionOrders] = useState<SessionOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const restaurantParam = searchParams.get('restaurant')
    const tableParam = searchParams.get('table')

    if (token) {
      resolveToken(token)
      return
    }

    if (restaurantParam && tableParam) {
      loadTableContext({ restaurantId: restaurantParam, tableId: tableParam })
    }
  }, [searchParams])

  useEffect(() => {
    if (!restaurantId) return

    const loadMenu = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(apiUrl(`/api/menu?restaurant_id=${restaurantId}`))
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

  useEffect(() => {
    if (!tableId) return
    loadCurrentSession(tableId)
  }, [tableId])

  useEffect(() => {
    if (!restaurantId || !tableId) return
    const events = new EventSource(apiUrl(`/api/events?restaurant_id=${restaurantId}&role=public`))

    events.addEventListener('order.created', (event) => {
      const payload = JSON.parse((event as MessageEvent).data)
      if (payload.tableId === tableId) {
        setNotice('Ban da duoc dong bo order moi theo realtime.')
        loadCurrentSession(tableId)
      }
    })

    events.addEventListener('order.updated', (event) => {
      const payload = JSON.parse((event as MessageEvent).data)
      if (payload.tableId === tableId) {
        loadCurrentSession(tableId)
      }
    })

    events.addEventListener('session.updated', (event) => {
      const payload = JSON.parse((event as MessageEvent).data)
      if (payload.tableId === tableId) {
        loadCurrentSession(tableId)
      }
    })

    events.addEventListener('payment.completed', (event) => {
      const payload = JSON.parse((event as MessageEvent).data)
      if (payload.tableId === tableId) {
        setNotice('Ban da duoc thanh toan xong. Co the mo session moi de dat tiep.')
        loadCurrentSession(tableId)
      }
    })

    return () => {
      events.close()
    }
  }, [restaurantId, tableId])

  const loadTableContext = async (payload: {
    token?: string
    restaurantId?: string
    tableId?: string
  }) => {
    if (payload.token) {
      await resolveToken(payload.token)
      return
    }

    if (!payload.restaurantId || !payload.tableId) return

    setRestaurantId(payload.restaurantId)
    setTableId(payload.tableId)
    setTableToken('')
    setTableNumber(null)
    setStep('menu')
  }

  const resolveToken = async (token: string) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(apiUrl(`/api/public/table?token=${token}`))
      if (!response.ok) throw new Error('Invalid QR token')

      const data = await response.json()
      setTableToken(token)
      setRestaurantId(data.table.restaurant_id)
      setTableId(data.table.id)
      setTableNumber(data.table.table_number)
      setSession(data.session)
      setSessionOrders(data.orders || [])
      setStep('menu')
    } catch (err) {
      setError('Khong tim thay thong tin ban tu QR code.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentSession = async (currentTableId: string) => {
    try {
      const response = await fetch(apiUrl(`/api/sessions/current?table_id=${currentTableId}`))
      if (!response.ok) throw new Error('Failed to load session')
      const data = await response.json()
      setSession(data.session)
      setSessionOrders(data.orders || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleQRScan = async (payload: {
    token?: string
    restaurantId?: string
    tableId?: string
  }) => {
    await loadTableContext(payload)
  }

  const handleAddToCart = (
    item: MenuItem,
    quantity: number,
    selectedOptions: CartItem['selectedOptions'] = [],
    unitPrice = item.price
  ) => {
    const optionSignature = (selectedOptions || [])
      .map((option) => `${option.name}:${option.value}`)
      .join('|')
    const lineId = `${item.id}::${optionSignature || 'base'}`

    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.id === lineId)
      if (existing) {
        return prev.map((ci) =>
          ci.id === lineId ? { ...ci, quantity: ci.quantity + quantity } : ci
        )
      }
      return [
        ...prev,
        {
          id: lineId,
          menuItemId: item.id,
          name: item.name,
          price: unitPrice,
          quantity,
          selectedOptions,
        },
      ]
    })
  }

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setCartItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, quantity } : item)))
  }

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const handleUpdateItemNote = (itemId: string, note: string) => {
    setCartItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, note } : item)))
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) return

    setLoading(true)
    setError('')

    try {
      const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

      const response = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: null,
          restaurantId,
          tableId,
          items: cartItems.map((item) => ({
            id: item.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            note: item.note || '',
            selectedOptions: item.selectedOptions || [],
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
      setNotice('Order da duoc day den nhan vien theo realtime.')
      await loadCurrentSession(tableId)

      setTimeout(() => {
        setStep('menu')
      }, 2000)
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestPayment = async () => {
    if (!session?.id) return

    setLoading(true)
    setError('')
    try {
      const response = await fetch(apiUrl('/api/sessions/payment-request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Khong the gui yeu cau thanh toan')
        return
      }

      setSession(data.session)
      setNotice('Yeu cau thanh toan da gui den nhan vien.')
    } catch (err) {
      setError('Khong the gui yeu cau thanh toan')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#2ad38b]">Order System</h1>
          <div className="flex items-center gap-2">
            {(tableNumber || tableId) && (
              <span className="text-sm text-gray-600">
                Table: {tableNumber ?? tableId}
              </span>
            )}
            {step !== 'scan' && (
              <Button
                onClick={() => {
                  setStep('scan')
                  setRestaurantId('')
                  setTableId('')
                  setTableToken('')
                  setTableNumber(null)
                  setSession(null)
                  setSessionOrders([])
                  setNotice('')
                }}
                variant="outline"
                size="sm"
              >
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

              {session && (
                <div className="bg-white border rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-lg">Current Table Session</h2>
                      <p className="text-sm text-gray-600">Status: {session.status}</p>
                      <p className="text-sm text-gray-600">
                        Total ordered: {formatCurrency(session.total_amount)}
                      </p>
                    </div>
                    <Button
                      onClick={handleRequestPayment}
                      variant="outline"
                      disabled={loading || session.status === 'payment_requested'}
                    >
                      {session.status === 'payment_requested'
                        ? 'Payment Requested'
                        : 'Request Payment'}
                    </Button>
                  </div>
                </div>
              )}

              <MenuDisplay
                categories={categories}
                items={items}
                onAddToCart={handleAddToCart}
                loading={loading}
              />
            </div>

            <div className="space-y-6">
              <Cart
                items={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onUpdateNote={handleUpdateItemNote}
                onRemoveItem={handleRemoveItem}
                onCheckout={handleCheckout}
                loading={loading}
                notes={notes}
                onNotesChange={setNotes}
              />

              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Ordered In This Session</h3>
                {sessionOrders.length === 0 ? (
                  <p className="text-sm text-gray-500">No orders yet for this table session.</p>
                ) : (
                  <div className="space-y-3">
                    {sessionOrders.map((order) => (
                      <div key={order.id} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </span>
                          <span className="text-xs uppercase text-gray-500">{order.status}</span>
                        </div>
                        <div className="space-y-1">
                          {order.order_items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span>
                                {item.quantity}x {item.menu_items.name}
                              </span>
                              <span>{formatCurrency(item.quantity * item.unit_price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-green-700 mb-2">Order Placed Successfully!</h2>
              <p className="text-green-600">Your order has been sent to the kitchen.</p>
              <p className="text-sm text-green-500 mt-4">Redirecting in a few seconds...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
