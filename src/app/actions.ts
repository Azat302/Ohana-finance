'use server';

import * as db from '@/lib/google-sheets';
import { Shift, Financials, Expense, Operation, RecurringExpense, Discount, SafeTransaction, GlobalBalances, ActionLog } from '@/types';
import { revalidatePath } from 'next/cache';
import { format, subDays, parseISO } from 'date-fns';
import { headers } from 'next/headers';

async function getMetadata() {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = headersList.get('user-agent') || 'unknown';
  return { ip, userAgent };
}

export async function getFullDayAction(date: string) {
  const data = await db.getFullDay(date);
  
  // If shift exists and it's NOT manual, or if shift doesn't exist at all,
  // we try to calculate start_cash from previous day
  if (!data.shift || !data.shift.is_manual_start_cash) {
    const prevDate = format(subDays(parseISO(date), 1), 'yyyy-MM-dd');
    const prevDayData = await db.getFullDay(prevDate);
    
    if (prevDayData.shift) {
      const prevStart = prevDayData.shift.start_cash || 0;
      const prevSafeTrans = prevDayData.safe_transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const prevCashRevenue = prevDayData.financials?.revenue_cash || 0;
      const prevCashExpenses = prevDayData.expenses
        ?.filter(e => e.payment_source === 'cash')
        ?.reduce((sum, e) => sum + e.amount, 0) || 0;
      
      // Calculate what should be in safe at the end of previous day
      const calculatedStart = prevStart + prevSafeTrans + prevCashRevenue - prevCashExpenses;
      
      if (data.shift) {
        data.shift.start_cash = calculatedStart;
      } else {
        data.shift = {
          date,
          staff: [],
          start_cash: calculatedStart,
          end_cash: 0,
          is_manual_start_cash: false
        };
      }
    }
  }
  
  return data;
}

export async function getDashboardSummaryAction() {
  return await db.getDashboardSummary();
}

export async function getRecurringExpensesAction() {
  return await db.getRecurringExpenses();
}

export async function saveShiftAction(shift: Shift) {
  await db.saveShift(shift);
  
  const { ip, userAgent } = await getMetadata();
  await db.addActionLog({
    date: shift.date,
    action_type: 'SHIFT_SAVE',
    description: `Заполнена смена ${shift.date}`,
    details: `Сотрудники: ${shift.staff.join(', ')}, Сейф на начало: ${shift.start_cash}`,
    ip,
    user_agent: userAgent
  });

  revalidatePath(`/day/${shift.date}`);
  revalidatePath('/');
}

export async function saveFinancialsAction(fin: Financials) {
  // Получаем текущие данные, чтобы вычислить разницу в наличных
  const currentData = await db.getFullDay(fin.date);
  const oldCashRevenue = currentData.financials?.revenue_cash || 0;
  const cashDiff = fin.revenue_cash - oldCashRevenue;

  await db.saveFinancials(fin);
  
  const { ip, userAgent } = await getMetadata();
  
  // Если есть разница в наличных, обновляем сейф
  if (cashDiff !== 0) {
    const balances = await db.getGlobalBalances();
    const newSafeBalance = (balances.safe || 0) + cashDiff;
    await db.saveGlobalBalances({ safe: newSafeBalance });
    
    await db.addActionLog({
      date: fin.date,
      action_type: 'SAFE_AUTO_UPDATE',
      description: `Авто-корректировка сейфа (выручка нал)`,
      details: `Разница: ${cashDiff > 0 ? '+' : ''}${cashDiff} ₽. Сейф: ${newSafeBalance} ₽`,
      ip,
      user_agent: userAgent
    });
  }

  await db.addActionLog({
    date: fin.date,
    action_type: 'FINANCIALS_SAVE',
    description: `Обновлены финансовые данные за ${fin.date}`,
    details: `Выручка: ${fin.total_revenue}, Нал: ${fin.revenue_cash}, Карта: ${fin.revenue_card}`,
    ip,
    user_agent: userAgent
  });

  revalidatePath(`/day/${fin.date}`);
  revalidatePath('/');
}

export async function addExpenseAction(expense: Expense) {
  await db.addExpense(expense);
  
  const { ip, userAgent } = await getMetadata();

  // Если расход из наличных (сейфа), убавляем из сейфа
  if (expense.payment_source === 'cash') {
    const balances = await db.getGlobalBalances();
    const newSafeBalance = (balances.safe || 0) - expense.amount;
    await db.saveGlobalBalances({ safe: newSafeBalance });
    
    await db.addActionLog({
      date: expense.date,
      action_type: 'SAFE_AUTO_UPDATE',
      description: `Авто-списание из сейфа (расход)`,
      details: `Сумма: -${expense.amount} ₽. Расход: ${expense.title}. Сейф: ${newSafeBalance} ₽`,
      ip,
      user_agent: userAgent
    });
  }
  
  await db.addActionLog({
    date: expense.date,
    action_type: 'EXPENSE_ADD',
    description: `Добавлен расход: ${expense.title}`,
    details: `Сумма: ${expense.amount}, Источник: ${expense.payment_source}`,
    ip,
    user_agent: userAgent
  });

  revalidatePath(`/day/${expense.date}`);
  revalidatePath('/');
}

