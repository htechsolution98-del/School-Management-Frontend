"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus, Edit2, Trash2, Save, X, Star, Quote,
  HelpCircle, Database, FileText, Upload, UserCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";

export default function TestimonialsManager() {
  const confirm = useConfirm();
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<"mongodb" | "file" | "error">("file");

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form inputs
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [image, setImage] = useState(""); // base64 or URL
  const [imagePreview, setImagePreview] = useState("");
  const [order, setOrder] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadTestimonials(); }, []);

  const loadTestimonials = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/landing/testimonials");
      const data = await res.json();
      if (res.ok && data.success) {
        setTestimonials(data.testimonials || []);
        setStorageMode(data.usingFileStore ? "file" : "mongodb");
      } else {
        setStorageMode("error");
      }
    } catch {
      setStorageMode("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Convert selected file to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImage(base64);
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setName(""); setRole(""); setContent("");
    setRating(5); setImage(""); setImagePreview("");
    setOrder(testimonials.length);
    setIsOpen(true);
  };

  const handleOpenEdit = (t: any) => {
    setEditingId(t._id);
    setName(t.name); setRole(t.role); setContent(t.content);
    setRating(t.rating || 5);
    setImage(t.image || ""); setImagePreview(t.image || "");
    setOrder(t.order ?? 0);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("Delete this testimonial?"))) return;
    try {
      const res = await fetch(`/api/landing/testimonials?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("Testimonial deleted!"); loadTestimonials(); }
      else toast.error(data.message || "Delete failed");
    } catch { toast.error("Server error"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !content.trim()) {
      toast.error("Name, role and review text are required"); return;
    }
    setIsSubmitting(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const payload = { name, role, content, rating, image, order, ...(editingId && { _id: editingId }) };
      const res = await fetch("/api/landing/testimonials", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? "Testimonial updated!" : "Testimonial added!");
        setIsOpen(false); loadTestimonials();
      } else toast.error(data.message || "Save failed");
    } catch { toast.error("Server connection error"); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Testimonials Manager</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Add, edit, or remove user reviews shown in the homepage slider</p>
        </div>
        <Button
          onClick={handleOpenNew}
          disabled={storageMode === "error"}
          className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl shadow-lg self-start sm:self-auto"
        >
          <Plus className="mr-1.5 h-4 w-4 stroke-[3]" /> Add Testimonial
        </Button>
      </div>

      {/* Storage mode banner */}
      {storageMode === "mongodb" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <Database className="h-4 w-4 shrink-0" /> Connected to MongoDB — changes saved to cloud.
        </div>
      )}
      {storageMode === "file" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <FileText className="h-4 w-4 shrink-0" />
          File Store Mode — saved to <code className="mx-1 bg-amber-100 px-1 rounded">data/landing-content.json</code>. Add MongoDB Atlas for cloud storage.
        </div>
      )}
      {storageMode === "error" && (
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
          <HelpCircle className="h-4 w-4 shrink-0" /> Storage unavailable. Restart the dev server.
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D496C] border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && testimonials.length === 0 && storageMode !== "error" && (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#429CE4]/10 flex items-center justify-center">
              <UserCircle2 className="h-7 w-7 text-[#429CE4]" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-700 text-base">No testimonials yet</h4>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">Add your first review or seed default data from the Dashboard.</p>
            </div>
            <Button onClick={handleOpenNew} className="bg-[#429CE4] text-white font-bold rounded-xl">
              <Plus className="mr-1.5 h-4 w-4" /> Add First Testimonial
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Testimonials grid */}
      {!isLoading && testimonials.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {testimonials.map((t, idx) => (
            <Card key={t._id || idx} className="overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col justify-between bg-white rounded-[2rem] p-6 relative">
              <div className="absolute top-6 right-6 text-slate-100/50 pointer-events-none">
                <Quote className="h-16 w-16 stroke-[1.5]" />
              </div>
              <div className="space-y-4">
                {/* Stars */}
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < t.rating ? "fill-[#FFA600] text-[#FFA600]" : "text-slate-200"}`} />
                  ))}
                </div>
                {/* Review */}
                <blockquote className="text-sm font-semibold text-slate-700 leading-relaxed italic pr-8">
                  &ldquo;{t.content}&rdquo;
                </blockquote>
                {/* Profile */}
                <div className="flex items-center gap-3 pt-2">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                    <AvatarImage src={t.image} alt={t.name} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-[#1D496C] to-[#6A7626] text-white font-black text-sm">
                      {t.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h5 className="font-black text-slate-900 text-sm">{t.name}</h5>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">{t.role}</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-50 mt-6 pt-4 flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => handleOpenEdit(t)} className="rounded-lg text-slate-600 border-slate-200 hover:bg-slate-100">
                  <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(t._id)} className="rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <Button variant="ghost" size="icon" className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 rounded-full" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>

            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-800">{editingId ? "Edit Testimonial" : "Add New Testimonial"}</h3>
              <p className="text-xs text-slate-400 mt-1">Set name, role, rating, photo, and review text</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Photo upload */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-600">Profile Photo</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-slate-200 shadow">
                    {imagePreview ? (
                      <AvatarImage src={imagePreview} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-[#1D496C] to-[#6A7626] text-white font-black text-lg">
                      {name ? name.split(" ").map(n => n[0]).join("").toUpperCase() : <UserCircle2 className="h-7 w-7" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
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
                      className="rounded-xl border-slate-200 w-full text-sm font-bold text-slate-600"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {imagePreview ? "Change Photo" : "Choose Photo from Device"}
                    </Button>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => { setImage(""); setImagePreview(""); }}
                        className="text-[11px] text-rose-500 font-semibold mt-1 hover:underline block"
                      >
                        Remove photo
                      </button>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">JPG, PNG, WebP — max 2MB</p>
                  </div>
                </div>
              </div>

              {/* Name & Role */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="t-name" className="text-sm font-bold text-slate-600">Author Name</Label>
                  <Input id="t-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rajesh Sharma" className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-role" className="text-sm font-bold text-slate-600">Role / Position</Label>
                  <Input id="t-role" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Principal, Apex High" className="rounded-xl border-slate-200" />
                </div>
              </div>

              {/* Rating & Order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="t-rating" className="text-sm font-bold text-slate-600">Star Rating</Label>
                  <select
                    id="t-rating"
                    value={rating}
                    onChange={e => setRating(parseInt(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[#429CE4] focus:ring-1 focus:ring-[#429CE4]"
                  >
                    {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Star{r > 1 ? "s" : ""}</option>)}
                  </select>
                  {/* Star preview */}
                  <div className="flex gap-0.5 pt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-[#FFA600] text-[#FFA600]" : "text-slate-200"}`} />
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-order" className="text-sm font-bold text-slate-600">Order #</Label>
                  <Input id="t-order" type="number" value={order} onChange={e => setOrder(parseInt(e.target.value))} className="rounded-xl border-slate-200" />
                </div>
              </div>

              {/* Review content */}
              <div className="space-y-1.5">
                <Label htmlFor="t-content" className="text-sm font-bold text-slate-600">Review Text</Label>
                <Textarea
                  id="t-content"
                  rows={4}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="e.g. VidyaSanchalan simplified our complete admission process..."
                  className="rounded-xl border-slate-200 leading-relaxed text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-[#429CE4] text-white hover:bg-[#1D496C] font-bold rounded-xl">
                  <Save className="mr-1.5 h-4 w-4" />
                  {isSubmitting ? "Saving..." : editingId ? "Update" : "Add Testimonial"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
