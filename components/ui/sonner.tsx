"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, InformationCircleIcon, Alert02Icon, MultiplicationSignCircleIcon, Loading03Icon } from "@hugeicons/core-free-icons"

/**
 * Global toast styling.
 *
 * Every notification in the app renders through this component, so the look is
 * defined once here instead of per page:
 * - one radius / border / shadow / padding scale for all variants
 * - each state is distinguished by a muted accent rather than a saturated fill,
 *   so text keeps its contrast in both light and dark mode
 * - capped width + safe-area padding keeps toasts compact on mobile
 * - a shared duration auto-dismisses everything, and the `duration`-less
 *   variants avoid overlapping duplicates for a single action
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group !z-[999999]"
      icons={{
        success: (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4.5 !text-emerald-600" />
        ),
        info: (
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4.5 !text-blue-600" />
        ),
        warning: (
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4.5 !text-amber-600" />
        ),
        error: (
          <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="size-4.5 !text-rose-600" />
        ),
        loading: (
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4.5 animate-spin !text-slate-500" />
        ),
      }}
      position="top-right"
      closeButton
      visibleToasts={1}
      duration={3500}
      offset={16}
      mobileOffset={{ top: 72, left: 16, right: 16 }}
      style={
        {
          zIndex: 999999,
          "--normal-bg": "#ffffff",
          "--normal-text": "#0f172a",
          "--normal-border": "#e2e8f0",
          "--border-radius": "0.75rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !rounded-xl !border !border-slate-200 !bg-white !text-slate-900 !shadow-[0_10px_30px_-10px_rgba(15,23,42,0.18)] !ring-1 !ring-slate-900/5",
          title: "!text-[13px] !font-semibold !leading-snug !text-slate-900",
          description: "!mt-0.5 !text-xs !leading-relaxed !text-slate-600",
          icon: "!size-4.5 !shrink-0",
          closeButton:
            "!left-auto !right-2 !top-2 !rounded-md !p-1 !text-slate-400 hover:!bg-slate-100 hover:!text-slate-700 cursor-pointer",
          actionButton:
            "!rounded-lg !bg-blue-600 !px-2.5 !py-1 !text-xs !font-medium !text-white hover:!bg-blue-700",
          cancelButton:
            "!rounded-lg !bg-slate-100 !px-2.5 !py-1 !text-xs !font-medium !text-slate-600",

          // State accents: readable high-contrast text on crisp surfaces
          success:
            "!border-emerald-200 !bg-white [&_[data-icon]]:!text-emerald-600 [&_[data-title]]:!text-emerald-950 [&_[data-description]]:!text-emerald-800",
          error:
            "!border-red-200 !bg-white [&_[data-icon]]:!text-red-600 [&_[data-title]]:!text-red-950 [&_[data-description]]:!text-red-800",
          warning:
            "!border-amber-200 !bg-white [&_[data-icon]]:!text-amber-600 [&_[data-title]]:!text-amber-950 [&_[data-description]]:!text-amber-800",
          info:
            "!border-blue-200 !bg-white [&_[data-icon]]:!text-blue-600 [&_[data-title]]:!text-blue-950 [&_[data-description]]:!text-blue-800",
          loading: "!border-slate-200 !bg-white [&_[data-icon]]:!text-slate-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }