import { z } from "zod";

export const MOBILE_LENGTH = 10;
export const MOBILE_ERROR_MESSAGE = "Enter a valid 10-digit mobile number.";

/**
 * Mobile numbers must be exactly 10 digits. Formatting characters that users
 * commonly paste in are stripped first, mirroring `sms_app/validators.py` on the
 * backend so both layers agree on the rule.
 */
export const mobileSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()\-.]/g, ""))
  .refine((value) => new RegExp(`^[0-9]{${MOBILE_LENGTH}}$`).test(value), {
    message: MOBILE_ERROR_MESSAGE,
  });

export const schoolFormSchema = z.object({
  name: z.string().trim().min(2, "School name must contain at least 2 characters.").max(255, "School name must be 255 characters or fewer."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254, "Email must be 254 characters or fewer."),
  phone: mobileSchema,
  address: z.string().trim().min(5, "Address must contain at least 5 characters."),
  city: z.string().trim().min(2, "City must contain at least 2 characters.").max(100, "City must be 100 characters or fewer."),
  state: z.string().trim().min(2, "State must contain at least 2 characters.").max(100, "State must be 100 characters or fewer."),
  country: z.string().trim().min(2, "Country must contain at least 2 characters.").max(100, "Country must be 100 characters or fewer."),
  pincode: z.string().trim().min(1, "Postal code is required.").max(10, "Postal code must be 10 characters or fewer."),
  index_no: z.string().trim().max(100, "Index number must be 100 characters or fewer.").refine(value => !value || /^[A-Za-z0-9][A-Za-z0-9 /_-]*$/.test(value), "Use letters, numbers, spaces, hyphens, underscores or slashes for the index number.").optional(),
  logo: z.custom<File>(value => typeof File !== "undefined" && value instanceof File, "Choose an image file.")
    .refine(file => file.size <= 2 * 1024 * 1024, "Logo must be 2 MB or smaller.")
    .refine(file => ["image/png", "image/jpeg", "image/webp"].includes(file.type), "Upload a valid PNG, JPEG or WebP image.").nullable().optional(),
  feature_ids: z.array(z.number().int().positive()).min(1, "Select at least one feature.").refine(ids => new Set(ids).size === ids.length, "Duplicate features are not allowed."),
  is_active: z.boolean().optional(),
}).superRefine((data, ctx) => {
  const indian = ["india", "in", "bharat"].includes(data.country.toLowerCase());
  if (!(indian ? /^[1-9][0-9]{5}$/ : /^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/).test(data.pincode)) {
    ctx.addIssue({ code: "custom", path: ["pincode"], message: indian ? "Enter a valid 6-digit Indian PIN code." : "Enter a postal code of 2 to 10 letters or numbers." });
  }
});

export type FieldErrors = Record<string, string>;

export function validationErrors(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  return issues.reduce<FieldErrors>((errors, issue) => {
    const field = String(issue.path[0] ?? "non_field_errors");
    if (!errors[field]) errors[field] = issue.message;
    return errors;
  }, {});
}

export const paymentFormSchema = z.object({
  school: z.number({ error: "Select a school." }).int().positive("Select a school."),
  razorpay_key_id: z.string().trim().regex(/^rzp_(test|live)_[A-Za-z0-9]+$/, "Enter a valid Key ID starting with rzp_test_ or rzp_live_.").max(255, "Key ID must be 255 characters or fewer."),
  razorpay_secret_key: z.string().trim().min(1, "Razorpay Secret Key is required.").max(255, "Secret key must be 255 characters or fewer.").refine(value => !/\s/.test(value), "Secret key cannot contain spaces."),
});
