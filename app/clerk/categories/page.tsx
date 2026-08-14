"use client"

import { useEffect, useState } from "react"
import { FolderOpen, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  getClassCategories,
  createClassCategory,
  deleteClassCategory,
  type ClassCategory
} from "@/lib/principal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ClassCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  const fetchCategories = async () => {
    setIsLoading(true)
    try {
      const cats = await getClassCategories()
      setCategories(cats)
    } catch {
      toast.error("Failed to load categories")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleCreate = async () => {
    if (!newCategoryName.trim()) return
    setIsSaving(true)
    try {
      await createClassCategory(newCategoryName.trim())
      toast.success("Category created successfully")
      setNewCategoryName("")
      setIsDialogOpen(false)
      await fetchCategories()
    } catch {
      toast.error("Failed to create category")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure? Deleting this category may affect its classes.")) return
    try {
      await deleteClassCategory(id)
      toast.success("Category deleted")
      await fetchCategories()
    } catch {
      toast.error("Failed to delete category")
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 sm:pt-6 bg-white min-h-screen">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FolderOpen className="h-7 w-7 text-primary flex-shrink-0" />
            Class Categories
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage categories that group your classes (e.g. Nursery, Primary, Secondary).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCategories} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
        </div>
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg bg-slate-50">
          <FolderOpen className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-medium text-slate-900">No categories yet</h3>
          <p className="text-slate-500 mt-1">Create a category to get started organizing your classes.</p>
          <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id} className="group hover:shadow-md transition-shadow border">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-blue-500" />
                  {cat.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(cat.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-xs text-muted-foreground">ID: {cat.id}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Class Category</DialogTitle>
            <DialogDescription>
              A category groups related classes together (e.g. Pre-Primary, Primary, Secondary).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <label className="text-sm font-medium">Category Name</label>
            <Input
              placeholder="e.g. Primary"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate() }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving || !newCategoryName.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
