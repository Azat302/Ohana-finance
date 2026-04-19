export interface Shift {
  date: string;
  staff: string[]; 
  start_cash: number;
  end_cash: number;
}

export interface Financials {
  date: string;
  revenue_cash: number;
  revenue_card: number;
  total_revenue: number;
  profit: number;
}

export interface Expense {
  id: string;
  date: string;
  time: string;
  title: string;
  amount: number;
  type: 'fixed' | 'variable';
  payment_source: 'cash' | 'bank';
  payment_type: 'cash' | 'card'; // keeping for compatibility, might merge later
}

export interface Operation {
  id: string;
  date: string;
  type: 'staff_hookah' | 'taxi' | 'staff';
  person: string;
  amount: number;
  count?: number;
  note?: string;
}

export interface Discount {
  id: string;
  date: string;
  person: string;
  amount: number;
  count?: number; // Added for staff
  note?: string;
}

export interface RecurringExpense {
  id: string;
  title: string;
  amount: number;
  day_of_month: number;
  active: boolean;
}

export interface FullDayData {
  date: string;
  shift: Shift | null;
  financials: Financials | null;
  expenses: Expense[];
  operations: Operation[];
  discounts: Discount[];
}

export interface DashboardSummary {
  date: string;
  total_revenue: number;
  total_expenses: number;
  profit: number;
}
