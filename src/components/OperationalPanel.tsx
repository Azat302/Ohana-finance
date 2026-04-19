'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { FullDayData, Shift, Financials, Expense, Operation, Discount } from '@/types';
import { 
  saveShiftAction, 
  saveFinancialsAction, 
  addExpenseAction, 
  addOperationAction, 
  addDiscountAction,
  deleteItemAction 
} from '@/app/actions';
import { Plus, Trash2, Users, CreditCard, Banknote, Coffee, Car, X, Save, Percent, Loader2, Wallet, ArrowLeft, Lock, Unlock, UserCheck } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

interface Props {
  initialData: FullDayData;
  date: string;
}

export default function OperationalPanel({ initialData, date }: Props) {
  const isToday = date === format(new Date(), 'yyyy-MM-dd');
  const [data, setData] = useState<FullDayData>(initialData);
  const [modal, setModal] = useState<'taxi' | 'staff_hookah' | 'discount' | 'password' | 'expense' | 'staff' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isLocked, setIsLocked] = useState(!isToday);
  const [password, setPassword] = useState('');
  const EDIT_PASSWORD = '123';

  // Helper for real-time calculations
  const calculateFinancials = (revCash: number, revCard: number, expenses: Expense[] = data.expenses, operations: Operation[] = data.operations, discounts: Discount[] = data.discounts) => {
    const totalRev = revCash + revCard;
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalOps = operations.reduce((sum, o) => sum + (o.amount * (o.count || 1)), 0);
    const totalDiscounts = discounts.reduce((sum, d) => sum + (d.amount * (d.count || 1)), 0);
    const profit = totalRev - totalExp - totalOps - totalDiscounts;
    return { date, revenue_cash: revCash, revenue_card: revCard, total_revenue: totalRev, profit };
  };

  const handleSaveShift = async (updates: Partial<Shift>) => {
    const newShift = { 
      date, 
      staff: (updates.staff ?? data.shift?.staff) || [], 
      start_cash: (updates.start_cash ?? data.shift?.start_cash) || 0, 
      end_cash: 0
    };
    setSaveStatus('saving');
    await saveShiftAction(newShift);
    setData(prev => ({ ...prev, shift: newShift }));
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleSaveFin = async (updates: Partial<Financials> = {}) => {
    const revCash = updates.revenue_cash ?? data.financials?.revenue_cash ?? 0;
    const revCard = updates.revenue_card ?? data.financials?.revenue_card ?? 0;
    const newFin = calculateFinancials(revCash, revCard, data.expenses, data.operations, data.discounts);
    
    setSaveStatus('saving');
    try {
      await saveFinancialsAction(newFin);
      setData(prev => ({ ...prev, financials: newFin }));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Save error:', e);
      setSaveStatus('idle');
    }
  };

  // Live update handler for inputs
  const handleRevenueChange = (type: 'cash' | 'card', value: string) => {
     const numVal = parseFloat(value) || 0;
     setData(prev => {
       const revCash = type === 'cash' ? numVal : (prev.financials?.revenue_cash || 0);
       const revCard = type === 'card' ? numVal : (prev.financials?.revenue_card || 0);
       return {
         ...prev,
         financials: calculateFinancials(revCash, revCard, prev.expenses, prev.operations, prev.discounts)
       };
     });
   };

  const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (modal === 'password') {
      if (password === EDIT_PASSWORD) {
        setIsLocked(false);
        setModal(null);
        setPassword('');
      } else {
        alert('Неверный пароль');
      }
      return;
    }
    const formData = new FormData(e.currentTarget);
    setIsSaving(true);

    try {
      if (modal === 'staff_hookah') {
        const newOp: Operation = {
          id: uuidv4(),
          date,
          type: 'staff_hookah',
          person: formData.get('person') as string,
          amount: parseFloat(formData.get('amount') as string) || 300,
          count: parseInt(formData.get('count') as string) || 1
        };
        await addOperationAction(newOp);
        setData(prev => {
          const nextOps = [...prev.operations, newOp];
          return {
            ...prev,
            operations: nextOps,
            financials: calculateFinancials(prev.financials?.revenue_cash || 0, prev.financials?.revenue_card || 0, prev.expenses, nextOps, prev.discounts)
          };
        });
      } else if (modal === 'staff') {
        const newDisc: Discount = {
          id: uuidv4(),
          date,
          person: formData.get('person') as string,
          amount: 0, // Price removed from UI
          count: parseInt(formData.get('count') as string) || 1,
          note: formData.get('note') as string
        };
        await addDiscountAction(newDisc);
        setData(prev => {
          const nextDiscounts = [...prev.discounts, newDisc];
          return {
            ...prev,
            discounts: nextDiscounts,
            financials: calculateFinancials(prev.financials?.revenue_cash || 0, prev.financials?.revenue_card || 0, prev.expenses, prev.operations, nextDiscounts)
          };
        });
      } else if (modal === 'taxi') {
        const newOp: Operation = {
          id: uuidv4(),
          date,
          type: 'taxi',
          person: formData.get('person') as string,
          amount: parseFloat(formData.get('amount') as string) || 0,
        };
        await addOperationAction(newOp);
        setData(prev => {
          const nextOps = [...prev.operations, newOp];
          return {
            ...prev,
            operations: nextOps,
            financials: calculateFinancials(prev.financials?.revenue_cash || 0, prev.financials?.revenue_card || 0, prev.expenses, nextOps, prev.discounts)
          };
        });
      } else if (modal === 'expense') {
        const now = new Date();
        const time = format(now, 'HH:mm');
        const newExp: Expense = {
          id: uuidv4(),
          date,
          time,
          title: formData.get('title') as string,
          amount: parseFloat(formData.get('amount') as string) || 0,
          type: (formData.get('type') as any) || 'variable',
          payment_source: (formData.get('payment_source') as any) || 'cash',
          payment_type: 'cash'
        };
        await addExpenseAction(newExp);
        setData(prev => {
          const nextExpenses = [...prev.expenses, newExp];
          return {
            ...prev,
            expenses: nextExpenses,
            financials: calculateFinancials(prev.financials?.revenue_cash || 0, prev.financials?.revenue_card || 0, nextExpenses, prev.operations, prev.discounts)
          };
        });
      }
      setModal(null);
    } catch (error) {
      alert('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (sheet: string, id: string) => {
    if (!confirm('Точно удалить?')) return;
    setIsSaving(true);
    await deleteItemAction(sheet, id, date);
    setData(prev => {
      const next = { ...prev };
      if (sheet === 'expenses') {
        const nextExpenses = prev.expenses.filter(e => e.id !== id);
        next.expenses = nextExpenses;
        next.financials = calculateFinancials(next.financials?.revenue_cash || 0, next.financials?.revenue_card || 0, nextExpenses, next.operations, next.discounts);
      } else if (sheet === 'operations') {
        const nextOps = prev.operations.filter(o => o.id !== id);
        next.operations = nextOps;
        next.financials = calculateFinancials(next.financials?.revenue_cash || 0, next.financials?.revenue_card || 0, next.expenses, nextOps, next.discounts);
      } else if (sheet === 'discounts') {
        const nextDiscounts = prev.discounts.filter(d => d.id !== id);
        next.discounts = nextDiscounts;
        next.financials = calculateFinancials(next.financials?.revenue_cash || 0, next.financials?.revenue_card || 0, next.expenses, next.operations, nextDiscounts);
      }
      return next;
    });
    setIsSaving(false);
  };

  return (
    <div className="space-y-4 pb-32">
      {/* Header */}
      <header className="flex items-center gap-4 px-1 py-2">
        <Link href="/" className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-90 transition-all">
          <ArrowLeft size={20} className="text-gray-400" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">
            {format(parseISO(date), 'd MMMM', { locale: ru })}
          </h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
            {format(parseISO(date), 'eeee', { locale: ru })}
          </p>
        </div>
      </header>

      {/* Modals - Optimized for Mobile Touch */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isSaving && setModal(null)} />
          <form onSubmit={handleModalSubmit} className="relative bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase tracking-tighter">
                {modal === 'staff_hookah' ? '💨 Кальян' : modal === 'taxi' ? '🚕 Такси' : modal === 'staff' ? '🧑‍🍳 Стафф' : modal === 'expense' ? '💸 Расход' : '🔒 Доступ'}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="p-2 text-gray-400"><X /></button>
            </div>
            <div className="space-y-4">
              {modal === 'password' ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-blue-500 mb-4">
                    <Lock size={32} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Введите пароль</label>
                    <input 
                      type="password" 
                      placeholder="••••" 
                      className="w-full p-5 bg-gray-50 rounded-2xl border-none text-2xl font-black text-center tracking-[0.5em]" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required 
                      autoFocus 
                    />
                  </div>
                </div>
              ) : modal === 'expense' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-gray-400 ml-1 tracking-wider">Тип платежа</label>
                      <select name="type" className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold border-none appearance-none">
                        <option value="variable">Переменный</option>
                        <option value="fixed">Постоянный</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black text-gray-400 ml-1 tracking-wider">Источник</label>
                      <select name="payment_source" className="w-full p-4 bg-gray-50 rounded-2xl text-sm font-bold border-none appearance-none">
                        <option value="cash">Наличка зав.</option>
                        <option value="bank">Расчетный счет</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Название</label>
                    <input name="title" placeholder="На что потрачено?" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-lg font-bold" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Сумма (₽)</label>
                    <input name="amount" type="number" placeholder="0" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-lg font-bold" required />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Имя / Кто</label>
                    <input name="person" placeholder="..." className="w-full p-4 bg-gray-50 rounded-2xl border-none text-lg font-bold" required autoFocus />
                  </div>
                  {(modal === 'staff_hookah' || modal === 'staff') && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Количество</label>
                      <input name="count" type="number" placeholder="1" defaultValue="1" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-lg font-bold" required />
                    </div>
                  )}
                  {(modal === 'taxi' || modal === 'staff_hookah') && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Цена за ед. (₽)</label>
                      <input name="amount" type="number" placeholder={modal === 'staff_hookah' ? '300' : '0'} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-lg font-bold" required />
                    </div>
                  )}
                  {modal === 'staff' && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Комментарий</label>
                      <input name="note" placeholder="..." className="w-full p-4 bg-gray-50 rounded-2xl border-none text-lg font-bold" />
                    </div>
                  )}
                </>
              )}
            </div>
            <button type="submit" disabled={isSaving} className="w-full bg-gray-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest flex justify-center items-center gap-2 active:scale-95 transition-all">
              {isSaving ? <Loader2 className="animate-spin" /> : modal === 'password' ? 'Разблокировать' : 'Подтвердить'}
            </button>
          </form>
        </div>
      )}

      {/* Staff & Safe Block */}
      <section className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4 ${isLocked ? 'opacity-60' : ''}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-gray-400 font-bold text-[10px] uppercase tracking-wider">
            <Users size={14} /> Персонал и Касса
          </div>
          {isLocked && (
            <div className="flex items-center gap-1 text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-full">
              <Lock size={8} /> Только чтение
            </div>
          )}
        </div>
        <div className="space-y-3">
          <input 
            placeholder="Имена сотрудников" 
            className="w-full p-4 bg-gray-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-blue-500 font-medium"
            defaultValue={data.shift?.staff.join(', ')}
            disabled={isLocked}
            onBlur={e => handleSaveShift({ staff: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          />
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Wallet size={16} /></div>
            <input 
              type="number" 
              placeholder="Сейф на начало дня" 
              className="w-full p-4 pl-12 bg-gray-50 rounded-2xl text-sm border-none font-bold" 
              defaultValue={data.shift?.start_cash} 
              disabled={isLocked}
              onBlur={e => handleSaveShift({ start_cash: parseFloat(e.target.value) || 0 })} 
            />
          </div>
        </div>
      </section>

      {/* Revenue Section with Auto-Save */}
      <section className={`bg-blue-600 rounded-3xl p-5 shadow-xl text-white space-y-5 transition-all ${isLocked ? 'grayscale-[0.5] opacity-80' : ''}`}>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="text-xs opacity-70 font-black uppercase tracking-widest">Выручка за смену</div>
            <div className="text-4xl font-black">{(data.financials?.total_revenue || 0).toLocaleString()} ₽</div>
          </div>
          {isLocked && <Lock className="opacity-30" size={20} />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 p-4 rounded-2xl">
            <div className="text-[10px] uppercase font-black opacity-60 mb-1 tracking-wider">Наличные</div>
            <input 
              type="number" 
              inputMode="decimal"
              className="w-full bg-transparent text-2xl font-black border-none p-0 focus:ring-0 placeholder:text-white/20" 
              placeholder="0"
              disabled={isLocked}
              value={data.financials?.revenue_cash || ''} 
              onChange={e => handleRevenueChange('cash', e.target.value)}
              onBlur={e => handleSaveFin({ revenue_cash: parseFloat(e.target.value) || 0 })} 
            />
          </div>
          <div className="bg-white/10 p-4 rounded-2xl">
            <div className="text-[10px] uppercase font-black opacity-60 mb-1 tracking-wider">Карта</div>
            <input 
              type="number" 
              inputMode="decimal"
              className="w-full bg-transparent text-2xl font-black border-none p-0 focus:ring-0 placeholder:text-white/20" 
              placeholder="0"
              disabled={isLocked}
              value={data.financials?.revenue_card || ''} 
              onChange={e => handleRevenueChange('card', e.target.value)}
              onBlur={e => handleSaveFin({ revenue_card: parseFloat(e.target.value) || 0 })} 
            />
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className={`grid grid-cols-2 gap-2 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
        <button 
          type="button"
          onClick={() => !isLocked && setModal('staff_hookah')} 
          disabled={isLocked}
          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 active:scale-95 transition-all cursor-pointer select-none"
        >
          <div className="bg-orange-100 p-2 rounded-xl pointer-events-none"><Coffee className="text-orange-500" size={24} /></div>
          <span className="text-[10px] font-black uppercase tracking-tighter pointer-events-none">Кальян</span>
        </button>
        <button 
          type="button"
          onClick={() => !isLocked && setModal('expense')} 
          disabled={isLocked}
          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 active:scale-95 transition-all cursor-pointer select-none"
        >
          <div className="bg-red-100 p-2 rounded-xl pointer-events-none"><Banknote className="text-red-500" size={24} /></div>
          <span className="text-[10px] font-black uppercase tracking-tighter pointer-events-none">Расход</span>
        </button>
        <button 
          type="button"
          onClick={() => !isLocked && setModal('taxi')} 
          disabled={isLocked}
          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 active:scale-95 transition-all cursor-pointer select-none"
        >
          <div className="bg-blue-100 p-2 rounded-xl pointer-events-none"><Car className="text-blue-500" size={24} /></div>
          <span className="text-[10px] font-black uppercase tracking-tighter pointer-events-none">Такси</span>
        </button>
        <button 
          type="button"
          onClick={() => !isLocked && setModal('staff')} 
          disabled={isLocked}
          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 active:scale-95 transition-all cursor-pointer select-none"
        >
          <div className="bg-green-100 p-2 rounded-xl pointer-events-none"><UserCheck className="text-green-500" size={24} /></div>
          <span className="text-[10px] font-black uppercase tracking-tighter pointer-events-none">Стафф</span>
        </button>
      </div>

      {/* Unified Lists (Expenses, Operations & Staff) */}
      <div className="space-y-6">
        {/* Expenses List */}
        {data.expenses.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase text-gray-400 px-3 tracking-widest">Расходы за день</div>
            <div className="space-y-2">
              {data.expenses.map(exp => (
                <div key={exp.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-sm text-gray-900">{exp.title}</div>
                      <div className="text-[8px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 font-black uppercase tracking-tighter">
                        {exp.payment_source === 'bank' ? 'Р/С' : 'Нал'}
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                      {exp.time} • {exp.type === 'fixed' ? 'Постоянный' : 'Переменный'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-black text-red-500">-{exp.amount.toLocaleString()} ₽</div>
                    {!isLocked && (
                      <button onClick={() => handleDelete('expenses', exp.id)} className="bg-red-50 text-red-400 p-2.5 rounded-xl active:scale-90 transition-all"><Trash2 size={16}/></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Operations List */}
        {data.operations.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase text-gray-400 px-3 tracking-widest">Операции</div>
            <div className="space-y-2">
              {data.operations.map(op => (
                <div key={op.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-50">
                  <div className="flex-1">
                    <div className="font-bold text-sm text-gray-900">{op.type === 'staff_hookah' ? '💨 Кальян' : '🚕 Такси'}</div>
                    <div className="text-xs font-bold text-gray-400">{op.person} • {op.amount} ₽ {op.count ? `(${op.count} шт)` : ''}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-black text-red-500">-{((op.amount || 0) * (op.count || 1)).toLocaleString()} ₽</div>
                    {!isLocked && (
                      <button onClick={() => handleDelete('operations', op.id)} className="bg-red-50 text-red-400 p-3 rounded-xl active:scale-90 transition-all"><Trash2 size={18}/></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staff List (stored in discounts) */}
        {data.discounts.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase text-gray-400 px-3 tracking-widest">Стафф</div>
            <div className="space-y-2">
              {data.discounts.map(d => (
                <div key={d.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-50">
                  <div className="flex-1">
                    <div className="font-bold text-sm text-gray-900">🧑‍🍳 {d.person}</div>
                    <div className="text-xs font-bold text-gray-400">{d.amount} ₽ {d.count ? `(${d.count} шт)` : ''} {d.note && `• ${d.note}`}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-black text-red-500">-{((d.amount || 0) * (d.count || 1)).toLocaleString()} ₽</div>
                    {!isLocked && (
                      <button onClick={() => handleDelete('discounts', d.id)} className="bg-red-50 text-red-400 p-3 rounded-xl active:scale-90 transition-all"><Trash2 size={18}/></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Large Bottom Save/Edit Button */}
      <div className="px-1 pt-4">
        {isLocked ? (
          <button 
            onClick={() => setModal('password')}
            className="w-full p-6 bg-amber-500 text-white rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-amber-100 active:scale-95 transition-all"
          >
            <Unlock size={24} /> Изменить данные
          </button>
        ) : (
          <button 
            onClick={() => handleSaveFin()}
            disabled={saveStatus === 'saving'}
            className={`w-full p-6 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all ${
              saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white shadow-blue-200'
            }`}
          >
            {saveStatus === 'saving' ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
            {saveStatus === 'saving' ? 'Сохранение...' : saveStatus === 'saved' ? 'Успешно сохранено!' : 'Сохранить данные'}
          </button>
        )}
      </div>

      {/* Floating Sticky Profit Footer */}
      <div className="fixed bottom-20 left-4 right-4 bg-gray-900 text-white p-5 rounded-[2rem] flex justify-between items-center shadow-2xl z-40 border border-white/10 ring-4 ring-black/5">
        <div>
          <div className="text-[10px] uppercase font-black opacity-50 tracking-tighter">Чистая прибыль</div>
          <div className="text-2xl font-black">{(data.financials?.profit || 0).toLocaleString()} ₽</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase font-black opacity-50 tracking-tighter">Всего расходов</div>
          <div className="text-lg font-bold text-red-400">
            -{(
              data.expenses.reduce((sum, e) => sum + e.amount, 0) + 
              data.operations.reduce((sum, o) => sum + (o.amount * (o.count || 1)), 0) +
              data.discounts.reduce((sum, d) => sum + (d.amount * (d.count || 1)), 0)
            ).toLocaleString()} ₽
          </div>
        </div>
      </div>
    </div>
  );
}
