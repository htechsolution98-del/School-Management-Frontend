import { z } from "zod";

export const AADHAAR_ERROR = "Aadhaar number must be exactly 12 digits.";
export const UDISE_ERROR = "UDISE number must be exactly 11 digits.";
export const ABC_ID_ERROR = "ABC ID / APAAR ID must be exactly 12 digits.";

export const aadhaarSchema = z.string().refine(value => value === "" || /^[0-9]{12}$/.test(value.trim()), AADHAAR_ERROR);
export const udiseSchema = z.string().refine(value => value === "" || /^[0-9]{11}$/.test(value.trim()), UDISE_ERROR);
export const abcIdSchema = z.string().refine(value => value === "" || /^[0-9]{12}$/.test(value.trim()), ABC_ID_ERROR);

export const governmentIDsSchema = z.object({
  aadhar_number: aadhaarSchema,
  abc_id: abcIdSchema,
  udise_no: udiseSchema,
});
export const isAadhaarField = (field: { label?: string; map_to_student_field?: string | null }) => field.map_to_student_field === "aadhar_number" || /aadh?aar|aadhar/i.test(field.label || "");
export const maskAadhaar = (value: string | null | undefined) => value ? `********${value.slice(-4)}` : "Not added";
