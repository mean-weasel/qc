'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createCategory, updateCategory, toggleCategoryActive } from '@/app/(app)/settings/actions'
import type { Category } from '@/types'
import type { DbCategory } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useRealtimeCouple } from '@/hooks/useRealtimeCouple'
import { CategoryFormDialog } from './CategoryFormDialog'
import { CategoryCard } from './CategoryCard'

interface CategoryManagerProps {
  coupleId: string
}

function mapDbToCategory(row: DbCategory): Category {
  return {
    id: row.id,
    coupleId: row.couple_id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    isActive: row.is_active,
    isSystem: row.is_system,
    sortOrder: row.sort_order,
    prompts: Array.isArray(row.prompts) ? row.prompts : [],
    createdAt: row.created_at,
  }
}

export function CategoryManager({ coupleId }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '💬',
  })
  const supabase = createClient()

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('couple_id', coupleId)
        .order('sort_order', { ascending: true })

      if (error) {
        console.error('Failed to load categories:', error)
        return
      }

      if (data) {
        setCategories(data.map(mapDbToCategory))
      }
    }
    loadCategories()
  }, [coupleId, supabase])

  // Realtime subscription
  useRealtimeCouple<DbCategory>({
    table: 'categories',
    coupleId,
    onInsert: (record) => {
      const category = mapDbToCategory(record)
      setCategories((prev) => [...prev, category].sort((a, b) => a.sortOrder - b.sortOrder))
    },
    onUpdate: (record) => {
      const category = mapDbToCategory(record)
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? category : c)).sort((a, b) => a.sortOrder - b.sortOrder),
      )
    },
    onDelete: (oldRecord) => {
      setCategories((prev) => prev.filter((c) => c.id !== oldRecord.id))
    },
  })

  function openCreateDialog() {
    setEditingCategory(null)
    setFormData({ name: '', description: '', icon: '💬' })
    setIsDialogOpen(true)
  }

  function openEditDialog(category: Category) {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon,
    })
    setIsDialogOpen(true)
  }

  async function handleSubmit() {
    const formDataObj = new FormData()
    formDataObj.append('name', formData.name)
    formDataObj.append('description', formData.description)
    formDataObj.append('icon', formData.icon)

    if (editingCategory) {
      const result = await updateCategory(editingCategory.id, { success: false }, formDataObj)
      if (result.error) {
        console.error('Failed to update category:', result.error)
        return
      }
    } else {
      const result = await createCategory({ success: false }, formDataObj)
      if (result.error) {
        console.error('Failed to create category:', result.error)
        return
      }
    }
    setIsDialogOpen(false)
  }

  async function handleToggleActive(categoryId: string, isActive: boolean) {
    const result = await toggleCategoryActive(categoryId, isActive)
    if (result.error) {
      console.error('Failed to toggle category active status:', result.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Discussion Categories</h3>
          <p className="text-sm text-gray-600">Customize categories for your check-in sessions</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-1 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <CategoryFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingCategory={editingCategory}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleSubmit}
      />

      <div className="space-y-2">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onEdit={openEditDialog}
            onToggleActive={handleToggleActive}
          />
        ))}
      </div>
    </div>
  )
}
