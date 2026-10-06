import { z } from "zod";

export const AADHAAR_ERROR = "Aadhaar number must be exactly 12 digits.";
export const aadhaarSchema = z.string().refine(value => value === "" || /^[0-9]{12}$/.test(value), AADHAAR_ERROR);
export const governmentIDsSchema = z.object({
  aadhar_number: aadhaarSchema,
  abc_id: z.string().trim().max(50, "ABC / APAAR ID cannot exceed 50 characters."),
  udise_no: z.string().trim().max(50, "UDISE / PEN cannot exceed 50 characters."),
});
export const isAadhaarField = (field: { label?: string; map_to_student_field?: string | null }) => field.map_to_student_field === "aadhar_number" || /aadh?aar|aadhar/i.test(field.label || "");
export const maskAadhaar = (value: string | null | undefined) => value ? `********${value.slice(-4)}` : "Not added";
