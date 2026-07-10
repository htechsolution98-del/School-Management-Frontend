export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://school-management-system-sms-xtgf.onrender.com/api";

export const API_ENDPOINTS = {
  LOGIN: "/api-login/",
  REFRESH: "/refresh/",
  SCHOOL: "/SchoolView/",
  STAFF: "/StaffView/",
  FORMS: "/forms/",
  FIELDS: "/fields/",
  CLASSES: "/getclass/",
  FORM_STATUS: "/formstatus/",
  FORM_LINK: "/admission/form/link/",
  SCHOOL_CLASS: "/schoolclass/",
  DIVISION_SET: "/divisionSet/",
  DIVISION_LIST: "/divisionlist/",
  SET_SUBJECT: "/setSubject/",
  SYLLABUS: "/syllabus/",
  GET_TEACHER: "/getteacher/",
  ASSIGN_CLASS: "/assignClass/",
  SEND_OTP: "/send-otp/",
  VERIFY_OTP: "/verify-otp/",
  FEATURE: "/feature/",
  GET_FEATURE: "/getfeature/",
  GET_TEMP_USER_DATA: "/gettempuserdata/",
  RAZOR_ORDER: "/razor/order/",
  PAYMENT_VERIFY: "/payment/verify/",
  GET_LOCATION: "/get-location/",
  DELETE_LOCATION: "/delete-location/",
  FACE_VERIFY: "/face-verify/",
  FACE_ENROLL: "/face-enroll/",
  ATTENDANCE: "/attendance/",
  ATTENDANCE_TODAY: "/today/",
  SALARY_COMPONENT: "/salary-component/",
  STAFF_SALARY_PAYMENT: "/staff-salary-payment/",
  FEE_TYPE: "/feetype/",
  FEE_WISE_CLASS: "/fee-wise-class/",
  DASHBOARD_COUNT: "/dashboard-count/",
  ACADEMIC_YEAR: "/main-academic-year/",
  ANNOUNCEMENT: "/announcement/",
}

export const getWebSocketUrl = (path: string): string => {
  let baseUrl = API_BASE_URL;
  if (typeof window !== "undefined") {
    if (baseUrl.startsWith("/")) {
      baseUrl = window.location.origin + baseUrl;
    }
  }
  const wsScheme = baseUrl.startsWith("https") ? "wss://" : "ws://";
  const wsHost = baseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${wsScheme}${wsHost}${path}`;
};

