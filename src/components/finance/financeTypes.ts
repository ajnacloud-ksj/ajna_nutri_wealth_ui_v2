export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  sourceAccount: string;
  transactionType: string;
  merchant?: string;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
  housing: number;
  groceries: number;
  dining: number;
  shopping: number;
  software: number;
  gas: number;
  medical: number;
  insurance: number;
  utilities: number;
  auto: number;
  personal_care: number;
  education: number;
  charity: number;
  zelle_send: number;
  fees: number;
  other: number;
  [key: string]: string | number;
}

export interface RecurringItem {
  merchant: string;
  type: string;
  cadence: string;
  avgAmount: number;
}

export interface AccountBalances {
  bofaChecking: number;
  sofiSavings: number;
  asOf?: string;
}

export interface DashboardData {
  monthlyData: MonthlyData[];
  categoryTotals: { name: string; amount: number; color: string }[];
  topMerchants: any[];
  recurringItems: RecurringItem[];
  accountBalances: AccountBalances;
  incomeByMonth: any[];
  outflowByMonth: OutflowMonth[];
  investmentSummary: { totalInvested: number; byDestination: any[]; count: number };
  dateRange: { start: string; end: string };
  transactions: Transaction[];
}

export interface OutflowMonth {
  month: string;
  investments: number;
  cardPayments: number;
  rent: number;
  expenses: number;
  zelle: number;
  otherTransfers: number;
  total: number;
}

export interface CategoryTotal {
  name: string;
  amount: number;
  color: string;
}

export interface MerchantDetail {
  merchant: string;
  amount: number;
  count: number;
  lastDate?: string;
  avg?: number;
}

export interface CategoryDetail {
  monthlyTrend: { month: string; amount: number }[];
  merchants: MerchantDetail[];
  total: number;
  txnCount: number;
  recent: Transaction[];
}

export const CATEGORY_COLORS: Record<string, string> = {
  housing: "#7c3aed",
  groceries: "#10b981",
  dining: "#f59e0b",
  shopping: "#6366f1",
  software: "#8b5cf6",
  gas: "#ef4444",
  medical: "#ec4899",
  insurance: "#0ea5e9",
  utilities: "#06b6d4",
  auto: "#f97316",
  personal_care: "#14b8a6",
  education: "#3b82f6",
  charity: "#f472b6",
  zelle_send: "#d946ef",
  fees: "#78716c",
  other: "#64748b",
};

export const CATEGORY_LABELS: Record<string, string> = {
  housing: "Housing/Rent",
  groceries: "Groceries",
  dining: "Dining",
  shopping: "Shopping",
  software: "Software",
  gas: "Gas",
  medical: "Medical",
  insurance: "Insurance",
  utilities: "Utilities",
  auto: "Auto",
  personal_care: "Personal Care",
  education: "Education",
  charity: "Charity",
  zelle_send: "Zelle Send",
  fees: "Fees",
  other: "Other",
};

export const DATE_RANGES = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "All", months: 0 },
];

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export const moneyDecimal = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
