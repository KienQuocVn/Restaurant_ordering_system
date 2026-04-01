'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/api'

interface MenuOptionValue {
  label: string
  price: number
}

interface MenuOptionGroup {
  name: string
  multi?: boolean
  values: MenuOptionValue[]
}

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category_id: string
  image_url?: string
  is_available: boolean
  options?: MenuOptionGroup[]
}

interface MenuCategory {
  id: string
  name: string
}

interface SelectedOption {
  name: string
  value: string
  price_add: number
}

interface MenuDisplayProps {
  categories: MenuCategory[]
  items: MenuItem[]
  onAddToCart: (
    item: MenuItem,
    quantity: number,
    selectedOptions: SelectedOption[],
    unitPrice: number
  ) => void
  loading?: boolean
}

function buildOptionMap(groups: MenuOptionGroup[]) {
  const initial: Record<string, SelectedOption[]> = {}
  groups.forEach((group) => {
    initial[group.name] = []
  })
  return initial
}

export function MenuDisplay({ categories, items, onAddToCart, loading }: MenuDisplayProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [selectedOptionsByItem, setSelectedOptionsByItem] = useState<
    Record<string, Record<string, SelectedOption[]>>
  >({})
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null)

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id)
    }
  }, [categories, selectedCategory])

  const filteredItems = useMemo(
    () =>
      selectedCategory
        ? items.filter((item) => item.category_id === selectedCategory)
        : items,
    [items, selectedCategory]
  )

  const handleQuantityChange = (itemId: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, value),
    }))
  }

  const handleSingleOptionChange = (
    itemId: string,
    groupName: string,
    rawValue: string,
    values: MenuOptionValue[]
  ) => {
    const match = values.find((value) => value.label === rawValue)
    setSelectedOptionsByItem((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [groupName]: match
          ? [{ name: groupName, value: match.label, price_add: Number(match.price || 0) }]
          : [],
      },
    }))
  }

  const handleMultiOptionChange = (
    itemId: string,
    groupName: string,
    option: MenuOptionValue,
    checked: boolean
  ) => {
    setSelectedOptionsByItem((prev) => {
      const existing = prev[itemId]?.[groupName] || []
      const nextValues = checked
        ? [
            ...existing,
            {
              name: groupName,
              value: option.label,
              price_add: Number(option.price || 0),
            },
          ]
        : existing.filter((value) => value.value !== option.label)

      return {
        ...prev,
        [itemId]: {
          ...(prev[itemId] || {}),
          [groupName]: nextValues,
        },
      }
    })
  }

  const getSelectedOptions = (item: MenuItem) => {
    const current = selectedOptionsByItem[item.id] || buildOptionMap(item.options || [])
    return Object.values(current).flat()
  }

  const getPreviewPrice = (item: MenuItem) => {
    const optionTotal = getSelectedOptions(item).reduce(
      (sum, option) => sum + Number(option.price_add || 0),
      0
    )
    return Number(item.price || 0) + optionTotal
  }

  const handleAddItem = (item: MenuItem) => {
    const quantity = quantities[item.id] || 1
    if (quantity <= 0) return

    const selectedOptions = getSelectedOptions(item)
    onAddToCart(item, quantity, selectedOptions, getPreviewPrice(item))
    setQuantities((prev) => ({ ...prev, [item.id]: 0 }))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Categories
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-4 py-2 whitespace-nowrap text-sm font-medium transition-colors ${
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden border-0 shadow-sm ring-1 ring-gray-200">
            {item.image_url && (
              <button
                type="button"
                className="h-44 w-full overflow-hidden bg-gray-100 text-left"
                onClick={() => setDetailItem(item)}
              >
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
              </button>
            )}
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <button type="button" onClick={() => setDetailItem(item)} className="text-left">
                    <h4 className="text-lg font-bold">{item.name}</h4>
                  </button>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                <span className="text-base font-bold text-[#2ad38b]">
                  {formatCurrency(getPreviewPrice(item))}
                </span>
              </div>

              {(item.options || []).map((group) => (
                <div key={`${item.id}-${group.name}`} className="rounded-xl bg-gray-50 p-3">
                  <p className="mb-2 text-sm font-medium text-gray-800">{group.name}</p>
                  {group.multi ? (
                    <div className="flex flex-wrap gap-2">
                      {group.values.map((value) => {
                        const checked = (selectedOptionsByItem[item.id]?.[group.name] || []).some(
                          (option) => option.value === value.label
                        )
                        return (
                          <label
                            key={value.label}
                            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                              checked
                                ? 'border-[#2ad38b] bg-green-50 text-[#128c5a]'
                                : 'border-gray-200 bg-white text-gray-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                handleMultiOptionChange(
                                  item.id,
                                  group.name,
                                  value,
                                  event.target.checked
                                )
                              }
                              disabled={loading || !item.is_available}
                            />
                            <span>
                              {value.label}
                              {value.price > 0 ? ` (+${formatCurrency(value.price)})` : ''}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <select
                      value={selectedOptionsByItem[item.id]?.[group.name]?.[0]?.value || ''}
                      onChange={(event) =>
                        handleSingleOptionChange(item.id, group.name, event.target.value, group.values)
                      }
                      className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                      disabled={loading || !item.is_available}
                    >
                      <option value="">Khong chon</option>
                      {group.values.map((value) => (
                        <option key={value.label} value={value.label}>
                          {value.label}
                          {value.price > 0 ? ` (+${formatCurrency(value.price)})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="99"
                  value={quantities[item.id] || 0}
                  onChange={(e) =>
                    handleQuantityChange(item.id, parseInt(e.target.value, 10) || 0)
                  }
                  className="w-20"
                  disabled={!item.is_available || loading}
                />
                <Button
                  onClick={() => handleAddItem(item)}
                  className="flex-1 bg-[#2ad38b] text-white hover:bg-[#0cceb0]"
                  disabled={!item.is_available || loading || (quantities[item.id] || 0) === 0}
                >
                  Add To Cart
                </Button>
              </div>

              {!item.is_available && (
                <p className="text-xs font-medium text-red-600">Mon nay tam het</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Chua co mon nao trong danh muc nay.
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(detailItem)} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailItem?.name}</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              {detailItem.image_url && (
                <img
                  src={detailItem.image_url}
                  alt={detailItem.name}
                  className="h-64 w-full rounded-lg object-cover"
                />
              )}
              <p className="text-sm text-gray-600">{detailItem.description}</p>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm text-gray-500">Base price</p>
                <p className="text-xl font-bold text-[#2ad38b]">
                  {formatCurrency(detailItem.price)}
                </p>
              </div>
              {(detailItem.options || []).length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Available options</p>
                  <div className="space-y-2">
                    {detailItem.options?.map((group) => (
                      <div key={group.name} className="rounded border p-3">
                        <p className="font-medium">{group.name}</p>
                        <p className="mt-1 text-sm text-gray-600">
                          {group.values
                            .map((value) =>
                              value.price > 0
                                ? `${value.label} (+${formatCurrency(value.price)})`
                                : value.label
                            )
                            .join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
