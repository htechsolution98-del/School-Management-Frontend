import type { ConfiguredField } from "@/lib/form-builder-config";

export function validateAdmissionBuilder(input: {
  title: string; academicYearId: number | null; description: string;
  sections: { title: string; fields: ConfiguredField[] }[]; documents: ConfiguredField[];
  feesEnabled: boolean; feeType: string; feesAmount: string; individualFees: Record<number, string>; classIds: number[];
}, step?: number) {
  const errors: Record<string, string> = {};
  const duplicate = (values: string[]) => new Set(values.map(value => value.trim().toLowerCase())).size !== values.length;
  if (step === undefined || step === 0) {
    if (!input.title.trim() || input.title.trim().length > 255) errors.title = "Enter a form title of 1–255 characters";
    if (!input.academicYearId) errors.academicYear = "Select an academic year";
    if (input.description.length > 2000) errors.description = "Description must be 2000 characters or fewer";
    if (!input.sections.length) errors.sections = "Add at least one section";
    if (duplicate(input.sections.map(section => section.title))) errors.sections = "Section titles must be unique";
    const allLabels: string[] = [];
    input.sections.forEach((section, index) => {
      if (!section.title.trim() || section.title.trim().length > 255) errors[`section-${index}`] = `Section ${index + 1}: enter a title of 1–255 characters`;
      const fields = section.fields.filter(field => field.selected);
      if (!fields.length) errors[`section-${index}`] = `${section.title || `Section ${index + 1}`}: select at least one field`;
      fields.forEach(field => {
        allLabels.push(field.label);
        if (!field.label.trim() || field.label.trim().length > 255) errors[field.id] = "Field labels must contain 1–255 characters";
        if (field.type === "file") errors[field.id] = `${field.label}: add file uploads in the Documents step`;
        if (["select", "radio"].includes(field.type)) {
          if (!field.options.length || field.options.some(option => !option.label.trim() || !option.value.trim())) errors[field.id] = `${field.label}: add complete options with a label and value`;
          else if (duplicate(field.options.map(option => option.value)) || duplicate(field.options.map(option => option.label))) errors[field.id] = `${field.label}: option labels and values must be unique`;
        }
      });
    });
    if (duplicate(allLabels)) errors.fields = "Field labels must be unique across sections for reliable manual entry and Excel imports";
  }
  if (step === undefined || step === 1) {
    const docs = input.documents.filter(document => document.selected);
    if (docs.some(document => !document.label.trim() || document.label.trim().length > 255)) errors.documents = "Document names must contain 1–255 characters";
    if (duplicate(docs.map(document => document.label))) errors.documents = "Document names must be unique";
  }
  if ((step === undefined || step === 2) && input.feesEnabled) {
    const validAmount = (amount: string) => /^\d+(\.\d{1,2})?$/.test(amount.trim()) && Number(amount) > 0 && Number(amount) <= 9999999.99;
    if (input.feeType === "general" && !validAmount(input.feesAmount)) errors.fees = "Enter a fee greater than zero, up to 99,99,999.99, with at most 2 decimal places";
    if (input.feeType === "individual") {
      const configured = Object.entries(input.individualFees).filter(([, amount]) => amount.trim());
      if (!configured.length) errors.fees = "Enter at least one class fee";
      else if (configured.some(([id, amount]) => !input.classIds.includes(Number(id)) || !validAmount(amount))) errors.fees = "Each configured class fee must be a positive amount with at most 2 decimal places";
    }
  }
  return errors;
}
