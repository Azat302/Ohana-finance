import { createClient } from '@supabase/supabase-js';
import { 
  Shift, 
  Financials, 
  Expense, 
  Operation, 
  Discount, 
  SafeTransaction, 
  RecurringExpense, 
  GlobalBalances,
  ActionLog,
  FullDayData,
  DashboardSummary
} from '../types';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let cachedSupabase: any = null;

export function getSupabase() {
  if (cachedSupabase) return cachedSupabase;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  
  cachedSupabase = createClient(supabaseUrl, supabaseServiceKey);
  return cachedSupabase;
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase credentials missing. Database operations will return empty data.');
}

export async function getDashboardSummary(): Promise<DashboardSummary[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: financials, error: finError } = await supabase
    .from('financials')
    .select('date, total_revenue, profit')
    .order('date', { ascending: false });

  if (finError) throw finError;

  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('date, amount');

  if (expError) throw expError;

  // Group expenses by date
  const expensesByDate = (expenses || []).reduce((acc: Record<string, number>, curr: any) => {
    acc[curr.date] = (acc[curr.date] || 0) + Number(curr.amount);
    return acc;
  }, {});

  return (financials || []).map((item: any) => ({
    date: item.date,
    total_revenue: Number(item.total_revenue),
    total_expenses: expensesByDate[item.date] || 0,
    profit: Number(item.profit)
  }));
}

export async function getFullDay(date: string): Promise<FullDayData> {
  const supabase = getSupabase();
  if (!supabase) return { date, shift: null, financials: null, expenses: [], operations: [], discounts: [], safe_transactions: [] };
  const [
    { data: shift },
    { data: financials },
    { data: expenses },
    { data: operations },
    { data: discounts },
    { data: safe_transactions }
  ] = await Promise.all([
    supabase.from('shifts').select('*').eq('date', date).single(),
    supabase.from('financials').select('*').eq('date', date).single(),
    supabase.from('expenses').select('*').eq('date', date),
    supabase.from('operations').select('*').eq('date', date),
    supabase.from('discounts').select('*').eq('date', date),
    supabase.from('safe_transactions').select('*').eq('date', date)
  ]);

  return {
    date,
    shift: shift || null,
    financials: financials || null,
    expenses: expenses || [],
    operations: operations || [],
    discounts: discounts || [],
    safe_transactions: safe_transactions || []
  };
}

export async function saveShift(shift: Shift): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('shifts')
    .upsert({
      date: shift.date,
      staff: shift.staff,
      start_cash: shift.start_cash,
      end_cash: shift.end_cash,
      is_manual_start_cash: shift.is_manual_start_cash
    });
  if (error) throw error;
}

export async function saveFinancials(financials: Financials): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('financials')
    .upsert(financials);
  if (error) throw error;
}

export async function addExpense(expense: Expense): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('expenses')
    .upsert(expense);
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function addOperation(operation: Operation): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('operations')
    .upsert(operation);
  if (error) throw error;
}

export async function deleteOperation(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('operations')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function addDiscount(discount: Discount): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('discounts')
    .upsert(discount);
  if (error) throw error;
}

export async function deleteDiscount(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('discounts')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getRecurringExpenses(): Promise<RecurringExpense[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('active', true);
  if (error) throw error;
  return data || [];
}

export async function getAllOperations(): Promise<Operation[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('operations')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveRecurringExpense(item: RecurringExpense): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('recurring_expenses')
    .upsert(item);
  if (error) throw error;
}

export async function addSafeTransaction(transaction: SafeTransaction): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('safe_transactions')
    .upsert(transaction);
  if (error) throw error;
}

export async function getSafeTransactions(date: string): Promise<SafeTransaction[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('safe_transactions')
    .select('*')
    .eq('date', date);
  if (error) throw error;
  return data || [];
}

export async function deleteRowById(sheetName: string, id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  // В Supabase sheetName - это название таблицы
  const { error } = await supabase
    .from(sheetName)
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getGlobalBalances(): Promise<GlobalBalances> {
  const balances: GlobalBalances = { 
    safe: 0, 
    bank: 0, 
    last_updated: new Date().toISOString() 
  };
  
  const supabase = getSupabase();
  if (!supabase) return balances;

  const { data, error } = await supabase
    .from('global_config')
    .select('*');
  
  if (error) throw error;
  
  data?.forEach((item: any) => {
    if (item.key === 'safe_balance') balances.safe = Number(item.value);
    if (item.key === 'bank_balance') balances.bank = Number(item.value);
    if (item.last_updated && new Date(item.last_updated) > new Date(balances.last_updated)) {
      balances.last_updated = item.last_updated;
    }
  });
  
  return balances;
}

export async function saveGlobalBalances(balances: Partial<GlobalBalances>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const updates = [];
  if (balances.safe !== undefined) {
    updates.push({ key: 'safe_balance', value: balances.safe, last_updated: new Date().toISOString() });
  }
  if (balances.bank !== undefined) {
    updates.push({ key: 'bank_balance', value: balances.bank, last_updated: new Date().toISOString() });
  }
  
  if (updates.length > 0) {
    const { error } = await supabase
      .from('global_config')
      .upsert(updates);
    if (error) throw error;
  }
}

export async function addActionLog(log: Omit<ActionLog, 'id' | 'timestamp'> & { id?: string, timestamp?: string }): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('action_logs')
    .upsert({
      id: log.id || Math.random().toString(36).substr(2, 9),
      timestamp: log.timestamp || new Date().toISOString(),
      date: log.date,
      action_type: log.action_type,
      description: log.description,
      details: typeof log.details === 'string' ? log.details : JSON.stringify(log.details),
      ip: log.ip,
      user_agent: log.user_agent
    });
  if (error) throw error;
}

export async function getActionLogs(date?: string): Promise<ActionLog[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  let query = supabase
    .from('action_logs')
    .select('*')
    .order('timestamp', { ascending: false });
  
  if (date) {
    query = query.eq('date', date);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return (data || []).map((log: any) => {
    let details = log.details;
    try {
      if (details && (details.startsWith('{') || details.startsWith('['))) {
        details = JSON.parse(details);
      }
    } catch {
      // Keep as string if parsing fails
    }
    return {
      ...log,
      details
    };
  });
}

export async function getExpensesByMonth(month: string): Promise<Expense[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const startDate = `${month}-01`;
  const endDate = `${month}-31`; // Supabase eq/gte/lte works with strings

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}
