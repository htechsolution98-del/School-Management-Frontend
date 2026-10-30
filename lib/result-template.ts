export type ResultTemplateId = "classic" | "modern" | "compact" | "watermark";

export const RESULT_TEMPLATES: Array<{ id: ResultTemplateId; name: string; description: string; header: string; accent: string }> = [
  { id: "classic", name: "Classic School", description: "Formal centered heading with ruled sections.", header: "center", accent: "#17325c" },
  { id: "modern", name: "Modern Color", description: "Branded color band with student details up front.", header: "band", accent: "#5c28e8" },
  { id: "compact", name: "Compact Table", description: "Space-saving layout for class-wide printing.", header: "compact", accent: "#0f766e" },
  { id: "watermark", name: "School Watermark", description: "Formal marksheet with the school logo faded behind the marks.", header: "watermark", accent: "#1d4ed8" },
];

function storageKey() {
  if (typeof window === "undefined") return "school_result_template";
  return `school_result_template_${window.localStorage.getItem("school_id") || "default"}`;
}

export function getSavedResultTemplate(): ResultTemplateId {
  if (typeof window === "undefined") return "classic";
  const saved = window.localStorage.getItem(storageKey()) as ResultTemplateId | null;
  return RESULT_TEMPLATES.some((template) => template.id === saved) ? saved! : "classic";
}

export function saveResultTemplate(template: ResultTemplateId) {
  if (typeof window !== "undefined") window.localStorage.setItem(storageKey(), template);
}
