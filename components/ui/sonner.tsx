"use client"

import { useTheme } from "next-themes"
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
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4.5" />
        ),
        info: (
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4.5" />
        ),
        warning: (
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4.5" />
        ),
        error: (
          <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="size-4.5" />
        ),
        loading: (
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4.5 animate-spin" />
        ),
      }}
      position="top-center"
      visibleToasts={3}
      duration={4000}
      gap={10}
      offset={16}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "0.75rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !rounded-xl !border-slate-200 !bg-white !text-slate-800 !shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)] !ring-1 !ring-slate-900/5 dark:!border-slate-700 dark:!bg-slate-900 dark:!text-slate-100 dark:!shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] dark:!ring-white/10",
          title: "!text-[13px] !font-semibold !leading-snug",
          description: "!mt-0.5 !text-xs !leading-relaxed !text-slate-500 dark:!text-slate-400",
          icon: "!size-4.5 !shrink-0",
          closeButton:
            "!left-auto !right-2 !top-2 !rounded-md !p-1 !text-slate-400 hover:!bg-slate-100 hover:!text-slate-600 dark:hover:!bg-slate-800",
          actionButton:
            "!rounded-lg !bg-[#1D496C] !px-2.5 !py-1 !text-xs !font-medium !text-white hover:!bg-[#285E89]",
          cancelButton:
            "!rounded-lg !bg-slate-100 !px-2.5 !py-1 !text-xs !font-medium !text-slate-600 dark:!bg-slate-800 dark:!text-slate-300",

          // State accents: muted surface + readable text in both themes.
          success:
            "[&_[data-icon]]:text-emerald-600 dark:[&_[data-icon]]:text-emerald-400 [&_[data-title]]:!text-emerald-950 dark:[&_[data-title]]:!text-emerald-50",
          error:
            "!border-red-200 dark:!border-red-900/60 [&_[data-icon]]:text-red-600 dark:[&_[data-icon]]:text-red-400 [&_[data-title]]:!text-red-950 dark:[&_[data-title]]:!text-red-50 [&_[data-description]]:!text-red-700/80 dark:[&_[data-description]]:!text-red-300/80",
          warning:
            "!border-amber-200 dark:!border-amber-900/60 [&_[data-icon]]:text-amber-600 dark:[&_[data-icon]]:text-amber-400 [&_[data-title]]:!text-amber-950 dark:[&_[data-title]]:!text-amber-50 [&_[data-description]]:!text-amber-700/80 dark:[&_[data-description]]:!text-amber-300/80",
          info: "[&_[data-icon]]:text-sky-600 dark:[&_[data-icon]]:text-sky-400",
          loading: "[&_[data-icon]]:text-slate-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }