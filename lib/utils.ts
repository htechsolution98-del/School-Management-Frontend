import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Capitalizes the first letter of every word (e.g. "yuji itadori" -> "Yuji Itadori", "social studies" -> "Social Studies") */
export function capitalizeWords(str?: string | null): string {
  if (!str) return "";
  return String(str).replace(
    /(^|[\s\-_/(\[])([a-z\u00E0-\u00FC])/g,
    (_match, prefix, char) => prefix + char.toUpperCase()
  );
}

/** Capitalizes the first letter of sentences (e.g. "good morning. have a nice day" -> "Good morning. Have a nice day") */
export function capitalizeSentence(str?: string | null): string {
  if (!str) return "";
  const s = String(str).trim();
  if (!s) return "";
  return s.replace(
    /(^\s*|[.!?]\s+)([a-z\u00E0-\u00FC])/g,
    (_match, prefix, char) => prefix + char.toUpperCase()
  );
}

/** Formats subject names across the entire website so each word starts with a capital letter */
export function formatSubjectName(subject?: string | null): string {
  if (!subject) return "";
  return capitalizeWords(subject);
}

/** Formats grades (e.g. "a+" -> "A+", "pass" -> "PASS") */
export function formatGrade(grade?: string | null): string {
  if (!grade) return "";
  return String(grade).toUpperCase();
}
