"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Phone,
  MapPin,
  Globe,
  Award,
  Hash,
  ShieldCheck,
  Calendar,
  Loader2,
  RefreshCw,
  LogOut,
  KeyRound,
  Check,
  Briefcase,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/current-user";
import { getSchoolProfile, type SchoolProfileData } from "@/lib/school-profile";
import type { CurrentUserProfile } from "@/types";
import { fetchWithAuth, logoutUser } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

interface UniversalProfileViewProps {
  roleTitle?: string;
}

export function UniversalProfileView({ roleTitle }: UniversalProfileViewProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [schoolData, setSchoolData] = useState<SchoolProfileData | null>(null);

  // All sections collapsed by default as requested
  const [sectionsOpen, setSectionsOpen] = useState({
    personal: false,
    professional: false,
    school: false,
    changePassword: false,
  });

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const allOpen = Object.values(sectionsOpen).every(Boolean);

  const toggleAllSections = () => {
    const nextState = !allOpen;
    setSectionsOpen({
      personal: nextState,
      professional: nextState,
      school: nextState,
      changePassword: nextState,
    });
  };

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [uProfile, sProfile] = await Promise.allSettled([
        getCurrentUserProfile(),
        getSchoolProfile(),
      ]);

      if (uProfile.status === "fulfilled") {
        setProfile(uProfile.value);
      }
      if (sProfile.status === "fulfilled") {
        setSchoolData(sProfile.value);
      }
    } catch {
      toast.error("Failed to load profile details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      toast.error("Please enter your current password.");
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/change-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword.trim(),
          new_password: newPassword.trim(),
          confirm_password: confirmPassword.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.detail || data.message || "Failed to update password.");
      }

      toast.success(data.message || "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error changing password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
      toast.success("Signed out successfully.");
      router.push("/login");
    } catch {
      toast.error("Error signing out.");
      setIsLoggingOut(false);
    }
  };

  const userName = profile?.name || profile?.username || "User";
  const userRole = roleTitle || profile?.role || "Staff";
  const schoolName =
    schoolData?.school_full_name ||
    profile?.school_full_name ||
    profile?.school?.name ||
    "Institution";
  const schoolLogo =
    schoolData?.main_logo_url ||
    profile?.school?.logo ||
    profile?.avatar;

  const staff = profile?.staff_profile;
  const parent = profile?.parent_profile;

  const boardDisplay = Array.isArray(schoolData?.board_affiliation)
    ? schoolData.board_affiliation.join(", ")
    : String(schoolData?.board_affiliation || "CBSE / State Board");

  const phoneDisplay = Array.isArray(schoolData?.phone_numbers)
    ? schoolData.phone_numbers.filter(Boolean).join(", ")
    : String(schoolData?.phone_numbers || profile?.school?.phone || "—");

  const addressDisplay =
    schoolData?.full_address ||
    profile?.school?.address ||
    "Campus Address";

  const cityStatePin = [
    profile?.school?.city,
    profile?.school?.state,
    profile?.school?.pincode,
  ].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full pb-16 px-3 sm:px-6">
      {/* ─────────────────────────────────────────────────────────────
          Hero Header Card
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-center sm:items-start gap-5 relative overflow-hidden"
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md border-2 border-white shrink-0 overflow-hidden">
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt={userName}
              className="w-full h-full object-cover rounded-3xl"
            />
          ) : (
            (userName.charAt(0) || "U").toUpperCase()
          )}
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {userName}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 capitalize">
              {userRole}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {schoolName} • {profile?.email || profile?.mobile || "Active Member"}
          </p>

          <p className="text-xs text-slate-400 font-medium mt-1 flex items-center justify-center sm:justify-start gap-1">
            <Building2 size={13} className="text-slate-400" />
            <span>{schoolName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-center sm:self-start">
          <button
            onClick={toggleAllSections}
            type="button"
            className="px-3 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <ChevronsUpDown size={14} />
            <span>{allOpen ? "Collapse All" : "Expand All"}</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            type="button"
            title="Refresh Profile"
            className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: PERSONAL & ACCOUNT DETAILS (Collapsible, Default Collapsed)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden transition-all"
      >
        <button
          type="button"
          onClick={() => toggleSection("personal")}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Personal & Account Details
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Personal contact information and user credentials
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {sectionsOpen.personal ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {sectionsOpen.personal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-4">
                  <DetailCard label="Full Name" value={userName} icon={User} />
                  <DetailCard label="Username / Login ID" value={profile?.username || "—"} icon={Hash} />
                  <DetailCard label="Email Address" value={profile?.email || "—"} icon={Mail} />
                  <DetailCard label="Mobile Phone" value={profile?.mobile || "—"} icon={Phone} />
                  <DetailCard label="Account Role" value={userRole} icon={ShieldCheck} />
                  <DetailCard
                    label="Account Created"
                    value={profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString("en-IN") : "Active"}
                    icon={Calendar}
                  />
                  {staff?.date_of_birth && (
                    <DetailCard label="Date of Birth" value={staff.date_of_birth} icon={Calendar} />
                  )}
                  {staff?.address && (
                    <DetailCard label="Residential Address" value={staff.address} icon={MapPin} className="sm:col-span-2" />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: PROFESSIONAL / PLACEMENT / WARD DETAILS (Collapsible, Default Collapsed)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden transition-all"
      >
        <button
          type="button"
          onClick={() => toggleSection("professional")}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              {parent ? <GraduationCap size={20} /> : <Briefcase size={20} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {parent ? "Ward & Student Standing" : "Professional & Role Credentials"}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {parent ? "Linked child admission, class, and roll number details" : "Department assignment, designation, and staff placement"}
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {sectionsOpen.professional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {sectionsOpen.professional && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-4">
                  {parent ? (
                    <>
                      <DetailCard label="Child Name" value={parent.student_name || "—"} icon={User} />
                      <DetailCard label="Child GR No." value={parent.gr_no || "—"} icon={Hash} />
                      <DetailCard label="Class & Division" value={`${parent.class_name || ""} (${parent.division || ""})`} icon={GraduationCap} />
                      <DetailCard label="Attendance Status" value={parent.is_today_absent ? "Absent Today" : "Present Today"} icon={ShieldCheck} />
                    </>
                  ) : (
                    <>
                      <DetailCard label="Department" value={staff?.department || "General Administration"} icon={Briefcase} />
                      <DetailCard label="Staff Category" value={staff?.category || userRole} icon={Award} />
                      <DetailCard label="Joining Date" value={staff?.joining_date || "—"} icon={Calendar} />
                      <DetailCard label="Status" value="Active Staff Member" icon={ShieldCheck} />
                      <DetailCard label="Institutional School" value={schoolName} icon={Building2} />
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: INSTITUTIONAL SCHOOL DETAILS (Collapsible, Default Collapsed)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden transition-all"
      >
        <button
          type="button"
          onClick={() => toggleSection("school")}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                School Institutional Details
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Affiliated school registration, campus contact, and location details
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {sectionsOpen.school ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {sectionsOpen.school && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-4">
                  <DetailCard label="Official School Name" value={schoolName} icon={Building2} />
                  <DetailCard label="School Code" value={schoolData?.school_code || profile?.school?.slug || "—"} icon={Hash} />
                  <DetailCard label="Board Affiliation" value={boardDisplay} icon={Award} />
                  <DetailCard label="UDISE+ Code" value={schoolData?.udise_code || "—"} icon={Hash} />
                  <DetailCard label="Official Email" value={schoolData?.official_emails || profile?.school?.email || "—"} icon={Mail} />
                  <DetailCard label="Contact Phone" value={phoneDisplay} icon={Phone} />
                  <DetailCard
                    label="Official Website"
                    value={schoolData?.website_url || "—"}
                    icon={Globe}
                  />
                  <DetailCard
                    label="Full Campus Address"
                    value={addressDisplay}
                    icon={MapPin}
                    className="sm:col-span-2"
                  />
                  <DetailCard
                    label="City, State & PIN"
                    value={cityStatePin || "—"}
                    icon={MapPin}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: CHANGE PASSWORD (Collapsible, Default Collapsed)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden transition-all"
      >
        <button
          type="button"
          onClick={() => toggleSection("changePassword")}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <KeyRound size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Change Account Password
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Update your account security password by confirming your current password
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {sectionsOpen.changePassword ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {sectionsOpen.changePassword && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-1">
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl pt-4">
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? "text" : "password"}
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">New Password</label>
                      <div className="relative">
                        <input
                          type={showNew ? "text" : "password"}
                          placeholder="At least 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirm ? "text" : "password"}
                          placeholder="Re-enter new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-white" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: SIGN OUT
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-5 sm:p-6 border border-red-100 shadow-[0_4px_24px_rgba(239,68,68,0.03)] flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <LogOut size={20} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Sign Out of Account
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              End your active session securely on this device
            </p>
          </div>
        </div>

        {showLogoutConfirm ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-red-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              <LogOut size={14} />
              <span>Yes, Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        )}
      </motion.div>
    </div>
  );
}

function DetailCard({
  label,
  value,
  icon: Icon,
  className = "",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={`p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-start gap-3 ${className}`}
    >
      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/60 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 break-words">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

