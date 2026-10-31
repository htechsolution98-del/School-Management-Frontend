import { z } from "zod";

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const BANK_ACC_REGEX = /^\d{9,18}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const CURRENT_YEAR = new Date().getFullYear();

export function isValidIndianMobile(num: string): boolean {
  if (!INDIAN_MOBILE_REGEX.test(num)) return false;
  // Disallow all-same repeating patterns like 9999999999, 8888888888, 7777777777, 6666666666
  if (/^([6-9])\1{9}$/.test(num)) return false;
  return true;
}

export const schoolProfileSchema = z.object({
  school_full_name: z
    .string()
    .trim()
    .min(1, "School full name is required.")
    .min(2, "School full name must be at least 2 characters."),
  establishment_year: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true; // Optional field
        if (!/^\d{4}$/.test(val)) return false;
        const num = parseInt(val, 10);
        return num >= 1800 && num <= CURRENT_YEAR;
      },
      {
        message: `Establishment year must be a valid 4-digit number between 1800 and ${CURRENT_YEAR}.`,
      }
    ),
  board_affiliation: z
    .union([z.string(), z.array(z.string())])
    .optional(),
  phone_numbers: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const list: string[] = Array.isArray(val)
          ? val
          : val.split(",").map((p) => p.trim());
        const nonEmpty = list.map((p) => String(p).trim()).filter(Boolean);
        if (nonEmpty.length === 0) return true;
        for (const item of nonEmpty) {
          const digits = item.replace(/\D/g, "");
          if (!isValidIndianMobile(digits)) return false;
        }
        return true;
      },
      {
        message:
          "Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.",
      }
    ),
  official_emails: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true;
        const emails = val.split(",").map((e) => e.trim()).filter(Boolean);
        if (emails.length === 0) return true;
        return emails.every((e) => EMAIL_REGEX.test(e));
      },
      {
        message: "Invalid email format",
      }
    ),
  pan_gst_number: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const upper = val.toUpperCase();
        if (upper.length === 10) {
          return PAN_REGEX.test(upper);
        }
        if (upper.length === 15) {
          return GSTIN_REGEX.test(upper);
        }
        return false;
      },
      {
        message:
          "Must be a valid 10-character PAN (e.g. ABCDE1234F) or 15-character GSTIN (e.g. 24ABCDE1234F1Z5).",
      }
    ),
  bank_account_no: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true;
        return BANK_ACC_REGEX.test(val);
      },
      {
        message: "Bank account number must be numeric characters only (between 9 and 18 digits).",
      }
    ),
  bank_ifsc: z
    .string()
    .trim()
    .transform((val) => val.toUpperCase())
    .refine(
      (val) => {
        if (!val) return true;
        return IFSC_REGEX.test(val);
      },
      {
        message: "IFSC code must exactly match standard Indian format (e.g. HDFC0001234: 4 letters, 0, 6 alphanumeric).",
      }
    ),
  website_url: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true;
        const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:[0-9]{1,5})?(\/.*)?$/;
        return urlPattern.test(val);
      },
      {
        message: "Please enter a valid website URL (e.g., https://myschool.edu).",
      }
    ),
});

export function validateSchoolProfileFields(data: any): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const result = schoolProfileSchema.safeParse(data);
  if (result.success) {
    return { isValid: true, errors: {} };
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] ? String(issue.path[0]) : "global";
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return { isValid: false, errors };
}

export function getTabForField(fieldName: string): "basic" | "billing" | "branding" | "documents" {
  const billingFields = new Set([
    "trust_name",
    "pan_gst_number",
    "bank_account_name",
    "bank_account_no",
    "bank_ifsc",
    "bank_name",
  ]);
  const brandingFields = new Set([
    "main_logo_url",
    "print_logo_url",
    "favicon_url",
    "login_banner_url",
  ]);
  const documentFields = new Set([
    "certificate_watermark_url",
    "receipt_bg_url",
    "principal_signature_url",
    "trustee_signature_url",
    "official_seal_url",
  ]);

  if (billingFields.has(fieldName)) return "billing";
  if (brandingFields.has(fieldName)) return "branding";
  if (documentFields.has(fieldName)) return "documents";
  return "basic";
}
