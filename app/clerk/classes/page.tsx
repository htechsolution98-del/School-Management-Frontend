"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  School,
  Plus,
  Loader2,
  RefreshCw,
  Trash2,
  FolderOpen,
  MoveRight,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Eye,
  ArrowLeft,
  ArrowUpRight,
  Sparkles,
  CreditCard,
  FileCheck2,
  FileText,
  LayoutGrid,
  Table as TableIcon,
  X
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
import { apiFetch } from "@/lib/principal/helpers"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { backendMediaUrl } from "@/lib/media"
import { StudentProfileDrawer, type StudentProfileData } from "./StudentProfileDrawer"

function getStudentInitials(name?: string | null): string {
  if (!name || !name.trim()) return "ST"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, Math.min(2, parts[0].length)).toUpperCase()
  }
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function StudentTableAvatar({
  photoUrl,
  name,
}: {
  photoUrl?: string | null
  name?: string | null
}) {
  const [imageError, setImageError] = useState(false)
  const resolvedUrl = backendMediaUrl(photoUrl) || photoUrl || ""
  const initials = getStudentInitials(name)

  return (
    <Avatar className="w-9 h-9 border border-slate-200 dark:border-zinc-700 shadow-2xs">
      {!imageError && resolvedUrl ? (
        <AvatarImage
          src={resolvedUrl}
          alt={name || "Student"}
          onError={() => setImageError(true)}
          className="object-cover"
        />
      ) : null}
      <AvatarFallback className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs select-none">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export default function ClassesPage() {
  const [categories, setCategories] = useState<ClassCategory[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selected class for Student Inspection & Verification
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null)
  const [students, setStudents] = useState<StudentProfileData[]>([])
  const [isStudentsLoading, setIsStudentsLoading] = useState(false)
  const [viewingClassId, setViewingClassId] = useState<number | null>(null)
  const [studentSearch, setStudentSearch] = useState("")
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "pending">("all")

  // Drawer state for Student Profile Inspection
  const [inspectedStudentId, setInspectedStudentId] = useState<number | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // View mode (grid | table)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  // New Category dialog
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  // New Class dialog (Bulk creation)
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [classInputs, setClassInputs] = useState<{ name: string; rte_applicable: boolean }[]>([
    { name: "", rte_applicable: false }
  ])

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

  // Load students when a class is selected
  const loadClassStudents = async (classId: number) => {
    setIsStudentsLoading(true)
    try {
      const response = await apiFetch<any>(
        `/students/?class_id=${classId}`,
        {},
        "Failed to load students for this class."
      )
      // Safely extract students from raw array, paginated results, or data wrapper
      const studentList: StudentProfileData[] = Array.isArray(response)
        ? response
        : Array.isArray(response?.results)
        ? response.results
        : Array.isArray(response?.data)
        ? response.data
        : []
      setStudents(studentList)
    } catch (err: unknown) {
      console.error("Error loading students for class ID", classId, err)
      const message = err instanceof Error ? err.message : "Could not load class students"
      toast.error(message)
      setStudents([])
      throw err
    } finally {
      setIsStudentsLoading(false)
    }
  }

  const handleViewStudents = async (cls: SchoolClass) => {
    setViewingClassId(cls.id)
    try {
      // Toggle off if clicking the already selected class
      if (selectedClass?.id === cls.id) {
        setSelectedClass(null)
        setStudents([])
        return
      }

      setSelectedClass(cls)
      setStudentSearch("")
      setVerificationFilter("all")
      await loadClassStudents(cls.id)

      // Smooth scroll to the student roster panel
      if (typeof window !== "undefined") {
        setTimeout(() => {
          const el = document.getElementById("class-roster-section")
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        }, 80)
      }
    } catch (err: unknown) {
      console.error("Failed to view students for class:", cls, err)
      const message = err instanceof Error ? err.message : "Failed to load students for this class"
      toast.error(message)
    } finally {
      setViewingClassId(null)
    }
  }

  const handleSelectClass = handleViewStudents

  const handleStudentUpdated = (updated: StudentProfileData) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    )
  }

  const handleOpenStudentDrawer = (studentId: number) => {
    setInspectedStudentId(studentId)
    setIsDrawerOpen(true)
  }

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

  const handleOpenClassDialog = () => {
    setSelectedCategoryId("")
    setClassInputs([{ name: "", rte_applicable: false }])
    setIsClassDialogOpen(true)
  }

  const handleAddClassInputRow = () => {
    setClassInputs((prev) => [...prev, { name: "", rte_applicable: false }])
  }

  const handleRemoveClassInputRow = (index: number) => {
    if (classInputs.length <= 1) return
    setClassInputs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleClassInputChange = (
    index: number,
    field: "name" | "rte_applicable",
    value: string | boolean
  ) => {
    setClassInputs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const handleBulkCreateClasses = async () => {
    if (!selectedCategoryId) {
      toast.error("Please select a category")
      return
    }

    const validRows = classInputs.filter((row) => row.name.trim().length > 0)
    if (validRows.length === 0) {
      toast.error("Please enter at least one class name")
      return
    }

    setIsSaving(true)
    try {
      const catId = parseInt(selectedCategoryId)
      await Promise.all(
        validRows.map((row) =>
          saveSchoolClasses([
            {
              school_class: row.name.trim(),
              category: catId,
              is_rte_applicable: row.rte_applicable,
            },
          ])
        )
      )
      toast.success(
        `${validRows.length} ${
          validRows.length === 1 ? "class" : "classes"
        } created successfully`
      )
      setClassInputs([{ name: "", rte_applicable: false }])
      setSelectedCategoryId("")
      setIsClassDialogOpen(false)
      await fetchData()
    } catch {
      toast.error("Failed to create classes")
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
      if (selectedClass?.id === id) {
        setSelectedClass(null)
      }
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

  // Filter students based on search and verification status
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return []
    return students.filter((s) => {
      if (!s) return false
      // Verification status filter
      if (verificationFilter === "verified" && !s.is_verified) return false
      if (verificationFilter === "pending" && s.is_verified) return false

      // Search query filter
      if (!studentSearch.trim()) return true
      const q = studentSearch.toLowerCase()
      const matchName = s.full_name?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q) || s.surname?.toLowerCase().includes(q)
      const matchGr = s.gr_no?.toLowerCase().includes(q)
      const matchRoll = s.roll_no?.toLowerCase().includes(q)
      const matchAbc = s.abc_id?.toLowerCase().includes(q)
      const matchUdise = s.udise_no?.toLowerCase().includes(q)
      const matchAadhaar = s.aadhar_number?.toLowerCase().includes(q)

      return Boolean(matchName || matchGr || matchRoll || matchAbc || matchUdise || matchAadhaar)
    })
  }, [students, studentSearch, verificationFilter])

  // Counts for selected class
  const verifiedCount = useMemo(() => (Array.isArray(students) ? students.filter((s) => Boolean(s?.is_verified)).length : 0), [students])
  const pendingCount = useMemo(() => (Array.isArray(students) ? students.filter((s) => !s?.is_verified).length : 0), [students])
  const missingGovIdsCount = useMemo(() => (Array.isArray(students) ? students.filter((s) => !s?.abc_id || !s?.udise_no).length : 0), [students])

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 sm:pt-6 bg-slate-50/50 dark:bg-zinc-950 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2.5">
              <School className="h-7 w-7 text-primary shrink-0" />
              Class Management & Student Verification
            </h2>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage class structure, inspect enrolled student profiles, assign ABC ID / UDISE No, and verify documents.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Grid / Table View Toggle */}
          <div className="flex items-center rounded-lg border bg-slate-50 dark:bg-zinc-800 p-1">
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

          <Button variant="outline" onClick={fetchData} disabled={isLoading} size="sm">
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setIsCategoryDialogOpen(true)} size="sm" variant="secondary">
            <FolderOpen className="mr-2 h-4 w-4" />
            New Category
          </Button>
          <Button onClick={handleOpenClassDialog} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Class
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* SELECTED CLASS: STUDENT ROSTER & VERIFICATION PANEL */}
      {selectedClass && (
        <Card id="class-roster-section" className="border-indigo-200 dark:border-indigo-900 shadow-sm bg-white dark:bg-zinc-900 overflow-hidden animate-in fade-in duration-150 scroll-mt-6">
          <CardHeader className="bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 dark:from-indigo-950/40 dark:via-zinc-900 dark:to-zinc-900 border-b border-indigo-100 dark:border-indigo-950 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedClass(null)}
                  className="rounded-xl h-9 text-xs gap-1.5 shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  All Classes
                </Button>

                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      Class Roster: <span className="text-primary">{selectedClass.school_class}</span>
                    </CardTitle>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {students.length} Students
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Click &apos;View Profile&apos; on any student to review documents, academic records, or manage verification.
                  </CardDescription>
                </div>
              </div>

              {/* Class Selector Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap hidden sm:inline">
                  Switch Class:
                </span>
                <Select
                  value={selectedClass.id.toString()}
                  onValueChange={(val) => {
                    if (val) {
                      const target = classes.find((c) => c.id === parseInt(val))
                      if (target) handleSelectClass(target)
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px] h-9 text-xs bg-white dark:bg-zinc-800">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.school_class}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadClassStudents(selectedClass.id)}
                  disabled={isStudentsLoading}
                  className="h-9 px-2.5"
                  title="Refresh student list"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isStudentsLoading && "animate-spin")} />
                </Button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-indigo-100/70 dark:border-indigo-950/60">
              <div className="p-3 bg-white dark:bg-zinc-800/80 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">Total Enrolled</p>
                <p className="text-lg font-bold text-slate-900 dark:text-zinc-100">{students.length}</p>
              </div>

              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </p>
                <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{verifiedCount}</p>
              </div>

              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-2xs">
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Pending Verification
                </p>
                <p className="text-lg font-bold text-amber-800 dark:text-amber-300">{pendingCount}</p>
              </div>

              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-2xs">
                <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Missing APAAR/UDISE
                </p>
                <p className="text-lg font-bold text-indigo-800 dark:text-indigo-300">{missingGovIdsCount}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by student name, GR no, roll no, ABC ID..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-9 h-9 text-xs bg-slate-50/50 dark:bg-zinc-800/50"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                <button
                  onClick={() => setVerificationFilter("all")}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
                    verificationFilter === "all"
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  All ({students.length})
                </button>
                <button
                  onClick={() => setVerificationFilter("pending")}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
                    verificationFilter === "pending"
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  )}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setVerificationFilter("verified")}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
                    verificationFilter === "verified"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  )}
                >
                  Verified ({verifiedCount})
                </button>
              </div>
            </div>

            {/* Students Table */}
            {isStudentsLoading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-xs text-slate-400">Loading student records...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-14 text-center border-2 border-dashed rounded-xl border-slate-200 dark:border-zinc-800 space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                  {students.length === 0
                    ? `No students currently enrolled in ${selectedClass.school_class}.`
                    : "No students matching your search criteria."}
                </p>
                <p className="text-xs text-slate-400">
                  {students.length === 0
                    ? "Students admitted to this class will appear here for verification and profile management."
                    : "Try clearing search filters."}
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-zinc-800/60">
                    <TableRow>
                      <TableHead className="w-[50px] text-xs">Photo</TableHead>
                      <TableHead className="text-xs">Student Name & GR No</TableHead>
                      <TableHead className="text-xs">Roll & Div</TableHead>
                      <TableHead className="text-xs">Government IDs (ABC / UDISE)</TableHead>
                      <TableHead className="text-xs">Documents</TableHead>
                      <TableHead className="text-xs">Verification Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => {
                      const displayName = student.full_name || student.name || "Student"

                      return (
                        <TableRow
                          key={student.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          {/* Photo Avatar */}
                          <TableCell className="py-4">
                            <StudentTableAvatar
                              photoUrl={student.photo_url}
                              name={displayName}
                            />
                          </TableCell>

                          {/* Name & GR */}
                          <TableCell className="py-4">
                            <div className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">
                              {displayName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                              {student.gr_no ? (
                                <span className="font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.2 rounded text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                                  GR: {student.gr_no}
                                </span>
                              ) : (
                                <span className="italic text-slate-400">No GR</span>
                              )}
                              {student.is_rte && (
                                <Badge variant="outline" className="text-[10px] py-0 text-orange-600 border-orange-200">
                                  RTE
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Roll & Division */}
                          <TableCell className="py-4 text-xs">
                            <div className="font-medium text-slate-700 dark:text-zinc-300">
                              Roll: {student.roll_no || <span className="text-slate-400 italic">None</span>}
                            </div>
                            <div className="text-slate-500">
                              Div: {student.division || <span className="text-slate-400 italic">None</span>}
                            </div>
                          </TableCell>

                          {/* Government IDs */}
                          <TableCell className="py-4 text-xs space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase w-12">APAAR:</span>
                              {student.abc_id ? (
                                <span className="font-mono text-[11px] font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 border border-gray-200/80 dark:border-zinc-700 px-1.5 py-0.5 rounded">
                                  {student.abc_id}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 dark:text-zinc-500 italic">
                                  Not Added
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase w-12">UDISE:</span>
                              {student.udise_no ? (
                                <span className="font-mono text-[11px] font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 border border-gray-200/80 dark:border-zinc-700 px-1.5 py-0.5 rounded">
                                  {student.udise_no}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 dark:text-zinc-500 italic">
                                  Not Added
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Documents Count */}
                          <TableCell className="py-4 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400">
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              <span>{student.documents?.length || 0} Docs</span>
                            </div>
                          </TableCell>

                          {/* Verification Status */}
                          <TableCell className="py-4">
                            {student.is_verified ? (
                              <div className="space-y-0.5">
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1 font-semibold text-xs py-0.5">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Verified
                                </Badge>
                                {student.verified_by_name && (
                                  <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                    by {student.verified_by_name}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800 gap-1 font-semibold text-xs py-0.5"
                              >
                                <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Pending
                              </Badge>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-4 text-right">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs font-semibold h-8 rounded-lg border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors shadow-2xs"
                            >
                              <Link href={`/clerk/student-profiles/${student.id}`}>
                                View Profile
                                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CATEGORIES & CLASSES LISTING */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading classes & categories...</p>
        </div>
      ) : classes.length === 0 ? (
        /* Empty State: No classes created */
        <div className="text-center p-14 border-2 border-dashed rounded-2xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-2xs">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4 shadow-2xs">
            <School className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">No classes created yet</h3>
          <p className="text-slate-500 mt-1 text-sm max-w-sm mx-auto">
            Get started by organizing your school structure into categories and adding classes.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <Button variant="outline" size="sm" onClick={() => setIsCategoryDialogOpen(true)}>
              <FolderOpen className="mr-2 h-4 w-4" /> Create Category
            </Button>
            <Button size="sm" onClick={handleOpenClassDialog}>
              <Plus className="mr-2 h-4 w-4" /> Create Class
            </Button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Classes by Category
            </h3>
            <span className="text-xs text-slate-500">
              Select a class below to inspect students &amp; verify credentials
            </span>
          </div>

          <div className="grid gap-6">
            {categories.map((category) => (
              <Card key={category.id} className="overflow-hidden border-slate-200 dark:border-zinc-800">
                <CardHeader className="bg-slate-50/80 dark:bg-zinc-900/80 border-b flex flex-row items-center justify-between py-3.5 px-5">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-zinc-200">
                    <FolderOpen className="h-4.5 w-4.5 text-blue-500" />
                    {category.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 w-8 rounded-lg"
                    title="Delete category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>

                <CardContent className="p-4">
                  {getClassesForCategory(category.id).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {getClassesForCategory(category.id).map((cls) => {
                        const isSelected = selectedClass?.id === cls.id

                        return (
                          <div
                            key={cls.id}
                            className={cn(
                              "flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border rounded-xl shadow-2xs transition-all",
                              isSelected
                                ? "border-primary ring-2 ring-primary/20 bg-indigo-50/20 dark:bg-indigo-950/20"
                                : "border-slate-200 dark:border-zinc-800 hover:border-primary/50"
                            )}
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-slate-800 dark:text-zinc-200 text-sm block truncate">
                                {cls.school_class}
                              </span>
                              {cls.is_rte_applicable && (
                                <span className="text-[10px] font-semibold text-orange-600">RTE Eligible</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant={isSelected ? "default" : "secondary"}
                                className={cn(
                                  "h-7 text-xs px-2.5 font-semibold gap-1 rounded-lg transition-colors",
                                  !isSelected && "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100",
                                  isSelected && "bg-indigo-600 hover:bg-indigo-700 text-white"
                                )}
                                onClick={() => handleViewStudents(cls)}
                                disabled={viewingClassId === cls.id}
                              >
                                {viewingClassId === cls.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Viewing...
                                  </>
                                ) : isSelected ? (
                                  <>
                                    <Users className="h-3 w-3" />
                                    Viewing
                                  </>
                                ) : (
                                  <>
                                    <Users className="h-3 w-3" />
                                    Students
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                                onClick={() => handleDeleteClass(cls.id)}
                                title="Delete class"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs py-4 text-center">
                      No classes in this category yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}

            {uncategorizedClasses.length > 0 && (
              <Card className="border-orange-200 dark:border-orange-950">
                <CardHeader className="bg-orange-50/80 dark:bg-orange-950/30 border-b border-orange-100 dark:border-orange-900/40 py-3.5 px-5">
                  <CardTitle className="text-base font-bold text-orange-800 dark:text-orange-400">
                    Uncategorized Classes
                  </CardTitle>
                  <CardDescription className="text-xs">
                    These classes don&apos;t belong to any category. Click <strong>Assign</strong> to move them into a category.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {uncategorizedClasses.map((cls) => {
                      const isSelected = selectedClass?.id === cls.id
                      return (
                        <div
                          key={cls.id}
                          className={cn(
                            "flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border rounded-xl shadow-2xs transition-colors",
                            isSelected
                              ? "border-primary ring-2 ring-primary/20 bg-indigo-50/20 dark:bg-indigo-950/20"
                              : "border-orange-100 dark:border-orange-950 hover:border-orange-300"
                          )}
                        >
                          <span className="font-bold text-slate-800 dark:text-zinc-200 text-sm">
                            {cls.school_class}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant={isSelected ? "default" : "secondary"}
                              className={cn(
                                "h-7 text-xs px-2 font-semibold gap-1 rounded-lg transition-colors",
                                !isSelected && "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100",
                                isSelected && "bg-indigo-600 hover:bg-indigo-700 text-white"
                              )}
                              onClick={() => handleViewStudents(cls)}
                              disabled={viewingClassId === cls.id}
                            >
                              {viewingClassId === cls.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Viewing...
                                </>
                              ) : isSelected ? (
                                <>
                                  <Users className="h-3 w-3" />
                                  Viewing
                                </>
                              ) : (
                                <>
                                  <Users className="h-3 w-3" />
                                  Students
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-400 hover:text-blue-600 hover:bg-blue-50"
                              title="Assign to category"
                              onClick={() => openAssignDialog(cls)}
                            >
                              <MoveRight className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteClass(cls.id)}
                              title="Delete class"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* TABLE VIEW (Clean table with No raw database IDs displayed) */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              All Classes
            </h3>
            <span className="text-xs text-slate-500">
              Total {classes.length} {classes.length === 1 ? "class" : "classes"} registered
            </span>
          </div>

          <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs bg-white dark:bg-zinc-900">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-zinc-800/60">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Class Name</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Category</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 dark:text-zinc-300">RTE Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 dark:text-zinc-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => {
                  const isSelected = selectedClass?.id === cls.id
                  const categoryObj = categories.find((c) => c.id === cls.category)

                  return (
                    <TableRow
                      key={cls.id}
                      className={cn(
                        "hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors",
                        isSelected && "bg-indigo-50/40 dark:bg-indigo-950/20"
                      )}
                    >
                      <TableCell className="py-3 font-semibold text-slate-900 dark:text-zinc-100 text-sm">
                        <div className="flex items-center gap-2">
                          <School className="w-4 h-4 text-primary shrink-0" />
                          <span>{cls.school_class}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-xs">
                        {categoryObj ? (
                          <Badge
                            variant="secondary"
                            className="font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 gap-1"
                          >
                            <FolderOpen className="w-3 h-3 text-blue-500" />
                            {categoryObj.name}
                          </Badge>
                        ) : (
                          <span className="text-orange-600 dark:text-orange-400 font-medium text-xs">
                            Uncategorized
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-xs">
                        {cls.is_rte_applicable ? (
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 text-[11px] font-semibold"
                          >
                            RTE Eligible
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-xs">Not Applicable</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "secondary"}
                            className={cn(
                              "h-7 text-xs px-2.5 font-semibold gap-1 rounded-lg transition-colors",
                              !isSelected && "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100",
                              isSelected && "bg-indigo-600 hover:bg-indigo-700 text-white"
                            )}
                            onClick={() => handleViewStudents(cls)}
                            disabled={viewingClassId === cls.id}
                          >
                            {viewingClassId === cls.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Viewing...
                              </>
                            ) : isSelected ? (
                              <>
                                <Users className="h-3 w-3" />
                                Viewing
                              </>
                            ) : (
                              <>
                                <Users className="h-3 w-3" />
                                Students
                              </>
                            )}
                          </Button>

                          {!cls.category && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                              title="Assign to category"
                              onClick={() => openAssignDialog(cls)}
                            >
                              <MoveRight className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                            onClick={() => handleDeleteClass(cls.id)}
                            title="Delete class"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* SLIDE-OVER DRAWER FOR STUDENT PROFILE, DOCUMENTS & VERIFICATION */}
      <StudentProfileDrawer
        studentId={inspectedStudentId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          setInspectedStudentId(null)
        }}
        onStudentUpdated={handleStudentUpdated}
      />

      {/* New Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Class Category</DialogTitle>
            <DialogDescription>
              A category groups related classes together (e.g. Nursery, Primary, High School).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <label className="text-sm font-medium">Category Name</label>
            <Input
              placeholder="e.g. Primary, Secondary"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={isSaving || !newCategoryName.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Class Dialog (Supports Bulk Creation) */}
      <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              Create Classes
            </DialogTitle>
            <DialogDescription>
              Select a category and add one or multiple classes to it at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Category Dropdown (displays category.name while binding category.id) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                Category
              </label>
              <Select
                value={selectedCategoryId}
                onValueChange={(val) => setSelectedCategoryId(val || "")}
                disabled={isSaving}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Select a category">
                    {categories.find((cat) => cat.id.toString() === selectedCategoryId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Dynamic Class Input Rows */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                Class List
              </label>

              <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
                {classInputs.map((input, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={`Class name (e.g. Class ${index + 1})`}
                        value={input.name}
                        disabled={isSaving}
                        onChange={(e) => handleClassInputChange(index, "name", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (index === classInputs.length - 1) {
                              handleAddClassInputRow()
                            } else {
                              handleBulkCreateClasses()
                            }
                          }
                        }}
                        autoFocus={index === classInputs.length - 1}
                        className="h-9 text-sm bg-white dark:bg-zinc-900"
                      />

                      {classInputs.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isSaving}
                          className="h-9 w-9 text-slate-400 hover:text-red-600 shrink-0"
                          onClick={() => handleRemoveClassInputRow(index)}
                          title="Remove row"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 pl-1">
                      <input
                        type="checkbox"
                        id={`rteApplicable-${index}`}
                        checked={input.rte_applicable}
                        disabled={isSaving}
                        onChange={(e) =>
                          handleClassInputChange(index, "rte_applicable", e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label
                        htmlFor={`rteApplicable-${index}`}
                        className="text-xs font-medium text-slate-600 dark:text-zinc-300 cursor-pointer select-none"
                      >
                        RTE (Right to Education) Eligible
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSaving}
                onClick={handleAddClassInputRow}
                className="w-full border-dashed text-primary hover:bg-primary/5 text-xs font-semibold h-9 mt-2"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Another Class
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsClassDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkCreateClasses}
              disabled={isSaving || !selectedCategoryId}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Classes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Category Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Category</DialogTitle>
            <DialogDescription>
              Assign <strong>&quot;{assignTarget?.school_class}&quot;</strong> to a category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <label className="text-sm font-medium">Category</label>
            <Select value={assignCategoryId} onValueChange={(val) => setAssignCategoryId(val || "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category">
                  {categories.find((cat) => cat.id.toString() === assignCategoryId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
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
