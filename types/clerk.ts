export interface SchoolClass {
  id: number;
  school_class: string;
}

export interface Division {
  id?: number;
  SchoolClass: number | null;
  class_name?: string;
  division: string;
  capacity: number | null;
}

export interface Subject {
  id?: number;
  name: string;
  division: number | null;
  school?: number;
}

export interface TimetableDivision {
  id: number;
  class_name: string;
  division: string;
  SchoolClass?: number | null;
  capacity?: number | null;
}

export interface TimetableSubject {
  id: number;
  name: string;
  division?: number | null;
  school?: number;
}

export interface Syllabus {
  id?: number;
  syllabus_file: string | File | null;
  division: number | null;
  subject: number | null;
}

export interface Teacher {
  id: number;
  name: string;
}

export interface AssignClassPayload {
  is_class_teacher: boolean;
  teacher: number;
  subject: number;
  division: number;
}

export interface AssignedTeacher {
  id?: number;
  teacher: number | string;
  subject: number | string;
  subject_name?: string;
  division?: number | string;
  division_name?: string;
  class_name?: string;
  is_class_teacher?: boolean;
  teacher_name?: string;
}

export interface Admission {
  id: number;
  admission_number: string;
  status: "pending" | "approved" | "rejected";
  gr_no?: string | null;
  division?: string | null;
  field_values: {
    id: number;
    field: number;
    field_label: string;
    value: string;
  }[];
  documents: {
    id: number;
    document_field: number;
    document_label: string;
    file: string;
  }[];
}

export interface LocationSettings {
  latitude: string;
  longitude: string;
  radius: string;
  start_time: string;
  end_time: string;
  half_day_time: string;
  school_name?: string;
}

export interface LocationSettingsRecord extends LocationSettings {
  id?: number | string;
}

export interface TimetableLectureSlot {
  slot_number: number;
  slot_start_time: string;
  slot_end_time: string;
}

export interface TimetableBreakSlot {
  slot_number: number;
  slot_start_time: string;
  slot_end_time: string;
  duration_minutes: number;
}

export interface TimetablePayload {
  day: string;
  class_division: number;
  total_lecture: number;
  start_time: string;
  end_time: string;
  slots: TimetableSlot[];
}

export interface TimetableSlot {
  slot_number: number;
  is_lecture: boolean;
  is_break: boolean;
  slot_start_time: string;
  slot_end_time: string;
  subject: number | null;
  teacher: number | null;
}

export interface TimetableFormSlot {
  id: string;
  slot_number: number;
  is_lecture: boolean;
  is_break: boolean;
  slot_start_time: string;
  slot_end_time: string;
  subject: string | number | null;
  teacher: string | number | null;
  subject_name?: string;
  teacher_name?: string;
}

export interface TimetableFormData {
  day: string;
  class_division: string | number;
  total_lecture: number;
  total_breaks: number;
  start_time: string;
  end_time: string;
  academicYear: string;
  lecture_duration: number;
  break_duration: number;
}

export interface TimetableRecord {
  id: number;
  day: string;
  class_division: number;
  total_lecture: number;
  start_time: string;
  end_time: string;
  slots: TimetableSlot[];
}
