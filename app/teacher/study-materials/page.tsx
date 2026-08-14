"use client";

import { useState } from "react";
import {
  FileText,
  UploadCloud,
  File,
  Download,
  Trash2,
  BookOpen,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AttachedFile {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: "pdf" | "png" | "jpg" | "jpeg" | "docx";
  fileUrl?: string;
  rawFile?: File;
}

interface StudyMaterialItem {
  id: string;
  title: string;
  className: string;
  division: string;
  subject: string;
  type: "Study Notes" | "Assignment" | "Practice Sheet" | "Reference";
  files: AttachedFile[];
  uploadDate: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB Limit

export default function StudyMaterialsPage() {
  const [materials, setMaterials] = useState<StudyMaterialItem[]>([]);

  // Form states
  const [title, setTitle] = useState("");
  const [selectedClass, setSelectedClass] = useState("Std1");
  const [selectedDivision, setSelectedDivision] = useState("A");
  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  const [materialType, setMaterialType] = useState<StudyMaterialItem["type"]>("Study Notes");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Filters
  const [filterClass, setFilterClass] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const incoming = Array.from(e.target.files);
      const validExtensions = ["pdf", "jpg", "jpeg", "png", "docx"];
      const validFiles: File[] = [];

      for (const file of incoming) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !validExtensions.includes(ext)) {
          toast.error(`Invalid format for "${file.name}". Allowed formats: PDF, JPG, JPEG, PNG, DOCX.`);
          continue;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(
            `File "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maximum allowed size is 5MB.`
          );
          continue;
        }

        if (!selectedFiles.some((f) => f.name === file.name)) {
          validFiles.push(file);
        }
      }

      if (validFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...validFiles]);
        toast.success(`Attached ${validFiles.length} file(s).`);
      }
      e.target.value = "";
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a title for the study material.");
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error("Please attach at least one file (up to 5MB per file).");
      return;
    }

    const attachedFiles: AttachedFile[] = selectedFiles.map((file, i) => {
      const ext = file.name.split(".").pop()?.toLowerCase() as AttachedFile["fileType"];
      const fileUrl = URL.createObjectURL(file);
      return {
        id: `${Date.now()}-${i}`,
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        fileType: ext || "pdf",
        fileUrl,
        rawFile: file,
      };
    });

    const newMaterial: StudyMaterialItem = {
      id: Date.now().toString(),
      title: title.trim(),
      className: selectedClass,
      division: selectedDivision,
      subject: selectedSubject,
      type: materialType,
      files: attachedFiles,
      uploadDate: new Date().toISOString().split("T")[0],
    };

    setMaterials([newMaterial, ...materials]);
    toast.success(`🎉 Material "${title}" with ${attachedFiles.length} file(s) uploaded successfully!`);

    // Reset Form
    setTitle("");
    setSelectedFiles([]);
  };

  const handleDownloadFile = (file: AttachedFile) => {
    let url = file.fileUrl;
    let createdTempUrl = false;

    if (!url && file.rawFile) {
      url = URL.createObjectURL(file.rawFile);
      createdTempUrl = true;
    }

    if (!url) {
      // Create downloadable sample document blob if pre-existing sample item
      const sampleText = `VidhyaSanchalan Study Material Document\n\nFile Name: ${file.fileName}\nFile Size: ${file.fileSize}\nType: ${file.fileType.toUpperCase()}\n\nDownloaded successfully!`;
      const blob = new Blob([sampleText], { type: "application/octet-stream" });
      url = URL.createObjectURL(blob);
      createdTempUrl = true;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (createdTempUrl) {
      setTimeout(() => URL.revokeObjectURL(url!), 1000);
    }

    toast.success(`Downloaded ${file.fileName}!`);
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(materials.filter((m) => m.id !== id));
    toast.success("Study material removed.");
  };

  const handleDeleteIndividualFile = (materialId: string, fileId: string) => {
    setMaterials((prev) =>
      prev
        .map((m) => {
          if (m.id === materialId) {
            const updatedFiles = m.files.filter((f) => f.id !== fileId);
            return { ...m, files: updatedFiles };
          }
          return m;
        })
        .filter((m) => m.files.length > 0)
    );
    toast.success("File removed.");
  };

  const filteredMaterials = materials.filter((m) => {
    if (filterClass !== "ALL" && m.className !== filterClass) return false;
    if (filterType !== "ALL" && m.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Study Materials & Assignments Uploader
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Upload study materials, practice sheets, and reference notes (PDF, JPG, PNG, DOCX - max 5MB per file) for students.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardHeader className="pb-3 border-b dark:border-zinc-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              Upload New Material
            </CardTitle>
            <CardDescription className="text-xs">
              Select class, subject, and multiple files (up to 5MB each) to share with students.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Material Title *
                </label>
                <Input
                  placeholder="e.g. Chapter 4 Notes & Formulae"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Class</label>
                  <Select value={selectedClass} onValueChange={(v) => v && setSelectedClass(v)}>
                    <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-bold">
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Std1">Std 1</SelectItem>
                      <SelectItem value="Std2">Std 2</SelectItem>
                      <SelectItem value="Std3">Std 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Division</label>
                  <Select value={selectedDivision} onValueChange={(v) => v && setSelectedDivision(v)}>
                    <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-bold">
                      <SelectValue placeholder="Div" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Div A</SelectItem>
                      <SelectItem value="B">Div B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Subject</label>
                <Select value={selectedSubject} onValueChange={(v) => v && setSelectedSubject(v)}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-bold">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Social Studies">Social Studies</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Material Category</label>
                <Select value={materialType} onValueChange={(v) => v && setMaterialType(v as any)}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60 font-bold">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Study Notes">Study Notes</SelectItem>
                    <SelectItem value="Assignment">Assignment</SelectItem>
                    <SelectItem value="Practice Sheet">Practice Sheet</SelectItem>
                    <SelectItem value="Reference">Reference Guide</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* File Attachment */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Attach Files (PDF, JPG, PNG, DOCX - Max 5MB per file) *
                </label>
                <div className="relative border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors bg-slate-50/50 dark:bg-zinc-800/30">
                  <UploadCloud className="h-8 w-8 text-indigo-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Click to choose files (Multiple allowed)
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, PNG, JPG, JPEG, DOCX up to 5MB per file</p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                      <span>Attached Files ({selectedFiles.length})</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-rose-600 hover:underline text-[10px] font-bold"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {selectedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <File className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate font-medium text-slate-800 dark:text-zinc-200 text-[11px]">
                              {file.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-2 shadow-2xs"
              >
                <UploadCloud className="h-4 w-4" /> Upload Material ({selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""})
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Uploaded Materials List */}
        <Card className="lg:col-span-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
          <CardHeader className="pb-3 border-b dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                Uploaded Study Materials ({filteredMaterials.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Active study materials accessible by students and parents.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Select value={filterClass} onValueChange={(v) => v && setFilterClass(v)}>
                <SelectTrigger className="h-8 text-xs font-bold rounded-lg bg-slate-50 dark:bg-zinc-800">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  <SelectItem value="Std1">Std 1</SelectItem>
                  <SelectItem value="Std2">Std 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredMaterials.length === 0 ? (
              <div className="py-14 text-center space-y-2 p-4">
                <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">No study materials uploaded yet</p>
                <p className="text-[11px] text-slate-400">Use the form on the left to upload your first study material.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredMaterials.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 space-y-3 hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                          {item.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {item.className} - Div {item.division}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            {item.subject}
                          </Badge>
                          <Badge variant="default" className="text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-100">
                            {item.type}
                          </Badge>
                          <span className="text-[10px] text-slate-400">Uploaded {item.uploadDate}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteMaterial(item.id)}
                        className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg shrink-0"
                        title="Delete entire material"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Files list */}
                    <div className="space-y-1.5 pt-1">
                      {item.files.map((file) => (
                        <div
                          key={file.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold uppercase text-[10px] shrink-0">
                              {file.fileType}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 dark:text-zinc-200 text-xs truncate">
                                {file.fileName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {file.fileSize}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadFile(file)}
                              className="h-7 text-[11px] font-bold rounded-lg gap-1 px-2.5"
                            >
                              <Download className="h-3 w-3" /> Download
                            </Button>
                            {item.files.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteIndividualFile(item.id, file.id)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                                title="Remove file"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
