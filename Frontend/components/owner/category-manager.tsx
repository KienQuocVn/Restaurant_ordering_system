'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Edit2, Trash2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  is_active?: boolean
}

interface CategoryManagerProps {
  categories: Category[]
  onAddCategory: (name: string) => void
  onUpdateCategory: (categoryId: string, name: string) => void
  onDeleteCategory: (categoryId: string) => void
  loading?: boolean
}

export function CategoryManager({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  loading,
}: CategoryManagerProps) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editingName, setEditingName] = useState('')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            disabled={loading}
          />
          <Button
            onClick={() => {
              if (!newName.trim()) return
              onAddCategory(newName.trim())
              setNewName('')
            }}
            disabled={loading || !newName.trim()}
            className="bg-[#2ad38b] hover:bg-[#0cceb0]"
          >
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500">No categories yet</p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-gray-50 p-3"
              >
                {editingId === category.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    disabled={loading}
                  />
                ) : (
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-gray-500">
                      {category.is_active === false ? 'Inactive' : 'Active'}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {editingId === category.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!editingName.trim()) return
                          onUpdateCategory(category.id, editingName.trim())
                          setEditingId('')
                          setEditingName('')
                        }}
                        disabled={loading}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId('')
                          setEditingName('')
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(category.id)
                          setEditingName(category.name)
                        }}
                        className="text-blue-600"
                        disabled={loading}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteCategory(category.id)}
                        className="text-red-600"
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
