import type { CreateStaffPayload, Department, Staff } from "@/types";

export type StaffErrors = Partial<Record<keyof CreateStaffPayload, string>>;
export const normalizePhone = (value: string) => value.replace(/[\s().-]/g, "");

export function parseDepartments(input: string, existing: Pick<Department, "name">[]) {
  const names = input.split(",").map(name => name.trim().replace(/\s+/g, " "));
  if (names.some(name => !name)) return { names: [], error: "Enter department names separated by commas, without empty entries." };
  if (names.some(name => name.length > 100)) return { names: [], error: "Each department name must be 100 characters or fewer." };
  const seen = new Set<string>();
  const existingNames = new Set(existing.map(item => item.name.trim().toLowerCase()));
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) return { names: [], error: `Duplicate name in this batch: ${name}.` };
    if (existingNames.has(key)) return { names: [], error: `Department already exists: ${name}. Remove it before creating the batch.` };
    seen.add(key);
  }
  return { names, error: "" };
}

export function validateStaffRecord(data: CreateStaffPayload, staff: Staff[], departments: Department[], roleIds: string[], editingId?: number, today = new Date()): StaffErrors {
  const errors: StaffErrors = {};
  if (!data.name.trim() || data.name.trim().length > 100) errors.name = "Enter a name between 1 and 100 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) || data.email.trim().length > 254) errors.email = "Enter a valid email address.";
  if (!/^\d{10}$/.test(normalizePhone(data.mobile))) errors.mobile = "Enter a valid 10-digit mobile number.";
  const others = staff.filter(member => member.id !== editingId);
  if (others.some(member => member.email?.trim().toLowerCase() === data.email.trim().toLowerCase())) errors.email = "This email is already assigned to a staff member.";
  if (others.some(member => normalizePhone(member.mobile || "") === normalizePhone(data.mobile) && data.mobile.trim())) errors.mobile = "This mobile number is already assigned to a staff member.";
  if (!departments.some(item => item.id === data.department)) errors.department = "Select an available department.";
  if (!roleIds.includes(String(data.category))) errors.category = "Select an available role.";
  if (!data.address.trim()) errors.address = "Enter the staff member's address.";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data.date_of_birth);
  if (!match) errors.date_of_birth = "Enter a valid date of birth.";
  else {
    const [, y, m, d] = match;
    const birth = new Date(Number(y), Number(m) - 1, Number(d));
    if (birth.getFullYear() !== Number(y) || birth.getMonth() !== Number(m) - 1 || birth.getDate() !== Number(d)) errors.date_of_birth = "Enter a valid calendar date.";
    else {
      let age = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
      if (age < 18) errors.date_of_birth = "Staff members must be at least 18 years old.";
    }
  }
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(data.salary.trim())) errors.salary = "Enter a salary from 0 to 99,999,999.99 with at most 2 decimal places.";
  if (typeof data.is_active !== "boolean") errors.is_active = "Select a valid employment status.";
  return errors;
}
