'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/api'

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

interface CartProps {
  items: CartItem[]
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onUpdateNote?: (itemId: string, note: string) => void
  onRemoveItem: (itemId: string) => void
  onCheckout: () => void
  loading?: boolean
  notes?: string
  onNotesChange?: (notes: string) => void
}

export function Cart({
  items,
  onUpdateQuantity,
  onUpdateNote,
  onRemoveItem,
  onCheckout,
  loading,
  notes = '',
  onNotesChange,
}: CartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Your Cart</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Cart is empty</p>
        ) : (
          <>
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-2 items-center border-b pb-3 last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-600">
                    {formatCurrency(item.price)} each
                  </p>
                  {(item.selectedOptions || []).length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {(item.selectedOptions || [])
                        .map((option) => `${option.name}: ${option.value}`)
                        .join(' | ')}
                    </p>
                  )}
                  <textarea
                    value={item.note || ''}
                    onChange={(e) => onUpdateNote?.(item.id, e.target.value)}
                    placeholder="Note for this item"
                    className="mt-2 w-full rounded border px-2 py-1 text-xs resize-none"
                    rows={2}
                    disabled={loading}
                  />
                </div>

                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    onUpdateQuantity(item.id, parseInt(e.target.value) || 1)
                  }
                  className="w-12 text-center"
                  disabled={loading}
                />

                <span className="text-sm font-medium w-16 text-right">
                  {formatCurrency(item.price * item.quantity)}
                </span>

                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-600 hover:text-red-700 disabled:opacity-50"
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Special Requests */}
            <div className="pt-2">
              <label className="block text-xs font-medium mb-1">
                Special Requests
              </label>
              <textarea
                value={notes}
                onChange={(e) => onNotesChange?.(e.target.value)}
                placeholder="Any special requests..."
                className="w-full px-2 py-2 border rounded text-xs resize-none"
                rows={2}
                disabled={loading}
              />
            </div>

            {/* Summary */}
            <div className="pt-4 space-y-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              onClick={onCheckout}
              className="w-full bg-[#2ad38b] hover:bg-[#0cceb0] text-white font-semibold"
              disabled={loading || items.length === 0}
            >
              {loading ? 'Processing...' : 'Place Order'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
