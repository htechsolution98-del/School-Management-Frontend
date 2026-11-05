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
  ExternalLink,
  KeyRound,
  Check,
  Landmark,
  CreditCard,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/current-user";
import { getSchoolProfile, type SchoolProfileData } from "@/lib/school-profile";
import type { CurrentUserProfile } from "@/types";
import { fetchWithAuth, logoutUser } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

export default function TrusteeProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [schoolData, setSchoolData] = useState<SchoolProfileData | null>(null);

  // All sections collapsed by default
  const [sectionsOpen, setSectionsOpen] = useState({
    trusteeAccount: false,
    schoolDetails: false,
    bankStatutory: false,
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
      trusteeAccount: nextState,
      schoolDetails: nextState,
      bankStatutory: nextState,
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

  const loadProfile = useCallback(async () => {
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
    loadProfile();
  }, [loadProfile]);

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

  const trusteeName = profile?.name || profile?.username || "Trustee";
  const schoolName =
    schoolData?.school_full_name ||
    profile?.school_full_name ||
    profile?.school?.name ||
    "Institution";
  const schoolLogo =
    schoolData?.main_logo_url ||
    profile?.school?.logo ||
    profile?.avatar;

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
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#1E2E62] via-[#2563EB] to-[#3B82F6] text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md border-2 border-white shrink-0 overflow-hidden">
          {schoolLogo ? (
            <img
              src={schoolLogo}
              alt={schoolName}
              className="w-full h-full object-contain p-1 rounded-3xl bg-white"
            />
          ) : (
            (trusteeName.charAt(0) || "T").toUpperCase()
          )}
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {trusteeName}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
              Trustee / Management
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Managing <strong className="text-slate-800">{schoolName}</strong>
          </p>

          <p className="text-xs text-slate-400 font-medium mt-1 flex items-center justify-center sm:justify-start gap-1">
            <Mail size={13} className="text-slate-400" />
            <span>{profile?.email || "No email on record"}</span>
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
            onClick={loadProfile}
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
          SECTION: TRUSTEE ACCOUNT DETAILS (Collapsible, Default Collapsed)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden transition-all"
      >
        <button
          type="button"
          onClick={() => toggleSection("trusteeAccount")}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Trustee Account Details
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Administrator login credentials and personal profile
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {sectionsOpen.trusteeAccount ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {sectionsOpen.trusteeAccount && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-4">
                  <DetailCard label="Full Name" value={trusteeName} icon={User} />
                  <DetailCard label="Username / Login ID" value={profile?.username || "—"} icon={Hash} />
                  <DetailCard label="Registered Email" value={profile?.email || "—"} icon={Mail} />
                  <DetailCard label="Mobile Phone" value={profile?.mobile || "—"} icon={Phone} />
                  <DetailCard label="Access Role" value="School Trustee (Executive)" icon={ShieldCheck} />
                  <DetailCard
                    label="Member Since"
                    value={profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString("en-IN") : "Active"}
                    icon={Calendar}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION: COMPLETE SCHOOL DETAILS (Collapsible, Default Collapsed)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden transition-all"
      >
        <button
          type="button"
          onClick={() => toggleSection("schoolDetails")}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                School Institutional Details
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Official school registration, board affiliation, and contact details
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {sectionsOpen.schoolDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {sectionsOpen.schoolDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-1">
                <div className="flex justify-end pt-3 pb-1">
                  <Link
                    href="/trustee/school-profile"
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                  >
                    <span>Edit School Details</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
                  <DetailCard label="Official School Name" value={schoolName} icon={Building2} />
                  <DetailCard label="Short Display Name" value={schoolData?.school_short_name || profile?.school_short_name || "—"} icon={Building2} />
                  <DetailCard label="School Code" value={schoolData?.school_code || profile?.school?.slug || "—"} icon={Hash} />
                  <DetailCard label="Board Affiliation" value={boardDisplay} icon={Award} />
                  <DetailCard label="UDISE+ Code" value={schoolData?.udise_code || "—"} icon={Hash} />
                  <DetailCard label="Establishment Year" value={schoolData?.establishment_year || "—"} icon={Calendar} />
                  <DetailCard label="Official Email" value={schoolData?.official_emails || profile?.school?.email || "—"} icon={Mail} />
                  <DetailCard label="Primary Phone" value={phoneDisplay} icon={Phone} />
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
          SECTION: BANKING & STATUTORY DETAILS (PAN, Account, Trust) (Collapsible, Default Collapsed)
         ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden transition-all"
      >
        <button
          type="button"
          onClick={() => toggleSection("bankStatutory")}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Landmark size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Banking & Statutory Details
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Registered trust name, PAN / GST credentials, and institutional bank account
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {sectionsOpen.bankStatutory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {sectionsOpen.bankStatutory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-1">
                <div className="flex justify-end pt-3 pb-1">
                  <Link
                    href="/trustee/school-profile"
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                  >
                    <span>Update Bank & PAN</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
                  <DetailCard
                    label="Managing Trust Name"
                    value={schoolData?.trust_name || "Educational Trust"}
                    icon={Building2}
                  />
                  <DetailCard
                    label="PAN / GST Number"
                    value={schoolData?.pan_gst_number || "—"}
                    icon={FileText}
                  />
                  <DetailCard
                    label="Bank Account Name"
                    value={schoolData?.bank_account_name || schoolName}
                    icon={CreditCard}
                  />
                  <DetailCard
                    label="Bank Account Number"
                    value={schoolData?.bank_account_no || "—"}
                    icon={Hash}
                  />
                  <DetailCard
                    label="Bank Name & Branch"
                    value={schoolData?.bank_name || "—"}
                    icon={Landmark}
                  />
                  <DetailCard
                    label="Bank IFSC Code"
                    value={schoolData?.bank_ifsc || "—"}
                    icon={Hash}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION: CHANGE ACCOUNT PASSWORD (Collapsible, Default Collapsed)
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
                Update your account password by verifying your current password
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
          SECTION: SIGN OUT OF TRUSTEE ACCOUNT
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
              Sign Out of Trustee Account
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              End your active administration session securely on this device
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