export async function addOperationAction(op: Operation) {
  await db.addOperation(op);
  
  const { ip, userAgent } = await getMetadata();
  await db.addActionLog({
    date: op.date,
    action_type: 'OPERATION_ADD',
    description: `Добавлена операция: ${op.type}`,
    details: `Сотрудник: ${op.person}, Сумма: ${op.amount}`,
    ip,
    user_agent: userAgent
  });

  revalidatePath(`/day/${op.date}`);
  revalidatePath('/');
}

export async function saveRecurringExpenseAction(item: RecurringExpense) {
  await db.saveRecurringExpense(item);
  
  const { ip, userAgent } = await getMetadata();
  await db.addActionLog({
    date: format(new Date(), 'yyyy-MM-dd'),
    action_type: 'RECURRING_EXPENSE_SAVE',
    description: `Обновлен регулярный расход: ${item.title}`,
    details: `Сумма: ${item.amount}, День: ${item.day_of_month}`,
    ip,
    user_agent: userAgent
  });

  revalidatePath('/recurring');
  revalidatePath('/');
}

export async function addDiscountAction(discount: Discount) {
  await db.addDiscount(discount);
  
  const { ip, userAgent } = await getMetadata();
  await db.addActionLog({
    date: discount.date,
    action_type: 'DISCOUNT_ADD',
    description: `Добавлена скидка/списание: ${discount.person}`,
    details: `Сумма: ${discount.amount}`,
    ip,
    user_agent: userAgent
  });

  revalidatePath(`/day/${discount.date}`);
  revalidatePath('/');
}

export async function addSafeTransactionAction(t: SafeTransaction) {
  await db.addSafeTransaction(t);
  
  const { ip, userAgent } = await getMetadata();
  
  // Обновляем баланс сейфа
  const balances = await db.getGlobalBalances();
  const newSafeBalance = (balances.safe || 0) + t.amount;
  await db.saveGlobalBalances({ safe: newSafeBalance });

  await db.addActionLog({
    date: t.date,
    action_type: 'SAFE_TRANSACTION',
    description: `Операция в сейфе: ${t.amount > 0 ? 'Внесение' : 'Изъятие'}`,
    details: `Сумма: ${t.amount} ₽. Сейф: ${newSafeBalance} ₽`,
    ip,
    user_agent: userAgent
  });

  revalidatePath(`/day/${t.date}`);
  revalidatePath('/hub');
  revalidatePath('/');
}

export async function deleteItemAction(sheetName: string, id: string, date: string) {
  const { ip, userAgent } = await getMetadata();
  
  // Если удаляем расход или транзакцию сейфа, нужно вернуть деньги
  if (sheetName === 'expenses') {
    const dayData = await db.getFullDay(date);
    const expense = dayData.expenses.find(e => e.id === id);
    if (expense && expense.payment_source === 'cash') {
      const balances = await db.getGlobalBalances();
      const newSafeBalance = (balances.safe || 0) + expense.amount;
      await db.saveGlobalBalances({ safe: newSafeBalance });
      
      await db.addActionLog({
        date,
        action_type: 'SAFE_AUTO_UPDATE',
        description: `Возврат в сейф (удаление расхода)`,
        details: `Сумма: +${expense.amount} ₽. Расход: ${expense.title}. Сейф: ${newSafeBalance} ₽`,
        ip,
        user_agent: userAgent
      });
    }
  } else if (sheetName === 'safe_transactions') {
    const transactions = await db.getSafeTransactions(date);
    const t = transactions.find(item => item.id === id);
    if (t) {
      const balances = await db.getGlobalBalances();
      const newSafeBalance = (balances.safe || 0) - t.amount;
      await db.saveGlobalBalances({ safe: newSafeBalance });
      
      await db.addActionLog({
        date,
        action_type: 'SAFE_AUTO_UPDATE',
        description: `Корректировка сейфа (удаление операции)`,
        details: `Сумма: ${-t.amount > 0 ? '+' : ''}${-t.amount} ₽. Сейф: ${newSafeBalance} ₽`,
        ip,
        user_agent: userAgent
      });
    }
  }

  await db.deleteRowById(sheetName, id);
  
  await db.addActionLog({
    date: date || format(new Date(), 'yyyy-MM-dd'),
    action_type: 'DELETE',
    description: `Удалена запись из ${sheetName}`,
    details: `ID: ${id}`,
    ip,
    user_agent: userAgent
  });

  if (date) revalidatePath(`/day/${date}`);
  revalidatePath('/recurring');
  revalidatePath('/');
}

export async function getGlobalBalancesAction() {
  return await db.getGlobalBalances();
}

export async function saveGlobalBalancesAction(balances: Partial<GlobalBalances>) {
  await db.saveGlobalBalances(balances);
  
  const { ip, userAgent } = await getMetadata();
  await db.addActionLog({
    date: format(new Date(), 'yyyy-MM-dd'),
    action_type: 'BALANCE_UPDATE',
    description: 'Обновлены глобальные балансы',
    details: JSON.stringify(balances),
    ip,
    user_agent: userAgent
  });
  
  revalidatePath('/hub');
  revalidatePath('/');
}

export async function getActionLogsAction(date?: string) {
  return await db.getActionLogs(date);
}

export async function addActionLogAction(log: Omit<ActionLog, 'id' | 'timestamp'>) {
  await db.addActionLog(log);
  revalidatePath('/history');
}
