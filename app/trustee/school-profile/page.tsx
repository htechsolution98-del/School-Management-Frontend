"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  Landmark,
  Palette,
  FileCheck2,
  Save,
  RotateCcw,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Loader2,
  Copy,
  Info,
  ShieldCheck,
  Globe,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSchoolProfile,
  updateSchoolProfile,
  SchoolProfileData,
  DEFAULT_SCHOOL_PROFILE,
} from "@/lib/school-profile";
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload";

type TabKey = "basic" | "billing" | "branding" | "documents";

interface AssetFieldConfig {
  key: keyof SchoolProfileData;
  label: string;
  description: string;
  recommendedSize: string;
  aspectRatioText: string;
  accept?: string;
  previewType?: "square" | "landscape" | "signature" | "portrait";
}

const BRANDING_ASSETS: AssetFieldConfig[] = [
  {
    key: "main_logo_url",
    label: "Main Institutional Logo",
    description: "Primary full-color school emblem for headers, app shell, and ID cards.",
    recommendedSize: "512 × 512 px",
    aspectRatioText: "1:1 Square (Transparent PNG)",
    previewType: "square",
  },
  {
    key: "print_logo_url",
    label: "Print-Optimized Logo",
    description: "High-contrast monochrome emblem for laser fee receipts and exam mark sheets.",
    recommendedSize: "800 × 800 px",
    aspectRatioText: "1:1 Square (Monochrome PNG)",
    previewType: "square",
  },
  {
    key: "favicon_url",
    label: "Browser Tab Favicon",
    description: "Small icon displayed in browser address bar and bookmarks.",
    recommendedSize: "64 × 64 px",
    aspectRatioText: "1:1 Square (.ico or .png)",
    previewType: "square",
  },
  {
    key: "login_banner_url",
    label: "Portal Login Banner",
    description: "Wide campus photography or branded visual on user authentication screens.",
    recommendedSize: "1920 × 1080 px",
    aspectRatioText: "16:9 Landscape (JPG / WebP)",
    previewType: "landscape",
  },
];

const DOCUMENT_ASSETS: AssetFieldConfig[] = [
  {
    key: "certificate_watermark_url",
    label: "Certificate Watermark",
    description: "Subtle background emblem printed on report cards, leaving, and bonafide certificates.",
    recommendedSize: "1000 × 1000 px",
    aspectRatioText: "1:1 Square (Light Transparent PNG)",
    previewType: "square",
  },
  {
    key: "receipt_bg_url",
    label: "Fee Receipt Artwork / Letterhead",
    description: "Formal letterhead frame and security guilloche pattern for fee invoices.",
    recommendedSize: "1240 × 1754 px",
    aspectRatioText: "A4 Portrait (PNG / PDF Artwork)",
    previewType: "portrait",
  },
  {
    key: "principal_signature_url",
    label: "Principal Digital Signature",
    description: "Authorized signature stamped onto computerized report cards and bonafides.",
    recommendedSize: "400 × 150 px",
    aspectRatioText: "8:3 Transparent PNG (Blue/Black Ink)",
    previewType: "signature",
  },
  {
    key: "trustee_signature_url",
    label: "Trustee / Secretary Signature",
    description: "Authorized management signature for appointment letters and resolutions.",
    recommendedSize: "400 × 150 px",
    aspectRatioText: "8:3 Transparent PNG (Blue/Black Ink)",
    previewType: "signature",
  },
  {
    key: "official_seal_url",
    label: "Official School Stamp / Seal",
    description: "Embossed circular institutional seal for attested school transcripts.",
    recommendedSize: "500 × 500 px",
    aspectRatioText: "1:1 Square Transparent PNG",
    previewType: "square",
  },
];

export default function TrusteeSchoolProfilePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const [profile, setProfile] = useState<SchoolProfileData>(DEFAULT_SCHOOL_PROFILE);
  const [initialProfile, setInitialProfile] = useState<SchoolProfileData>(DEFAULT_SCHOOL_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { isUploading, activeKey, uploadFile } = useCloudinaryUpload();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const data = await getSchoolProfile();
      setProfile(data);
      setInitialProfile(data);
      setHasChanges(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load school profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof SchoolProfileData, value: string) => {
    setProfile((prev) => {
      const updated = { ...prev, [field]: value };
      setHasChanges(JSON.stringify(updated) !== JSON.stringify(initialProfile));
      return updated;
    });
  };

  const handleAssetUpload = async (field: keyof SchoolProfileData, file: File) => {
    const secureUrl = await uploadFile(file, field as string, {
      assetType: field as string,
    });
    if (secureUrl) {
      handleChange(field, secureUrl);
      toast.success(`${file.name} uploaded to Cloudinary! Remember to save.`);
    }
  };

  const handleRemoveAsset = (field: keyof SchoolProfileData) => {
    handleChange(field, "");
  };

  const handleCopyUrl = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success("Cloudinary URL copied to clipboard!");
  };

  const handleDiscard = () => {
    setProfile(initialProfile);
    setHasChanges(false);
    toast.info("Unsaved modifications reverted.");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await updateSchoolProfile(profile);
      setProfile(updated);
      setInitialProfile(updated);
      setHasChanges(false);
      toast.success("Institutional school profile and media assets saved successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save school profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">
          Loading institutional profile and Cloudinary credentials...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 pb-28 sm:pb-32">
      {/* ── Top Header Banner ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Institutional Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            School Profile & Branding
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Configure school identification, legal billing details, official affiliations, and
            upload high-resolution Cloudinary digital assets (logos, signatures, watermarks, seals).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          {hasChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Discard</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSaving || isUploading}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer ${
              hasChanges
                ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-600/25"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? "Saving Changes..." : "Save Profile"}</span>
          </button>
        </div>
      </div>

      {/* ── Tabbed Navigation Bar ── */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setActiveTab("basic")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "basic"
              ? "bg-white text-indigo-700 shadow-sm shadow-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Basic Info & Contact</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("billing")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "billing"
              ? "bg-white text-indigo-700 shadow-sm shadow-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Billing & Bank Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("branding")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "branding"
              ? "bg-white text-indigo-700 shadow-sm shadow-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Branding & Logos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "documents"
              ? "bg-white text-indigo-700 shadow-sm shadow-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Document Assets & Signatures</span>
        </button>
      </div>

      {/* ── Tab Content Panels ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAB 1: BASIC INFO & CONTACT */}
        {activeTab === "basic" && (
          <div className="space-y-6">
            {/* Sub-card 1: Institutional Identity */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Institutional Identity & Affiliations
                  </h2>
                  <p className="text-xs text-slate-500">
                    Official registration names, education board affiliations, and government UDISE codes.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    School Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profile.school_full_name}
                    onChange={(e) => handleChange("school_full_name", e.target.value)}
                    placeholder="e.g. St. Xavier's International Academy"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Legal full name printed on official certificates, marksheets, and government filings.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Short / Display Name
                  </label>
                  <input
                    type="text"
                    value={profile.school_short_name}
                    onChange={(e) => handleChange("school_short_name", e.target.value)}
                    placeholder="e.g. SXIA"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Compact abbreviation for mobile navigation pills and headers.
                  </span>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Motto / Tagline
                  </label>
                  <input
                    type="text"
                    value={profile.tagline}
                    onChange={(e) => handleChange("tagline", e.target.value)}
                    placeholder="e.g. Excellence in Education, Integrity in Character"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Establishment Year
                  </label>
                  <input
                    type="text"
                    value={profile.establishment_year}
                    onChange={(e) => handleChange("establishment_year", e.target.value)}
                    placeholder="e.g. 1998"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Board / Affiliation
                  </label>
                  <input
                    type="text"
                    value={profile.board_affiliation}
                    onChange={(e) => handleChange("board_affiliation", e.target.value)}
                    placeholder="e.g. CBSE, ICSE, GSEB, State Board, IB"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    UDISE / Govt Affiliation Code
                  </label>
                  <input
                    type="text"
                    value={profile.udise_code}
                    onChange={(e) => handleChange("udise_code", e.target.value)}
                    placeholder="e.g. 24070100101"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Sub-card 2: Contact & Campus Information */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Campus Location & Official Contact Channels
                  </h2>
                  <p className="text-xs text-slate-500">
                    Physical campus address and publicly displayed communication channels.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Full Campus Address
                  </label>
                  <textarea
                    rows={3}
                    value={profile.full_address}
                    onChange={(e) => handleChange("full_address", e.target.value)}
                    placeholder="Plot No. 12, Education City, Near Ring Road, City, State - PIN"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Official Phone Number(s)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={profile.phone_numbers}
                      onChange={(e) => handleChange("phone_numbers", e.target.value)}
                      placeholder="+91 98765 43210, 0261-234567"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden font-mono"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Multiple numbers can be separated with commas.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Official Contact Email(s)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={profile.official_emails}
                      onChange={(e) => handleChange("official_emails", e.target.value)}
                      placeholder="principal@school.edu, contact@school.edu"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Institutional Website URL
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={profile.website_url}
                      onChange={(e) => handleChange("website_url", e.target.value)}
                      placeholder="https://www.stxaviersacademy.org"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BILLING & BANK DETAILS */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Trust Registration & Banking Details
                  </h2>
                  <p className="text-xs text-slate-500">
                    Details configured here are used for student fee invoices, salary disbursals, and tax audit reports.
                  </p>
                </div>
              </div>

              {/* Informational Banner */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-xs sm:text-sm">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Statutory Notice:</strong> Ensure the Trust Name, PAN/GSTIN, and Bank IFSC match the registered Society / Trust Deed. These credentials appear directly on computer-generated GST tax invoices and fee receipts issued to parents.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Registered Trust / Society Name
                  </label>
                  <input
                    type="text"
                    value={profile.trust_name}
                    onChange={(e) => handleChange("trust_name", e.target.value)}
                    placeholder="e.g. Shree Vidya Vikas Educational Trust"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Trust PAN / GSTIN Number
                  </label>
                  <input
                    type="text"
                    value={profile.pan_gst_number}
                    onChange={(e) => handleChange("pan_gst_number", e.target.value.toUpperCase())}
                    placeholder="e.g. AAATV1234F / 24AAATV1234F1Z5"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Bank Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={profile.bank_account_name}
                    onChange={(e) => handleChange("bank_account_name", e.target.value)}
                    placeholder="e.g. Shree Vidya Vikas Trust Fee Account"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Primary Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={profile.bank_account_no}
                    onChange={(e) => handleChange("bank_account_no", e.target.value)}
                    placeholder="e.g. 50200012345678"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Bank IFSC Code
                  </label>
                  <input
                    type="text"
                    value={profile.bank_ifsc}
                    onChange={(e) => handleChange("bank_ifsc", e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001234"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Bank Name & Branch Location
                  </label>
                  <input
                    type="text"
                    value={profile.bank_name}
                    onChange={(e) => handleChange("bank_name", e.target.value)}
                    placeholder="e.g. HDFC Bank, City Center Branch"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BRANDING & LOGOS */}
        {activeTab === "branding" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Institutional Branding & Logos (Cloudinary)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Files uploaded here are pushed directly to your secure Cloudinary media cloud and delivered across web and print.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {BRANDING_ASSETS.map((cfg) => (
                  <AssetUploadCard
                    key={cfg.key}
                    config={cfg}
                    currentUrl={profile[cfg.key] as string}
                    isUploading={isUploading && activeKey === cfg.key}
                    onFileSelected={(file) => handleAssetUpload(cfg.key, file)}
                    onUrlChanged={(url) => handleChange(cfg.key, url)}
                    onRemove={() => handleRemoveAsset(cfg.key)}
                    onCopyUrl={() => handleCopyUrl(profile[cfg.key] as string)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DOCUMENT ASSETS & SIGNATURES */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Official Document Assets & Digital Signatures
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configure official signatures, security seals, and document watermarks for automated certificate and report generation.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {DOCUMENT_ASSETS.map((cfg) => (
                  <AssetUploadCard
                    key={cfg.key}
                    config={cfg}
                    currentUrl={profile[cfg.key] as string}
                    isUploading={isUploading && activeKey === cfg.key}
                    onFileSelected={(file) => handleAssetUpload(cfg.key, file)}
                    onUrlChanged={(url) => handleChange(cfg.key, url)}
                    onRemove={() => handleRemoveAsset(cfg.key)}
                    onCopyUrl={() => handleCopyUrl(profile[cfg.key] as string)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Fixed Bottom Save Action Bar ── */}
        <div className="fixed bottom-0 right-0 w-full md:w-[calc(100%-16rem)] bg-white/85 backdrop-blur-md border-t border-slate-200/90 px-4 sm:px-8 py-3.5 sm:py-4 flex justify-between items-center shadow-[0_-4px_12px_rgba(0,0,0,0.04)] z-50 transition-all">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium min-w-0">
            {hasChanges ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="text-amber-800 font-bold truncate">Unsaved changes present.</span>
                <span className="hidden sm:inline text-slate-500">Remember to save before leaving.</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-600 truncate">All institutional profile changes are saved.</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {hasChanges && (
              <button
                type="button"
                onClick={handleDiscard}
                className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className={`inline-flex items-center gap-2 font-bold text-xs sm:text-sm px-5 sm:px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50 ${
                hasChanges
                  ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-600/25"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? "Saving..." : "Save Profile"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Asset Upload Subcomponent ──
interface AssetUploadCardProps {
  config: AssetFieldConfig;
  currentUrl: string;
  isUploading: boolean;
  onFileSelected: (file: File) => void;
  onUrlChanged: (url: string) => void;
  onRemove: () => void;
  onCopyUrl: () => void;
}

function AssetUploadCard({
  config,
  currentUrl,
  isUploading,
  onFileSelected,
  onUrlChanged,
  onRemove,
  onCopyUrl,
}: AssetUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
      {/* Card Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 leading-snug">
            {config.label}
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 shrink-0">
            {config.recommendedSize}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-normal">
          {config.description}
        </p>
      </div>

      {/* Preview / Dropzone Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-xl border-2 transition-all flex flex-col items-center justify-center p-3 text-center overflow-hidden min-h-[140px] ${
          isDragOver
            ? "border-indigo-500 bg-indigo-50/80 scale-[0.99]"
            : currentUrl
            ? "border-slate-200 bg-white"
            : "border-dashed border-slate-300 bg-white/60 hover:bg-white"
        }`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="text-xs font-semibold text-indigo-900">
              Uploading to Cloudinary...
            </span>
          </div>
        ) : currentUrl ? (
          <div className="relative group w-full flex flex-col items-center justify-center">
            {/* Checkerboard background for transparent PNG inspection */}
            <div
              className={`w-full max-h-40 flex items-center justify-center rounded-lg p-2 overflow-hidden ${
                config.previewType === "landscape" ? "bg-slate-900/5" : "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:12px_12px] bg-slate-50"
              }`}
            >
              <img
                src={currentUrl}
                alt={config.label}
                className={`object-contain transition-transform group-hover:scale-105 select-none ${
                  config.previewType === "signature"
                    ? "h-16 w-auto"
                    : config.previewType === "portrait"
                    ? "h-36 w-auto shadow-sm"
                    : "h-28 w-auto"
                }`}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>

            {/* Quick Actions overlay */}
            <div className="flex items-center gap-1.5 mt-2.5">
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>View</span>
              </a>
              <button
                type="button"
                onClick={onCopyUrl}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                title="Copy Cloudinary URL"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <UploadCloud className="w-3 h-3" />
                <span>Change</span>
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                title="Remove asset"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer py-4 flex flex-col items-center justify-center gap-1.5 w-full"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-slate-700">
              Drop file here, or <span className="text-indigo-600 font-bold underline">browse</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {config.aspectRatioText}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={config.accept || "image/*"}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onFileSelected(e.target.files[0]);
            }
          }}
          className="hidden"
        />
      </div>

      {/* Manual URL Input Accordion */}
      <div className="pt-1">
        {!isManualInput ? (
          <button
            type="button"
            onClick={() => setIsManualInput(true)}
            className="text-[11px] font-medium text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <LinkIcon className="w-3 h-3" />
            <span>Enter CDN URL manually</span>
          </button>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Direct Cloudinary URL
              </label>
              <button
                type="button"
                onClick={() => setIsManualInput(false)}
                className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Close
              </button>
            </div>
            <input
              type="url"
              value={currentUrl}
              onChange={(e) => onUrlChanged(e.target.value)}
              placeholder="https://res.cloudinary.com/..."
              className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 outline-hidden bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}

