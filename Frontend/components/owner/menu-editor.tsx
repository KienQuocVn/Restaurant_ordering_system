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
import { Trash2, Edit2, ArrowUp, ArrowDown, ImagePlus } from 'lucide-react'
import { formatCurrency } from '@/lib/api'

interface MenuItem {
  id: string
  category_id: string
  name: string
  description: string
  price: number
  is_available: boolean
  display_order?: number
  image_url?: string
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

interface MenuEditorProps {
  categories: MenuCategory[]
  items: MenuItem[]
  onAddItem: (item: any) => void
  onUpdateItem: (itemId: string, item: any) => void
  onDeleteItem: (itemId: string) => void
  onReorderItems?: (itemIds: string[]) => void
  loading?: boolean
}

export function MenuEditor({
  categories,
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorderItems,
  loading,
}: MenuEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    optionsJson: '[]',
    isAvailable: true,
  })

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        categoryId: item.category_id,
        name: item.name,
        description: item.description,
        price: item.price.toString(),
        imageUrl: item.image_url || '',
        optionsJson: JSON.stringify(item.options || [], null, 2),
        isAvailable: item.is_available,
      })
    } else {
      setEditingItem(null)
      setFormData({
        categoryId: categories[0]?.id || '',
        name: '',
        description: '',
        price: '',
        imageUrl: '',
        optionsJson: '[]',
        isAvailable: true,
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingItem(null)
  }

  const handleImageUpload = async (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setFormData((prev) => ({ ...prev, imageUrl: result }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.price || !formData.categoryId) {
      alert('Please fill in all required fields')
      return
    }

    let parsedOptions: MenuItem['options'] = []
    try {
      parsedOptions = JSON.parse(formData.optionsJson || '[]')
      if (!Array.isArray(parsedOptions)) {
        throw new Error('Options must be an array')
      }
    } catch {
      alert('Options JSON is invalid')
      return
    }

    const itemData = {
      categoryId: formData.categoryId,
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      imageUrl: formData.imageUrl,
      options: parsedOptions,
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
            items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-14 w-14 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-white text-gray-400">
                        <ImagePlus className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-gray-600 truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        if (index === 0 || !onReorderItems) return
                        const next = [...items]
                        ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                        onReorderItems(next.map((entry) => entry.id))
                      }}
                      className="text-gray-500 hover:text-gray-700 disabled:opacity-40"
                      disabled={loading || index === 0 || !onReorderItems}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (index === items.length - 1 || !onReorderItems) return
                        const next = [...items]
                        ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
                        onReorderItems(next.map((entry) => entry.id))
                      }}
                      className="text-gray-500 hover:text-gray-700 disabled:opacity-40"
                      disabled={loading || index === items.length - 1 || !onReorderItems}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

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
                Category *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value })
                }
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                disabled={loading}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

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
                Image URL
              </label>
              <Input
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value })
                }
                placeholder="https://..."
                disabled={loading}
              />
              <div className="mt-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  <ImagePlus className="h-4 w-4" />
                  <span>Upload image from device</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                    disabled={loading}
                  />
                </label>
              </div>
              {formData.imageUrl && (
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="mt-3 h-28 w-full rounded-md border object-cover"
                />
              )}
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

            <div>
              <label className="block text-sm font-medium mb-1">
                Options / Toppings JSON
              </label>
              <textarea
                value={formData.optionsJson}
                onChange={(e) =>
                  setFormData({ ...formData, optionsJson: e.target.value })
                }
                placeholder='[{"name":"Size","values":[{"label":"M","price":0},{"label":"L","price":20000}]}]'
                className="min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
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
