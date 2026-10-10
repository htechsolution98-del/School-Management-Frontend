export interface AttendanceSetting {
  id: number;
  school?: number;
  name: string;
  check_in_time: string;
  check_out_time: string;
  grace_period_mins: number;
  half_day_threshold_mins: number;
  geo_required: boolean;
  geo_radius_meters: number | string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRegularization {
  id: number;
  staff: number;
  staff_name?: string;
  attendance_date: string;
  requested_check_in?: string | null;
  requested_check_out?: string | null;
  original_check_in?: string | null;
  original_check_out?: string | null;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  approved_by?: number | null;
  approved_by_username?: string | null;
  audit_log?: Array<{
    action: string;
    by?: number | string;
    by_username?: string;
    timestamp: string;
    original_punch?: {
      check_in?: string | null;
      check_out?: string | null;
    };
    new_punch?: {
      check_in?: string | null;
      check_out?: string | null;
      requested_check_in?: string | null;
      requested_check_out?: string | null;
    };
    note?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface LeaveCycle {
  id: number;
  school?: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_closed?: boolean;
  closed_at?: string;
  closed_by?: number | null;
  closed_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LeaveTransaction {
  id: number;
  school?: number;
  staff: number;
  staff_name?: string;
  leave_type: number;
  leave_type_name?: string;
  leave_cycle: number;
  leave_cycle_name?: string;
  leave_request?: number | null;
  transaction_type: string;
  amount: number | string;
  balance_after: number | string;
  description: string;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at: string;
}

export interface LeaveReportSummary {
  cycle: {
    id: number | null;
    name: string;
    is_closed: boolean;
  };
  totals: {
    total_allocated: number;
    total_carry_forward: number;
    total_used: number;
    total_pending: number;
    total_available: number;
  };
  request_counts: {
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    cancellation_requests: number;
  };
  staff_summary: Array<{
    staff_id: number;
    staff_name: string;
    department: string | null;
    allocated: number;
    carry_forward: number;
    used: number;
    pending: number;
    available: number;
  }>;
}


export interface DynamicLeaveTemplate {
  id: number;
  school?: number;
  name?: string | null;
  time_line?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface DynamicLeaveType {
  id: number;
  leave_template: number;
  template_name?: string | null;
  name?: string | null;
  code?: string | null;
  leave_type?: string | null;
  is_paid: boolean;
  allocation_count: number | string;
  allocation_period: "Monthly" | "Quarterly" | "Yearly" | string;
  carry_forward: boolean;
  max_carry_forward: number;
  allow_encashment: boolean;
  category?: number | null;
  created_at?: string;
}

export interface LeaveBalance {
  id: number;
  staff: number;
  staff_name?: string;
  leave_type: number;
  leave_type_name?: string;
  leave_cycle: number;
  leave_cycle_name?: string;
  allocated: number | string;
  carry_forward: number | string;
  used: number | string;
  pending: number | string;
  remaining?: number | string;
  created_at?: string;
  updated_at?: string;
}

export type CalcType = "Fixed" | "Percentage" | "Formula";
export type ComponentTypeEnum = "Earning" | "Deduction";

export interface DynamicSalaryComponent {
  id: number;
  school?: number;
  name: string;
  type: ComponentTypeEnum;
  component_type?: "earning" | "deduction";
  calc_type: CalcType;
  calc_base?: string | null;
  value: number | string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SalaryStructure {
  id: number;
  school?: number;
  name: string;
  base_salary?: number | string;
  components: number[];
  components_detail?: DynamicSalaryComponent[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollRun {
  id: number;
  school?: number;
  salary_month: string;
  status: "Draft" | "Generated" | "Approved" | "Locked";
  total_processed: number;
  generated_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollPayslip {
  id: number;
  staff: number;
  staff_name?: string;
  payroll_run: number;
  salary_month?: string;
  present_days: number | string;
  paid_leaves: number | string;
  unpaid_leaves: number | string;
  gross_earnings: number | string;
  total_deductions: number | string;
  net_salary: number | string;
  component_breakdown: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}
