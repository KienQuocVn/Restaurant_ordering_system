'use client'

import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface QRCodeGeneratorProps {
  value: string
  tableNumber: number
  size?: number
}

export function QRCodeGenerator({
  value,
  tableNumber,
  size = 256,
}: QRCodeGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null)

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector('canvas') as HTMLCanvasElement
    if (canvas) {
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `qr-table-${tableNumber}.png`
      link.click()
    }
  }

  const handlePrint = () => {
    const canvas = qrRef.current?.querySelector('canvas') as HTMLCanvasElement
    if (canvas) {
      const printWindow = window.open()
      if (printWindow) {
        printWindow.document.write(
          `<img src="${canvas.toDataURL()}" style="width:100%;max-width:500px;"/>`
        )
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Table {tableNumber} QR Code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center p-6 bg-gray-50 rounded-lg border-2 border-dashed">
          <div ref={qrRef}>
            <QRCodeCanvas
              value={value}
              size={size}
              level="H"
              includeMargin={true}
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>
        </div>

        <p className="text-xs text-gray-600 text-center break-all">
          Data: {value}
        </p>

        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            className="flex-1 bg-[#2ad38b] hover:bg-[#0cceb0]"
          >
            Download
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="flex-1"
          >
            Print
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
