"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Plus,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  Users,
  BookOpen,
  Bus,
  Wallet,
  Boxes,
  Trash2,
} from "lucide-react"

import { AdminButton as Button } from "@/components/superadmin/admin-button"
import { StatusBadge } from "@/components/superadmin/status-badge"
import {
  getFeatures,
  createFeature,
  deleteFeature,
  updateFeatureActivity,
} from "@/lib/superadmin"
import { useConfirm } from "@/components/providers/confirm-provider"
import type { FeatureType } from "@/types"

const SCHOOL_FEATURES = [
  {
    code: "TEACHER",
    label: "Teacher",
    icon: GraduationCap,
  },
  {
    code: "CLERK",
    label: "Clerk",
    icon: Users,
  },
  {
    code: "LIBRARIAN",
    label: "Librarian",
    icon: BookOpen,
  },
  {
    code: "FEE_MANAGEMENT",
    label: "Fees Management",
    icon: Wallet,
  },
  {
    code: "PRINCIPAL",
    label: "Principal",
    icon: ShieldCheck,
  },
  {
    code: "VICE_PRINCIPAL",
    label: "Vice Principal",
    icon: ShieldCheck,
  },
  {
    code: "ASSISTANT_CLERK",
    label: "Assistant Clerk",
    icon: Users,
  },
  {
    code: "TRANSPORTATION",
    label: "Transportation",
    icon: Bus,
  },
  {
    code: "INVENTORY",
    label: "Inventory",
    icon: Boxes,
  },
]

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  TEACHER: "Classroom, attendance and student progress",
  CLERK: "Admissions and student records",
  LIBRARIAN: "Library catalog and book circulation",
  FEE_MANAGEMENT: "Student fees, payments and receipts",
  PRINCIPAL: "School administration and academic oversight",
  VICE_PRINCIPAL: "Academic coordination and school operations",
  ASSISTANT_CLERK: "Support for admissions and office tasks",
  TRANSPORTATION: "Transport routes and student travel",
  INVENTORY: "School assets, stock and procurement",
}

// ================= PAGE =================

