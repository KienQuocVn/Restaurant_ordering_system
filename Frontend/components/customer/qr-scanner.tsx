'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface QRScannerProps {
  onScan: (restaurantId: string, tableId: string) => void
  loading?: boolean
}

export function QRScanner({ onScan, loading }: QRScannerProps) {
  const [manualInput, setManualInput] = useState('')
  const [error, setError] = useState('')

  const handleManualScan = () => {
    setError('')
    
    // Expected format: restaurant_id|table_id
    const parts = manualInput.split('|')
    if (parts.length !== 2) {
      setError('Invalid QR code format. Expected: restaurant_id|table_id')
      return
    }

    const [restaurantId, tableId] = parts
    if (!restaurantId || !tableId) {
      setError('Both restaurant ID and table ID are required')
      return
    }

    onScan(restaurantId, tableId)
    setManualInput('')
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Scan Table QR Code</CardTitle>
        <CardDescription>
          Scan the QR code on your table to start ordering
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">
            QR Code Data
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Scan QR code here"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualScan()
                }
              }}
              disabled={loading}
              autoFocus
            />
            <Button
              onClick={handleManualScan}
              className="bg-[#2ad38b] hover:bg-[#0cceb0]"
              disabled={loading || !manualInput}
            >
              {loading ? 'Loading...' : 'Enter'}
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Tip: Most QR code readers will automatically enter the data. 
          Focus on the input field and scan.
        </p>
      </CardContent>
    </Card>
  )
}
