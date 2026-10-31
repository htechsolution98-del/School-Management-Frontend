"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import {
  Award,
  Sparkles,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Filter,
  Eye,
  Send,
  Layers,
  FileCheck,
  ShieldCheck,
  Globe,
  Printer,
  Download,
  School,
  GraduationCap,
  Calendar,
  User,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { getSavedResultTemplate, saveResultTemplate, type ResultTemplateId } from "@/lib/result-template";
import { ResultTemplatePicker } from "@/components/results/result-template-picker";
import { writePrintableResultCards } from "@/lib/result-report-print";
import { downloadResultReportCardPDF } from "@/lib/result-pdf-generator";
import { ResultCardPreview } from "@/components/results/result-card-preview";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { getAcademicYearsForPrincipal } from "@/lib/principal/academic-year";
import { getClasses } from "@/lib/clerk/classes";
import {
  getFinalResults,
  getWeightageConfigs,
  getExamsFull,
  getExamResultPreview,
  updatePublishedResultTemplate,
  type FinalStudentResult,
  type ResultWeightageConfig,
} from "@/lib/exam-api";

export default function PublishedResultsPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDivFilter, setSelectedDivFilter] = useState<string>("ALL");

  const [resultsData, setResultsData] = useState<FinalStudentResult[]>([]);
  const [weightageConfig, setWeightageConfig] = useState<ResultWeightageConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Detailed Modal view for student official report card
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<any | null>(null);
  const [modalCardData, setModalCardData] = useState<{
    subjects: Array<{ subject: string; maximum: string | number; obtained: string | number; grade?: string; remarks?: string; absent?: boolean }>;
    totals: { maximum: string | number; obtained: string | number; percentage: number | string; grade?: string };
    title: string;
    loading: boolean;
  } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [examPreview, setExamPreview] = useState<any>(null);
  const [finalAvailable, setFinalAvailable] = useState(false);
  const [schoolBrand, setSchoolBrand] = useState({ name: "School", logo: "", address: "", phone: "", email: "", indexNo: "" });
  const [resultTemplate, setResultTemplate] = useState("classic");
  const [templateNeedsPublish, setTemplateNeedsPublish] = useState(false);
  const [isPublishingTemplate, setIsPublishingTemplate] = useState(false);

  const classExams = useMemo(() => exams.filter((exam: any) => {
    const classId = typeof exam.class_group === "object" && exam.class_group ? exam.class_group.id : exam.class_group;
    const yearId = typeof exam.academic_year === "object" && exam.academic_year ? exam.academic_year.id : exam.academic_year;
    const divMatches = selectedDivFilter === "ALL" || !exam.division || exam.division === "ALL" || String(exam.division).toLowerCase() === selectedDivFilter.toLowerCase();
    return String(classId) === selectedClassId && (!yearId || String(yearId) === selectedYearId) && divMatches;
  }), [exams, selectedClassId, selectedYearId, selectedDivFilter]);
  const examMode = Boolean(selectedExamId && selectedExamId !== "FINAL");
  const visibleExamRows = useMemo(() => (examPreview?.students || []).filter((row: any) => row.is_published), [examPreview]);
  const displayResults: any[] = examMode ? visibleExamRows.map((row: any) => {
    const marks = row.marks_obtained === null ? 0 : Number(row.marks_obtained);
    const maxMarks = Number(row.max_marks || examPreview.max_marks || 0);
    const percentage = maxMarks > 0 ? Number(((marks / maxMarks) * 100).toFixed(2)) : 0;
    return { ...row, id: row.student, student: row.student, total_percentage: percentage,
      component_breakdown: { components: [{ name: examPreview.exam_title, type: "EXAM", weightage_pct: 100, score_pct: percentage, contribution_pct: percentage, details: row.is_absent ? "Absent" : `Marks: ${marks}/${maxMarks}` }], final_percentage: percentage } };
  }) : resultsData;

  const classesWithExams = useMemo(() => {
    if (!exams || exams.length === 0) return classes;
    const classIdsWithExams = new Set(
      exams.map((e: any) =>
        String(typeof e.class_group === "object" && e.class_group !== null ? e.class_group.id : e.class_group)
      ).filter(Boolean)
    );
    const filtered = classes.filter((c: any) => classIdsWithExams.has(String(c.id)));
    return filtered.length > 0 ? filtered : classes;
  }, [classes, exams]);

  const availableDivisions = useMemo(() => {
    const set = new Set<string>();
    if (!selectedClassId || selectedClassId === "ALL") {
      exams.forEach((e: any) => { if (e.division && e.division !== "ALL") set.add(String(e.division).trim()); });
      resultsData.forEach((r: any) => { if (r.division) set.add(String(r.division).trim()); });
      return Array.from(set).sort();
    }
    const targetClassId = String(selectedClassId);
    exams.forEach((e: any) => {
      const cId = typeof e.class_group === "object" && e.class_group !== null ? e.class_group.id : e.class_group;
      if (String(cId) === targetClassId && e.division && e.division !== "ALL") {
        set.add(String(e.division).trim());
      }
    });
    resultsData.forEach((r: any) => {
      if (r.division) set.add(String(r.division).trim());
    });
    return Array.from(set).sort();
  }, [selectedClassId, exams, resultsData]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [yearsRes, classesRes] = await Promise.allSettled([
        getAcademicYearsForPrincipal(),
        getClasses(),
      ]);

      const yearsData = yearsRes.status === "fulfilled" ? yearsRes.value : [];
      const classesData = classesRes.status === "fulfilled" ? classesRes.value : [];
      setAcademicYears(yearsData || []);
      setClasses(classesData || []);

      let resolvedYearId = "";
      if (yearsData && yearsData.length > 0) {
        const activeYr = yearsData.find((y: any) => y.is_active) || yearsData[0];
        resolvedYearId = String(activeYr.id);
        setSelectedYearId(resolvedYearId);

        const examsList = await getExamsFull({ academic_year: Number(resolvedYearId) });
        setExams(examsList || []);

        const classIdsWithExams = new Set(
          (examsList || []).map((e: any) =>
            String(typeof e.class_group === "object" && e.class_group !== null ? e.class_group.id : e.class_group)
          ).filter(Boolean)
        );

        if (classesData && classesData.length > 0 && !selectedClassId) {
          const firstValidClass = classesData.find((c: any) => classIdsWithExams.has(String(c.id))) || classesData[0];
          setSelectedClassId(String(firstValidClass.id));
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load initial data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    setResultTemplate(getSavedResultTemplate());
    try {
      setSchoolBrand((brand) => ({ ...brand, name: localStorage.getItem("school_name") || brand.name, logo: localStorage.getItem("school_logo") || "" }));
    } catch {}
  }, []);

  useEffect(() => {
    const fetchPublishedResults = async () => {
      if (!selectedYearId || !selectedClassId) return;
      setIsLoading(true);
      try {
        const [configs, fetched] = await Promise.allSettled([
          getWeightageConfigs(Number(selectedYearId)),
          getFinalResults(
            Number(selectedYearId),
            Number(selectedClassId),
            selectedDivFilter !== "ALL" ? selectedDivFilter : undefined
          ),
        ]);

        if (configs.status === "fulfilled" && configs.value.length > 0) {
          setWeightageConfig(configs.value[0]);
        }

        if (fetched.status === "fulfilled") {
          const publishedResults = (fetched.value || []).filter((result) => result.is_published);
          setResultsData(publishedResults);
          if (publishedResults[0]?.report_template) {
            setResultTemplate(publishedResults[0].report_template);
            saveResultTemplate(publishedResults[0].report_template);
          }
          setTemplateNeedsPublish(false);
        }
      } catch (err) {
        console.error("Failed to load published results", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedYearId && selectedClassId) {
      fetchPublishedResults();
    }
  }, [selectedYearId, selectedClassId, selectedDivFilter]);

  useEffect(() => {
    if (!selectedExamId || selectedExamId === "FINAL") { setExamPreview(null); setTemplateNeedsPublish(false); return; }
    setTemplateNeedsPublish(false);
    let active = true;
    getExamResultPreview(Number(selectedExamId), selectedDivFilter)
      .then((data) => {
        if (!active) return;
        setExamPreview(data);
        const publishedTemplate = data.students?.find((row: any) => row.is_published)?.report_template;
        if (publishedTemplate) { setResultTemplate(publishedTemplate); saveResultTemplate(publishedTemplate); setTemplateNeedsPublish(false); }
      })
      .catch(() => { if (active) setExamPreview(null); });
    return () => { active = false; };
  }, [selectedExamId, selectedDivFilter]);

  useEffect(() => {
    if (!classExams.length) { setSelectedExamId(""); setExamPreview(null); return; }
    if (selectedExamId === "FINAL" && !finalAvailable) setSelectedExamId(String(classExams[0].id));
    if (selectedExamId !== "FINAL" && !classExams.some((exam: any) => String(exam.id) === selectedExamId)) setSelectedExamId(String(classExams[0].id));
  }, [classExams, selectedExamId, finalAvailable]);

  useEffect(() => {
    setFinalAvailable(resultsData.some((result) => result.is_published));
  }, [resultsData]);

  const openMarksheetsForPrint = async (rows: any[], onlyStudentId?: string | number) => {
    if (!rows.length) { toast.error("There are no published results to print."); return; }
    const activeTemplate = rows.find((row: any) => row.report_template)?.report_template || getSavedResultTemplate();
    setResultTemplate(activeTemplate);
    const printWindow = window.open("", "_blank", "popup,width=1100,height=850");
    if (!printWindow) { toast.error("Allow pop-ups to print marksheets."); return; }
    printWindow.document.write("<!doctype html><html><body style='font:14px Arial;padding:32px;color:#334155'>Preparing result report cards…</body></html>");

    const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char] || char));
    let rowsToPrint = rows;
    let reportHeading = examMode ? (examPreview?.term_name || examPreview?.exam_title || "Examination") : "Final Academic Result";

    // A term contains one exam record per subject. Gather only published subject results
    // from that same term so a term report card is complete without filling missing marks.
    if (examMode) {
      const selectedExam = classExams.find((exam: any) => String(exam.id) === selectedExamId);
      if (selectedExam) {
        const termKey = selectedExam.exam_term?.id ?? selectedExam.exam_term ?? selectedExam.term_name ?? selectedExam.title;
        const termExams = classExams.filter((exam: any) => {
          const candidateKey = exam.exam_term?.id ?? exam.exam_term ?? exam.term_name ?? exam.title;
          return String(candidateKey) === String(termKey);
        });
        const previews: PromiseSettledResult<any>[] = [];
        for (const exam of termExams) {
          try {
            const preview = String(exam.id) === selectedExamId
              ? examPreview
              : await getExamResultPreview(Number(exam.id), selectedDivFilter);
            previews.push({ status: "fulfilled", value: preview });
          } catch (reason) {
            previews.push({ status: "rejected", reason });
          }
        }
        if (previews.some((previewResult) => previewResult.status === "rejected")) {
          printWindow.close();
          toast.error("Could not load every published subject result for this term. Please retry before printing.");
          return;
        }
        const byStudent = new Map<string, any>();
        previews.forEach((previewResult, examIndex) => {
          if (previewResult.status !== "fulfilled") return;
          const preview = previewResult.value;
          const termExam = termExams[examIndex];
          (preview?.students || []).filter((student: any) =>
            student.is_published && (!onlyStudentId || String(student.student ?? student.student_id ?? student.id) === String(onlyStudentId))
          ).forEach((student: any) => {
            const studentId = String(student.student ?? student.student_id ?? student.id ?? "");
            if (!studentId) return;
            const report = byStudent.get(studentId) || {
              ...student,
              id: studentId,
              student: studentId,
              subject_results: [],
              student_name: student.student_name || student.name,
              roll_no: student.roll_no || student.roll_number,
              gr_no: student.gr_no,
              division: student.division,
            };
            report.subject_results.push({
              subject_name: preview.subject_name || termExam.subject_name || termExam.title,
              max_marks: student.max_marks ?? preview.max_marks ?? termExam.max_marks,
              marks_obtained: student.marks_obtained,
              is_absent: student.is_absent,
              grade: student.grade,
              remarks: student.remarks,
            });
            byStudent.set(studentId, report);
          });
        });
        if (byStudent.size) {
          rowsToPrint = Array.from(byStudent.values()).map((student: any) => {
            const obtained = student.subject_results.reduce((sum: number, subject: any) => sum + (Number(subject.marks_obtained) || 0), 0);
            const maximum = student.subject_results.reduce((sum: number, subject: any) => sum + (Number(subject.max_marks) || 0), 0);
            return {
              ...student,
              total_marks_obtained: obtained,
              total_max_marks: maximum,
              total_percentage: maximum ? Number(((obtained / maximum) * 100).toFixed(2)) : 0,
              grade: student.subject_results.length === 1 ? student.subject_results[0].grade : null,
              remarks: student.subject_results.map((subject: any) => subject.remarks).filter(Boolean).join(" · "),
            };
          });
        }
        if (onlyStudentId && !byStudent.has(String(onlyStudentId))) {
          printWindow.close();
          toast.error("No published marksheet was found for this student.");
          return;
        }
        reportHeading = selectedExam.term_name || selectedExam.title || reportHeading;
      }
    }

    const studentReports = rowsToPrint.map((result: any) => {
      const subjectRows = examMode
        ? (result.subject_results || [{ subject_name: examPreview?.subject_name || examPreview?.exam_title, max_marks: result.max_marks, marks_obtained: result.marks_obtained, is_absent: result.is_absent, grade: result.grade, remarks: result.remarks }]).map((subject: any) => ({
            subject: subject.subject_name,
            maximum: subject.max_marks,
            obtained: subject.marks_obtained,
            grade: subject.grade,
            remarks: subject.remarks,
            absent: subject.is_absent,
          }))
        : (result.component_breakdown?.components || []).map((component: any) => ({
            subject: component.name,
            maximum: `${component.weightage_pct}% weight`,
            obtained: `${component.score_pct}%`,
            grade: "",
            remarks: component.details || "",
          }));
      const totalMaximum = Number(result.total_max_marks ?? (examMode ? subjectRows.reduce((sum: number, subject: any) => sum + (Number(subject.maximum) || 0), 0) : 100));
      const totalObtained = Number(result.total_marks_obtained ?? (examMode ? subjectRows.reduce((sum: number, subject: any) => sum + (Number(subject.obtained) || 0), 0) : Number(result.total_percentage || 0)));
      const percent = Number(result.total_percentage ?? (totalMaximum ? (totalObtained / totalMaximum) * 100 : 0));
      const grade = result.grade || (examMode ? (percent >= 90 ? "A+" : percent >= 75 ? "A" : percent >= 60 ? "B" : percent >= 40 ? "C" : "F") : "");
      return {
        studentId: result.student || result.student_id || result.id,
        name: result.student_name,
        rollNumber: result.roll_no,
        admissionNumber: result.gr_no,
        className: currentClassObj?.school_class,
        division: result.division && result.division !== "ALL" ? result.division : selectedDivFilter !== "ALL" ? selectedDivFilter : "",
        photo: result.photo || result.profile_photo,
        subjects: subjectRows,
        totalMaximum: examMode ? totalMaximum : "100%",
        totalObtained: examMode ? totalObtained : `${Number(result.total_percentage || 0).toFixed(2)}%`,
        percentage: percent.toFixed(2),
        overallGrade: grade,
        remarks: result.remarks || "",
      };
    });
    await writePrintableResultCards({
      printWindow,
      students: studentReports,
      school: schoolBrand,
      title: reportHeading,
      academicYear: currentYearObj?.name || (currentYearObj?.start_year ? `${currentYearObj.start_year} - ${currentYearObj.end_year}` : ""),
      template: activeTemplate,
    });
  };
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  useEffect(() => {
    if (!selectedStudentForCard) {
      setModalCardData(null);
      return;
    }

    let active = true;

    if (!examMode) {
      const components = selectedStudentForCard.component_breakdown?.components || [];
      const subjects = components.map((component: any) => ({
        subject: component.name,
        maximum: `${component.weightage_pct}% weight`,
        obtained: `${component.score_pct}%`,
        remarks: component.details,
      }));
      setModalCardData({
        subjects,
        totals: {
          maximum: "100%",
          obtained: `${Number(selectedStudentForCard.total_percentage || 0).toFixed(2)}%`,
          percentage: Number(selectedStudentForCard.total_percentage || 0).toFixed(2),
          grade: selectedStudentForCard.grade,
        },
        title: "Final Examination",
        loading: false,
      });
      return;
    }

    const studentId = String(selectedStudentForCard.student ?? selectedStudentForCard.student_id ?? selectedStudentForCard.id ?? "");
    const selectedExam = classExams.find((exam: any) => String(exam.id) === selectedExamId);
    const termKey = selectedExam?.exam_term?.id ?? selectedExam?.exam_term ?? selectedExam?.term_name ?? selectedExam?.title;
    const termExams = classExams.filter((exam: any) => {
      const key = exam.exam_term?.id ?? exam.exam_term ?? exam.term_name ?? exam.title;
      return String(key).toLowerCase() === String(termKey).toLowerCase();
    });

    const reportTitle = (selectedExam?.title || examPreview?.exam_title || "TERM 1 EXAMINATION").toUpperCase();

    const initialSub = [{
      subject: examPreview?.subject_name || selectedExam?.subject_name || selectedExam?.title || "Exam",
      maximum: selectedStudentForCard.max_marks ?? examPreview?.max_marks ?? 50,
      obtained: selectedStudentForCard.is_absent ? "Absent" : selectedStudentForCard.marks_obtained ?? 0,
      grade: selectedStudentForCard.grade,
      remarks: selectedStudentForCard.remarks,
      absent: selectedStudentForCard.is_absent,
    }];
    setModalCardData({
      subjects: initialSub,
      totals: {
        maximum: selectedStudentForCard.max_marks ?? examPreview?.max_marks ?? 50,
        obtained: selectedStudentForCard.is_absent ? "Absent" : selectedStudentForCard.marks_obtained ?? 0,
        percentage: Number(selectedStudentForCard.total_percentage || 0).toFixed(2),
        grade: selectedStudentForCard.grade,
      },
      title: reportTitle,
      loading: termExams.length > 1,
    });

    if (termExams.length <= 1) return;

    (async () => {
      try {
        const fullSubjects: Array<{ subject: string; maximum: string | number; obtained: string | number; grade?: string; remarks?: string; absent?: boolean }> = [];
        let totalMax = 0;
        let totalObt = 0;

        for (const exam of termExams) {
          const preview = String(exam.id) === selectedExamId
            ? examPreview
            : await getExamResultPreview(Number(exam.id), selectedDivFilter);
          const foundSt = (preview?.students || []).find((s: any) => String(s.student ?? s.student_id ?? s.id) === studentId);
          if (foundSt) {
            const subName = preview?.subject_name || exam.subject_name || exam.title;
            const mMax = Number(foundSt.max_marks ?? preview?.max_marks ?? 50);
            const mObt = foundSt.is_absent ? 0 : Number(foundSt.marks_obtained ?? 0);
            totalMax += mMax;
            totalObt += mObt;
            fullSubjects.push({
              subject: subName,
              maximum: mMax,
              obtained: foundSt.is_absent ? "Absent" : foundSt.marks_obtained ?? 0,
              grade: foundSt.grade,
              remarks: foundSt.remarks,
              absent: foundSt.is_absent,
            });
          }
        }

        if (!active) return;

        if (fullSubjects.length > 0) {
          const pct = totalMax > 0 ? (totalObt / totalMax) * 100 : 0;
          const grade = pct >= 90 ? "a+" : pct >= 80 ? "a" : pct >= 70 ? "b+" : pct >= 60 ? "b" : pct >= 40 ? "c" : "f";
          setModalCardData({
            subjects: fullSubjects,
            totals: {
              maximum: totalMax,
              obtained: totalObt,
              percentage: pct.toFixed(2),
              grade,
            },
            title: reportTitle,
            loading: false,
          });
        }
      } catch {
        if (active) setModalCardData((prev) => prev ? { ...prev, loading: false } : null);
      }
    })();

    return () => { active = false; };
  }, [selectedStudentForCard, examMode, selectedExamId, classExams, examPreview, selectedDivFilter]);

  const handleDownloadPDF = async () => {
    if (!selectedStudentForCard) return;
    setIsDownloadingPDF(true);
    try {
      const studentId = String(selectedStudentForCard.student ?? selectedStudentForCard.student_id ?? selectedStudentForCard.id ?? "");
      const studentName = selectedStudentForCard.student_name || selectedStudentForCard.name || "Student";
      const rollNumber = selectedStudentForCard.roll_no || selectedStudentForCard.roll_number || "—";
      const admissionNumber = selectedStudentForCard.gr_no || selectedStudentForCard.admission_no || "—";
      const className = [
        currentClassObj?.school_class,
        selectedStudentForCard.division && selectedStudentForCard.division !== "ALL"
          ? selectedStudentForCard.division
          : selectedDivFilter !== "ALL" ? selectedDivFilter : ""
      ].filter(Boolean).join(" - ");

      const subjectsToInclude = modalCardData?.subjects?.length
        ? modalCardData.subjects
        : [{
            subject: examPreview?.subject_name || examPreview?.exam_title || "Subject",
            maximum: selectedStudentForCard.max_marks ?? 50,
            obtained: selectedStudentForCard.is_absent ? "Absent" : selectedStudentForCard.marks_obtained ?? 0,
            grade: selectedStudentForCard.grade,
            remarks: selectedStudentForCard.remarks,
            absent: selectedStudentForCard.is_absent,
          }];

      const totalsToInclude = modalCardData?.totals || {
        maximum: selectedStudentForCard.max_marks ?? 50,
        obtained: selectedStudentForCard.is_absent ? "Absent" : selectedStudentForCard.marks_obtained ?? 0,
        percentage: Number(selectedStudentForCard.total_percentage || 0).toFixed(2),
        grade: selectedStudentForCard.grade || "A",
      };

      await downloadResultReportCardPDF({
        school: {
          name: schoolBrand.name,
          logo: schoolBrand.logo,
          address: schoolBrand.address,
          phone: schoolBrand.phone,
          email: schoolBrand.email,
          academicYear: currentYearObj?.name || (currentYearObj?.start_year ? `${currentYearObj.start_year} - ${currentYearObj.end_year}` : "2026-27"),
        },
        title: modalCardData?.title || (examMode ? (examPreview?.term_name || examPreview?.exam_title || "TERM 1 EXAMINATION") : "Final Academic Result"),
        student: {
          id: studentId,
          name: studentName,
          rollNumber,
          admissionNumber,
          className,
          photo: selectedStudentForCard.photo || selectedStudentForCard.profile_photo,
        },
        subjects: subjectsToInclude,
        totals: totalsToInclude,
        remarks: selectedStudentForCard.remarks,
        template: resultTemplate as ResultTemplateId,
      });

      toast.success(`Result PDF for ${studentName} downloaded successfully!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download PDF.");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handlePrint = () => {
    if (selectedStudentForCard) {
      const studentId = selectedStudentForCard.student ?? selectedStudentForCard.student_id ?? selectedStudentForCard.id;
      openMarksheetsForPrint([selectedStudentForCard], studentId);
    }
  };

  const handlePrintClass = () => {
    setResultTemplate(getSavedResultTemplate());
    openMarksheetsForPrint(displayResults);
  };

  const handlePublishedTemplateChange = (template: ResultTemplateId) => {
    setResultTemplate(template);
    setTemplateNeedsPublish(displayResults.some((row) => row.report_template !== template));
  };

  const handlePublishUpdatedTemplate = async () => {
    if (!templateNeedsPublish || !displayResults.length) return;
    setIsPublishingTemplate(true);
    try {
      if (examMode) {
        await updatePublishedResultTemplate({ scope: "exam", exam: Number(selectedExamId), division: selectedDivFilter, template: resultTemplate as ResultTemplateId });
        setExamPreview((current: any) => current ? { ...current, students: current.students.map((row: any) => row.is_published ? { ...row, report_template: resultTemplate } : row) } : current);
      } else {
        await updatePublishedResultTemplate({ scope: "final", academic_year: Number(selectedYearId), school_class: Number(selectedClassId), division: selectedDivFilter, template: resultTemplate as ResultTemplateId });
        setResultsData((current) => current.map((row) => row.is_published ? { ...row, report_template: resultTemplate as ResultTemplateId } : row));
      }
      setTemplateNeedsPublish(false);
      toast.success("Updated marksheet template published to student and teacher results.");
    } catch (err: any) {
      toast.error(err?.message || "Could not publish the updated marksheet template.");
    } finally {
      setIsPublishingTemplate(false);
    }
  };

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return resultsData;
    const q = searchQuery.toLowerCase();
    return resultsData.filter(
      (r) =>
        r.student_name?.toLowerCase().includes(q) ||
        r.roll_no?.toLowerCase().includes(q) ||
        r.gr_no?.toLowerCase().includes(q) ||
        r.grade?.toLowerCase().includes(q)
    );
  }, [resultsData, searchQuery]);

  const filteredDisplayResults = examMode
    ? displayResults.filter((r) => `${r.student_name || ""} ${r.roll_no || ""} ${r.gr_no || ""}`.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredResults;

  const stats = useMemo(() => {
    if (resultsData.length === 0) return { count: 0, avg: "0.00", passRate: "0%", highest: "0.00" };
    const totalCount = resultsData.length;
    const passedCount = resultsData.filter((r) => r.grade !== "F").length;
    const pcts = resultsData.map((r) => Number(r.total_percentage || r.percentage || 0));
    const avg = (pcts.reduce((a, b) => a + b, 0) / totalCount).toFixed(2);
    const highest = Math.max(...pcts).toFixed(2);
    const passRate = `${Math.round((passedCount / totalCount) * 100)}%`;
    return { count: totalCount, avg, passRate, highest };
  }, [resultsData]);

  const currentClassObj = classes.find((c) => String(c.id) === selectedClassId);
  const currentYearObj = academicYears.find((y) => String(y.id) === selectedYearId);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-[#5c28e8]">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                  Official Published Results & Report Cards (Section 22)
                </h1>
                <Badge className="bg-purple-50 text-[#5c28e8] border-purple-200 font-semibold text-[11px]">
                  Live Published Ledger
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Complete institutional archive of published student report cards with normalized breakdown and printable marksheet certificates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Filters */}
      <Card className="rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
          <CardTitle className="text-xs font-bold text-[#5c28e8] dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-4 w-4" /> Filter Published Results
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Academic Year:</label>
              <Select value={selectedYearId} onValueChange={(val) => { if (val) setSelectedYearId(val); }}>
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-semibold">
                  <SelectValue placeholder="Select Academic Year">
                    {academicYears.find((y) => String(y.id) === selectedYearId)
                      ? (academicYears.find((y) => String(y.id) === selectedYearId).name ||
                         `${academicYears.find((y) => String(y.id) === selectedYearId).start_year || ""}-${academicYears.find((y) => String(y.id) === selectedYearId).end_year || ""}`.replace(/^-$/, "") ||
                         `Academic Year #${selectedYearId}`)
                      : "Select Academic Year"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => {
                    const label = y.name || (y.start_year && y.end_year ? `${y.start_year}-${y.end_year}` : `Academic Year #${y.id}`);
                    return (
                      <SelectItem key={y.id} value={String(y.id)}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Class:</label>
              <Select
                value={selectedClassId}
                onValueChange={(val) => {
                  if (val) {
                    setSelectedClassId(val);
                    setSelectedDivFilter("ALL");
                  }
                }}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-semibold">
                  <SelectValue placeholder="Select Class...">
                    {classesWithExams.find((cls) => String(cls.id) === selectedClassId)?.school_class || (selectedClassId ? `Class #${selectedClassId}` : "Select Class...")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classesWithExams.map((cls) => (
                    <SelectItem key={cls.id} value={String(cls.id)}>
                      {cls.school_class}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Division:</label>
              <Select value={selectedDivFilter} onValueChange={(val) => { if (val) setSelectedDivFilter(val); }}>
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-semibold">
                  <SelectValue placeholder="All Divisions">
                    {selectedDivFilter === "ALL" ? "All Divisions" : `Division ${selectedDivFilter}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Divisions</SelectItem>
                  {availableDivisions.map((divName) => (
                    <SelectItem key={divName} value={divName}>
                      Division {divName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Published exam:</label>
              <Select value={selectedExamId} onValueChange={(value) => { if (value) setSelectedExamId(value); }}>
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-zinc-800 font-semibold"><SelectValue placeholder="Select exam" /></SelectTrigger>
                <SelectContent>
                  {classExams.map((exam: any) => <SelectItem key={exam.id} value={String(exam.id)}>{exam.title}{exam.subject_name ? ` — ${exam.subject_name}` : ""}</SelectItem>)}
                  {finalAvailable && resultsData.length > 0 && <SelectItem value="FINAL">Final Annual Result</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {displayResults.length > 0 && <Card className="rounded-2xl border border-indigo-100 bg-white shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-bold text-slate-900">Published marksheet template</CardTitle><CardDescription>Change the layout for every student in this published exam or final result set.</CardDescription></CardHeader>
        <CardContent className="space-y-4"><ResultTemplatePicker key={resultTemplate} onChange={handlePublishedTemplateChange} />
          {templateNeedsPublish && <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-medium text-amber-900">The selected template is pending publication. Student and teacher marksheets will update after you publish it.</p><Button onClick={handlePublishUpdatedTemplate} disabled={isPublishingTemplate} className="shrink-0 gap-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">{isPublishingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{isPublishingTemplate ? "Publishing…" : "Publish Updated Template"}</Button></div>}
        </CardContent>
      </Card>}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-muted-foreground uppercase">Published Students</span>
            <div className="text-2xl font-black text-slate-900 dark:text-zinc-100 mt-1">{examMode ? displayResults.length : stats.count}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-muted-foreground uppercase">Class Average</span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{examMode ? (displayResults.length ? (displayResults.reduce((sum, r) => sum + Number(r.total_percentage), 0) / displayResults.length).toFixed(2) : "0.00") : stats.avg}%</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-muted-foreground uppercase">Highest Score</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{examMode ? (displayResults.length ? Math.max(...displayResults.map((r) => Number(r.total_percentage))).toFixed(2) : "0.00") : stats.highest}%</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold text-muted-foreground uppercase">Passing Rate</span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{examMode ? `${displayResults.length ? Math.round(displayResults.filter((r) => r.grade !== "F").length * 100 / displayResults.length) : 0}%` : stats.passRate}</div>
          </CardContent>
        </Card>
      </div>

      {/* Published Ledger Table */}
      <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" />
              {examMode ? `${examPreview?.exam_title || "Exam"} Published Marksheet` : "Final Academic Results"} — {currentClassObj?.school_class || "Class"}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Official published marks records accessible by students and parents.
            </CardDescription>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button onClick={handlePrintClass} disabled={filteredDisplayResults.length === 0} variant="outline" className="h-8 rounded-xl text-xs font-bold gap-2">
              <Printer className="h-3.5 w-3.5" /> Print Class Marksheets
            </Button>
            <div className="w-full sm:w-64">
            <Input
              placeholder="Search by student, roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs rounded-xl"
            />
            </div>
          </div>
        </CardHeader>

        {filteredDisplayResults.length === 0 ? (
          <CardContent className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
            <Award className="h-8 w-8 text-slate-400" />
            <div>
              <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                No Published Results Found
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Publish results for this class from the <strong>Result Publish</strong> menu.
              </p>
            </div>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold text-xs">#</TableHead>
                    <TableHead className="w-16 text-center font-bold text-xs">Roll</TableHead>
                    <TableHead className="w-20 text-center font-bold text-xs">GR No.</TableHead>
                    <TableHead className="font-bold text-xs min-w-[180px]">Student Name</TableHead>
                    <TableHead className="text-center font-bold text-xs">{examMode ? "Marks" : "Final %"}</TableHead>
                    <TableHead className="text-center font-bold text-xs">Grade</TableHead>
                    <TableHead className="text-center font-bold text-xs">Status</TableHead>
                    <TableHead className="text-center font-bold text-xs w-36">Report Card</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisplayResults.map((res: any, idx: number) => (
                    <TableRow key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50">
                      <TableCell className="text-center font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold text-indigo-600">{res.roll_no || "—"}</TableCell>
                      <TableCell className="text-center font-mono text-xs text-slate-600 dark:text-zinc-400">{res.gr_no || "—"}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-900 dark:text-zinc-100">{res.student_name || `Student #${res.student}`}</TableCell>
                      <TableCell className="text-center text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
                        {examMode ? `${res.is_absent ? "Absent" : res.marks_obtained} / ${res.max_marks}` : `${res.total_percentage !== undefined ? res.total_percentage : res.percentage}%`}
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold">
                        <span className={`px-2 py-0.5 rounded font-extrabold ${res.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {res.grade}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          PUBLISHED
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <Button
                          onClick={() => setSelectedStudentForCard(res)}
                          className="h-8 text-xs bg-[#5c28e8] hover:bg-[#4d20cb] text-white font-bold rounded-xl gap-1.5 shadow-md shadow-purple-500/20 px-3"
                        >
                          <Printer className="h-3.5 w-3.5" /> View Marksheet
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Official Printable Report Card Dialog */}
      <div id="result-bulk-print" className={`result-template-${resultTemplate}`} aria-hidden="true">
        {displayResults.map((result: any, index: number) => {
          const examMarks = examMode ? Number(result.marks_obtained || 0) : Number(result.total_marks_obtained || 0);
          const maxMarks = examMode ? Number(result.max_marks || 0) : Number(result.total_max_marks || 0);
          return <section className="bulk-mark-sheet" key={`${result.id}-${index}`} style={{ "--result-accent": resultTemplate === "modern" ? "#5c28e8" : resultTemplate === "compact" ? "#0f766e" : "#17325c" } as CSSProperties}>
            <header className="bulk-school-header">
              {schoolBrand.logo && <img src={schoolBrand.logo} alt="School logo" />}
              <div><h1>{schoolBrand.name}</h1>{schoolBrand.indexNo && <p>School Index: {schoolBrand.indexNo}</p>}{schoolBrand.address && <p>{schoolBrand.address}</p>}{(schoolBrand.phone || schoolBrand.email) && <p>{[schoolBrand.phone, schoolBrand.email].filter(Boolean).join(" · ")}</p>}</div>
              <div className="bulk-document-title"><strong>{examMode ? examPreview?.exam_title : "Final Academic Result"}</strong><span>{currentYearObj?.name || `${currentYearObj?.start_year || ""}-${currentYearObj?.end_year || ""}`}</span></div>
            </header>
            <div className="bulk-student-info">
              <span><b>Student</b>{result.student_name}</span><span><b>Roll No.</b>{result.roll_no || "—"}</span><span><b>GR No.</b>{result.gr_no || "—"}</span><span><b>Class / Division</b>{currentClassObj?.school_class || "—"} / {result.division || selectedDivFilter}</span>
            </div>
            <table><thead><tr><th>Subject / Component</th><th>Marks</th><th>Maximum</th><th>Grade</th><th>Status</th></tr></thead><tbody>
              {examMode ? <tr><td>{examPreview?.subject_name || examPreview?.exam_title}</td><td>{result.is_absent ? "Absent" : result.marks_obtained}</td><td>{result.max_marks}</td><td>{result.grade || "—"}</td><td>Published</td></tr> : (result.component_breakdown?.components || []).map((component: any, i: number) => <tr key={i}><td>{component.name}{component.details && <small>{component.details}</small>}</td><td>{component.score_pct ?? "—"}%</td><td>{component.weightage_pct ?? "—"}% weight</td><td>—</td><td>Published</td></tr>)}
            </tbody></table>
            <div className="bulk-summary"><span>Total {maxMarks > 0 ? `${examMarks} / ${maxMarks}` : `${Number(result.total_percentage || 0).toFixed(2)}%`}</span><span>Percentage: {Number(result.total_percentage || 0).toFixed(2)}%</span><span>Grade: {result.grade || "—"}</span></div>
            <footer><span>Class Teacher</span><span>Principal</span><span>Parent / Guardian</span></footer>
          </section>;
        })}
      </div>
      <style jsx global>{`
        #result-bulk-print { display: none; }
        @media print {
          body.print-class-results * { visibility: hidden !important; }
          body.print-class-results #result-bulk-print, body.print-class-results #result-bulk-print * { visibility: visible !important; }
          body.print-class-results #result-bulk-print { display: block !important; position: absolute; inset: 0; width: 100%; background: white; color: #111827; padding: 0; }
          body.print-class-results .bulk-mark-sheet { --result-accent: #17325c; page-break-after: always; break-after: page; padding: 10mm; font: 11px Arial, sans-serif; }
          body.print-class-results .bulk-mark-sheet:last-child { page-break-after: auto; break-after: auto; }
          body.print-class-results .bulk-school-header { display: flex; gap: 12px; align-items: center; border-bottom: 3px solid var(--result-accent); padding-bottom: 10px; }
          body.print-class-results .bulk-school-header img { width: 60px; height: 60px; object-fit: contain; }
          body.print-class-results .bulk-school-header h1 { margin: 0; color: var(--result-accent); font-size: 20px; }
          body.print-class-results .bulk-school-header p { margin: 2px 0; font-size: 9px; }
          body.print-class-results .bulk-document-title { margin-left: auto; text-align: right; display: grid; }
          body.print-class-results .bulk-document-title strong { color: var(--result-accent); font-size: 14px; }
          body.print-class-results .bulk-student-info { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin: 18px 0; padding: 10px; background: #f3f4f6; }
          body.print-class-results .bulk-student-info span { display: grid; gap: 3px; }
          body.print-class-results .bulk-student-info b { font-size: 9px; color: #64748b; text-transform: uppercase; }
          body.print-class-results .bulk-mark-sheet table { width: 100%; border-collapse: collapse; }
          body.print-class-results .bulk-mark-sheet th { text-align: left; color: white; background: var(--result-accent); padding: 8px; }
          body.print-class-results .bulk-mark-sheet td { border-bottom: 1px solid #cbd5e1; padding: 8px; }
          body.print-class-results .bulk-mark-sheet small { display: block; color: #64748b; }
          body.print-class-results .bulk-summary { display: flex; justify-content: space-between; margin-top: 18px; border-top: 2px solid var(--result-accent); padding-top: 12px; font-weight: bold; }
          body.print-class-results .bulk-mark-sheet footer { display: flex; justify-content: space-around; margin-top: 65px; }
          body.print-class-results .bulk-mark-sheet footer span { border-top: 1px solid #475569; padding: 6px 18px 0; }
        }
      `}</style>
      <Dialog open={!!selectedStudentForCard} onOpenChange={(open) => { if (!open) setSelectedStudentForCard(null); }}>
        <DialogContent className="fixed inset-0 left-0 top-0 flex h-[100dvh] w-screen max-h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-slate-50 p-0 sm:left-1/2 sm:top-1/2 sm:h-[92dvh] sm:w-[94vw] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
            {selectedStudentForCard && <ResultCardPreview
              title={modalCardData?.title || (examMode ? examPreview?.exam_title || "Exam Result" : "Final Examination")}
              template={resultTemplate as ResultTemplateId}
              school={{ name: schoolBrand.name, logo: schoolBrand.logo, address: schoolBrand.address, phone: schoolBrand.phone, email: schoolBrand.email, academicYear: currentYearObj?.name || (currentYearObj?.start_year ? `${currentYearObj.start_year} - ${currentYearObj.end_year}` : undefined) }}
              student={{ id: selectedStudentForCard.student || selectedStudentForCard.student_id || selectedStudentForCard.id, name: selectedStudentForCard.student_name, rollNumber: selectedStudentForCard.roll_no, admissionNumber: selectedStudentForCard.gr_no, className: [currentClassObj?.school_class, selectedStudentForCard.division && selectedStudentForCard.division !== "ALL" ? selectedStudentForCard.division : selectedDivFilter !== "ALL" ? selectedDivFilter : ""].filter(Boolean).join(" - "), photo: selectedStudentForCard.photo || selectedStudentForCard.profile_photo }}
              subjects={modalCardData?.subjects || (examMode ? [{ subject: examPreview?.subject_name || examPreview?.exam_title || "Exam", maximum: selectedStudentForCard.max_marks ?? examPreview?.max_marks ?? 0, obtained: selectedStudentForCard.is_absent ? "Absent" : selectedStudentForCard.marks_obtained ?? 0, grade: selectedStudentForCard.grade, remarks: selectedStudentForCard.remarks, absent: selectedStudentForCard.is_absent }] : (selectedStudentForCard.component_breakdown?.components || []).map((component: any) => ({ subject: component.name, maximum: `${component.weightage_pct}% weight`, obtained: `${component.score_pct}%`, remarks: component.details })))}
              totals={modalCardData?.totals || { maximum: examMode ? selectedStudentForCard.max_marks ?? examPreview?.max_marks ?? 0 : "100%", obtained: examMode ? selectedStudentForCard.is_absent ? "Absent" : selectedStudentForCard.marks_obtained ?? 0 : `${Number(selectedStudentForCard.total_percentage || 0).toFixed(2)}%`, percentage: Number(selectedStudentForCard.total_percentage || 0).toFixed(2), grade: selectedStudentForCard.grade }}
              remarks={selectedStudentForCard.remarks}
            />}
          </div>
          <DialogFooter className="flex shrink-0 flex-row justify-end gap-2 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <Button variant="outline" onClick={() => setSelectedStudentForCard(null)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF}
              className="gap-2 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              {isDownloadingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isDownloadingPDF ? "Downloading..." : "Download PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
