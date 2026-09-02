"use client";

import { useEffect, useState } from "react";
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
import {
  getExamRooms,
  createExamRoom,
  updateExamRoom,
  deleteExamRoom,
  getExamsFull,
  autoGenerateSeating,
  bulkAutoGenerateSeating,
  getSeatingAllocations,
  type ExamRoom,
  type ExamFull,
  type SeatingRecord,
} from "@/lib/exam-api";

export default function SeatingAllocationPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [examRooms, setExamRooms] = useState<ExamRoom[]>([]);
  const [exams, setExams] = useState<ExamFull[]>([]);
  const [selectedExamTitle, setSelectedExamTitle] = useState<string>("");
  const [seatingRecords, setSeatingRecords] = useState<SeatingRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal for adding/editing room
  const [editingRoom, setEditingRoom] = useState<ExamRoom | null>(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newBuildingBlock, setNewBuildingBlock] = useState("");
  const [newCapacity, setNewCapacity] = useState("30");
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false);

  const resetRoomForm = () => {
    setEditingRoom(null);
    setNewRoomNumber("");
    setNewBuildingBlock("");
    setNewCapacity("30");
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [yearsData, roomsData] = await Promise.all([getAcademicYearsForPrincipal(), getExamRooms()]);
      setAcademicYears(yearsData || []);
      setExamRooms(roomsData || []);

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
        const defaultTitle = selectedExamTitle || uniqueTitles[0];
        if (!selectedExamTitle) setSelectedExamTitle(defaultTitle);

        const seating = await getSeatingAllocations({ academicYearId: Number(selectedYearId), title: defaultTitle });
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
  }, [selectedYearId, selectedExamTitle]);

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
        toast.success(`✅ Exam Room '${newRoomNumber}' updated successfully!`);
      } else {
        await createExamRoom(payload);
        toast.success(`🎉 Exam Room '${newRoomNumber}' added successfully!`);
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
      toast.success(`🗑️ Exam Room '${room.room_number}' deleted!`);
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

  // Trigger Auto-Generate Seating in Bulk
  const handleAutoGenerate = async () => {
    if (!selectedYearId || !selectedExamTitle) {
      toast.error("Please select an academic year and exam component.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await bulkAutoGenerateSeating(Number(selectedYearId), selectedExamTitle);
      toast.success(`⚡ ${res.message || "Bulk auto-generated seating allocation!"}`);
      
      // Refresh current roster view
      const seating = await getSeatingAllocations({ academicYearId: Number(selectedYearId), title: selectedExamTitle });
      setSeatingRecords(seating || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to auto-generate seating allocation.");
    } finally {
      setIsGenerating(false);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Hash className="h-6 w-6 text-blue-600" />
              Automatic Exam Seating Allocation
            </h1>
            <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
              Exam Seating Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Auto-assign room numbers and seat numbers (Seat 001, Seat 002...) to enrolled students upon publishing exam schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => { resetRoomForm(); setIsRoomModalOpen(true); }}
            className="rounded-xl text-xs gap-1.5"
          >
            <Building2 className="h-3.5 w-3.5" /> Add Exam Room
          </Button>

          <Button
            size="sm"
            onClick={handleAutoGenerate}
            disabled={isGenerating || !selectedExamTitle}
            className="rounded-xl text-xs gap-1.5 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Auto-Generate Seating
          </Button>
        </div>
      </div>

      {/* Control Card */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Exam Selection & Seating Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Academic Year:</label>
              <Select value={selectedYearId} onValueChange={(val) => { if (val) setSelectedYearId(val); }}>
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-semibold">
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
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-semibold">
                  <SelectValue placeholder="Select Exam Component..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {Array.from(new Set(exams.map(e => e.title))).map((title, idx) => (
                    <SelectItem key={idx} value={title}>
                      <span className="font-semibold">{title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Search Student / Seat:</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student, seat, room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Exam Rooms Summary Badges */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 text-xs flex-wrap">
            <span className="font-semibold text-slate-500">Active Exam Rooms ({examRooms.filter(r => r.is_active).length}):</span>
            {examRooms.filter(r => r.is_active).length === 0 ? (
              <span className="text-amber-600 font-semibold">⚠️ No active rooms — add one below or activate an existing room.</span>
            ) : (
              examRooms.filter(r => r.is_active).map((r) => (
                <Badge key={r.id} variant="outline" className="bg-emerald-50 text-emerald-700 font-mono text-[11px] border-emerald-200">
                  {r.room_number} (Cap: {r.capacity})
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exam Rooms Management Card */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" /> Exam Rooms Management
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Manage exam rooms — add, edit, delete, or activate/deactivate rooms used for seating allocation.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => { resetRoomForm(); setIsRoomModalOpen(true); }}
            className="rounded-xl text-xs gap-1.5 font-bold bg-blue-600 hover:bg-blue-700 text-white"
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
                <TableHeader className="bg-slate-50 dark:bg-zinc-800/50">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-xs">#</TableHead>
                    <TableHead className="font-bold text-xs">Room Number</TableHead>
                    <TableHead className="font-bold text-xs">Building / Block</TableHead>
                    <TableHead className="w-24 text-center font-bold text-xs">Capacity</TableHead>
                    <TableHead className="w-28 text-center font-bold text-xs">Status</TableHead>
                    <TableHead className="w-32 text-center font-bold text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examRooms.map((room, idx) => (
                    <TableRow key={room.id}>
                      <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100 font-mono">{room.room_number}</TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-zinc-400">{room.building_block || "—"}</TableCell>
                      <TableCell className="text-center text-xs font-bold font-mono text-indigo-600">{room.capacity}</TableCell>
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
                            className="h-7 w-7 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg"
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
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Seating Allocation Roster
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Assigned room numbers & seat numbers for students taking this exam.
            </CardDescription>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            disabled={filteredSeating.length === 0}
            className="rounded-xl text-xs gap-1.5 font-semibold text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <Download className="h-3.5 w-3.5" /> Export Roster CSV
          </Button>
        </CardHeader>

        <CardContent className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" /> Loading seating allocation...
            </div>
          ) : filteredSeating.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500" /> No seating allocation generated yet for this exam schedule. Click "Auto-Generate Seating" above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-zinc-800/50">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-xs">#</TableHead>
                    <TableHead className="w-32 font-bold text-xs">Assigned Seat</TableHead>
                    <TableHead className="w-32 font-bold text-xs">Exam Room</TableHead>
                    <TableHead className="w-48 font-bold text-xs">Class & Subject</TableHead>
                    <TableHead className="font-bold text-xs">Student Name</TableHead>
                    <TableHead className="w-28 font-bold text-xs">Roll No.</TableHead>
                    <TableHead className="w-28 font-bold text-xs">GR Number</TableHead>
                    <TableHead className="w-24 text-center font-bold text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredSeating.map((st, idx) => (
                    <TableRow key={st.id}>
                      <TableCell className="text-center font-mono text-xs text-slate-500">
                        {idx + 1}
                      </TableCell>

                      <TableCell className="font-mono font-extrabold text-xs text-blue-600">
                        {st.seat_number}
                      </TableCell>

                      <TableCell className="font-semibold text-xs text-slate-700 dark:text-zinc-300">
                        {st.room_number}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-slate-900 dark:text-zinc-100">{st.class_name}{st.division ? ` (Div ${st.division})` : ""}</span>
                          <span className="text-[10px] text-muted-foreground">{st.subject_name}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100">
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Room Modal */}
      <Dialog open={isRoomModalOpen} onOpenChange={setIsRoomModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" /> {editingRoom ? "Edit Exam Room" : "Add Exam Room"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingRoom ? "Update exam room details." : "Define exam room number and seating capacity."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold">Room Number:</label>
              <Input
                placeholder="e.g. Room 101"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
                className="h-8 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold">Building Block (Optional):</label>
              <Input
                placeholder="e.g. Main Block, 1st Floor"
                value={newBuildingBlock}
                onChange={(e) => setNewBuildingBlock(e.target.value)}
                className="h-8 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold">Seating Capacity:</label>
              <Input
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="h-8 text-xs rounded-lg font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="ghost" onClick={() => { setIsRoomModalOpen(false); resetRoomForm(); }} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveRoom}
              disabled={isSubmittingRoom}
              className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmittingRoom ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingRoom ? "Update Room" : "Save Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
