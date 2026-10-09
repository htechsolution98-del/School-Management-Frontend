"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Hash,
  Plus,
  Users,
  Loader2,
  Sparkles,
  Search,
  Building2,
  AlertCircle,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Download,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { getAcademicYearsForPrincipal } from "@/lib/principal/academic-year";
import { getSchoolClasses } from "@/lib/principal/classes";
import { getDivisions } from "@/lib/clerk/divisions";
import type { SchoolClass } from "@/types/principal";
import {
  getExamRooms,
  createExamRoom,
  updateExamRoom,
  deleteExamRoom,
  getExamsFull,
  autoGenerateSeating,
  bulkAutoGenerateSeating,
  getSeatingAllocations,
  updateSeatingAllocation,
  type ExamRoom,
  type ExamFull,
  type SeatingRecord,
} from "@/lib/exam-api";

export default function SeatingAllocationPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [selectedDivision, setSelectedDivision] = useState<string>("ALL");
  const [examRooms, setExamRooms] = useState<ExamRoom[]>([]);
  const [exams, setExams] = useState<ExamFull[]>([]);
  const [selectedExamTitle, setSelectedExamTitle] = useState<string>("");
  const [selectedStrategy, setSelectedStrategy] = useState<string>("ROLL_NO");
  const [seatingRecords, setSeatingRecords] = useState<SeatingRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const availableDivisions = useMemo(() => {
    if (selectedClassId && selectedClassId !== "ALL") {
      const filtered = divisions.filter((d: any) => String(d.SchoolClass || d.school_class) === String(selectedClassId));
      const divSet = new Set(filtered.map((d: any) => d.division).filter(Boolean));
      return Array.from(divSet).sort();
    }
    const divSet = new Set(divisions.map((d: any) => d.division).filter(Boolean));
    return Array.from(divSet).sort();
  }, [divisions, selectedClassId]);

  // Modal for adding/editing room
  const [editingRoom, setEditingRoom] = useState<ExamRoom | null>(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newBuildingBlock, setNewBuildingBlock] = useState("");
  const [newCapacity, setNewCapacity] = useState("30");
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false);

  // Modal for editing student seat allocation
  const [editingSeat, setEditingSeat] = useState<SeatingRecord | null>(null);
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);
  const [editSeatNumber, setEditSeatNumber] = useState("");
  const [editRoomId, setEditRoomId] = useState("");
  const [isSubmittingSeat, setIsSubmittingSeat] = useState(false);

  const resetRoomForm = () => {
    setEditingRoom(null);
    setNewRoomNumber("");
    setNewBuildingBlock("");
    setNewCapacity("30");
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [yearsData, roomsData, classesData, divisionsData] = await Promise.all([
        getAcademicYearsForPrincipal(),
        getExamRooms(),
        getSchoolClasses().catch(() => []),
        getDivisions().catch(() => []),
      ]);
      setAcademicYears(yearsData || []);
      setExamRooms(roomsData || []);
      setClasses(classesData || []);
      setDivisions(divisionsData || []);

      if (yearsData && yearsData.length > 0 && !selectedYearId) {
        const activeYr = yearsData.find((y: any) => y.is_active) || yearsData[0];
        setSelectedYearId(String(activeYr.id));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load seating initial data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadExamsAndSeating = async () => {
    if (!selectedYearId) return;
    setIsLoading(true);
    try {
      const examsList = await getExamsFull({ academic_year: Number(selectedYearId) });
      setExams(examsList || []);

      if (examsList && examsList.length > 0) {
        // Set first title if none selected
        const uniqueTitles = Array.from(new Set(examsList.map((e) => e.title)));
        const defaultTitle = selectedExamTitle && uniqueTitles.includes(selectedExamTitle) ? selectedExamTitle : uniqueTitles[0];
        if (selectedExamTitle !== defaultTitle) setSelectedExamTitle(defaultTitle);

        const seating = await getSeatingAllocations({
          academicYearId: Number(selectedYearId),
          title: defaultTitle,
          classId: selectedClassId,
          division: selectedDivision,
        });
        setSeatingRecords(seating || []);
      } else {
        setSelectedExamTitle("");
        setSeatingRecords([]);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load exams and seating records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYearId) {
      loadExamsAndSeating();
    }
  }, [selectedYearId, selectedExamTitle, selectedClassId, selectedDivision]);

  // Handle Add / Edit Exam Room
  const handleSaveRoom = async () => {
    if (!newRoomNumber) {
      toast.error("Room number is required.");
      return;
    }

    setIsSubmittingRoom(true);
    try {
      const payload = {
        room_number: newRoomNumber.trim(),
        building_block: newBuildingBlock.trim() || undefined,
        capacity: Number(newCapacity) || 30,
        is_active: true,
      };

      if (editingRoom) {
        await updateExamRoom(editingRoom.id, payload);
        toast.success(`Exam Room '${newRoomNumber}' updated successfully!`);
      } else {
        await createExamRoom(payload);
        toast.success(`Exam Room '${newRoomNumber}' added successfully!`);
      }

      setIsRoomModalOpen(false);
      resetRoomForm();
      const rooms = await getExamRooms();
      setExamRooms(rooms || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save exam room.");
    } finally {
      setIsSubmittingRoom(false);
    }
  };

  const handleEditRoom = (room: ExamRoom) => {
    setEditingRoom(room);
    setNewRoomNumber(room.room_number);
    setNewBuildingBlock(room.building_block || "");
    setNewCapacity(String(room.capacity || 30));
    setIsRoomModalOpen(true);
  };

  const handleDeleteRoom = async (room: ExamRoom) => {
    if (!confirm(`Delete exam room "${room.room_number}"? This cannot be undone.`)) return;
    try {
      await deleteExamRoom(room.id);
      toast.success(`Exam Room '${room.room_number}' deleted!`);
      const rooms = await getExamRooms();
      setExamRooms(rooms || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete exam room.");
    }
  };

  const handleToggleRoom = async (room: ExamRoom) => {
    try {
      await updateExamRoom(room.id, { is_active: !room.is_active });
      toast.success(`Room '${room.room_number}' ${!room.is_active ? "activated" : "deactivated"}!`);
      const rooms = await getExamRooms();
      setExamRooms(rooms || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to toggle room status.");
    }
  };

  // Trigger Auto-Generate Seating in Bulk with Selected Strategy
  const handleAutoGenerate = async () => {
    if (!selectedYearId || !selectedExamTitle) {
      toast.error("Please select an academic year and exam component.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await bulkAutoGenerateSeating(
        Number(selectedYearId),
        selectedExamTitle,
        selectedStrategy,
        selectedClassId,
        selectedDivision
      );
      toast.success(res.message || "Bulk auto-generated seating allocation!");
      
      // Refresh current roster view
      const seating = await getSeatingAllocations({
        academicYearId: Number(selectedYearId),
        title: selectedExamTitle,
        classId: selectedClassId,
        division: selectedDivision,
      });
      setSeatingRecords(seating || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to auto-generate seating allocation.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit specific student's seating allocation
  const handleOpenSeatEdit = (st: SeatingRecord) => {
    setEditingSeat(st);
    setEditSeatNumber(st.seat_number || "");
    const matchingRoom = examRooms.find((r) => r.room_number === st.room_number || String(r.id) === String(st.room));
    setEditRoomId(matchingRoom ? String(matchingRoom.id) : st.room ? String(st.room) : "");
    setIsSeatModalOpen(true);
  };

  const handleSaveSeatChange = async () => {
    if (!editingSeat) return;
    if (!editSeatNumber.trim()) {
      toast.error("Seat number cannot be empty.");
      return;
    }

    setIsSubmittingSeat(true);
    try {
      await updateSeatingAllocation(editingSeat.id, {
        seat_number: editSeatNumber.trim(),
        room: editRoomId ? Number(editRoomId) : undefined,
      });

      toast.success(`Seat for ${editingSeat.student_name} updated to '${editSeatNumber}'!`);
      setIsSeatModalOpen(false);
      setEditingSeat(null);

      // Refresh roster
      const seating = await getSeatingAllocations({
        academicYearId: Number(selectedYearId),
        title: selectedExamTitle,
        classId: selectedClassId,
        division: selectedDivision,
      });
      setSeatingRecords(seating || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update seat assignment.");
    } finally {
      setIsSubmittingSeat(false);
    }
  };

  const filteredSeating = seatingRecords.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.student_name.toLowerCase().includes(q) ||
      (s.seat_number || "").toLowerCase().includes(q) ||
      (s.room_number || "").toLowerCase().includes(q) ||
      (s.gr_no || "").toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    if (filteredSeating.length === 0) {
      toast.error("No seating records to export.");
      return;
    }

    const headers = [
      "Assigned Seat",
      "Exam Room",
      "Class",
      "Division",
      "Subject",
      "Student Name",
      "Roll No",
      "GR Number",
      "Status",
    ];
    const rows = filteredSeating.map((st) => [
      st.seat_number,
      st.room_number,
      st.class_name,
      st.division || "",
      st.subject_name,
      st.student_name,
      st.roll_no || "",
      st.gr_no || "",
      "ALLOCATED",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `seating_roster_${selectedExamTitle || "export"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5c28e8] shrink-0 mt-0.5">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                Automatic Exam Seating Allocation
              </h1>
              <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                Exam Module
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-assign room numbers and seat numbers based on Roll No, First Name, Surname, or GR Number. You can also customize individual student seat numbers on demand.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <Button
            variant="outline"
            onClick={() => { resetRoomForm(); setIsRoomModalOpen(true); }}
            className="rounded-xl text-xs gap-1.5 font-bold h-10 px-4 border-gray-200"
          >
            <Building2 className="h-3.5 w-3.5" /> Add Exam Room
          </Button>

          <Button
            onClick={handleAutoGenerate}
            disabled={isGenerating || !selectedExamTitle}
            className="rounded-xl text-xs gap-1.5 font-bold h-10 px-5 bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20"
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Auto-Generate Seating
          </Button>
        </div>
      </div>

      {/* Control Card */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-[#5c28e8]">
            <Sparkles className="h-4 w-4 text-[#5c28e8]" /> EXAM SELECTION & SEATING CONFIGURATION
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Academic Year:</label>
              <Select value={selectedYearId} onValueChange={(val) => { if (val) setSelectedYearId(val); }}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200 font-semibold">
                  <SelectValue placeholder="Select Academic Year">
                    {(() => {
                      const y = academicYears.find((yr) => String(yr.id) === selectedYearId);
                      if (!y) return "Select Academic Year";
                      return y.name || (y.start_year && y.end_year ? `${y.start_year}-${y.end_year}` : `Academic Year #${y.id}`) + (y.is_active ? " (Active)" : "");
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => {
                    const label = y.name || (y.start_year && y.end_year ? `${y.start_year}-${y.end_year}` : `Academic Year #${y.id}`);
                    return (
                      <SelectItem key={y.id} value={String(y.id)}>
                        {label} {y.is_active ? "(Active)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Exam Component:</label>
              <Select value={selectedExamTitle} onValueChange={(val) => { if (val) setSelectedExamTitle(val); }}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200 font-semibold">
                  <SelectValue placeholder="Select Exam Component...">
                    {selectedExamTitle || "Select Exam Component..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from(new Set(exams.map((e) => e.title))).map((title, idx) => (
                    <SelectItem key={idx} value={title}>
                      <span className="font-semibold">{title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Class:</label>
              <Select
                value={selectedClassId}
                onValueChange={(val) => {
                  setSelectedClassId(val || "ALL");
                  setSelectedDivision("ALL");
                }}
              >
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200 font-semibold">
                  <SelectValue placeholder="All Classes">
                    {selectedClassId === "ALL"
                      ? "All Classes (Entire School)"
                      : classes.find((c) => String(c.id) === selectedClassId)?.school_class || `Class #${selectedClassId}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="ALL">
                    <span className="font-bold text-[#5c28e8]">All Classes (Entire School)</span>
                  </SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.school_class}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Division:</label>
              <Select value={selectedDivision} onValueChange={(val) => setSelectedDivision(val || "ALL")}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-gray-200 font-semibold">
                  <SelectValue placeholder="All Divisions">
                    {selectedDivision === "ALL" ? "All Divisions" : `Division ${selectedDivision}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="ALL">
                    <span className="font-bold text-[#5c28e8]">All Divisions</span>
                  </SelectItem>
                  {availableDivisions.map((divName, idx) => (
                    <SelectItem key={idx} value={divName}>
                      Division {divName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Ordering Strategy:</label>
              <Select value={selectedStrategy} onValueChange={(val) => { if (val) setSelectedStrategy(val); }}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800 border-purple-200 font-bold text-[#5c28e8]">
                  <SelectValue placeholder="Ordering Strategy">
                    {selectedStrategy === "ROLL_NO"
                      ? "By Roll Number (1, 2, 3...)"
                      : selectedStrategy === "NAME"
                      ? "By First Name (A to Z)"
                      : selectedStrategy === "SURNAME"
                      ? "By Surname (A to Z)"
                      : selectedStrategy === "GR_NO"
                      ? "By GR Number (Ascending)"
                      : "Randomized / Shuffled"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROLL_NO">By Roll Number (1, 2, 3...)</SelectItem>
                  <SelectItem value="NAME">By First Name (A to Z)</SelectItem>
                  <SelectItem value="SURNAME">By Surname (A to Z)</SelectItem>
                  <SelectItem value="GR_NO">By GR Number (Ascending)</SelectItem>
                  <SelectItem value="RANDOM">Randomized / Shuffled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Search Student / Seat:</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student, seat, room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-xl border-gray-200"
                />
              </div>
            </div>
          </div>

          {/* Exam Rooms Summary Badges */}
          <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-500">Active Exam Rooms ({examRooms.filter(r => r.is_active).length}):</span>
              {examRooms.filter(r => r.is_active).length === 0 ? (
                <span className="text-amber-600 font-semibold">No active rooms — add one below or activate an existing room.</span>
              ) : (
                examRooms.filter(r => r.is_active).map((r) => (
                  <Badge key={r.id} variant="outline" className="bg-emerald-50 text-emerald-700 font-mono text-[11px] border-emerald-200">
                    {r.room_number} (Cap: {r.capacity})
                  </Badge>
                ))
              )}
            </div>

            <Badge variant="outline" className="bg-purple-50 text-[#5c28e8] border-purple-200 text-[11px] font-semibold">
              Strategy: {
                selectedStrategy === "NAME" ? "Alphabetical (First Name)" :
                selectedStrategy === "SURNAME" ? "Alphabetical (Surname)" :
                selectedStrategy === "GR_NO" ? "GR Number" :
                selectedStrategy === "RANDOM" ? "Randomized" : "Roll Number"
              }
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Exam Rooms Management Card */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-zinc-800">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#5c28e8]" /> Exam Rooms Management
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Manage exam rooms — add, edit, delete, or activate/deactivate rooms used for seating allocation.
            </CardDescription>
          </div>
          <Button
            onClick={() => { resetRoomForm(); setIsRoomModalOpen(true); }}
            className="rounded-xl text-xs gap-1.5 font-bold h-9 px-4 bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20"
          >
            <Plus className="h-3.5 w-3.5" /> Add Room
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          {examRooms.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              No exam rooms found. Click &quot;Add Room&quot; to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-gray-100">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-xs uppercase tracking-wider text-slate-500">#</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Room Number</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Building / Block</TableHead>
                    <TableHead className="w-24 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Capacity</TableHead>
                    <TableHead className="w-28 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Status</TableHead>
                    <TableHead className="w-32 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examRooms.map((room, idx) => (
                    <TableRow key={room.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100 font-mono">{room.room_number}</TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-zinc-400">{room.building_block || "—"}</TableCell>
                      <TableCell className="text-center text-xs font-bold font-mono text-[#5c28e8]">{room.capacity}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={room.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                          : "bg-zinc-100 text-zinc-500 border-zinc-200 text-[10px]"
                        }>
                          {room.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditRoom(room)}
                            title="Edit Room"
                            className="h-7 w-7 text-[#5c28e8] hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleRoom(room)}
                            title={room.is_active ? "Deactivate Room" : "Activate Room"}
                            className={`h-7 w-7 rounded-lg ${room.is_active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                          >
                            {room.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRoom(room)}
                            title="Delete Room"
                            className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seating Roster Table */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-zinc-800">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-[#5c28e8]" />
              Seating Allocation Roster ({filteredSeating.length} Students)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Assigned room numbers & seat numbers for students taking this exam. You can customize any student&apos;s seat number or room by clicking the edit icon.
            </CardDescription>
          </div>
          
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={filteredSeating.length === 0}
            className="rounded-xl text-xs gap-1.5 font-semibold text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-9"
          >
            <Download className="h-3.5 w-3.5" /> Export Roster CSV
          </Button>
        </CardHeader>

        <CardContent className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#5c28e8]" /> Loading seating allocation...
            </div>
          ) : filteredSeating.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" /> No seating allocation generated yet for this exam schedule. Click &quot;Auto-Generate Seating&quot; above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-gray-100">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-xs uppercase tracking-wider text-slate-500">#</TableHead>
                    <TableHead className="w-32 font-bold text-xs uppercase tracking-wider text-slate-500">Assigned Seat</TableHead>
                    <TableHead className="w-32 font-bold text-xs uppercase tracking-wider text-slate-500">Exam Room</TableHead>
                    <TableHead className="w-44 font-bold text-xs uppercase tracking-wider text-slate-500">Class & Subject</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Student Name</TableHead>
                    <TableHead className="w-24 font-bold text-xs uppercase tracking-wider text-slate-500">Roll No.</TableHead>
                    <TableHead className="w-28 font-bold text-xs uppercase tracking-wider text-slate-500">GR Number</TableHead>
                    <TableHead className="w-24 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Status</TableHead>
                    <TableHead className="w-20 text-center font-bold text-xs uppercase tracking-wider text-slate-500">Edit</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredSeating.map((st, idx) => (
                    <TableRow key={st.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-center font-mono text-xs text-slate-500">
                        {idx + 1}
                      </TableCell>

                      <TableCell className="font-mono font-extrabold text-xs text-[#5c28e8]">
                        <span className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800">
                          {st.seat_number}
                        </span>
                      </TableCell>

                      <TableCell className="font-semibold text-xs text-slate-700 dark:text-zinc-300">
                        {st.room_number || `Room ${st.room || "—"}`}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-slate-900 dark:text-zinc-100">{st.class_name}{st.division ? ` (Div ${st.division})` : ""}</span>
                          <span className="text-[10px] text-muted-foreground">{st.subject_name}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100 capitalize">
                        {st.student_name}
                      </TableCell>

                      <TableCell className="text-xs font-mono font-semibold text-slate-600">
                        {st.roll_no ? `#${st.roll_no}` : "—"}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-slate-600">
                        {st.gr_no || "N/A"}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] uppercase">
                          Allocated
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenSeatEdit(st)}
                          title="Change Seat Number / Room"
                          className="h-8 w-8 text-[#5c28e8] hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-xl"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Student Seat Allocation Modal */}
      <Dialog open={isSeatModalOpen} onOpenChange={setIsSeatModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-gray-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-zinc-100">
              <Pencil className="h-5 w-5 text-[#5c28e8]" /> Change Student Seating Allocation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Customize the assigned seat number and exam room for <span className="font-bold text-slate-900 dark:text-zinc-100">{editingSeat?.student_name}</span> (Roll: #{editingSeat?.roll_no || "—"}, GR: {editingSeat?.gr_no || "—"}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-zinc-300">Custom Seat Number:</label>
              <Input
                placeholder="e.g. Seat 015 or S-102"
                value={editSeatNumber}
                onChange={(e) => setEditSeatNumber(e.target.value)}
                className="h-11 text-xs rounded-2xl border-gray-200 font-mono font-bold"
              />
              <p className="text-[11px] text-muted-foreground">
                You can assign any custom seat identifier (e.g. Seat 001, Seat 15, Desk A-1).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-zinc-300">Exam Room:</label>
              <Select value={editRoomId} onValueChange={(val) => { if (val) setEditRoomId(val); }}>
                <SelectTrigger className="h-11 text-xs rounded-2xl bg-white dark:bg-zinc-800 border-gray-200 font-semibold">
                  <SelectValue placeholder="Select Exam Room">
                    {examRooms.find((r) => String(r.id) === editRoomId)?.room_number || "Select Room"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {examRooms.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.room_number} (Capacity: {r.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button variant="ghost" onClick={() => { setIsSeatModalOpen(false); setEditingSeat(null); }} className="rounded-xl text-xs h-10">
              Cancel
            </Button>
            <Button
              onClick={handleSaveSeatChange}
              disabled={isSubmittingSeat}
              className="rounded-xl text-xs font-bold h-10 px-5 bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20"
            >
              {isSubmittingSeat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Seat Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Room Modal */}
      <Dialog open={isRoomModalOpen} onOpenChange={setIsRoomModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-gray-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#5c28e8]" /> {editingRoom ? "Edit Exam Room" : "Add Exam Room"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingRoom ? "Update exam room details." : "Define exam room number and seating capacity."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Room Number:</label>
              <Input
                placeholder="e.g. Room 101"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
                className="h-11 text-xs rounded-2xl border-gray-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Building Block (Optional):</label>
              <Input
                placeholder="e.g. Main Block, 1st Floor"
                value={newBuildingBlock}
                onChange={(e) => setNewBuildingBlock(e.target.value)}
                className="h-11 text-xs rounded-2xl border-gray-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Seating Capacity:</label>
              <Input
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="h-11 text-xs rounded-2xl border-gray-200 font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button variant="ghost" onClick={() => { setIsRoomModalOpen(false); resetRoomForm(); }} className="rounded-xl text-xs h-10">
              Cancel
            </Button>
            <Button
              onClick={handleSaveRoom}
              disabled={isSubmittingRoom}
              className="rounded-xl text-xs font-bold h-10 px-5 bg-[#5c28e8] hover:bg-[#4d20cb] text-white shadow-md shadow-purple-500/20"
            >
              {isSubmittingRoom ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingRoom ? "Update Room" : "Save Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
