export class ApiValidationError extends Error {
  constructor(message: string, public fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiValidationError";
  }
}

function errorText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(errorText).filter(Boolean).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(errorText).filter(Boolean).join(" ");
  return "";
}

export async function apiValidationError(response: Response, fallback: string): Promise<ApiValidationError> {
  try {
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) return new ApiValidationError(errorText(data) || fallback);
    const errors = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, errorText(value)]).filter(([, value]) => value));
    return new ApiValidationError(errors.detail || errors.message || errors.non_field_errors || Object.values(errors)[0] || fallback, errors);
  } catch {
    return new ApiValidationError(fallback);
  }
}
