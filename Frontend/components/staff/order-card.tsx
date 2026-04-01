'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/api'

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  special_instructions?: string
  menu_items: {
    name: string
  }
}

interface OrderCardProps {
  orderId: string
  tableNumber: number
  status: string
  items: OrderItem[]
  totalAmount: number
  createdAt: string
  onStatusChange: (orderId: string, status: string) => void
  onPrintBill?: () => void
  onPrintKitchenSlip?: () => void
  loading?: boolean
}

const statusBadgeColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export function OrderCard({
  orderId,
  tableNumber,
  status,
  items,
  totalAmount,
  createdAt,
  onStatusChange,
  onPrintBill,
  onPrintKitchenSlip,
  loading,
}: OrderCardProps) {
  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'preparing'
      case 'preparing':
        return 'completed'
      default:
        return currentStatus
    }
  }

  const nextStatus = getNextStatus(status)

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg">Table {tableNumber}</h3>
            <p className="text-xs text-gray-500">
              {new Date(createdAt).toLocaleTimeString()}
            </p>
          </div>
          <Badge className={statusBadgeColor[status] || ''}>
            {status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Order Items */}
        <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded">
          {items.map((item) => (
            <div key={item.id} className="text-sm">
              <div className="flex justify-between">
                <span className="font-medium">
                  {item.quantity}x {item.menu_items.name}
                </span>
                <span className="text-gray-600">
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
              </div>
              {item.special_instructions && (
                <p className="text-xs text-gray-600 italic ml-2">
                  Note: {item.special_instructions}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex justify-between font-bold mb-4 pb-4 border-b">
          <span>Total:</span>
          <span className="text-[#2ad38b]">{formatCurrency(totalAmount)}</span>
        </div>

        {/* Actions */}
        {status !== 'completed' && status !== 'cancelled' && (
          <Button
            onClick={() => onStatusChange(orderId, nextStatus)}
            className="w-full bg-[#2ad38b] hover:bg-[#0cceb0] text-white"
            disabled={loading}
          >
            {nextStatus === 'preparing'
              ? 'Start Preparing'
              : 'Mark Complete'}
          </Button>
        )}

        {status !== 'cancelled' && status !== 'completed' && (
          <Button
            onClick={() => onStatusChange(orderId, 'cancelled')}
            variant="destructive"
            className="w-full mt-2"
            disabled={loading}
          >
            Cancel Order
          </Button>
        )}

        {onPrintKitchenSlip && (
          <Button
            onClick={onPrintKitchenSlip}
            variant="outline"
            className="w-full mt-2"
            disabled={loading}
          >
            Print Kitchen Slip
          </Button>
        )}

        {onPrintBill && (
          <Button
            onClick={onPrintBill}
            variant="outline"
            className="w-full mt-2"
            disabled={loading}
          >
            Print Bill
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
