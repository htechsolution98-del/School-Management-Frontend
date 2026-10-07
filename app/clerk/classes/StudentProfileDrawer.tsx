"use client"

import { useEffect, useState } from "react"
import {
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  FileText,
  ExternalLink,
  Eye,
  Loader2,
  Save,
  User,
  Phone,
  Mail,
  Calendar,
  Hash,
  CreditCard,
  Building,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/principal/helpers"
import Link from "next/link"
import { aadhaarSchema, AADHAAR_ERROR } from "@/lib/student-profile-validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { formatDDMMYYYY } from "@/lib/table-utils"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { StudentProfileData, StudentDocumentItem } from "@/types/student-profile"
import { getDocumentBlob, openAuthenticatedDocument } from "@/lib/document-viewer"
export type { StudentProfileData, StudentDocumentItem } from "@/types/student-profile"

interface StudentProfileDrawerProps {
  studentId: number | null
  isOpen: boolean
  onClose: () => void
  onStudentUpdated?: (updated: StudentProfileData) => void
}

export function StudentProfileDrawer({
  studentId,
  isOpen,
  onClose,
  onStudentUpdated,
}: StudentProfileDrawerProps) {
  const [student, setStudent] = useState<StudentProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [activeTab, setActiveTab] = useState<"details" | "documents">("details")

  // Click-to-enlarge document preview state
  const [previewDoc, setPreviewDoc] = useState<{
    url: string
    title: string
    rawUrl?: string
    isImage?: boolean
  } | null>(null)
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | number | null>(null)

  const handlePreview = async (doc: any) => {
    const docUrl = doc.url || doc.file_url
    if (!docUrl) return
    const title = doc.label || doc.title || "Document Preview"
    const isImg = isImageFile(docUrl)

    if (isImg) {
      setPreviewDoc({ url: docUrl, title, rawUrl: docUrl, isImage: true })
      return
    }

    setLoadingPreviewId(doc.id)
    try {
      const { objectUrl, isImage } = await getDocumentBlob(docUrl, docUrl)
      setPreviewDoc({ url: objectUrl, title, rawUrl: docUrl, isImage })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load document"
      toast.error(message)
    } finally {
      setLoadingPreviewId(null)
    }
  }

  // Editable Form State
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    father_name: "",
    mother_name: "",
    date_of_birth: "",
    mobile: "",
    division: "",
    roll_no: "",
    aadhar_number: "",
    abc_id: "",
    udise_no: "",
  })

  // Load student profile whenever drawer opens
  useEffect(() => {
    if (isOpen && studentId) {
      loadStudentProfile(studentId)
    } else if (!isOpen) {
      setStudent(null)
      setPreviewDoc(null)
    }
  }, [isOpen, studentId])

  const loadStudentProfile = async (id: number) => {
    setIsLoading(true)
    try {
      const data = await apiFetch<StudentProfileData>(
        `/students/${id}/`,
        {},
        "Failed to load student profile."
      )
      setStudent(data)
      setFormData({
        name: data.name || "",
        surname: data.surname || "",
        father_name: data.father_name || "",
        mother_name: data.mother_name || "",
        date_of_birth: data.date_of_birth || "",
        mobile: data.mobile || "",
        division: data.division || "",
        roll_no: data.roll_no || "",
        aadhar_number: data.aadhar_number || "",
        abc_id: data.abc_id || "",
        udise_no: data.udise_no || "",
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load student details"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveChanges = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!student) return

    if (!aadhaarSchema.safeParse(formData.aadhar_number).success) { toast.error(AADHAAR_ERROR); return }
    setIsSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        father_name: formData.father_name.trim(),
        mother_name: formData.mother_name.trim(),
        date_of_birth: formData.date_of_birth || null,
        mobile: formData.mobile.trim(),
        division: formData.division.trim(),
        roll_no: formData.roll_no.trim(),
        aadhar_number: formData.aadhar_number.trim(),
        abc_id: formData.abc_id.trim() || null,
        udise_no: formData.udise_no.trim() || null,
      }

      const updated = await apiFetch<StudentProfileData>(
        `/students/${student.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        "Failed to update student details."
      )

      setStudent(updated)
      toast.success("Student details updated successfully")
      onStudentUpdated?.(updated)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save changes"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleVerification = async (verifyStatus: boolean) => {
    if (!student) return

    setIsVerifying(true)
    try {
      const updated = await apiFetch<StudentProfileData>(
        `/students/${student.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_verified: verifyStatus }),
        },
        verifyStatus
          ? "Failed to verify student documents."
          : "Failed to update verification status."
      )

      setStudent(updated)
      toast.success(
        verifyStatus
          ? "Student documents verified & approved successfully!"
          : "Student status reverted to pending verification."
      )
      onStudentUpdated?.(updated)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error updating verification status"
      toast.error(message)
    } finally {
      setIsVerifying(false)
    }
  }

  if (!isOpen) return null

  const isImageFile = (url: string | null) => {
    if (!url) return false
    return /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(url)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-2xl bg-white dark:bg-zinc-950 shadow-2xl flex flex-col border-l border-slate-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            {/* Student Photo / Avatar */}
            <div className="relative shrink-0">
              {student?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.photo_url}
                  alt={student.full_name || "Student"}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-zinc-800 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-primary text-white font-bold text-xl flex items-center justify-center shadow-md">
                  {student?.name?.charAt(0)?.toUpperCase() || "S"}
                </div>
              )}
              {student && (
                <div
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center ${student.is_verified ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                    }`}
                  title={student.is_verified ? "Verified Student" : "Pending Verification"}
                >
                  {student.is_verified ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                  )}
                </div>
              )}
            </div>

            {/* Student Identity */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-100 truncate">
                  {student?.full_name || (isLoading ? "Loading student..." : "Student Profile")}
                </h3>

                {student && (
                  <Badge
                    variant={student.is_verified ? "default" : "secondary"}
                    className={
                      student.is_verified
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-semibold gap-1"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-semibold gap-1"
                    }
                  >
                    {student.is_verified ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5" /> Pending Verification
                      </>
                    )}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-zinc-400 flex-wrap">
                {student?.gr_no && (
                  <span className="font-mono bg-slate-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    GR: {student.gr_no}
                  </span>
                )}
                {student?.class_name && (
                  <span>
                    Class: <strong className="text-slate-700 dark:text-zinc-200">{student.class_name}</strong>
                  </span>
                )}
                {student?.division && (
                  <span>
                    Div: <strong className="text-slate-700 dark:text-zinc-200">{student.division}</strong>
                  </span>
                )}
                {student?.roll_no && (
                  <span>
                    Roll: <strong className="text-slate-700 dark:text-zinc-200">{student.roll_no}</strong>
                  </span>
                )}
              </div>

              {student?.is_verified && student.verified_by_name && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified by {student.verified_by_name}
                  {student.verified_at &&
                    ` on ${formatDDMMYYYY(student.verified_at)}`}
                </p>
              )}
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 shrink-0"
          >
            <X className="w-5 h-5 text-slate-500" />
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-zinc-800 px-6 bg-white dark:bg-zinc-950">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "details"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
          >
            <User className="w-4 h-4" />
            Profile & Government IDs
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "documents"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
          >
            <FileText className="w-4 h-4" />
            Cloudinary Documents ({student?.documents?.length || 0})
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading student profile details...</p>
            </div>
          ) : !student ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              Student information not found.
            </div>
          ) : activeTab === "details" ? (
            /* TAB 1: PROFILE & GOVERNMENT IDS */
            <form onSubmit={handleSaveChanges} className="space-y-6">
              {/* Highlighted Government IDs Card */}
              <div className="p-4 sm:p-5 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/70 to-slate-50 dark:from-indigo-950/20 dark:to-zinc-900 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm font-bold uppercase tracking-wider">
                    Government Identification & National Registries
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ABC ID / APAAR ID */}
                  <div className="space-y-1.5 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-indigo-200/80 dark:border-indigo-900 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="abc_id" className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        ABC ID (APAAR ID)
                      </Label>
                      <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-200">
                        Higher Edu / APAAR
                      </Badge>
                    </div>
                    <Input
                      id="abc_id"
                      placeholder="e.g. 1234-5678-9012"
                      value={formData.abc_id}
                      onChange={(e) => handleInputChange("abc_id", e.target.value)}
                      className="font-mono text-sm bg-indigo-50/30 dark:bg-zinc-800/50 border-indigo-200 dark:border-indigo-900"
                    />
                    <p className="text-[10px] text-slate-500">
                      Automated Permanent Academic Account Registry identifier.
                    </p>
                  </div>

                  {/* UDISE Number (PEN) */}
                  <div className="space-y-1.5 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-indigo-200/80 dark:border-indigo-900 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="udise_no" className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        UDISE Number (PEN)
                      </Label>
                      <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-200">
                        UDISE+ PEN
                      </Badge>
                    </div>
                    <Input
                      id="udise_no"
                      placeholder="e.g. PEN2023987654"
                      value={formData.udise_no}
                      onChange={(e) => handleInputChange("udise_no", e.target.value)}
                      className="font-mono text-sm bg-indigo-50/30 dark:bg-zinc-800/50 border-indigo-200 dark:border-indigo-900"
                    />
                    <p className="text-[10px] text-slate-500">
                      Permanent Education Number issued via UDISE+ database.
                    </p>
                  </div>
                </div>

                {/* Aadhaar Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="aadhar_number" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Aadhaar Number
                  </Label>
                  <Input
                    id="aadhar_number"
                    placeholder="12-digit Aadhaar Number"
                    value={formData.aadhar_number}
                    onChange={(e) => handleInputChange("aadhar_number", e.target.value)}
                    maxLength={12}
                    inputMode="numeric"
                    className="font-mono text-sm bg-white dark:bg-zinc-900"
                  />
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" /> Personal Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-medium">First Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="surname" className="text-xs font-medium">Surname</Label>
                    <Input
                      id="surname"
                      value={formData.surname}
                      onChange={(e) => handleInputChange("surname", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="father_name" className="text-xs font-medium">Father&apos;s Name</Label>
                    <Input
                      id="father_name"
                      value={formData.father_name}
                      onChange={(e) => handleInputChange("father_name", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mother_name" className="text-xs font-medium">Mother&apos;s Name</Label>
                    <Input
                      id="mother_name"
                      value={formData.mother_name}
                      onChange={(e) => handleInputChange("mother_name", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="date_of_birth" className="text-xs font-medium">Date of Birth</Label>
                    <DatePicker
                      id="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={date => handleInputChange("date_of_birth", date)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mobile" className="text-xs font-medium">Mobile Number</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="Primary contact number"
                      value={formData.mobile}
                      onChange={(e) => handleInputChange("mobile", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Academic Placement */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-primary" /> Academic Placement
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="division" className="text-xs font-medium">Division</Label>
                    <Input
                      id="division"
                      placeholder="e.g. A, B"
                      value={formData.division}
                      onChange={(e) => handleInputChange("division", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="roll_no" className="text-xs font-medium">Roll Number</Label>
                    <Input
                      id="roll_no"
                      placeholder="e.g. 15"
                      value={formData.roll_no}
                      onChange={(e) => handleInputChange("roll_no", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-500">RTE Status</Label>
                    <div className="pt-2">
                      <Badge variant={student.is_rte ? "default" : "outline"} className="text-xs">
                        {student.is_rte ? "RTE Enrolled" : "General"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={isSaving} className="w-full sm:w-auto gap-2">
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            /* TAB 2: CLOUDINARY DOCUMENTS PREVIEW */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" /> Verified Cloudinary Documents
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Inspect uploaded student credentials (Aadhaar, Birth Certificate, etc.)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadStudentProfile(student.id)}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reload Docs
                </Button>
              </div>

              {(!student.documents || student.documents.length === 0) ? (
                <div className="py-12 border-2 border-dashed rounded-xl border-slate-200 dark:border-zinc-800 text-center space-y-2 bg-slate-50 dark:bg-zinc-900/50">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                    No documents uploaded yet
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    This student does not have any attached admission or student documents in Cloudinary storage.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {student.documents.map((doc) => {
                    const docUrl = doc.url || doc.file_url
                    const isImg = isImageFile(docUrl)

                    return (
                      <div
                        key={doc.id}
                        className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-2xs hover:border-primary/50 transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Thumbnail / File Icon */}
                          <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 shrink-0 flex items-center justify-center overflow-hidden">
                            {isImg && docUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={docUrl}
                                alt={doc.label}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => setPreviewDoc({ url: docUrl, title: doc.label })}
                              />
                            ) : (
                              <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                              {doc.label || doc.title}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {doc.type === "ADMISSION_DOCUMENT"
                                ? "Admission Upload"
                                : "Student Document"}
                            </p>
                            {doc.uploaded_at && (
                              <p className="text-[10px] text-slate-400">
                                {formatDDMMYYYY(doc.uploaded_at)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Document Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                          {docUrl ? (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 flex-1 text-xs gap-1.5"
                                disabled={loadingPreviewId === doc.id}
                                onClick={() => handlePreview(doc)}
                              >
                                {loadingPreviewId === doc.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                                Preview
                              </Button>

                              <button
                                type="button"
                                onClick={() =>
                                  openAuthenticatedDocument(
                                    docUrl,
                                    doc.label || doc.title,
                                    docUrl
                                  )
                                }
                                className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-medium cursor-pointer"
                                title="Open in new window"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No file URL available</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer with Primary Verification Action */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto">
            {student?.is_verified ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Student is fully verified
              </span>
            ) : (
              <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Pending verification of documents
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {student && <Link href={`/clerk/student-profiles/${student.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-indigo-600 dark:border-zinc-700 dark:text-indigo-300">Full Student 360</Link>}
            <Button variant="outline" onClick={onClose} size="sm">
              Close
            </Button>

            {student && (
              <>
                {student.is_verified ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isVerifying}
                    onClick={() => handleToggleVerification(false)}
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                  >
                    {isVerifying && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Revoke Verification
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={isVerifying}
                    onClick={() => handleToggleVerification(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
                  >
                    {isVerifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    Verify Student Documents
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Click-to-Enlarge Lightbox / Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl sm:max-w-4xl p-0 overflow-hidden bg-slate-950 text-white border-slate-800">
          <DialogHeader className="p-4 bg-slate-900 border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {previewDoc?.title || "Document Preview"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Cloudinary High-Resolution Document Inspection
              </DialogDescription>
            </div>
            {previewDoc && (
              <button
                type="button"
                onClick={() =>
                  openAuthenticatedDocument(
                    previewDoc.rawUrl || previewDoc.url,
                    previewDoc.title,
                    previewDoc.rawUrl || previewDoc.url
                  )
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Direct Link
              </button>
            )}
          </DialogHeader>

          <div className="p-4 flex items-center justify-center min-h-[400px] max-h-[75vh] overflow-auto bg-slate-950">
            {previewDoc && (previewDoc.isImage ?? isImageFile(previewDoc.rawUrl || previewDoc.url)) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewDoc.url}
                alt={previewDoc.title}
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
              />
            ) : previewDoc?.url ? (
              <iframe
                src={previewDoc.url}
                title={previewDoc.title}
                className="w-full h-[65vh] rounded-lg border border-slate-800 bg-white"
              />
            ) : null}
          </div>

          <DialogFooter className="p-3 bg-slate-900 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewDoc(null)}
              className="text-slate-300 border-slate-700 hover:bg-slate-800"
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