export default function FeaturesManagerPage() {
  const confirm = useConfirm()
  const [features, setFeatures] = useState<FeatureType[]>([])
  const [selectedFeature, setSelectedFeature] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [busyFeatureId, setBusyFeatureId] = useState<number | null>(null)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  // ================= FETCH FEATURES =================

  const fetchFeatures = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const data = await getFeatures()

      setFeatures(data)
    } catch (err: any) {
      setError(err.message || "Failed to load features")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeatures()
  }, [fetchFeatures])

  // ================= CREATE FEATURE =================

  const handleCreateFeature = async () => {

    const allAdded = SCHOOL_FEATURES.every((item) =>
      features.some(
        (feature) => feature.name.toLowerCase() === item.label.toLowerCase()
      )
    )

    if (allAdded) {
      setError("All features are already created")
      return
    }

    if (!selectedFeature) {
      setError("Please select a feature")
      return
    }

    const featureData = SCHOOL_FEATURES.find(
      (item) => item.code === selectedFeature
    )

    if (!featureData) {
      setError("Invalid feature selected")
      return
    }

    const alreadyExists = features.some(
      (feature) =>
        feature.name.toLowerCase() ===
        featureData.label.toLowerCase()
    )

    if (alreadyExists) {
      setError("Feature already exists")
      return
    }

    setSubmitting(true)
    setError("")
    setSuccess("")

    try {
      await createFeature({
        name: featureData.label.toUpperCase(),
      })

      setSuccess(
        `${featureData.label} feature created successfully`
      )

      setTimeout(() => {
        setSuccess("")
      }, 2000)

      setSelectedFeature("")

      await fetchFeatures()

    } catch (err: any) {
      setError(
        err.message || "Failed to create feature"
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (feature: FeatureType) => {
    if (busyFeatureId !== null) return
    setBusyFeatureId(feature.id)
    setError("")
    setSuccess("")
    try {
      const updated = await updateFeatureActivity(feature.id, !(feature.is_active ?? true))
      setFeatures(current => current.map(item => item.id === updated.id ? updated : item))
      setSuccess(`${feature.name} ${updated.is_active ? "activated" : "deactivated"} successfully.`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update feature status.")
    } finally {
      setBusyFeatureId(null)
    }
  }

  const handleDelete = async (feature: FeatureType) => {
    if (busyFeatureId !== null) return
    if (!(await confirm(`Delete ${feature.name}? This removes its school assignments and associated modules. Use the switch to temporarily deactivate it instead.`))) return
    setBusyFeatureId(feature.id)
    setError("")
    setSuccess("")
    try {
      await deleteFeature(feature.id)
      setFeatures(current => current.filter(item => item.id !== feature.id))
      setSuccess(`${feature.name} deleted successfully.`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete feature.")
    } finally {
      setBusyFeatureId(null)
    }
  }

  return (
    <div className="w-full space-y-6">

      {/* ================= HEADER ================= */}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-600">
              System Modules
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl tracking-tight">
            School Features
          </h1>

          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage school system features and module permissions.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchFeatures}
          disabled={loading || submitting || busyFeatureId !== null}
          className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* ================= ALERTS ================= */}

      <AnimatePresence>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
          >
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.div>
        )}

      </AnimatePresence>

      {/* ================= CREATE FEATURE ================= */}

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">

        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="h-5 w-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            Add Feature
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {SCHOOL_FEATURES.map((item) => {
            const Icon = item.icon

            const isSelected = selectedFeature === item.code

            const alreadyExists = features.some(
              (feature) =>
                feature.name.toLowerCase() ===
                item.label.toLowerCase()
            )


            return (
              <motion.button
                whileTap={{ scale: alreadyExists ? 1 : 0.98 }}
                key={item.code}
                disabled={alreadyExists}
                onClick={() => {
                  if (!alreadyExists) {
                    setSelectedFeature(item.code)
                  }
                }}
                className={`border rounded-xl p-5 text-left transition-all
                  ${alreadyExists
                    ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-70"
                    : isSelected
                      ? "border-[#1D496C] bg-slate-50"
                      : "border-slate-200 hover:border-slate-200 hover:bg-slate-50"
                  }
                `}
              >
                <div className="flex items-center gap-3">

                  <div
                    className={`h-11 w-11 rounded-xl flex items-center justify-center
                    ${alreadyExists
                        ? "bg-[#1D496C] text-white"
                        : isSelected
                          ? "bg-[#1D496C] text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-800">
                      {item.label}
                    </h3>

                    <p className="text-xs text-slate-400 mt-1">
                      {item.code}
                    </p>
                  </div>

                  {alreadyExists && (
                    <StatusBadge label="Added" />
                  )}

                </div>
              </motion.button>
            )
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleCreateFeature}
            disabled={loading || submitting || busyFeatureId !== null}

          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Feature
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ================= FEATURES LIST ================= */}

      <section aria-labelledby="active-features-title" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <h2 id="active-features-title" className="text-base font-semibold text-slate-900">Feature Controls</h2>
            <p className="mt-1 text-sm text-slate-500">Manage availability across all schools.</p>
          </div>
          {!loading && <span className="text-xs font-medium tabular-nums text-slate-500">{features.filter(feature => feature.is_active ?? true).length} active ? {features.length} total</span>}
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
            <p className="text-sm text-slate-400 mt-2">
              Loading features...
            </p>
          </div>
        ) : features.length === 0 ? (
          <div className="py-16 text-center">
            <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">
              No features created yet
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
            {features.map(feature => {
              const definition = SCHOOL_FEATURES.find(item => item.label.toLowerCase().replace(/[^a-z]/g, "") === feature.name.toLowerCase().replace(/[^a-z]/g, ""))
              const Icon = definition?.icon ?? Sparkles
              const active = feature.is_active ?? true
              const busy = busyFeatureId === feature.id
              return <li key={feature.id} className="flex flex-col rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
                <div className="flex items-center justify-between gap-3 px-5 pt-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <StatusBadge active={active} />
                </div>
                <div className="flex-1 px-5 pb-5 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900">{definition?.label ?? feature.name}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{definition ? FEATURE_DESCRIPTIONS[definition.code] : "Available for assigned schools"}</p>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <button type="button" role="switch" aria-checked={active} aria-label={`${active ? "Deactivate" : "Activate"} ${feature.name}`} aria-busy={busy} onClick={() => handleToggle(feature)} disabled={busyFeatureId !== null || submitting} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D496C] disabled:cursor-wait disabled:opacity-60 ${active ? "bg-[#1D496C]" : "bg-slate-300"}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${active ? "translate-x-5" : "translate-x-0.5"}`}>{busy && <Loader2 className="h-3 w-3 animate-spin text-slate-500" />}</span>
                    </button>
                    <span className="text-xs font-medium text-slate-600">{active ? "Enabled" : "Disabled"}</span>
                  </div>
                  <button type="button" onClick={() => handleDelete(feature)} disabled={busyFeatureId !== null || submitting} aria-label={`Delete ${feature.name} feature`} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                </div>
              </li>
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
