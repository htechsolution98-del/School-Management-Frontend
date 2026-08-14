"use client";

import { useState } from "react";
import {
  GraduationCap,
  Save,
  CheckCircle2,
  FileCheck,
  Search,
  Users,
  Award,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StudentMarkRecord {
  id: string;
  grNo: string;
  studentName: string;
  marksObtained: number | string;
  maxMarks: number;
  grade: string;
  status: "Pass" | "Fail" | "Pending";
  isVerified: boolean;
}

export default function EnterMarksPage() {
  const [selectedExam, setSelectedExam] = useState("Mid-Term Exam 2026");
  const [selectedClass, setSelectedClass] = useState("Std1");
  const [selectedDivision, setSelectedDivision] = useState("A");
  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  const [searchQuery, setSearchQuery] = useState("");

  const [studentMarks, setStudentMarks] = useState<StudentMarkRecord[]>([
    {
      id: "1",
      grNo: "1001",
      studentName: "Xyz Abc",
      marksObtained: 88,
      maxMarks: 100,
      grade: "A+",
      status: "Pass",
      isVerified: true,
    },
    {
      id: "2",
      grNo: "1002",
      studentName: "Karan Patel",
      marksObtained: 75,
      maxMarks: 100,
      grade: "A",
      status: "Pass",
      isVerified: false,
    },
  ]);

  const calcGradeAndStatus = (marks: number, max: number): { grade: string; status: "Pass" | "Fail" } => {
    const pct = (marks / max) * 100;
    if (pct >= 90) return { grade: "A+", status: "Pass" };
    if (pct >= 75) return { grade: "A", status: "Pass" };
    if (pct >= 60) return { grade: "B", status: "Pass" };
    if (pct >= 35) return { grade: "C", status: "Pass" };
    return { grade: "F", status: "Fail" };
  };

  const handleMarksChange = (id: string, valStr: string) => {
    const valNum = valStr === "" ? "" : Math.min(100, Math.max(0, Number(valStr) || 0));
    setStudentMarks((prev) =>
      prev.map((rec) => {
        if (rec.id !== id) return rec;
        if (valNum === "") {
          return { ...rec, marksObtained: "", grade: "-", status: "Pending" };
        }
        const { grade, status } = calcGradeAndStatus(Number(valNum), rec.maxMarks);
        return { ...rec, marksObtained: valNum, grade, status };
      })
    );
  };

  const handleSaveDraft = () => {
    toast.success(`Draft saved for ${selectedSubject} (${selectedClass} Div ${selectedDivision})`);
  };

  const handleVerifyAll = () => {
    setStudentMarks((prev) => prev.map((m) => ({ ...m, isVerified: true })));
    toast.success(`🎉 Verified and locked exam marks sheet for ${selectedSubject}!`);
  };

  const filteredStudents = studentMarks.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.studentName.toLowerCase().includes(q) || s.grNo.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2.5">
            <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Enter & Verify Student Exam Marks
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Input subject exam marks, auto-calculate grades, and submit verified marksheets for Class & Subject Teachers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSaveDraft}
            variant="outline"
            className="h-9 text-xs font-bold rounded-xl gap-1.5"
          >
            <Save className="h-4 w-4 text-slate-600" /> Save Draft
          </Button>
          <Button
            onClick={handleVerifyAll}
            className="h-9 text-xs font-bold rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
          >
            <CheckCircle2 className="h-4 w-4" /> Verify & Lock Sheet
          </Button>
        </div>
      </div>

      {/* Selectors Bar */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Exam Term</label>
            <Select value={selectedExam} onValueChange={(v) => v && setSelectedExam(v)}>
              <SelectTrigger className="h-10 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                <SelectValue placeholder="Exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mid-Term Exam 2026">Mid-Term Exam 2026</SelectItem>
                <SelectItem value="Final Exam 2026">Final Exam 2026</SelectItem>
                <SelectItem value="Unit Test 1">Unit Test 1</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Class</label>
            <Select value={selectedClass} onValueChange={(v) => v && setSelectedClass(v)}>
              <SelectTrigger className="h-10 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Std1">Std 1</SelectItem>
                <SelectItem value="Std2">Std 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Division</label>
            <Select value={selectedDivision} onValueChange={(v) => v && setSelectedDivision(v)}>
              <SelectTrigger className="h-10 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                <SelectValue placeholder="Div" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Div A</SelectItem>
                <SelectItem value="B">Div B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Subject</label>
            <Select value={selectedSubject} onValueChange={(v) => v && setSelectedSubject(v)}>
              <SelectTrigger className="h-10 text-xs font-bold rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="Science">Science</SelectItem>
                <SelectItem value="English">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Student Marks Entry Sheet */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-600" />
              Marks Entry Sheet: {selectedSubject} ({selectedClass} - Div {selectedDivision})
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedExam} • Max Marks: 100
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search student or GR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/60"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">#</th>
                  <th className="px-4 py-3.5">Student Name</th>
                  <th className="px-4 py-3.5">GR Number</th>
                  <th className="px-4 py-3.5 w-40 text-center">Marks (Out of 100)</th>
                  <th className="px-4 py-3.5 text-center">Grade</th>
                  <th className="px-4 py-3.5 text-center">Result Status</th>
                  <th className="px-4 py-3.5 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {filteredStudents.map((s, index) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3 text-center font-mono text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-zinc-100">{s.studentName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 font-mono text-[11px]">
                        GR: {s.grNo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={s.marksObtained}
                        onChange={(e) => handleMarksChange(s.id, e.target.value)}
                        className="w-24 h-9 text-xs text-center font-bold font-mono mx-auto rounded-lg bg-slate-50 dark:bg-zinc-800"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className="font-bold text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {s.grade}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={s.status === "Pass" ? "default" : s.status === "Fail" ? "destructive" : "secondary"}
                        className="text-[10px] font-bold"
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.isVerified ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 gap-1 text-[10px] font-bold">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold text-amber-600 border-amber-300">
                          Draft
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
