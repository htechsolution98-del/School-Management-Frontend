"use client"

import { useEffect, useState } from "react"
import {
  School,
  Plus,
  Loader2,
  RefreshCw,
  Trash2,
  FolderOpen,
  MoveRight
} from "lucide-react"
import { toast } from "sonner"

import { 
  getSchoolClasses, 
  saveSchoolClasses, 
  deleteSchoolClass, 
  getClassCategories,
  createClassCategory,
  deleteClassCategory,
  assignClassCategory,
  type SchoolClass,
  type ClassCategory
} from "@/lib/principal"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ClassesPage() {
  const [categories, setCategories] = useState<ClassCategory[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New Category dialog
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  // New Class dialog
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false)
  const [newClassName, setNewClassName] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")

  // Assign category dialog (for legacy classes)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState<SchoolClass | null>(null)
  const [assignCategoryId, setAssignCategoryId] = useState<string>("")

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [cats, cls] = await Promise.all([
        getClassCategories(),
        getSchoolClasses()
      ])
      setCategories(cats)
      setClasses(cls)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
      toast.error("Could not load categories or classes")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    setIsSaving(true)
    try {
      await createClassCategory(newCategoryName.trim())
      toast.success("Category created successfully")
      setNewCategoryName("")
      setIsCategoryDialogOpen(false)
      await fetchData()
    } catch {
      toast.error("Failed to create category")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddClass = async () => {
    if (!newClassName.trim() || !selectedCategoryId) {
      toast.error("Please enter a class name and select a category")
      return
    }
    setIsSaving(true)
    try {
      await saveSchoolClasses([{
        school_class: newClassName.trim(),
        category: parseInt(selectedCategoryId)
      }])
      toast.success("Class created successfully")
      setNewClassName("")
      setIsClassDialogOpen(false)
      await fetchData()
    } catch {
      toast.error("Failed to create class")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Are you sure? This will delete the category and may affect its classes.")) return
    try {
      await deleteClassCategory(id)
      toast.success("Category deleted")
      await fetchData()
    } catch {
      toast.error("Failed to delete category")
    }
  }

  const handleDeleteClass = async (id: number) => {
    if (!confirm("Are you sure you want to delete this class?")) return
    try {
      await deleteSchoolClass(id)
      toast.success("Class deleted")
      await fetchData()
    } catch {
      toast.error("Failed to delete class")
    }
  }

  const openAssignDialog = (cls: SchoolClass) => {
    setAssignTarget(cls)
    setAssignCategoryId("")
    setIsAssignDialogOpen(true)
  }

  const handleAssignCategory = async () => {
    if (!assignTarget || !assignCategoryId) return
    setIsSaving(true)
    try {
      await assignClassCategory(assignTarget.id, parseInt(assignCategoryId))
      toast.success(`"${assignTarget.school_class}" assigned to category`)
      setIsAssignDialogOpen(false)
      setAssignTarget(null)
      await fetchData()
    } catch {
      toast.error("Failed to assign category")
    } finally {
      setIsSaving(false)
    }
  }

  const getClassesForCategory = (categoryId: number) =>
    classes.filter(c => c.category === categoryId)

  const uncategorizedClasses = classes.filter(c => !c.category)

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-8 sm:pt-6 bg-white min-h-screen">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <School className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            Class Management
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Create and organize categories and classes for your school.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchData} disabled={isLoading} size="sm">
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setIsCategoryDialogOpen(true)} size="sm" variant="secondary">
            <FolderOpen className="mr-2 h-4 w-4" />
            New Category
          </Button>
          <Button onClick={() => setIsClassDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Class
          </Button>
        </div>
      </div>

      <Separator />

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6">
          {categories.map(category => (
            <Card key={category.id}>
              <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-blue-500" />
                  {category.name}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)} className="text-red-500 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                {getClassesForCategory(category.id).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {getClassesForCategory(category.id).map(cls => (
                      <div key={cls.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm hover:border-primary/50 transition-colors">
                        <span className="font-medium text-slate-700">{cls.school_class}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteClass(cls.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-4 text-center">No classes in this category yet.</p>
                )}
              </CardContent>
            </Card>
          ))}

          {categories.length === 0 && uncategorizedClasses.length === 0 && (
            <div className="text-center p-12 border-2 border-dashed rounded-lg bg-slate-50">
              <School className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-900">No classes found</h3>
              <p className="text-slate-500 mt-1">Get started by creating a class category.</p>
              <Button className="mt-4" onClick={() => setIsCategoryDialogOpen(true)}>
                <FolderOpen className="mr-2 h-4 w-4" /> Create Category
              </Button>
            </div>
          )}

          {uncategorizedClasses.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader className="bg-orange-50 border-b py-4">
                <CardTitle className="text-lg text-orange-700">Uncategorized Classes</CardTitle>
                <CardDescription>
                  These classes don't belong to any category. Click <strong>Assign</strong> to move them into a category.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {uncategorizedClasses.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-3 bg-white border border-orange-100 rounded-lg shadow-sm hover:border-orange-300 transition-colors">
                      <span className="font-medium text-slate-700">{cls.school_class}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-600 hover:bg-blue-50" title="Assign to category" onClick={() => openAssignDialog(cls)}>
                          <MoveRight className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteClass(cls.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* New Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Class Category</DialogTitle>
            <DialogDescription>
              A category groups related classes together (e.g. Nursery, Primary).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <label className="text-sm font-medium">Category Name</label>
            <Input
              placeholder="e.g. Pre-Primary"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory() }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCategory} disabled={isSaving || !newCategoryName.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Class Dialog */}
      <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>Add a new class to an existing category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Category</label>
              <Select value={selectedCategoryId} onValueChange={(val) => setSelectedCategoryId(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Class Name</label>
              <Input
                placeholder="e.g. Standard 1, LKG"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddClass() }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClassDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClass} disabled={isSaving || !newClassName.trim() || !selectedCategoryId}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Category Dialog (for legacy uncategorized classes) */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Category</DialogTitle>
            <DialogDescription>
              Assign <strong>"{assignTarget?.school_class}"</strong> to a category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <label className="text-sm font-medium">Select Category</label>
            <Select value={assignCategoryId} onValueChange={(val) => setAssignCategoryId(val ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignCategory} disabled={isSaving || !assignCategoryId}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
