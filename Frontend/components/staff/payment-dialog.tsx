'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/api'

interface PaymentDialogProps {
  open: boolean
  orderId: string
  tableNumber: number
  totalAmount: number
  qrCodeUrl?: string
  onClose: () => void
  onPaymentSubmit: (paymentMethod: string) => void
  loading?: boolean
}

export function PaymentDialog({
  open,
  orderId,
  tableNumber,
  totalAmount,
  qrCodeUrl,
  onClose,
  onPaymentSubmit,
  loading,
}: PaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('')

  const paymentMethods = [
    {
      id: 'cash',
      name: 'Cash',
      icon: '💵',
    },
    {
      id: 'card',
      name: 'Card',
      icon: '💳',
    },
    {
      id: 'momo',
      name: 'Mobile Money',
      icon: '📱',
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      icon: '🏦',
    },
  ]

  const handleSubmit = () => {
    if (selectedMethod) {
      onPaymentSubmit(selectedMethod)
      setSelectedMethod('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment - Table {tableNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-[#2ad38b]">
              {formatCurrency(totalAmount)}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-3">Select Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-4 rounded-lg border-2 transition-colors flex flex-col items-center gap-2 ${
                    selectedMethod === method.id
                      ? 'border-[#2ad38b] bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <span className="text-2xl">{method.icon}</span>
                  <span className="text-xs font-medium text-center">
                    {method.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {selectedMethod === 'momo' && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
              <p className="font-medium text-blue-900 mb-1">Mobile Money Instructions:</p>
              <p className="text-blue-800">
                Customer should scan the QR code below or transfer to the restaurant&apos;s mobile money account.
              </p>
            </div>
          )}

          {selectedMethod === 'bank_transfer' && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
              <p className="font-medium text-blue-900 mb-1">Bank Transfer Instructions:</p>
              <p className="text-blue-800">
                Customer should transfer to the restaurant&apos;s bank account using the provided details.
              </p>
            </div>
          )}

          {qrCodeUrl && (
            <div className="bg-gray-50 border rounded p-3 text-sm">
              <p className="font-medium mb-2">Generated payment QR / link</p>
              <a
                href={qrCodeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 break-all"
              >
                {qrCodeUrl}
              </a>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#2ad38b] hover:bg-[#0cceb0]"
            disabled={!selectedMethod || loading}
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
