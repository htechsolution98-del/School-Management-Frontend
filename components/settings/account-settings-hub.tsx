"use client";

import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  Lock,
  KeyRound,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  RefreshCw,
  BadgeCheck,
  GraduationCap,
  Briefcase,
  Layers,
  School,
  IdCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getCurrentUserProfile,
  changeUserPassword,
  type UserProfileResponse,
} from "@/lib/profile";

export interface AccountSettingsHubProps {
  roleTitle: string;
  pageTitle?: string;
  pageSubtitle?: string;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function AccountSettingsHub({
  roleTitle,
  pageTitle,
  pageSubtitle,
}: AccountSettingsHubProps) {
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const fetchProfile = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getCurrentUserProfile();
      setProfile(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load profile details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword.trim()) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (!newPassword.trim()) {
      setPasswordError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password cannot be identical to your current password.");
      return;
    }

    setSavingPassword(true);

    try {
      const res = await changeUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      toast.success(res.message || "Password updated successfully!");
      setPasswordSuccess(res.message || "Password updated successfully! Please use your new password next time you sign in.");

      // Clear input fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password. Please check your current password.";
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const isPasswordValid = newPassword.length >= 6;
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="space-y-6 pb-16 min-w-0 max-w-6xl mx-auto">
      {/* ─── HEADER CARD ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#5826df]/15 to-[#6d3df5]/25 text-[#5826df] border border-[#5826df]/20 shadow-2xs shrink-0">
            <KeyRound className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100">
                {pageTitle || `${roleTitle} Account & Security Settings`}
              </h1>
              <Badge className="bg-indigo-50 text-[#5826df] dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                {roleTitle}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
              {pageSubtitle || "View personal profile details, verify account credentials, and change your password."}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchProfile(true)}
          disabled={refreshing}
          className="h-10 rounded-2xl px-4 text-xs font-bold text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-[#5826df]/30 hover:bg-indigo-50/40 hover:text-[#5826df] gap-2 transition-all shadow-2xs shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-[#5826df]" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
          <Loader2 className="w-8 h-8 text-[#5826df] animate-spin" />
          <p className="text-xs font-bold text-slate-500">Loading profile & security settings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ─── LEFT COLUMN: PROFILE CARD & DETAILS (5 COLS) ──────────────── */}
          <div className="lg:col-span-5 space-y-6">
            {/* User Profile Overview Card */}
            <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
              <div className="bg-gradient-to-r from-[#5826df] to-[#6d3df5] p-6 text-white relative">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white text-xl font-black shadow-inner shrink-0">
                    {profile?.initials || (profile?.name ? profile.name.slice(0, 2).toUpperCase() : "U")}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black truncate">{profile?.name || profile?.username}</h2>
                    <p className="text-xs text-white/80 truncate font-mono">@{profile?.username}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/25">
                        {profile?.role || roleTitle}
                      </span>
                      {profile?.is_active && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/40 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-4 text-xs">
                {/* School affiliation */}
                {profile?.school && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/70 text-[#5826df] flex items-center justify-center shrink-0">
                      <School className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Institution / School</p>
                      <p className="font-extrabold text-slate-800 dark:text-zinc-200 truncate">{profile.school.name}</p>
                    </div>
                  </div>
                )}

                {/* Info List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                    <span className="text-slate-500 flex items-center gap-2 font-medium">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
                    </span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      {profile?.email || "Not specified"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                    <span className="text-slate-500 flex items-center gap-2 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Mobile Number
                    </span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      {profile?.mobile || "Not specified"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                    <span className="text-slate-500 flex items-center gap-2 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Member Since
                    </span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      {formatDate(profile?.date_joined)}
                    </span>
                  </div>

                  {/* Staff Details if Available */}
                  {profile?.staff_profile && (
                    <>
                      {profile.staff_profile.department && (
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                          <span className="text-slate-500 flex items-center gap-2 font-medium">
                            <Layers className="w-3.5 h-3.5 text-slate-400" /> Department
                          </span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200">
                            {profile.staff_profile.department}
                          </span>
                        </div>
                      )}
                      {profile.staff_profile.category && (
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                          <span className="text-slate-500 flex items-center gap-2 font-medium">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Designation / Role
                          </span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200">
                            {profile.staff_profile.category}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Student Details if Available */}
                  {profile?.student_profile && (
                    <>
                      {profile.student_profile.gr_no && (
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                          <span className="text-slate-500 flex items-center gap-2 font-medium">
                            <IdCard className="w-3.5 h-3.5 text-slate-400" /> GR / Roll No.
                          </span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
                            {profile.student_profile.gr_no}
                          </span>
                        </div>
                      )}
                      {profile.student_profile.school_class && (
                        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800">
                          <span className="text-slate-500 flex items-center gap-2 font-medium">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> Class & Division
                          </span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200">
                            {profile.student_profile.school_class}{profile.student_profile.division ? ` - Div ${profile.student_profile.division}` : ""}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Tip Card */}
            <Card className="rounded-3xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/70 to-purple-50/40 dark:from-indigo-950/20 dark:to-zinc-900 p-5 shadow-2xs">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-[#5826df]/15 text-[#5826df] shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-900 dark:text-zinc-100">Account Security Tip</p>
                  <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                    New accounts start with the default school password (<code className="px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 border text-[#5826df] font-mono font-bold">123456</code>). Please change your password to keep your academic records and portal access secure.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* ─── RIGHT COLUMN: CHANGE PASSWORD FORM (7 COLS) ──────────────── */}
          <div className="lg:col-span-7">
            <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
              <CardHeader className="p-6 sm:p-7 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200 dark:border-amber-900/60">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100">
                      Change Account Password
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Verify your current password and create a unique new password.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 sm:p-7">
                {passwordError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 mb-5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span className="font-semibold">{passwordError}</span>
                  </motion.div>
                )}

                {passwordSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 mb-5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span className="font-semibold">{passwordSuccess}</span>
                  </motion.div>
                )}

                <form onSubmit={handleChangePasswordSubmit} className="space-y-5">
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                      <span>Current Password <span className="text-rose-500">*</span></span>
                      <span className="text-[11px] font-normal text-slate-400">Default was 123456</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-11 rounded-2xl pr-10 text-xs border-slate-200 dark:border-zinc-700 focus:border-[#5826df] focus:ring-2 focus:ring-[#5826df]/20 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-11 rounded-2xl pr-10 text-xs border-slate-200 dark:border-zinc-700 focus:border-[#5826df] focus:ring-2 focus:ring-[#5826df]/20 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Requirements checklist */}
                    <div className="pt-1 flex items-center gap-3 text-[11px]">
                      <span className={`flex items-center gap-1 font-semibold ${isPasswordValid ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isPasswordValid ? "text-emerald-600" : "text-slate-300"}`} />
                        At least 6 characters
                      </span>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Confirm New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-11 rounded-2xl pr-10 text-xs border-slate-200 dark:border-zinc-700 focus:border-[#5826df] focus:ring-2 focus:ring-[#5826df]/20 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {confirmPassword.length > 0 && (
                      <div className="pt-1 flex items-center gap-1.5 text-[11px]">
                        {isMatch ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match perfectly
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3">
                    <Button
                      type="submit"
                      disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword || !isMatch || !isPasswordValid}
                      className="w-full h-11 bg-gradient-to-r from-[#5826df] to-[#6d3df5] hover:from-[#4c1fc7] hover:to-[#5e2de0] text-white font-bold text-xs rounded-2xl gap-2 shadow-md shadow-[#5826df]/25 transition-all hover:shadow-[#5826df]/35 active:scale-[0.98] disabled:opacity-50"
                    >
                      {savingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating Password...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 stroke-[2.2]" />
                          Save New Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
