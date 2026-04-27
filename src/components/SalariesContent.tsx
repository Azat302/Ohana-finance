'use client';

import { useState } from 'react';
import { Salary } from '@/types';
import { addSalaryAction } from '@/app/actions';
import { Plus, Loader2, Calendar, Banknote, User, CreditCard, Wallet, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  initialSalaries: Salary[];
}

export default function SalariesContent({ initialSalaries }: Props) {
  const [salaries, setSalaries] = useState<Salary[]>(initialSalaries);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddSalary = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const person = formData.get('person') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const type = formData.get('type') as 'salary' | 'bonus' | 'prepayment';
    const payment_source = formData.get('payment_source') as 'cash' | 'bank';
    const note = formData.get('note') as string;
    const date = formData.get('date') as string || format(new Date(), 'yyyy-MM-dd');

    if (!person || isNaN(amount)) return;

    setIsSaving(true);
    const newSalary: Salary = {
      id: uuidv4(),
      date,
      person,
      amount,
      type,
      payment_source,
      note: note || undefined
    };

    try {
      const result = await addSalaryAction(newSalary);
      if (!result.success) throw new Error(result.error);
      
      setSalaries(prev => [newSalary, ...prev]);
      e.currentTarget.reset();
    } catch (error: any) {
      console.error('Add salary error:', error);
      alert('Ошибка при сохранении: ' + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-8">
      <header className="flex justify-between items-end px-2 pt-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Зарплаты</h1>
          <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest">
            Учет выплат сотрудникам
          </div>
        </div>
      </header>

      {/* Form */}
      <section className="bg-[#111] rounded-[2.5rem] p-6 border border-white/5 space-y-6">
        <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest">
          <Plus size={12} /> Новая выплата
        </div>
        <form onSubmit={handleAddSalary} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-gray-500 ml-1 tracking-wider">Тип</label>
              <select name="type" className="w-full p-4 bg-white/5 rounded-2xl text-sm font-bold text-white border-none focus:ring-1 focus:ring-white/20 appearance-none">
                <option value="salary">Зарплата</option>
                <option value="prepayment">Аванс</option>
                <option value="bonus">Премия</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-gray-500 ml-1 tracking-wider">Источник</label>
              <select name="payment_source" className="w-full p-4 bg-white/5 rounded-2xl text-sm font-bold text-white border-none focus:ring-1 focus:ring-white/20 appearance-none">
                <option value="cash">Сейф (Нал)</option>
                <option value="bank">Р/С (Безнал)</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-gray-500 ml-1 tracking-wider">Сотрудник</label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input name="person" placeholder="Имя сотрудника" className="w-full p-4 pl-12 bg-white/5 rounded-2xl text-sm font-bold text-white border-none focus:ring-1 focus:ring-white/20" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-gray-500 ml-1 tracking-wider">Дата</label>
              <input name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} className="w-full p-4 bg-white/5 rounded-2xl text-sm font-bold text-white border-none focus:ring-1 focus:ring-white/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black text-gray-500 ml-1 tracking-wider">Сумма (₽)</label>
              <input name="amount" type="number" placeholder="0" className="w-full p-4 bg-white/5 rounded-2xl text-lg font-black text-white border-none focus:ring-1 focus:ring-white/20" required />
            </div>
          </div>

          <button type="submit" disabled={isSaving} className="w-full bg-white text-black p-5 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all flex justify-center items-center gap-2">
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <>Добавить выплату <Plus size={18} strokeWidth={3} /></>}
          </button>
        </form>
      </section>

      {/* List */}
      <section className="space-y-4 px-1">
        <div className="flex items-center justify-between text-gray-500 text-[10px] font-black uppercase tracking-widest px-2">
          <span>История выплат</span>
          <span>Всего: {salaries.reduce((sum, s) => sum + s.amount, 0).toLocaleString()} ₽</span>
        </div>

        <div className="space-y-2">
          {salaries.length > 0 ? (
            salaries.map(salary => (
              <div key={salary.id} className="bg-[#111] p-4 rounded-3xl flex justify-between items-center border border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{salary.person}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${
                      salary.type === 'salary' ? 'bg-blue-500/10 text-blue-400' :
                      salary.type === 'bonus' ? 'bg-green-500/10 text-green-400' :
                      'bg-orange-500/10 text-orange-400'
                    }`}>
                      {salary.type === 'salary' ? 'ЗП' : salary.type === 'bonus' ? 'Премия' : 'Аванс'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase">
                    <span className="flex items-center gap-1"><Calendar size={10} /> {format(new Date(salary.date), 'dd.MM.yy')}</span>
                    <span className="flex items-center gap-1">
                      {salary.payment_source === 'cash' ? <Wallet size={10} /> : <CreditCard size={10} />}
                      {salary.payment_source === 'cash' ? 'Сейф' : 'Р/С'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-white">
                    {salary.amount.toLocaleString()} ₽
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center border border-dashed border-white/5 rounded-[2.5rem]">
              <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Нет записей</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
