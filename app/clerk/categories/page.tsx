"use client"

import { useEffect, useState } from "react"
import {
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  LayoutGrid,
  Table as TableIcon,
  Search,
  Edit3,
  X,
  Layers,
} from "lucide-react"
import { toast } from "sonner"

import {
  getClassCategories,
  createClassCategory,
  deleteClassCategory,
  updateClassCategory,
  type ClassCategory,
} from "@/lib/principal"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ClassCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  // Bulk creation dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [categoryInputs, setCategoryInputs] = useState<{ name: string }[]>([{ name: "" }])

  // Edit dialog states
  const [editingCategory, setEditingCategory] = useState<ClassCategory | null>(null)
  const [editName, setEditName] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

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

  // Filtered categories by search
  const filteredCategories = categories.filter((cat) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return cat.name.toLowerCase().includes(q)
  })

  // Open creation modal with initial row
  const handleOpenCreateDialog = () => {
    setCategoryInputs([{ name: "" }])
    setIsDialogOpen(true)
  }

  // Add a new row to bulk creation form
  const handleAddInputRow = () => {
    setCategoryInputs((prev) => [...prev, { name: "" }])
  }

  // Remove a row from bulk creation form
  const handleRemoveInputRow = (index: number) => {
    if (categoryInputs.length <= 1) return
    setCategoryInputs((prev) => prev.filter((_, i) => i !== index))
  }

  // Update input row value
  const handleInputChange = (index: number, value: string) => {
    setCategoryInputs((prev) =>
      prev.map((item, i) => (i === index ? { name: value } : item))
    )
  }

  // Submit bulk creation
  const handleBulkCreate = async () => {
    const validNames = categoryInputs
      .map((c) => c.name.trim())
      .filter((name) => name.length > 0)

    if (validNames.length === 0) {
      toast.error("Please enter at least one category name")
      return
    }

    setIsSaving(true)
    try {
      await Promise.all(validNames.map((name) => createClassCategory(name)))
      toast.success(
        `${validNames.length} ${
          validNames.length === 1 ? "category" : "categories"
        } created successfully`
      )
      setCategoryInputs([{ name: "" }])
      setIsDialogOpen(false)
      await fetchCategories()
    } catch {
      toast.error("Failed to create categories")
    } finally {
      setIsSaving(false)
    }
  }

  // Open edit modal
  const handleOpenEdit = (cat: ClassCategory) => {
    setEditingCategory(cat)
    setEditName(cat.name)
  }

  // Save updated category
  const handleSaveEdit = async () => {
    if (!editingCategory || !editName.trim()) return
    setIsUpdating(true)
    try {
      await updateClassCategory(editingCategory.id, editName.trim())
      toast.success("Category updated successfully")
      setEditingCategory(null)
      await fetchCategories()
    } catch {
      toast.error("Failed to update category")
    } finally {
      setIsUpdating(false)
    }
  }

  // Delete category
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
    <div className="flex-1 space-y-6">
      {/* Header */}
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
          <Button size="sm" onClick={handleOpenCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
        </div>
      </div>

      <Separator />

      {/* Search & View Toggle Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search categories by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm rounded-lg"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-slate-50 p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs font-semibold gap-1.5"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs font-semibold gap-1.5"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="h-3.5 w-3.5" />
              Table
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        /* Empty State: No categories exist */
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 shadow-2xs">
            <FolderOpen className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No categories created yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Group and organize your school classes by adding categories such as Primary, Middle School, or High School.
          </p>
          <Button className="mt-5 shadow-xs" onClick={handleOpenCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </div>
      ) : filteredCategories.length === 0 ? (
        /* Empty State: Search match failure */
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-200 bg-slate-50/50">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No categories found</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            No categories match &quot;{searchQuery}&quot;. Check the spelling or clear your search query.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearchQuery("")}>
            Clear Search
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW (No raw database IDs displayed) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCategories.map((cat) => (
            <Card
              key={cat.id}
              className="group relative overflow-hidden border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 rounded-xl bg-white"
            >
              <CardHeader className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 text-[#5826df] flex items-center justify-center shrink-0 group-hover:bg-[#5826df] group-hover:text-white transition-colors duration-200">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                        {cat.name}
                      </CardTitle>
                      <span className="text-xs text-slate-400 font-medium">Class Group</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={() => handleOpenEdit(cat)}
                      title="Edit category"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(cat.id)}
                      title="Delete category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        /* TABLE VIEW (No raw database IDs displayed) */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-b">
                <TableHead className="font-semibold text-slate-700 py-3 px-4">Category Name</TableHead>
                <TableHead className="w-32 text-right font-semibold text-slate-700 py-3 px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((cat) => (
                <TableRow key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-slate-900">{cat.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-3 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-indigo-600 hover:border-indigo-200 gap-1"
                        onClick={() => handleOpenEdit(cat)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 gap-1"
                        onClick={() => handleDelete(cat.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Bulk Category Creation Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Create Class Categories
            </DialogTitle>
            <DialogDescription>
              Add one or multiple class categories in a single submission (e.g. Pre-Primary, Primary, High School).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              {categoryInputs.map((input, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder={`Category name #${index + 1} (e.g. Primary)`}
                      value={input.name}
                      disabled={isSaving}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (index === categoryInputs.length - 1) {
                            handleAddInputRow()
                          } else {
                            handleBulkCreate()
                          }
                        }
                      }}
                      autoFocus={index === categoryInputs.length - 1}
                      className="h-9 text-sm"
                    />
                  </div>

                  {categoryInputs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isSaving}
                      className="h-9 w-9 text-slate-400 hover:text-red-600 shrink-0"
                      onClick={() => handleRemoveInputRow(index)}
                      title="Remove row"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={handleAddInputRow}
              className="w-full border-dashed text-primary hover:bg-primary/5 text-xs font-semibold h-9"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Another Category
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleBulkCreate} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Categories
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-indigo-600" />
              Edit Class Category
            </DialogTitle>
            <DialogDescription>
              Update the name of the class category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-sm font-medium text-slate-700">Category Name</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={isUpdating}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit()
              }}
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingCategory(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating || !editName.trim()}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
