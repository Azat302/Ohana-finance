'use client';

import { useState, useEffect } from 'react';
import { Expense, FullDayData } from '@/types';
import { addExpenseAction, deleteItemAction, getFullDayAction } from '@/app/actions';
import { Plus, Trash2, X, Save, Loader2, Lock, Unlock, Calendar, Banknote, CreditCard, Clock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  initialDate: string;
}

export default function ExpensesManager({ initialDate }: Props) {
  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState<FullDayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const EXPENSE_PASSWORD = '123';

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getFullDayAction(date);
      setData(res);
      setLoading(false);
    }
    loadData();
  }, [date]);

  const handleAddExp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!data) return;
    
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const type = formData.get('type') as 'fixed' | 'variable';
    const payment_source = formData.get('payment_source') as 'cash' | 'bank';
    
    if (!title || isNaN(amount)) return;

    setIsSaving(true);
    const now = new Date();
    const time = format(now, 'HH:mm');
    
    const newExp: Expense = { 
      id: uuidv4(), 
      date, 
      time,
      title, 
      amount, 
      type,
      payment_source,
      payment_type: 'cash' 
    };
    
    await addExpenseAction(newExp);
    setData(prev => prev ? {
      ...prev,
      expenses: [...prev.expenses, newExp]
    } : null);
    
    e.currentTarget.reset();
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Точно удалить?')) return;
    setIsSaving(true);
    await deleteItemAction('expenses', id, date);
    setData(prev => prev ? {
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== id)
    } : null);
    setIsSaving(false);
  };

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
    <div className="space-y-6 pb-20">
      <header className="flex justify-between items-end px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Расходы</h1>
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest">
            <Calendar size={14} /> {format(parseISO(date), 'd MMMM', { locale: ru })}
          </div>
        </div>
        <input 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)}
          className="p-2 bg-white rounded-xl text-xs font-bold border-gray-100 shadow-sm"
        />
      </header>

      {/* Expense Form */}
      <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">
          <Plus size={12} /> Добавить расход
        </div>
        <form onSubmit={handleAddExp} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-gray-400 ml-1 tracking-wider">Тип платежа</label>
              <select name="type" className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold border-none focus:ring-2 focus:ring-blue-500 appearance-none">
                <option value="variable">Переменный</option>
                <option value="fixed">Постоянный</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-gray-400 ml-1 tracking-wider">Источник</label>
              <select name="payment_source" className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold border-none focus:ring-2 focus:ring-blue-500 appearance-none">
                <option value="cash">Наличка зав.</option>
                <option value="bank">Расчетный счет</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-gray-400 ml-1 tracking-wider">Название</label>
            <input name="title" placeholder="На что потрачено?" className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold border-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] uppercase font-black text-gray-400 ml-1 tracking-wider">Сумма (₽)</label>
              <input name="amount" type="number" placeholder="0" className="w-full p-4 bg-gray-50 rounded-2xl text-lg font-black border-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <button type="submit" disabled={isSaving || loading} className="self-end bg-gray-900 text-white p-5 rounded-2xl active:scale-95 transition-all shadow-lg shadow-gray-200">
              {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} strokeWidth={3} />}
            </button>
          </div>
        </form>
      </section>

      {/* Expenses List */}
      <section className="space-y-3 px-1">
        <div className="flex items-center justify-between text-gray-400 text-[10px] font-black uppercase tracking-widest px-2">
          <span>Список расходов</span>
          {data && <span>Итого: {data.expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} ₽</span>}
        </div>
        
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-gray-300" size={32} /></div>
        ) : data && data.expenses.length > 0 ? (
          <div className="space-y-3">
            {[...data.expenses].reverse().map(exp => (
              <div key={exp.id} className="bg-white p-5 rounded-[2rem] flex justify-between items-center shadow-sm border border-gray-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-black text-gray-900">{exp.title}</div>
                    <div className="text-[8px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 font-black uppercase tracking-tighter">
                      {exp.payment_source === 'bank' ? 'Р/С' : 'Нал'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                    <Clock size={10} /> {exp.time} • {exp.type === 'fixed' ? 'Постоянный' : 'Переменный'}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-lg font-black text-red-500">-{exp.amount.toLocaleString()} ₽</div>
                  <button 
                    onClick={() => handleDelete(exp.id)} 
                    disabled={isSaving}
                    className="p-3 bg-red-50 text-red-400 rounded-2xl active:scale-90 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-gray-200 text-center space-y-2">
            <div className="text-gray-300 mx-auto w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center"><Banknote size={20} /></div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">Нет расходов за этот день</p>
          </div>
        )}
      </section>
    </div>
  );
}
