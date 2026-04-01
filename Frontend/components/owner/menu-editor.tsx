'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Trash2, Edit2 } from 'lucide-react'
import { formatCurrency } from '@/lib/api'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  is_available: boolean
}

interface MenuEditorProps {
  items: MenuItem[]
  onAddItem: (item: any) => void
  onUpdateItem: (itemId: string, item: any) => void
  onDeleteItem: (itemId: string) => void
  loading?: boolean
}

export function MenuEditor({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  loading,
}: MenuEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    isAvailable: true,
  })

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name,
        description: item.description,
        price: item.price.toString(),
        isAvailable: item.is_available,
      })
    } else {
      setEditingItem(null)
      setFormData({
        name: '',
        description: '',
        price: '',
        isAvailable: true,
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingItem(null)
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.price) {
      alert('Please fill in all required fields')
      return
    }

    const itemData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      isAvailable: formData.isAvailable,
    }

    if (editingItem) {
      onUpdateItem(editingItem.id, itemData)
    } else {
      onAddItem(itemData)
    }

    handleCloseDialog()
  }

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Menu Items</CardTitle>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-[#2ad38b] hover:bg-[#0cceb0]"
          disabled={loading}
        >
          Add Item
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No menu items yet</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-medium text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-gray-600 truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <p className="font-bold text-[#2ad38b]">
                      {formatCurrency(item.price)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenDialog(item)}
                    className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    disabled={loading}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="text-red-600 hover:text-red-700 disabled:opacity-50"
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Item Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Grilled Chicken"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Item description"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Price *
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder="0.00"
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Available</label>
              <Switch
                checked={formData.isAvailable}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isAvailable: checked })
                }
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-[#2ad38b] hover:bg-[#0cceb0]"
              disabled={loading}
            >
              {editingItem ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
