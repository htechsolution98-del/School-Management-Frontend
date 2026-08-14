import { API_BASE_URL } from "@/lib/config";
import { apiFetch } from "./helpers";

export interface DashboardStudent {
  id: number;
  name: string;
  surname: string;
  class_name: string;
  email: string;
  mobile: string;
  date_of_birth: string;
}

export async function getAllStudents(): Promise<DashboardStudent[]> {
  return apiFetch<DashboardStudent[]>("/get-student/", {}, "Failed to fetch all students");
}
