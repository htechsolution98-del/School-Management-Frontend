import { apiFetch, buildQuery } from "./helpers";
import type {
  FeeFilters,
  FeeStatus,
  FeeSummary,
  InitiatePaymentOptions,
  MyStudentFee,
  OfflinePaymentPayload,
  Payment,
  PaymentFilters,
  RazorpayCheckoutResponse,
  RazorpayOrderResponse,
  RazorpayVerifyPayload,
} from "@/types/student";
import { loadRazorpayScript } from "@/lib/razorpay";

export async function getMyFees(): Promise<MyStudentFee[]> {
  return apiFetch<MyStudentFee[]>("/my-fees/", {}, "Failed to fetch fees.");
}

export async function getStudentFees(
  filters: FeeFilters = {}
): Promise<MyStudentFee[]> {
  const query = buildQuery({
    student: filters.student,
    school_class: filters.school_class,
    academic_year: filters.academic_year,
    status: filters.status !== "all" ? filters.status : undefined,
    billing_period: filters.billing_period,
  });
  return apiFetch<MyStudentFee[]>(`/student-fee/${query}`, {}, "Failed to fetch student fees.");
}

export function computeFeeSummary(fees: MyStudentFee[]): FeeSummary {
  return fees.reduce<FeeSummary>(
    (acc, fee) => {
      const payable = parseFloat(fee.actual_payable_amount);
      const paid = parseFloat(fee.paid_amount);
      const balance = parseFloat(fee.balance_amount);

      acc.totalFees += payable;
      acc.paidAmount += paid;
      acc.pendingAmount += fee.status === "pending" ? balance : 0;
      acc.remainingBalance += balance;
      return acc;
    },
    { totalFees: 0, paidAmount: 0, pendingAmount: 0, remainingBalance: 0 }
  );
}

export async function updateFeeStatus(
  feeId: number,
  status: FeeStatus
): Promise<MyStudentFee> {
  return apiFetch<MyStudentFee>(
    `/student-fee/${feeId}/`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    "Failed to update fee status."
  );
}

export async function createRazorpayOrder(
  studentFeeId: number,
  partialAmount?: string
): Promise<RazorpayOrderResponse> {
  const body: { student_fee: number; amount?: string } = {
    student_fee: studentFeeId,
  };
  if (partialAmount) body.amount = partialAmount;

  return apiFetch<RazorpayOrderResponse>(
    "/student-fee/razor/order/",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    "Failed to create payment order."
  );
}

export async function verifyRazorpayPayment(
  payload: RazorpayVerifyPayload & { student_fee_id?: number }
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    "/student-fee/razor/verify/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Payment verification failed."
  );
}

export async function getPaymentHistory(
  filters: PaymentFilters = {}
): Promise<Payment[]> {
  const query = buildQuery({
    student_fee: filters.student_fee,
    student: filters.student,
    school_class: filters.school_class,
    payment_mode: filters.payment_mode,
    date_from: filters.date_from,
    date_to: filters.date_to,
  });
  return apiFetch<Payment[]>(`/student-fee-payment/${query}`, {}, "Failed to fetch payment history.");
}

export async function createOfflineStudentFeePayment(
  payload: OfflinePaymentPayload
): Promise<Payment> {
  return apiFetch<Payment>(
    "/student-fee-payment/",
    {
      method: "POST",
      body: JSON.stringify({ is_verified: true, ...payload }),
    },
    "Failed to record offline payment."
  );
}

export async function initiateRazorpayPayment({
  studentFeeId,
  partialAmount,
  onSuccess,
  onFailure,
}: InitiatePaymentOptions): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    onFailure("Failed to load Razorpay. Please check your internet connection.");
    return;
  }

  let orderData: RazorpayOrderResponse & {
    id?: string;
    name?: string;
    description?: string;
    prefill?: Record<string, string>;
  };

  try {
    orderData = await createRazorpayOrder(studentFeeId, partialAmount);
  } catch (error) {
    onFailure(error instanceof Error ? error.message : "Network error while creating order. Please try again.");
    return;
  }

  const orderId = orderData.order_id ?? orderData.id;
  const key = orderData.key;
  if (!key || !orderId || !Number(orderData.amount)) {
    onFailure("Razorpay order is missing its key or payment details. Please contact the school office.");
    return;
  }

  const rzp = new window.Razorpay({
    key,
    amount: orderData.amount,
    currency: orderData.currency ?? "INR",
    name: orderData.name ?? "School Fees",
    description: orderData.description ?? "Fee Payment",
    order_id: orderId,
    handler: async (response: RazorpayCheckoutResponse) => {
      try {
        await verifyRazorpayPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          student_fee_id: studentFeeId,
        });
        onSuccess();
      } catch {
        onFailure("Payment verification failed. Contact support.");
      }
    },
    prefill: orderData.prefill ?? {},
    theme: { color: "#7c3aed" },
    modal: {
      ondismiss: () => onFailure("Checkout closed before payment completed."),
    },
  });

  try {
    rzp.on("payment.failed", (response: any) => {
      onFailure(response?.error?.description ?? "Payment failed. Please try again.");
    });
    rzp.open();
  } catch (error) {
    onFailure(error instanceof Error ? error.message : "Unable to open payment window.");
  }
}

export function formatINR(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `₹ ${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function billingPeriodToLabel(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function feeStatusLabel(status: FeeStatus): string {
  return status.toUpperCase();
}

export function periodToMonthName(period: string): string {
  const [, month] = period.split("-");
  return new Date(2000, Number(month) - 1, 1).toLocaleString("en-IN", {
    month: "long",
  });
}
