"use client";

import { useEffect, useState, useRef } from "react";
import {
  Save,
  Plus,
  Edit2,
  Trash2,
  X,
  Sparkles,
  HelpCircle,
  Database,
  FileText,
  Quote,
  Layout,
  Image as ImageIcon,
  CheckCircle2,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
export default function AboutManager() {
  const confirm = useConfirm();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [storageMode, setStorageMode] = useState<"mongodb" | "file" | "error">("file");

  // About General Copy State
  const [aboutBadge, setAboutBadge] = useState("★ About VidhyaSanchalan");
  const [aboutTitle, setAboutTitle] = useState("One Platform for Complete School Management");
  const [aboutTitleHighlight, setAboutTitleHighlight] = useState("Complete School");
  const [aboutDescription, setAboutDescription] = useState(
    "VidhyaSanchalan is an advanced school ERP and management system designed to simplify daily school operations. It helps schools manage admissions, fees, staff, attendance, examinations, homework, reports, announcements, and student progress through separate role-based panels."
  );
  const [aboutQuote, setAboutQuote] = useState(
    "The system supports both online and offline processes and provides transparency between school staff, students, and parents."
  );
  const [aboutImage, setAboutImage] = useState("/about sms.jpg");
  const [aboutImages, setAboutImages] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState("/about sms.jpg");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // About Highlights CRUD list state
  const [highlights, setHighlights] = useState<{ title: string; desc: string }[]>([]);

  // CRUD Dialog States
  const [isOpen, setIsOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [cardTitle, setCardTitle] = useState("");
  const [cardDesc, setCardDesc] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert selected file to base64
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Use JPG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Max size is 5MB.");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    setIsUploadingImage(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("context", "about");

      const res = await fetch("/api/landing/upload", { method: "POST", body: form });
      const data = await res.json();

      if (data.success) {
        setAboutImages((prev) => [...prev, data.url]);
        setAboutImage(data.url);
        setImagePreview(data.url);
        toast.success("New about image uploaded and added to the slider list! Remember to Save settings below.");
      } else {
        toast.error(data.message || "Upload failed");
        setImagePreview(aboutImage); // revert preview
      }
    } catch {
      toast.error("Upload error. Please try again.");
      setImagePreview(aboutImage); // revert preview
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAboutImage = (indexToRemove: number) => {
    const updatedImages = aboutImages.filter((_, idx) => idx !== indexToRemove);
    setAboutImages(updatedImages);
    
    // If the image we are removing is the current active cover image, update it.
    if (aboutImage === aboutImages[indexToRemove]) {
      const fallback = updatedImages.length > 0 ? updatedImages[0] : "/about sms.jpg";
      setAboutImage(fallback);
      setImagePreview(fallback);
    }
    toast.success("Image removed from slider list. Remember to Save settings.");
  };

  useEffect(() => {
    loadAboutSettings();
  }, []);

  const loadAboutSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/landing/settings");
      const data = await res.json();
      if (res.ok && data.success) {
        setStorageMode(data.usingFileStore ? "file" : "mongodb");
        if (data.settings) {
          setAboutBadge(data.settings.aboutBadge || "★ About VidhyaSanchalan");
          setAboutTitle(data.settings.aboutTitle || "One Platform for Complete School Management");
          setAboutTitleHighlight(data.settings.aboutTitleHighlight || "Complete School");
          setAboutDescription(
            data.settings.aboutDescription ||
              "VidhyaSanchalan is an advanced school ERP and management system designed to simplify daily school operations."
          );
          setAboutQuote(
            data.settings.aboutQuote ||
              "The system supports both online and offline processes and provides transparency between school staff, students, and parents."
          );
          const img = data.settings.aboutImage || "/about sms.jpg";
          setAboutImage(img);
          setImagePreview(img);
          setAboutImages(data.settings.aboutImages || [img]);
          setHighlights(data.settings.aboutHighlights || []);
        }
      } else {
        setStorageMode("error");
      }
    } catch {
      setStorageMode("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storageMode === "error") {
      toast.error("Storage unavailable. Cannot save changes.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/landing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aboutBadge,
          aboutTitle,
          aboutTitleHighlight,
          aboutDescription,
          aboutQuote,
          aboutImage,
          aboutImages,
          aboutHighlights: highlights,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("About section copywriting updated successfully!");
        loadAboutSettings();
      } else {
        toast.error(data.message || "Failed to update settings");
      }
    } catch {
      toast.error("Server connection error");
    } finally {
      setIsSaving(false);
    }
  };

  // CRUD: Open Dialog for New Highlight Card
  const handleOpenNew = () => {
    setEditingIndex(null);
    setCardTitle("");
    setCardDesc("");
    setIsOpen(true);
  };

  // CRUD: Open Dialog to Edit Highlight Card
  const handleOpenEdit = (index: number) => {
    setEditingIndex(index);
    setCardTitle(highlights[index].title);
    setCardDesc(highlights[index].desc);
    setIsOpen(true);
  };

  // CRUD: Delete Highlight Card
  const handleDeleteHighlight = async (index: number) => {
    if (!(await confirm("Are you sure you want to delete this highlight card?"))) return;

    const updatedHighlights = highlights.filter((_, i) => i !== index);
    
    // Save directly to backend
    setIsSaving(true);
    try {
      const res = await fetch("/api/landing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aboutBadge,
          aboutTitle,
          aboutTitleHighlight,
          aboutDescription,
          aboutQuote,
          aboutImage,
          aboutImages,
          aboutHighlights: updatedHighlights,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Highlight card deleted successfully!");
        setHighlights(updatedHighlights);
      } else {
        toast.error(data.message || "Delete failed");
      }
    } catch {
      toast.error("Server connection error while deleting highlight");
    } finally {
      setIsSaving(false);
    }
  };

  // CRUD: Submit Create or Update Highlight Card
  const handleSubmitCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardTitle.trim() || !cardDesc.trim()) {
      toast.error("Title and description are required for the highlight card!");
      return;
    }

    let updatedHighlights = [...highlights];
    const newCard = { title: cardTitle, desc: cardDesc };

    if (editingIndex !== null) {
      updatedHighlights[editingIndex] = newCard;
    } else {
      updatedHighlights.push(newCard);
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/landing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aboutBadge,
          aboutTitle,
          aboutTitleHighlight,
          aboutDescription,
          aboutQuote,
          aboutImage,
          aboutImages,
          aboutHighlights: updatedHighlights,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingIndex !== null ? "Highlight card updated!" : "Highlight card added!");
        setHighlights(updatedHighlights);
        setIsOpen(false);
      } else {
        toast.error(data.message || "Failed to save card");
      }
    } catch {
      toast.error("Server connection error while saving card");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">About Section Manager</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure the homepage introduction, image highlights, and create/manage highlight tags
          </p>
        </div>
      </div>

      {/* Storage Mode Banner */}
      {storageMode === "mongodb" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <Database className="h-4 w-4 shrink-0" />
          Connected to MongoDB — changes saved to cloud database.
        </div>
      )}
      {storageMode === "file" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <FileText className="h-4 w-4 shrink-0" />
          File Store Mode — saved to <code className="mx-1 bg-amber-100 px-1 rounded">data/landing-content.json</code>.
        </div>
      )}
      {storageMode === "error" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
          <HelpCircle className="h-4 w-4 shrink-0" />
          Storage unavailable. Restart the dev server.
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D496C] border-t-transparent" />
        </div>
      )}

      {!isLoading && (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: General Copy Settings */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="shadow-sm border border-slate-100 bg-white rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-[#1D496C]">
                  <Layout className="h-5 w-5 text-[#FFA600]" />
                  Main Section Copywriting
                </CardTitle>
                <CardDescription>
                  Configure headers, labels, paragraph text, and motivational callout quote
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveGeneral} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="aboutBadge" className="text-xs font-bold text-slate-600">
                        Section Header Badge Pill
                      </Label>
                      <Input
                        id="aboutBadge"
                        value={aboutBadge}
                        onChange={(e) => setAboutBadge(e.target.value)}
                        placeholder="e.g. ★ About VidhyaSanchalan"
                        className="rounded-xl border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600">
                        Section Graphic Image
                      </Label>
                      <div className="flex items-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-xl border-slate-200 w-full text-xs font-bold text-slate-600 flex items-center justify-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Choose Image from Device
                        </Button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">JPG, PNG, WebP — max 2MB</p>
                    </div>
                  </div>

                  {/* Slider Image Gallery */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold text-slate-600 flex items-center justify-between">
                      <span>Slider Image Gallery ({aboutImages.length})</span>
                      <span className="text-[10px] text-slate-400 font-normal italic">Click thumbnail to set as cover</span>
                    </Label>
                    {aboutImages.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                        No images uploaded yet. Upload one above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2.5">
                        {aboutImages.map((img, idx) => {
                          const isPrimary = aboutImage === img;
                          return (
                            <div
                              key={idx}
                              className={`relative group rounded-xl overflow-hidden border-2 aspect-video bg-slate-50 transition-all ${
                                isPrimary ? "border-[#429CE4]" : "border-slate-100 hover:border-slate-300"
                              }`}
                            >
                              <img
                                src={img}
                                alt={`About slide ${idx + 1}`}
                                className="w-full h-full object-cover cursor-pointer rounded-lg"
                                onClick={() => {
                                  setAboutImage(img);
                                  setImagePreview(img);
                                  toast.info("Selected as primary cover image!");
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 bg-white/95 text-rose-600 hover:bg-rose-50 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveAboutImage(idx);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              {isPrimary && (
                                <div className="absolute top-1 left-1 bg-[#429CE4] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                                  Cover
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="aboutTitle" className="text-xs font-bold text-slate-600">
                      Heading Title Copy (Base)
                    </Label>
                    <Input
                      id="aboutTitle"
                      value={aboutTitle}
                      onChange={(e) => setAboutTitle(e.target.value)}
                      placeholder="e.g. One Platform for Complete School Management"
                      className="rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="aboutTitleHighlight" className="text-xs font-bold text-slate-600">
                      Highlighted Text Segment (Displays in colorful premium gradient)
                    </Label>
                    <Input
                      id="aboutTitleHighlight"
                      value={aboutTitleHighlight}
                      onChange={(e) => setAboutTitleHighlight(e.target.value)}
                      placeholder="e.g. Complete School"
                      className="rounded-xl border-slate-200"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 italic">
                      Note: This highlighted text segment will automatically be render-replaced into the main title.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="aboutDescription" className="text-xs font-bold text-slate-600">
                      Main Introduction Paragraph Copy
                    </Label>
                    <Textarea
                      id="aboutDescription"
                      rows={5}
                      value={aboutDescription}
                      onChange={(e) => setAboutDescription(e.target.value)}
                      placeholder="Enter the section intro copy..."
                      className="rounded-xl border-slate-200 leading-relaxed text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="aboutQuote" className="text-xs font-bold text-slate-600">
                      Highlight Callout Block Quote Copy
                    </Label>
                    <div className="relative">
                      <Quote className="absolute left-3 top-3 h-5 w-5 text-slate-300" />
                      <Textarea
                        id="aboutQuote"
                        rows={3}
                        value={aboutQuote}
                        onChange={(e) => setAboutQuote(e.target.value)}
                        placeholder="Enter the highlighted callout quote copy..."
                        className="rounded-xl border-slate-200 pl-10 leading-relaxed text-sm italic text-[#1D496C] bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button
                      type="submit"
                      disabled={isSaving || storageMode === "error"}
                      className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl px-6 py-5 shadow-lg shadow-[#429CE4]/10"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Copy Settings"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Highlights CRUD Grid */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="shadow-sm border border-slate-100 bg-white rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-black text-[#1D496C]">
                    <Sparkles className="h-5 w-5 text-[#FFA600]" />
                    Highlights Cards (CRUD)
                  </CardTitle>
                  <CardDescription>Configure key highlight bullets shown inside the block</CardDescription>
                </div>
                <Button
                  onClick={handleOpenNew}
                  size="sm"
                  className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-lg shadow-sm"
                >
                  <Plus className="mr-1 h-3 w-3 stroke-[3]" /> Add Card
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {highlights.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-dashed border-2 border-slate-100 rounded-2xl bg-slate-50/30">
                    <Sparkles className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500">No highlights cards defined</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Click Add Card to populate highlight segments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {highlights.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between border border-slate-100 p-4 rounded-xl bg-white shadow-sm hover:shadow transition-shadow gap-4"
                      >
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-lg bg-[#429CE4]/10 text-[#429CE4] flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-[#1D496C] text-sm">{item.title}</h4>
                            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-500 hover:bg-slate-100 rounded-lg"
                            onClick={() => handleOpenEdit(index)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-lg"
                            onClick={() => handleDeleteHighlight(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Live Preview Concept Block */}
                <div className="border border-slate-100 rounded-xl bg-slate-50/50 p-4 shadow-inner relative overflow-hidden mt-6">
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-500 font-bold tracking-wider uppercase text-[9px]">About Banner Preview</span>
                  </div>
                  <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <div className="h-14 w-20 rounded-md bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                      {aboutImage ? (
                        <img src={aboutImage} alt="Preview" className="h-full w-full object-cover rounded-md" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#6A7626] bg-[#6A7626]/10 px-2 py-0.5 rounded-full">
                        {aboutBadge}
                      </span>
                      <h5 className="font-extrabold text-[#1D496C] text-xs mt-1.5 truncate max-w-[200px]">
                        {aboutTitle}
                      </h5>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* CRUD Dialog: Add / Edit Highlight Card Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-800">
                {editingIndex !== null ? "Edit Highlight Card" : "Add Highlight Card"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure card heading title and description note
              </p>
            </div>

            <form onSubmit={handleSubmitCard} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cardTitle" className="text-sm font-bold text-slate-600">
                  Card Title
                </Label>
                <Input
                  id="cardTitle"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  placeholder="e.g. Transparency"
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cardDesc" className="text-sm font-bold text-slate-600">
                  Description Notes
                </Label>
                <Input
                  id="cardDesc"
                  value={cardDesc}
                  onChange={(e) => setCardDesc(e.target.value)}
                  placeholder="e.g. For staff, students & parents"
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl"
                >
                  {isSaving ? "Saving..." : editingIndex !== null ? "Update Card" : "Add Card"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
