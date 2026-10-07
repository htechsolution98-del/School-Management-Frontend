export interface PendingDocItem {
  id: string;
  admissionId: number;
  studentName: string;
  className: string;
  divisionName?: string;
  documentName: string;
  fileUrl: string;
  isVerified: boolean;
  admissionNumber?: string;
  docFieldId?: number;
}

export function groupStudentDocuments(documents: PendingDocItem[], filter: "all" | "pending" | "verified") {
  const students = new Map<number, { admissionId: number; studentName: string; className: string; divisionName?: string; admissionNumber?: string; documents: PendingDocItem[] }>();
  for (const document of documents) {
    if (filter === "pending" && document.isVerified || filter === "verified" && !document.isVerified) continue;
    let student = students.get(document.admissionId);
    if (!student) {
      student = { admissionId: document.admissionId, studentName: document.studentName, className: document.className, divisionName: document.divisionName, admissionNumber: document.admissionNumber, documents: [] };
      students.set(document.admissionId, student);
    }
    student.documents.push(document);
  }
  return Array.from(students.values());
}
