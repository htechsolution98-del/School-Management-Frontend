"use client";
import { useParams } from "next/navigation";
import { StudentProfile360 } from "@/components/students/student-profile360";
export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 dark:bg-zinc-950">
      <StudentProfile360 key={params.id} studentId={Number(params.id)} />
    </div>
  );
}
