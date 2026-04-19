'use server';

import * as db from '@/lib/google-sheets';
import { Shift, Financials, Expense, Operation, RecurringExpense, Discount } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getFullDayAction(date: string) {
  return await db.getFullDay(date);
}

export async function getDashboardSummaryAction() {
  return await db.getDashboardSummary();
}

export async function getRecurringExpensesAction() {
  return await db.getRecurringExpenses();
}

export async function saveShiftAction(shift: Shift) {
  await db.saveShift(shift);
  revalidatePath(`/day/${shift.date}`);
  revalidatePath('/');
}

export async function saveFinancialsAction(fin: Financials) {
  await db.saveFinancials(fin);
  revalidatePath(`/day/${fin.date}`);
  revalidatePath('/');
}

export async function addExpenseAction(expense: Expense) {
  await db.addExpense(expense);
  revalidatePath(`/day/${expense.date}`);
  revalidatePath('/');
}

export async function addOperationAction(op: Operation) {
  await db.addOperation(op);
  revalidatePath(`/day/${op.date}`);
  revalidatePath('/');
}

export async function saveRecurringExpenseAction(item: RecurringExpense) {
  await db.saveRecurringExpense(item);
  revalidatePath('/recurring');
  revalidatePath('/');
}

export async function addDiscountAction(discount: Discount) {
  await db.addDiscount(discount);
  revalidatePath(`/day/${discount.date}`);
  revalidatePath('/');
}

export async function deleteItemAction(sheetName: string, id: string, date: string) {
  await db.deleteRowById(sheetName, id);
  if (date) revalidatePath(`/day/${date}`);
  revalidatePath('/recurring');
  revalidatePath('/');
}
