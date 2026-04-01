'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QRCodeGenerator } from '@/components/qr-code-generator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface DiningTable {
  id: string
  table_number: number
}

export default function QRCodesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [tables, setTables] = useState<DiningTable[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null)
  const [newTableCount, setNewTableCount] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

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
    loadTables(parsedUser.id)
  }, [])

  const loadTables = async (restaurantId: string) => {
    try {
      const response = await fetch(
        `/api/staff/tables?restaurant_id=${restaurantId}`
      )
      if (!response.ok) throw new Error('Failed to load tables')

      const data = await response.json()
      setTables(data || [])
      setError('')
    } catch (err) {
      console.error('Error loading tables:', err)
      setError('Failed to load tables')
    }
  }

  const handleCreateTables = async () => {
    const count = parseInt(newTableCount)
    if (!count || count < 1) {
      setError('Please enter a valid number')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create tables in database
      const tablesToCreate = Array.from({ length: count }, (_, i) => ({
        restaurant_id: user.id,
        table_number: tables.length + i + 1,
        status: 'available',
      }))

      // Note: In a real app, you would call an API route
      // For now, we'll just create mock tables
      setTables([
        ...tables,
        ...tablesToCreate.map((t, i) => ({
          id: `table-${Date.now()}-${i}`,
          table_number: t.table_number,
        })),
      ])

      setNewTableCount('')
      setDialogOpen(false)
    } catch (err) {
      console.error('Error creating tables:', err)
      setError('Failed to create tables')
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
              QR Code Management
            </h1>
            <p className="text-sm text-gray-600">
              Manage and generate QR codes for your tables
            </p>
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

        {/* Add Tables Button */}
        <div className="mb-8">
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-[#2ad38b] hover:bg-[#0cceb0]"
            disabled={loading}
          >
            Add Tables
          </Button>
        </div>

        {/* QR Code Selection Grid */}
        {selectedTable ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Button
                onClick={() => setSelectedTable(null)}
                variant="outline"
                className="mb-4"
              >
                Back
              </Button>
              <QRCodeGenerator
                restaurantId={user.id}
                tableNumber={selectedTable.table_number}
                size={300}
              />
            </div>

            <div>
              <h2 className="text-lg font-bold mb-4">Table Information</h2>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Table Number</p>
                    <p className="text-2xl font-bold text-[#2ad38b]">
                      {selectedTable.table_number}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">QR Code Data</p>
                    <p className="text-sm bg-gray-50 p-2 rounded break-all">
                      {user.id}|table_{selectedTable.table_number}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Instructions:</p>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Print the QR code</li>
                      <li>Laminate for durability</li>
                      <li>Mount on the table</li>
                      <li>Customers scan to order</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-4">
              Select a Table to Generate QR Code
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {tables.length === 0 ? (
                <p className="col-span-full text-gray-500 text-center py-8">
                  No tables created yet
                </p>
              ) : (
                tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className="p-4 bg-white rounded-lg border-2 border-gray-300 hover:border-[#2ad38b] hover:bg-green-50 transition-colors font-medium text-center"
                  >
                    Table {table.table_number}
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {/* Add Tables Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tables</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                How many tables would you like to add?
              </p>
              <Input
                type="number"
                min="1"
                value={newTableCount}
                onChange={(e) => setNewTableCount(e.target.value)}
                placeholder="e.g., 10"
                disabled={loading}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTables}
                className="bg-[#2ad38b] hover:bg-[#0cceb0]"
                disabled={loading || !newTableCount}
              >
                {loading ? 'Creating...' : 'Create Tables'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
