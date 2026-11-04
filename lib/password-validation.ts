/**
 * Standardized strong password validator for registration, forgot password,
 * and password change flows.
 */

export interface PasswordStrengthResult {
  score: number; // 0 to 5
  isValid: boolean;
  message: string | null;
  checks: {
    minLength: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const pwd = (password || "").trim();

  const checks = {
    minLength: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number: /\d/.test(pwd),
    special: /[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\;'`~]/.test(pwd),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const isValid = score === 5;

  let message: string | null = null;
  if (!pwd) {
    message = "Password is required.";
  } else if (!checks.minLength) {
    message = "Password must be at least 8 characters long.";
  } else if (!checks.uppercase) {
    message = "Password must contain at least one uppercase letter (A-Z).";
  } else if (!checks.lowercase) {
    message = "Password must contain at least one lowercase letter (a-z).";
  } else if (!checks.number) {
    message = "Password must contain at least one number (0-9).";
  } else if (!checks.special) {
    message = "Password must contain at least one special character (!@#$%^&* etc.).";
  }

  return {
    score,
    isValid,
    message,
    checks,
  };
}

export function validateStrongPassword(password: string): string | null {
  return checkPasswordStrength(password).message;
}

export function validateIndianMobile(mobile: string): string | null {
  const digits = (mobile || "").replace(/[\s()\-\.]/g, "");
  const clean = digits.length >= 10 ? digits.slice(-10) : digits;

  if (!clean) {
    return "Mobile number is required.";
  }
  if (clean.length !== 10) {
    return "Mobile number must be exactly 10 digits.";
  }
  if (!/^[6-9]/.test(clean)) {
    return "Mobile number must start with 6, 7, 8, or 9.";
  }
  return null;
}

