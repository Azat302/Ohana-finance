import fs from 'fs/promises';
import path from 'path';
import { Shift, Financials, Expense, Operation, FullDayData, DashboardSummary, RecurringExpense, Discount, SafeTransaction, GlobalBalances, ActionLog } from '@/types';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

async function readDb() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function writeDb(data: any) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

export const getFullDay = async (date: string): Promise<FullDayData> => {
  const db = await readDb();
  const day = db[date] || {};
  return {
    date,
    shift: day.shift || null,
    financials: day.financials || null,
    expenses: day.expenses || [],
    operations: day.operations || [],
    discounts: day.discounts || [],
    safe_transactions: day.safe_transactions || [],
  };
};

export const getSafeTransactions = async (date: string): Promise<SafeTransaction[]> => {
  const day = await getFullDay(date);
  return day.safe_transactions || [];
};

export const getDashboardSummary = async (): Promise<DashboardSummary[]> => {
  const db = await readDb();
  return Object.keys(db)
    .filter(date => db[date].financials)
    .map(date => ({
      date,
      total_revenue: db[date].financials.total_revenue,
      total_expenses: db[date].financials.total_revenue - db[date].financials.profit,
      profit: db[date].financials.profit,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
};

export const getRecurringExpenses = async (): Promise<RecurringExpense[]> => {
  const db = await readDb();
  return db.recurring_expenses || [];
};

export const getGlobalBalances = async (): Promise<GlobalBalances> => {
  const db = await readDb();
  return db.global_balances || { safe: 0, bank: 0, last_updated: new Date().toISOString() };
};

export const getActionLogs = async (date?: string): Promise<ActionLog[]> => {
  const db = await readDb();
  let logs = db.action_logs || [];
  if (date) logs = logs.filter((l: any) => l.date === date);
  return logs.reverse();
};

export async function saveShift(shift: Shift) {
  const db = await readDb();
  if (!db[shift.date]) db[shift.date] = {};
  db[shift.date].shift = shift;
  await writeDb(db);
}

export async function saveFinancials(fin: Financials) {
  const db = await readDb();
  if (!db[fin.date]) db[fin.date] = {};
  db[fin.date].financials = fin;
  await writeDb(db);
}

export async function addExpense(expense: Expense) {
  const db = await readDb();
  if (!db[expense.date]) db[expense.date] = {};
  if (!db[expense.date].expenses) db[expense.date].expenses = [];
  db[expense.date].expenses.push(expense);
  await writeDb(db);
}

export async function addOperation(op: Operation) {
  const db = await readDb();
  if (!db[op.date]) db[op.date] = {};
  if (!db[op.date].operations) db[op.date].operations = [];
  db[op.date].operations.push(op);
  await writeDb(db);
}

export async function addDiscount(discount: Discount) {
  const db = await readDb();
  if (!db[discount.date]) db[discount.date] = {};
  if (!db[discount.date].discounts) db[discount.date].discounts = [];
  db[discount.date].discounts.push(discount);
  await writeDb(db);
}

export async function saveRecurringExpense(item: RecurringExpense) {
  const db = await readDb();
  if (!db.recurring_expenses) db.recurring_expenses = [];
  const idx = db.recurring_expenses.findIndex((e: any) => e.id === item.id);
  if (idx === -1) db.recurring_expenses.push(item);
  else db.recurring_expenses[idx] = item;
  await writeDb(db);
}

export async function addSafeTransaction(t: SafeTransaction) {
  const db = await readDb();
  if (!db[t.date]) db[t.date] = {};
  if (!db[t.date].safe_transactions) db[t.date].safe_transactions = [];
  db[t.date].safe_transactions.push(t);
  await writeDb(db);
}

export async function deleteRowById(sheetName: string, id: string, date?: string) {
  const db = await readDb();
  if (sheetName === 'recurring_expenses') {
    db.recurring_expenses = db.recurring_expenses?.filter((e: any) => e.id !== id);
  } else if (date && db[date] && db[date][sheetName]) {
    db[date][sheetName] = db[date][sheetName].filter((e: any) => e.id !== id);
  }
  await writeDb(db);
}

export async function saveGlobalBalances(balances: Partial<GlobalBalances>) {
  const db = await readDb();
  db.global_balances = { ...(db.global_balances || { safe: 0, bank: 0 }), ...balances, last_updated: new Date().toISOString() };
  await writeDb(db);
}

export async function addActionLog(log: Omit<ActionLog, 'id' | 'timestamp'>) {
  const db = await readDb();
  if (!db.action_logs) db.action_logs = [];
  const newLog = {
    ...log,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString()
  };
  db.action_logs.push(newLog);
  await writeDb(db);
}
