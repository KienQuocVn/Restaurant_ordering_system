'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/api'

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  product_name?: string
  menu_items?: {
    name: string
  }
}

interface OwnerOrder {
  id: string
  table_number: number
  status: string
  total_amount: number
  created_at: string
  cancel_reason?: string
  order_items: OrderItem[]
}

interface OrderManagerProps {
  orders: OwnerOrder[]
  onCancelOrder: (orderId: string, reason: string) => void
  onPrintBill?: (order: OwnerOrder) => void
  onPrintKitchenSlip?: (order: OwnerOrder) => void
  loading?: boolean
}

export function OrderManager({
  orders,
  onCancelOrder,
  onPrintBill,
  onPrintKitchenSlip,
  loading,
}: OrderManagerProps) {
  const [cancelingId, setCancelingId] = useState('')
  const [reason, setReason] = useState('')

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Orders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders yet</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="rounded-lg border p-4 bg-white">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <p className="font-semibold">Table {order.table_number}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm uppercase text-gray-500">{order.status}</p>
                  <p className="font-semibold text-[#2ad38b]">
                    {formatCurrency(order.total_amount)}
                  </p>
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.product_name || item.menu_items?.name}
                    </span>
                    <span>{formatCurrency(item.quantity * item.unit_price)}</span>
                  </div>
                ))}
              </div>

              {order.cancel_reason && (
                <p className="text-sm text-red-600 mb-3">
                  Cancel reason: {order.cancel_reason}
                </p>
              )}

              {order.status !== 'cancelled' && order.status !== 'completed' && (
                <div className="space-y-2">
                  {cancelingId === order.id ? (
                    <>
                      <input
                        className="w-full rounded border px-3 py-2 text-sm"
                        placeholder="Cancel reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={loading}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          disabled={loading || !reason.trim()}
                          onClick={() => {
                            onCancelOrder(order.id, reason.trim())
                            setCancelingId('')
                            setReason('')
                          }}
                        >
                          Confirm Cancel
                        </Button>
                        <Button
                          variant="outline"
                          disabled={loading}
                          onClick={() => {
                            setCancelingId('')
                            setReason('')
                          }}
                        >
                          Close
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      disabled={loading}
                      onClick={() => setCancelingId(order.id)}
                    >
                      Cancel Order
                    </Button>
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {onPrintBill && (
                  <Button variant="outline" disabled={loading} onClick={() => onPrintBill(order)}>
                    Print Bill
                  </Button>
                )}
                {onPrintKitchenSlip && (
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => onPrintKitchenSlip(order)}
                  >
                    Print Kitchen Slip
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
