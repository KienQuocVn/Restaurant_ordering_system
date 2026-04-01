'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/api'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category_id: string
  image_url?: string
  is_available: boolean
}

interface MenuCategory {
  id: string
  name: string
}

interface MenuDisplayProps {
  categories: MenuCategory[]
  items: MenuItem[]
  onAddToCart: (item: MenuItem, quantity: number) => void
  loading?: boolean
}

export function MenuDisplay({ categories, items, onAddToCart, loading }: MenuDisplayProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categories.length > 0 ? categories[0].id : null
  )
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const filteredItems = selectedCategory
    ? items.filter((item) => item.category_id === selectedCategory)
    : items

  const handleQuantityChange = (itemId: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, value),
    }))
  }

  const handleAddToCart = (item: MenuItem) => {
    const quantity = quantities[item.id] || 1
    if (quantity > 0) {
      onAddToCart(item, quantity)
      setQuantities((prev) => ({ ...prev, [item.id]: 0 }))
    }
  }

  return (
    <div className="space-y-4">
      {/* Categories */}
      <div>
        <h3 className="text-sm font-medium mb-2">Categories</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#2ad38b] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            {item.image_url && (
              <div className="w-full h-40 bg-gray-200 overflow-hidden">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-lg">{item.name}</h4>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                <span className="text-lg font-bold text-[#2ad38b]">
                  {formatCurrency(item.price)}
                </span>
              </div>

              <div className="flex gap-2 items-center mt-4">
                <Input
                  type="number"
                  min="0"
                  max="99"
                  value={quantities[item.id] || 0}
                  onChange={(e) =>
                    handleQuantityChange(item.id, parseInt(e.target.value) || 0)
                  }
                  className="w-16"
                  disabled={!item.is_available || loading}
                />
                <Button
                  onClick={() => handleAddToCart(item)}
                  className="flex-1 bg-[#2ad38b] hover:bg-[#0cceb0] text-white"
                  disabled={!item.is_available || loading || (quantities[item.id] || 0) === 0}
                >
                  Add
                </Button>
              </div>

              {!item.is_available && (
                <p className="text-xs text-red-600 mt-2">Not available</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No items available in this category
          </CardContent>
        </Card>
      )}
    </div>
  )
}
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id)
    }
  }, [categories, selectedCategory])
