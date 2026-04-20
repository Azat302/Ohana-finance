'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import ExpensesManager from './ExpensesManager';
import RecurringExpensesList from './RecurringExpensesList';
import { RecurringExpense } from '@/types';

interface Props {
  today: string;
  recurringExpenses: RecurringExpense[];
}

export default function ExpensesPageContent({ today, recurringExpenses }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const EXPENSE_PASSWORD = '123';

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 w-full max-w-sm text-center space-y-6">
          <div className="bg-blue-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-blue-500">
            <Lock size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Доступ ограничен</h2>
            <p className="text-gray-400 text-sm font-medium">Введите пароль для управления расходами</p>
          </div>
          <div className="space-y-4">
            <input 
              type="password" 
              placeholder="••••" 
              className="w-full p-5 bg-gray-50 rounded-2xl text-center text-2xl font-black tracking-[0.5em] border-none focus:ring-2 focus:ring-blue-500 transition-all"
              autoFocus
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (e.target.value === EXPENSE_PASSWORD) setIsAuthenticated(true);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-12">
      <section>
        <ExpensesManager initialDate={today} />
      </section>
      
      <section className="pb-20">
        <div className="px-2 mb-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Настройка постоянных трат</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Здесь можно изменить или удалить регулярные платежи</p>
        </div>
        <RecurringExpensesList initialExpenses={recurringExpenses} />
      </section>
    </div>
  );
}
