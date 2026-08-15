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
  Power,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  getFeatures,
  createFeature,
  deleteFeature,
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

// ================= PAGE =================

export default function FeaturesManagerPage() {
  const confirm = useConfirm()
  const [features, setFeatures] = useState<FeatureType[]>([])
  const [selectedFeature, setSelectedFeature] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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

  const handleDeactivate = async (id: number) => {
    if (!(await confirm("Are you sure you want to deactivate and remove this feature? This might affect schools currently using it."))) {
      return
    }

    try {
      setLoading(true)
      await deleteFeature(id)
      setSuccess("Feature deactivated successfully.")
      setTimeout(() => setSuccess(""), 2000)
      await fetchFeatures()
    } catch (err: any) {
      setError(err.message || "Failed to deactivate feature.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ================= HEADER ================= */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            School Features
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Manage school system features and modules.
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={fetchFeatures}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* ================= ALERTS ================= */}

      <AnimatePresence>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
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

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="h-5 w-5 text-violet-600" />
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
                className={`border rounded-2xl p-5 text-left transition-all
                  ${alreadyExists
                    ? "border-emerald-200 bg-emerald-50 cursor-not-allowed opacity-70"
                    : isSelected
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 hover:border-violet-300 hover:bg-slate-50"
                  }
                `}
              >
                <div className="flex items-center gap-3">

                  <div
                    className={`h-11 w-11 rounded-xl flex items-center justify-center
                    ${alreadyExists
                        ? "bg-emerald-600 text-white"
                        : isSelected
                          ? "bg-violet-600 text-white"
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
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      Added
                    </Badge>
                  )}

                </div>
              </motion.button>
            )
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleCreateFeature}
            disabled={submitting}
            className="bg-violet-600 hover:bg-violet-700 text-white"
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

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">
            Active Features
          </h2>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
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
          <div className="divide-y divide-slate-100">

            {features.map((feature) => (
              <div
                key={feature.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div>
                  <h3 className="font-medium text-slate-800">
                    {feature.name}
                  </h3>

                  <p className="text-sm text-slate-400 mt-1">
                    {feature.name}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    Active
                  </Badge>
                  <button
                    onClick={() => handleDeactivate(feature.id)}
                    className="inline-flex items-center justify-center rounded-full p-2 hover:bg-red-50 text-red-500 transition-colors"
                    title="Deactivate Feature"
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

          </div>
        )}
      </div>
    </div>
  )
}