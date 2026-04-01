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
import { apiFetch, clearAuthSession, getStoredUser } from '@/lib/api'

interface DiningTable {
  id: string
  table_number: number
  qr_token: string
  zone?: string
  capacity?: number
  guest_count?: number
  status?: string
}

export default function QRCodesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [origin, setOrigin] = useState('')
  const [tables, setTables] = useState<DiningTable[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null)
  const [newTableCount, setNewTableCount] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<DiningTable | null>(null)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  // Check if user is logged in and is owner
  useEffect(() => {
    const parsedUser = getStoredUser()
    if (!parsedUser) {
      router.push('/login')
      return
    }

    if (parsedUser.role !== 'owner') {
      router.push('/')
      return
    }
    if (!parsedUser.restaurant_id) {
      router.push('/login')
      return
    }

    setUser(parsedUser)
    loadTables(parsedUser.restaurant_id)
  }, [])

  const loadTables = async (restaurantId: string) => {
    try {
      const response = await apiFetch(
        `/api/staff/tables?restaurant_id=${restaurantId}`,
        {},
        true
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
      const response = await apiFetch('/api/staff/tables', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId: user.restaurant_id,
          count,
        }),
      }, true)

      if (!response.ok) {
        throw new Error('Failed to create tables')
      }

      const createdTables = await response.json()
      setTables([...tables, ...createdTables])

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
    clearAuthSession()
    router.push('/login')
  }

  const handleUpdateTable = async () => {
    if (!editingTable) return
    setLoading(true)
    setError('')
    try {
      const response = await apiFetch('/api/staff/tables', {
        method: 'PATCH',
        body: JSON.stringify({
          tableId: editingTable.id,
          zone: editingTable.zone || 'Main',
          capacity: editingTable.capacity || 4,
          guestCount: editingTable.guest_count || 0,
          status: editingTable.status || 'empty',
        }),
      }, true)
      if (!response.ok) throw new Error('Failed to update table')
      await loadTables(user.restaurant_id)
      setSelectedTable(editingTable)
    } catch (err) {
      console.error(err)
      setError('Failed to update table')
    } finally {
      setLoading(false)
    }
  }

  const handleResetTable = async () => {
    if (!selectedTable) return
    setLoading(true)
    try {
      const response = await apiFetch('/api/staff/tables', {
        method: 'PATCH',
        body: JSON.stringify({
          tableId: selectedTable.id,
          status: 'empty',
          guestCount: 0,
        }),
      }, true)
      if (!response.ok) throw new Error('Failed to reset table')
      await loadTables(user.restaurant_id)
      setSelectedTable(null)
    } catch (err) {
      console.error(err)
      setError('Failed to reset table')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTable = async () => {
    if (!selectedTable) return
    setLoading(true)
    try {
      const response = await apiFetch(
        `/api/staff/tables?table_id=${selectedTable.id}`,
        { method: 'DELETE' },
        true
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete table')
      await loadTables(user.restaurant_id)
      setSelectedTable(null)
    } catch (err) {
      console.error(err)
      setError('Failed to delete table')
    } finally {
      setLoading(false)
    }
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
                value={`${origin}/customer?token=${selectedTable.qr_token}`}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Zone</p>
                      <Input
                        value={editingTable?.zone || ''}
                        onChange={(e) =>
                          setEditingTable((prev) =>
                            prev ? { ...prev, zone: e.target.value } : prev
                          )
                        }
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Capacity</p>
                      <Input
                        type="number"
                        value={editingTable?.capacity || 0}
                        onChange={(e) =>
                          setEditingTable((prev) =>
                            prev
                              ? { ...prev, capacity: parseInt(e.target.value) || 0 }
                              : prev
                          )
                        }
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Guest count</p>
                      <Input
                        type="number"
                        value={editingTable?.guest_count || 0}
                        onChange={(e) =>
                          setEditingTable((prev) =>
                            prev
                              ? { ...prev, guest_count: parseInt(e.target.value) || 0 }
                              : prev
                          )
                        }
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Status</p>
                      <Input
                        value={editingTable?.status || 'empty'}
                        onChange={(e) =>
                          setEditingTable((prev) =>
                            prev ? { ...prev, status: e.target.value } : prev
                          )
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">QR Code URL</p>
                    <p className="text-sm bg-gray-50 p-2 rounded break-all">
                      {origin}/customer?token={selectedTable.qr_token}
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

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      onClick={handleUpdateTable}
                      disabled={loading}
                      className="bg-[#2ad38b] hover:bg-[#0cceb0]"
                    >
                      Save Table
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleResetTable}
                      disabled={loading}
                    >
                      Reset Table
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteTable}
                      disabled={loading}
                    >
                      Delete Table
                    </Button>
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
                    onClick={() => {
                      setSelectedTable(table)
                      setEditingTable(table)
                    }}
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
