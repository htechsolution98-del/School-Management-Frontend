import type { LucideIcon } from "lucide-react";
import type { School, FeatureType } from "@/types/superadmin";
import type {
  SuperAdminAnalyticsSummary,
  SuperAdminSchoolRow,
  SuperAdminAnalyticsResponse,
  SchoolDetailedStats,
} from "@/lib/superadmin";
import type { SubscriptionSummary, SchoolSubscription } from "@/lib/subscriptions";
import type { SupportTicketStats } from "@/lib/support";
import type { ActivityLogItem } from "@/lib/activity-logs";

export interface DashboardFilters {
  selectedSchoolId: string | "ALL";
  academicYear: string | "ALL";
  dateRange: "30D" | "90D" | "1Y" | "ALL";
}

export interface EnrollmentPoint {
  month: string;
  rawDate?: string;
  admissions: number;
  withdrawals?: number;
  total: number;
}

export interface SchoolComparisonItem {
  id: number;
  name: string;
  students: number;
  staff: number;
  classes: number;
}

export interface ModuleAdoptionItem {
  id: number;
  name: string;
  codeName: string;
  count: number;
  totalSchools: number;
  percentage: number;
  icon?: LucideIcon;
}

export interface ClassDistributionItem {
  class_name: string;
  students: number;
}

export type EnrollmentMonthData = EnrollmentPoint;
export type SchoolComparisonData = SchoolComparisonItem;
export type ModuleAdoptionData = ModuleAdoptionItem;
export type DetailedSchoolTelemetry = SchoolDetailedStats;

export interface FinancialMetrics {
  totalStudentFees: number;
  collectedStudentFees: number;
  pendingStudentFees: number;
  monthlySubscriptionRevenue: number;
  annualSubscriptionRevenue: number;
  activeSubscriptionsCount: number;
  trialSubscriptionsCount: number;
  expiringSoonCount: number;
  expiredCount: number;
}

export interface OperationalAlert {
  id: string;
  type: "warning" | "error" | "info";
  title: string;
  count: number;
  description: string;
  actionLabel: string;
  actionHref: string;
}

export type {
  School,
  FeatureType,
  SuperAdminAnalyticsSummary,
  SuperAdminSchoolRow,
  SuperAdminAnalyticsResponse,
  SchoolDetailedStats,
  SubscriptionSummary,
  SchoolSubscription,
  SupportTicketStats,
  ActivityLogItem,
};
