/**
 * Indian Number to Words Converter Utility
 * Formats numbers into the Indian numbering system (Crores, Lakhs, Thousands, Hundreds, Rupees, and Paise).
 */

const ONES: string[] = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS: string[] = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function convertBelowThousand(n: number): string {
  let str = "";
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) {
    str += ONES[n] + " ";
  }
  return str.trim();
}

/**
 * Converts a positive integer (up to 99,99,99,999) into Indian word representation.
 */
function convertIntegerToIndianWords(num: number): string {
  if (num === 0) return "Zero";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const remainder = num;

  const parts: string[] = [];

  if (crore > 0) {
    parts.push(convertIntegerToIndianWords(crore) + " Crore");
  }
  if (lakh > 0) {
    parts.push(convertBelowThousand(lakh) + " Lakh");
  }
  if (thousand > 0) {
    parts.push(convertBelowThousand(thousand) + " Thousand");
  }
  if (remainder > 0) {
    parts.push(convertBelowThousand(remainder));
  }

  return parts.join(" ").trim();
}

export interface NumberToWordsOptions {
  includeRupees?: boolean; // Default true: adds "Rupees"
  includeOnly?: boolean; // Default true: adds "Only" at the end
  caseType?: "title" | "upper" | "capitalized"; // Default "title"
}

/**
 * Converts any numeric input (string or number) into Indian words format.
 * Example: 25000 -> "Twenty Five Thousand Rupees Only"
 * Example: 15420.75 -> "Fifteen Thousand Four Hundred Twenty Rupees and Seventy Five Paise Only"
 */
export function numberToIndianWords(
  amount: number | string,
  options: NumberToWordsOptions = {}
): string {
  const {
    includeRupees = true,
    includeOnly = true,
    caseType = "title",
  } = options;

  if (amount === null || amount === undefined || amount === "") {
    return "";
  }

  const numericValue = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numericValue) || numericValue < 0) {
    return "";
  }

  if (numericValue === 0) {
    let zeroStr = "Zero";
    if (includeRupees) zeroStr += " Rupees";
    if (includeOnly) zeroStr += " Only";
    return zeroStr;
  }

  // Split integer and paise
  const [intPartStr, decPartStr] = numericValue.toFixed(2).split(".");
  const intPart = parseInt(intPartStr, 10);
  const paisePart = parseInt(decPartStr || "0", 10);

  const parts: string[] = [];

  if (intPart > 0) {
    const rupeesWords = convertIntegerToIndianWords(intPart);
    parts.push(rupeesWords);
    if (includeRupees) {
      parts.push("Rupees");
    }
  }

  if (paisePart > 0) {
    const paiseWords = convertBelowThousand(paisePart);
    if (parts.length > 0) {
      parts.push("and " + paiseWords + " Paise");
    } else {
      parts.push(paiseWords + " Paise");
    }
  }

  if (includeOnly && parts.length > 0) {
    parts.push("Only");
  }

  let result = parts.join(" ").trim();

  // Clean extra spaces
  result = result.replace(/\s+/g, " ");

  if (caseType === "upper") {
    return result.toUpperCase();
  }

  return result;
}

/**
 * Format number into Indian comma format: 1234567.89 -> 12,34,567.89
 */
export function formatIndianNumber(val: number | string): string {
  if (val === null || val === undefined || val === "") return "";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
