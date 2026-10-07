"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { camelCaseText, formatDDMMYYYY, getCreatedAt } from "@/lib/table-utils";
import { Users, RefreshCw, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { getStudentProfiles } from "@/lib/clerk/student-profiles";
import { getDivisions, getClasses } from "@/lib/clerk";
import type { Division, SchoolClass } from "@/types/clerk";
import type { StudentProfileData } from "@/types/student-profile";
import { StudentPhoto, StatusPill } from "@/components/students/student-profile-parts";

/**
 * Safely resolves the student's division from various API payload shapes:
 * string, nested object (division.name / division.division), division_name, or division ID.
 */
function resolveStudentDivision(student: unknown, divisionsList?: Division[]): string {
  if (!student || typeof student !== "object") return "";
  const s = student as Record<string, unknown>;

  // 1. Direct string property on student (e.g. s.division = "a" or "A")
  if (typeof s.division === "string" && s.division.trim()) {
    return s.division.trim();
  }

  // 2. Nested division object (e.g. s.division = { name: "A", ... } or { division: "A" })
  if (s.division && typeof s.division === "object") {
    const divObj = s.division as Record<string, unknown>;
    const nested = divObj.name || divObj.division || divObj.division_name;
    if (typeof nested === "string" && nested.trim()) {
      return nested.trim();
    }
  }

  // 3. Alternate property names on student (e.g. s.division_name, s.divisionName, s.section)
  if (typeof s.division_name === "string" && s.division_name.trim()) {
    return s.division_name.trim();
  }
  if (typeof s.divisionName === "string" && s.divisionName.trim()) {
    return s.divisionName.trim();
  }
  if (typeof s.section === "string" && s.section.trim()) {
    return s.section.trim();
  }

  // 4. Numeric division ID (e.g. s.division = 26 or s.division_id = 26) matched against fetched divisions
  const divId = typeof s.division === "number" ? s.division : typeof s.division_id === "number" ? s.division_id : null;
  if (divId && divisionsList && divisionsList.length > 0) {
    const matched = divisionsList.find((d) => d.id === divId);
    if (matched) {
      const matchedName = matched.division || (matched as unknown as Record<string, unknown>).name || (matched as unknown as Record<string, unknown>).division_name;
      if (typeof matchedName === "string" && matchedName.trim()) {
        return matchedName.trim();
      }
    }
  }

  return "";
}

export default function StudentProfilesPage() {
  const [students, setStudents] = useState<StudentProfileData[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const [studentsRes, divisionsRes, classesRes] = await Promise.allSettled([
        getStudentProfiles(signal),
        getDivisions(),
        getClasses(),
      ]);

      if (studentsRes.status === "fulfilled" && !signal?.aborted) {
        setStudents(studentsRes.value);
      } else if (studentsRes.status === "rejected" && !signal?.aborted) {
        setError(studentsRes.reason instanceof Error ? studentsRes.reason.message : "Unable to load students.");
      }

      if (divisionsRes.status === "fulfilled" && !signal?.aborted) {
        setDivisions(divisionsRes.value);
      }

      if (classesRes.status === "fulfilled" && !signal?.aborted) {
        setSchoolClasses(classesRes.value);
      }
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : "Unable to load students.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Dynamically populated division options from fetched divisions and student records
  const divisionOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];

    // Option to filter students without an assigned division
    options.push({ value: "__none__", label: "No Division (Unassigned)" });

    divisions.forEach((div) => {
      const rawName = String(div.division || (div as unknown as Record<string, string>).name || "").trim();
      if (rawName && !seen.has(rawName.toLowerCase())) {
        seen.add(rawName.toLowerCase());
        const displayLabel = rawName.length === 1 ? `Division ${rawName.toUpperCase()}` : `Division ${camelCaseText(rawName)}`;
        options.push({
          value: rawName.toLowerCase(),
          label: displayLabel,
        });
      }
    });

    students.forEach((student) => {
      const divName = resolveStudentDivision(student, divisions).trim();
      if (divName && !seen.has(divName.toLowerCase())) {
        seen.add(divName.toLowerCase());
        const displayLabel = divName.length === 1 ? `Division ${divName.toUpperCase()}` : `Division ${camelCaseText(divName)}`;
        options.push({
          value: divName.toLowerCase(),
          label: displayLabel,
        });
      }
    });

    return options;
  }, [divisions, students]);

  // Dynamically populated class options from fetched school classes and student records
  const classOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];

    schoolClasses.forEach((cls) => {
      const name = (cls.school_class || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        options.push({
          value: name.toLowerCase(),
          label: camelCaseText(name),
        });
      }
    });

    students.forEach((student) => {
      const name = (student.class_name || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        options.push({
          value: name.toLowerCase(),
          label: camelCaseText(name),
        });
      }
    });

    return options;
  }, [schoolClasses, students]);

  const columns = useMemo<DataTableColumn<StudentProfileData>[]>(() => [
    {
      key: "name",
      header: "Student",
      sticky: true,
      search: row => [row.full_name, row.name, row.surname],
      render: row => {
        const enrolledDate = formatDDMMYYYY(row.created_at || row.admission_date || getCreatedAt(row));
        return (
          <Link
            href={`/clerk/student-profiles/${row.id}`}
            className="flex min-w-[180px] items-center gap-3 font-semibold text-slate-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-300"
          >
            <StudentPhoto src={row.photo_url} name={row.full_name} />
            <div className="min-w-0">
              <span className="block whitespace-normal leading-tight">
                {camelCaseText(row.full_name)}
              </span>
              <span className="block text-[11px] font-normal text-slate-500 dark:text-zinc-400 mt-0.5 whitespace-nowrap">
                Enrolled: {enrolledDate}
              </span>
            </div>
          </Link>
        );
      },
    },
    {
      key: "gr_no",
      header: "GR No.",
      search: row => row.gr_no,
      camelCase: false,
      headClassName: "whitespace-nowrap",
      cellClassName: "whitespace-nowrap font-mono text-xs",
      render: row => row.gr_no || <span className="text-slate-400">—</span>,
    },
    {
      key: "roll_no",
      header: "Roll No.",
      search: row => row.roll_no,
      camelCase: false,
      headClassName: "whitespace-nowrap",
      cellClassName: "whitespace-nowrap font-mono text-xs",
      render: row => row.roll_no || <span className="text-slate-400">—</span>,
    },
    {
      key: "class_division",
      header: "Class & Div",
      search: row => [row.class_name, resolveStudentDivision(row, divisions)],
      headClassName: "whitespace-nowrap",
      cellClassName: "whitespace-nowrap",
      render: row => {
        const cls = camelCaseText(row.class_name);
        const div = resolveStudentDivision(row, divisions);
        const divDisplay = div ? (div.length === 1 ? div.toUpperCase() : camelCaseText(div)) : "";

        if (!cls && !divDisplay) return <span className="text-slate-400">Not assigned</span>;

        if (cls && divDisplay) {
          return (
            <span className="font-medium text-slate-800 dark:text-zinc-200">
              {cls} <span className="text-slate-400">-</span> {divDisplay}
            </span>
          );
        }

        if (cls) {
          return (
            <span className="font-medium text-slate-800 dark:text-zinc-200">
              {cls} <span className="text-xs text-slate-400 font-normal">(No Div)</span>
            </span>
          );
        }

        return <span className="font-medium text-slate-800 dark:text-zinc-200">Div {divDisplay}</span>;
      },
    },
    {
      key: "mobile",
      header: "Contact",
      search: row => [row.mobile, row.father_name, row.mother_name, row.email],
      camelCase: false,
      headClassName: "whitespace-nowrap",
      cellClassName: "whitespace-nowrap",
      render: row => (
        <div className="space-y-0.5 text-xs">
          <p className="font-mono text-slate-700 dark:text-zinc-300">
            {row.mobile || <span className="text-slate-400 italic">No mobile</span>}
          </p>
          {row.father_name && (
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-[130px]">
              {camelCaseText(row.father_name)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "gov_ids",
      header: "Gov IDs",
      search: row => [row.abc_id, row.udise_no],
      camelCase: false,
      headClassName: "whitespace-nowrap",
      cellClassName: "whitespace-nowrap",
      render: row => (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase w-12 shrink-0">
              APAAR:
            </span>
            {row.abc_id ? (
              <span className="font-mono text-[11px] font-medium text-slate-800 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                {row.abc_id}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full px-2 py-0.2 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900">
                Missing
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase w-12 shrink-0">
              UDISE:
            </span>
            {row.udise_no ? (
              <span className="font-mono text-[11px] font-medium text-slate-800 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                {row.udise_no}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full px-2 py-0.2 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900">
                Missing
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "documents",
      header: "Documents",
      headClassName: "whitespace-nowrap",
      cellClassName: "whitespace-nowrap",
      render: row => (
        <div className="space-y-0.5 text-xs">
          <p className="font-medium text-slate-700 dark:text-zinc-300">
            {row.completion.document_count} uploaded
          </p>
          {row.completion.missing_documents.length > 0 && (
            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
              {row.completion.missing_documents.length} missing
            </p>
          )}
        </div>
      ),
    },
    {
      key: "is_verified",
      header: "Verification",
      align: "center",
      headClassName: "whitespace-nowrap text-center",
      cellClassName: "whitespace-nowrap text-center",
      render: row => <StatusPill verified={row.is_verified} />,
    },
  ], [divisions]);

  const verified = students.filter(student => student.is_verified).length;

  return (
    <div className="student-profile-list min-w-0 space-y-6 text-slate-900 dark:text-zinc-100">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-300">School Management</p>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <Users className="h-7 w-7 text-indigo-600 dark:text-indigo-300" />
            Student Profiles
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
            A complete directory of your school&apos;s enrolled students across every class and division.
          </p>
        </div>
        <Button variant="outline" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "All students", value: students.length },
          { label: "Verified students", value: verified },
          { label: "Pending verification", value: students.length - verified },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs text-slate-500 dark:text-zinc-400">{card.label}</p>
            {loading ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="mt-2 text-2xl font-semibold">{card.value}</p>}
          </div>
        ))}
      </div>

      {loading ? (
        <div aria-label="Loading student profiles" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          data={students}
          columns={columns}
          getRowId={row => row.id}
          error={error}
          createdDate={false}
          createdDateRange
          search
          searchPlaceholder="Search name, GR, roll, mobile, APAAR or PEN"
          searchAriaLabel="Search student profiles"
          searchExtra={row => [row.aadhar_number, ...row.guardians.map(guardian => guardian.name)]}
          caption="School-wide Student Profiles"
          minWidth={980}
          actionsWidth="130px"
          pageSize={10}
          emptyTitle="No enrolled students yet"
          emptyDescription="Students added through admission or manual entry will appear here."
          noResultsTitle="No students match your filters"
          noResultsDescription="Try another search or clear the filters."
          filters={[
            {
              key: "class",
              label: "Class",
              options: classOptions,
              camelCase: false,
              match: (row, value) => {
                const studentClass = (row.class_name || "").toLowerCase().trim();
                return studentClass === value.toLowerCase().trim();
              },
            },
            {
              key: "division",
              label: "Division",
              options: divisionOptions,
              camelCase: false,
              match: (row, value) => {
                const studentDiv = resolveStudentDivision(row, divisions).toLowerCase().trim();
                if (value === "__none__") {
                  return !studentDiv;
                }
                return studentDiv === value.toLowerCase().trim();
              },
            },
            {
              key: "verified",
              label: "Verification",
              options: [{ value: "yes", label: "Verified" }, { value: "no", label: "Pending" }],
              match: (row, value) => row.is_verified === (value === "yes"),
            },
            {
              key: "missing",
              label: "Missing Documents / IDs",
              options: [
                { value: "ids", label: "Missing government IDs" },
                { value: "documents", label: "Missing required documents" },
                { value: "none", label: "No documents uploaded" },
              ],
              match: (row, value) =>
                value === "ids"
                  ? !!row.completion.missing_ids.length
                  : value === "documents"
                  ? !!row.completion.missing_documents.length
                  : row.completion.document_count === 0,
            },
          ]}
          renderActions={row => (
            <Link
              href={`/clerk/student-profiles/${row.id}`}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 focus-visible:outline-2 dark:border-zinc-700 dark:text-indigo-300 dark:hover:bg-indigo-950 transition-colors"
            >
              View Profile
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        />
      )}

      {error && <Button variant="outline" onClick={() => void load()}>Retry loading students</Button>}
    </div>
  );
}
