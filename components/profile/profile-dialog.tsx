"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Building2, CalendarDays, Loader2, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile } from "@/lib/current-user";
import type { CurrentUserProfile } from "@/types";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="break-words text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 first:mt-0">
      {children}
    </p>
  );
}

/**
 * Profile of whoever is currently signed in.
 *
 * Identity comes from the access token via GET /me/, so the same component
 * works for every role without any role-specific props or hardcoded users.
 */
export function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProfile(await getCurrentUserProfile());
    } catch {
      setError("Unable to load your profile right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const staff = profile?.staff_profile;
  const student = profile?.student_profile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>My profile</DialogTitle>
          <DialogDescription>Details of the currently signed-in account.</DialogDescription>
        </DialogHeader>

        {loading && !profile ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="size-6 animate-spin text-slate-400" />
            <p className="text-sm text-slate-500">Loading your profile…</p>
          </div>
        ) : error && !profile ? (
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <p className="text-sm text-slate-600">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : profile ? (
          <div>
            {/* Identity header */}
            <div className="flex flex-col items-center gap-3 border-b border-slate-100 px-6 pb-5 pt-7 text-center">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="size-16 rounded-2xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1D496C] to-[#429CE4] text-lg font-bold text-white shadow-sm">
                  {profile.initials || "?"}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-900">{profile.name || profile.username}</p>
                <p className="truncate text-xs text-slate-500">@{profile.username}</p>
              </div>
              {profile.roles.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {profile.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1 rounded-full bg-[#1D496C]/8 px-2.5 py-1 text-[11px] font-medium text-[#1D496C]"
                    >
                      <ShieldCheck className="size-3" />
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="divide-y divide-slate-100 px-6 pb-2">
              <SectionTitle>Account</SectionTitle>
              <DetailRow icon={Mail} label="Email" value={profile.email} />
              <DetailRow icon={Phone} label="Mobile number" value={profile.mobile} />
              <DetailRow icon={UserRound} label="Username" value={profile.username} />
              <DetailRow icon={Building2} label="School" value={profile.school?.name} />
              <DetailRow icon={BadgeCheck} label="Account status" value={profile.is_active ? "Active" : "Disabled"} />
              <DetailRow icon={CalendarDays} label="Member since" value={formatDate(profile.date_joined)} />

              {staff && (
                <>
                  <SectionTitle>Staff details</SectionTitle>
                  <DetailRow icon={UserRound} label="Staff name" value={staff.name} />
                  <DetailRow icon={BadgeCheck} label="Category" value={staff.category} />
                  <DetailRow icon={Building2} label="Department" value={staff.department} />
                  <DetailRow icon={CalendarDays} label="Joining date" value={formatDate(staff.joining_date || (staff as any).created_at)} />
                  <DetailRow icon={UserRound} label="Address" value={staff.address} />
                </>
              )}

              {student && (
                <>
                  <SectionTitle>Student details</SectionTitle>
                  <DetailRow icon={UserRound} label="Student name" value={[student.name, student.surname].filter(Boolean).join(" ") || null} />
                  <DetailRow icon={BadgeCheck} label="GR number" value={student.gr_no} />
                  <DetailRow icon={Building2} label="Class" value={student.school_class} />
                  <DetailRow icon={UserRound} label="Division" value={student.division} />
                  <DetailRow icon={CalendarDays} label="Date of birth" value={formatDate(student.date_of_birth)} />
                </>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}