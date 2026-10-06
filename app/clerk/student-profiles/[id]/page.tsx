"use client";
import { useParams } from "next/navigation";
import { StudentProfile360 } from "@/components/students/student-profile360";
export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  return <StudentProfile360 key={params.id} studentId={Number(params.id)} />;
}
