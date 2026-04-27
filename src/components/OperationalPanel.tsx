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
  addSafeTransactionAction,
  deleteItemAction,
  deleteDayAction 
} from '@/app/actions';
import { Trash2, Banknote, Coffee, Car, X, Percent, Loader2, Wallet, Lock, UserCheck, WalletCards, ShieldCheck, Pencil, CreditCard } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { SafeTransaction, RecurringExpense } from '@/types';

interface Props {
  initialData: FullDayData;
  date: string;
  scheduledExpenses?: RecurringExpense[];
}

export default function OperationalPanel({ initialData, date, scheduledExpenses = [] }: Props) {
  const isToday = date === format(new Date(), 'yyyy-MM-dd');
  const [data, setData] = useState<FullDayData>(initialData);
  const [modal, setModal] = useState<'taxi' | 'staff_hookah' | 'discount' | 'password' | 'expense' | 'staff' | 'salary' | 'salary_person' | 'salary_type' | 'salary_amount' | 'safe' | 'safe_manual' | 'delete_confirm' | null>(null);
  const [salaryPerson, setSalaryPerson] = useState<string | null>(null);
  const [salaryType, setSalaryType] = useState<'salary' | 'bonus' | null>(null);
  const [salaryPaymentSource, setSalaryPaymentSource] = useState<'cash' | 'bank'>('cash');
  const salaryPeople = ['Влада', 'Дима', 'Равчик', 'Артем', 'Ноутнейм'];
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(!isToday);
  const [password, setPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const EDIT_PASSWORD = '3451';
  const HUB_PASSWORD = 'OhanaBest302!';

  const handleDeleteDay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (deletePassword === HUB_PASSWORD) {
      if (confirm('Вы уверены, что хотите полностью удалить все данные за этот день? Это действие необратимо.')) {
        setIsSaving(true);
        try {
          const result = await deleteDayAction(date);
          if (result.success) {
            window.location.reload();
          } else {
            alert('Ошибка при удалении: ' + result.error);
          }
        } catch (error: any) {
          alert('Ошибка: ' + error.message);
        } finally {
          setIsSaving(false);
          setModal(null);
          setDeletePassword('');
        }
      }
    } else {
      alert('Неверный пароль администратора');
      setDeletePassword('');
    }
  };

  // Helper for real-time calculations
  const calculateFinancials = (revCash: number, revCard: number, expenses: Expense[] = data.expenses) => {
    const totalRev = revCash + revCard;
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalRev - totalExp;
    return { date, revenue_cash: revCash, revenue_card: revCard, total_revenue: totalRev, profit };
  };

  const handleSaveShift = async (updates: Partial<Shift>) => {
    const newShift = { 
      date, 
      staff: (updates.staff ?? data.shift?.staff) || [], 
      start_cash: (updates.start_cash ?? data.shift?.start_cash) || 0, 
      end_cash: 0
    };
    const result = await saveShiftAction(newShift);
    if (result.success) {
      setData(prev => ({ ...prev, shift: newShift }));
    } else {
      console.error('Save shift error:', result.error);
      alert('Ошибка при сохранении смены: ' + result.error);
    }
  };

  const handleSaveFin = async (updates: Partial<Financials> = {}) => {
    const revCash = updates.revenue_cash ?? data.financials?.revenue_cash ?? 0;
    const revCard = updates.revenue_card ?? data.financials?.revenue_card ?? 0;
    const newFin = calculateFinancials(revCash, revCard, data.expenses);
    
    try {
      const result = await saveFinancialsAction(newFin);
      if (result.success) {
        setData(prev => ({ ...prev, financials: newFin }));
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      console.error('Save financials error:', e);
      alert('Ошибка при сохранении финансов: ' + (e.message || e));
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
         financials: calculateFinancials(revCash, revCard, prev.expenses)
       };
     });
   };

  const handleSalaryClose = () => {
    setModal(null);
    setSalaryPerson(null);
    setSalaryType(null);
    setSalaryPaymentSource('cash');
  };

  const handleSalarySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!salaryPerson || !salaryType) return;
    
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string) || 0;
    
    const now = new Date();
    const time = format(now, 'HH:mm');
    const title = salaryType === 'salary' ? `ЗП ${salaryPerson}` : `Премия ${salaryPerson}`;
    
    const newExp: Expense = {
      id: uuidv4(),
      date,
      time,
      title,
      amount,
      type: 'variable',
      payment_source: salaryPaymentSource,
      payment_type: 'cash'
    };
    
    setIsSaving(true);
    try {
      const result = await addExpenseAction(newExp);
      if (!result.success) throw new Error(result.error);
      
      const nextExpenses = [...data.expenses, newExp];
      const newFin = calculateFinancials(data.financials?.revenue_cash || 0, data.financials?.revenue_card || 0, nextExpenses);
      
      const resultFin = await saveFinancialsAction(newFin);
      if (!resultFin.success) throw new Error(resultFin.error);
      
      setData(prev => ({
        ...prev,
        expenses: nextExpenses,
        financials: newFin
      }));
      handleSalaryClose();
    } catch (error: any) {
      console.error('Salary submit error:', error);
      alert('Ошибка при сохранении: ' + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePersonSelect = (person: string) => {
    setSalaryPerson(person);
    setModal('salary_type');
  };

  const handleSalaryTypeSelect = (type: 'salary' | 'bonus') => {
    setSalaryType(type);
    setModal('salary_amount');
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
    if (modal === 'safe_manual') {
      if (password === EDIT_PASSWORD) {
        const formData = new FormData(e.currentTarget);
        const amount = parseFloat(formData.get('amount') as string) || 0;
        const newShift: Shift = {
          date,
          staff: data.shift?.staff || [],
          start_cash: amount,
          end_cash: 0,
          is_manual_start_cash: true
        };
        setIsSaving(true);
        try {
          const result = await saveShiftAction(newShift);
          if (!result.success) throw new Error(result.error);
          setData(prev => ({ ...prev, shift: newShift }));
          setModal(null);
          setPassword('');
        } catch (error: any) {
          console.error('Save manual shift error:', error);
          alert('Ошибка при сохранении: ' + (error.message || error));
        } finally {
          setIsSaving(false);
        }
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
          person: 'Кальян', // Default name
          amount: 0, // No longer affects profit
          count: parseInt(formData.get('count') as string) || 1
        };
        const result = await addOperationAction(newOp);
        if (!result.success) throw new Error(result.error);
        setData(prev => {
          const nextOps = [...prev.operations, newOp];
          return {
            ...prev,
            operations: nextOps,
            financials: calculateFinancials(prev.financials?.revenue_cash || 0, prev.financials?.revenue_card || 0, prev.expenses)
          };
        });
      } else if (modal === 'staff') {
        const newDisc: Discount = {
          id: uuidv4(),
          date,
          person: formData.get('person') as string,
          amount: 0, 
          count: parseInt(formData.get('count') as string) || 1,
          note: '' // Note removed
        };
        const result = await addDiscountAction(newDisc);
        if (!result.success) throw new Error(result.error);
        setData(prev => {
          const nextDiscounts = [...prev.discounts, newDisc];
          return {
            ...prev,
            discounts: nextDiscounts,
            financials: calculateFinancials(prev.financials?.revenue_cash || 0, prev.financials?.revenue_card || 0, prev.expenses)
          };
        });
      } else if (modal === 'taxi') {
        const newOp: Operation = {
          id: uuidv4(),
          date,
          type: 'taxi',
          person: 'Такси', // Default name
          amount: parseFloat(formData.get('amount') as string) || 0,
        };
        const result = await addOperationAction(newOp);
        if (!result.success) throw new Error(result.error);
        setData(prev => {
          const nextOps = [...prev.operations, newOp];
          return {
            ...prev,
            operations: nextOps,
            financials: calculateFinancials(prev.financials?.revenue_cash || 0, prev.financials?.revenue_card || 0, prev.expenses)
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
        const resultExp = await addExpenseAction(newExp);
        if (!resultExp.success) throw new Error(resultExp.error);

        const nextExpenses = [...data.expenses, newExp];
        const newFin = calculateFinancials(data.financials?.revenue_cash || 0, data.financials?.revenue_card || 0, nextExpenses);
        const resultFin = await saveFinancialsAction(newFin);
        if (!resultFin.success) throw new Error(resultFin.error);
        
        setData(prev => ({
          ...prev,
          expenses: nextExpenses,
          financials: newFin
        }));
      } else if (modal === 'safe') {
        const now = new Date();
        const time = format(now, 'HH:mm');
        const amount = parseFloat(formData.get('amount') as string) || 0;
        const newSafeTrans: SafeTransaction = {
          id: uuidv4(),
          date,
          time,
          amount,
          note: formData.get('note') as string || 'Перевод в сейф'
        };
        const result = await addSafeTransactionAction(newSafeTrans);
        if (!result.success) throw new Error(result.error);
        setData(prev => ({
          ...prev,
          safe_transactions: [...(prev.safe_transactions || []), newSafeTrans]
        }));
      }
      setModal(null);
    } catch (error: any) {
      console.error('Modal submit error:', error);
      alert('Ошибка при сохранении: ' + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (sheet: string, id: string) => {
    if (!confirm('Точно удалить?')) return;
    setIsSaving(true);
    try {
      const result = await deleteItemAction(sheet, id, date);
      if (!result.success) throw new Error(result.error);
      
      let nextExpenses = data.expenses;
      let nextOps = data.operations;
      let nextDiscounts = data.discounts;
      
      if (sheet === 'expenses') {
        nextExpenses = data.expenses.filter(e => e.id !== id);
      } else if (sheet === 'operations') {
        nextOps = data.operations.filter(o => o.id !== id);
      } else if (sheet === 'discounts') {
        nextDiscounts = data.discounts.filter(d => d.id !== id);
      } else if (sheet === 'safe_transactions') {
        setData(prev => ({
          ...prev,
          safe_transactions: prev.safe_transactions.filter(t => t.id !== id)
        }));
        setIsSaving(false);
        return; // Early return as financials don't need update for safe
      }
      
      const newFin = calculateFinancials(
        data.financials?.revenue_cash || 0, 
        data.financials?.revenue_card || 0, 
        nextExpenses
      );
      
      const resultFin = await saveFinancialsAction(newFin);
      if (!resultFin.success) throw new Error(resultFin.error);
      
      setData(prev => ({
        ...prev,
        expenses: nextExpenses,
        operations: nextOps,
        discounts: nextDiscounts,
        financials: newFin
      }));
    } catch (error: any) {
      console.error('Delete error:', error);
      alert('Ошибка при удалении: ' + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-32 max-w-lg mx-auto">
      {/* New Header - Hub Style - moved to top */}
      <div className="bg-gray-50/50 backdrop-blur-md px-6 py-4 sticky top-0 z-30 transition-all border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Смена</h1>
          
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-400">Сейф:</span>
            <span className="text-sm font-black text-blue-600">
              {((data.shift?.start_cash || 0) + (data.safe_transactions?.reduce((sum, t) => sum + t.amount, 0) || 0)).toLocaleString()} ₽
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => isLocked ? setModal('password') : setIsLocked(true)} 
              className="p-2 hover:bg-white rounded-2xl transition-all active:scale-90 shadow-sm border border-transparent hover:border-gray-100"
            >
              <Pencil className="h-5 w-5 text-gray-900" />
            </button>
            <button 
              onClick={() => setModal('delete_confirm')}
              className="p-2 hover:bg-white rounded-2xl transition-all active:scale-90 shadow-sm border border-transparent hover:border-gray-100 group"
            >
              <Trash2 className="h-5 w-5 text-gray-900 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* Scheduled Expenses Section */}
      {scheduledExpenses.length > 0 && (
        <section className="px-4">
          <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-5 space-y-3">
            <div className="flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase tracking-widest">
              <CreditCard size={14} /> Запланированные постоянные траты
            </div>
            <div className="space-y-2">
              {scheduledExpenses.map(exp => (
                <div key={exp.id} className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">{exp.title}</span>
                  <span className="font-black text-blue-600">{exp.amount.toLocaleString()} ₽</span>
                </div>
              ))}
              <div className="pt-2 border-t border-blue-100 flex justify-between items-center">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Итого к списанию</span>
                <span className="text-lg font-black text-blue-700">
                  {scheduledExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} ₽
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Modals - Optimized for Mobile Touch */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isSaving && setModal(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tighter">
                {modal === 'staff_hookah' ? '💨 Кальян' : modal === 'taxi' ? '🚕 Такси' : modal === 'staff' ? '🧑‍🍳 Стафф' : modal === 'expense' ? '💸 Расход' : modal === 'salary' ? '👤 Сотрудник' : modal === 'salary_type' ? '💰 Тип' : modal === 'salary_amount' ? '💸 Сумма' : modal === 'safe' ? '🛡️ Сейф' : modal === 'delete_confirm' ? '🗑️ Удаление' : '🔒 Доступ'}
              </h3>
              <button type="button" onClick={() => ['salary', 'salary_type', 'salary_amount'].includes(modal || '') ? handleSalaryClose() : setModal(null)} className="p-2 text-gray-400"><X /></button>
            </div>
            
            <form onSubmit={
              ['salary_amount', 'salary_type', 'salary'].includes(modal) 
                ? handleSalarySubmit 
                : modal === 'delete_confirm' 
                ? handleDeleteDay 
                : handleModalSubmit
            } className="space-y-4">
              {modal === 'delete_confirm' ? (
                <div className="space-y-4">
                  <div className="bg-red-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-red-500 mb-4">
                    <Trash2 size={32} />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-[10px] font-bold text-gray-500 mb-4">Для полного удаления данных за день введите сложный пароль хаба</p>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      className="w-full p-5 bg-gray-50 rounded-2xl border-none text-xl font-black text-center tracking-[0.2em]" 
                      value={deletePassword}
                      onChange={e => setDeletePassword(e.target.value)}
                      required 
                      autoFocus 
                    />
                  </div>
                </div>
              ) : modal === 'safe' ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-emerald-500 mb-4">
                    <ShieldCheck size={32} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase font-bold text-gray-400 ml-1">Сумма (₽)</label>
                    <p className="text-[8px] text-gray-400 mb-1 ml-1 italic">Положительная (+), Отрицательная (-)</p>
                    <input 
                      name="amount" 
                      type="number" 
                      step="any"
                      placeholder="0" 
                      className="w-full p-5 bg-gray-50 rounded-2xl border-none text-xl font-black text-center" 
                      required 
                      autoFocus 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase font-bold text-gray-400 ml-1">Комментарий (необяз.)</label>
                    <input 
                      name="note" 
                      placeholder="Например: Внесение из кассы" 
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none text-xs font-bold" 
                    />
                  </div>
                </div>
              ) : modal === 'password' ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-blue-500 mb-4">
                    <Lock size={32} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase font-bold text-gray-400 ml-1">Введите пароль</label>
                    <input 
                      type="password" 
                      placeholder="••••" 
                      className="w-full p-5 bg-gray-50 rounded-2xl border-none text-xl font-black text-center tracking-[0.5em]" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required 
                      autoFocus 
                    />
                  </div>
                </div>
              ) : modal === 'salary' ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 font-medium text-center">Выберите сотрудника</p>
                  <div className="grid grid-cols-2 gap-2">
                    {salaryPeople.map(person => (
                      <button
                        key={person}
                        type="button"
                        onClick={() => handlePersonSelect(person)}
                        className="p-4 bg-gray-50 rounded-2xl text-xs font-bold hover:bg-purple-50 hover:text-purple-600 transition-colors active:scale-95"
                      >
                        {person}
                      </button>
                    ))}
                  </div>
                </div>
              ) : modal === 'salary_type' ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 font-medium text-center">
                    {salaryPerson}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSalaryTypeSelect('salary')}
                      className="p-6 bg-green-50 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all"
                    >
                      <Wallet size={32} className="text-green-500" />
                      <span className="text-xs font-black uppercase">Зарплата</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSalaryTypeSelect('bonus')}
                      className="p-6 bg-purple-50 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all"
                    >
                      <Percent size={32} className="text-purple-500" />
                      <span className="text-xs font-black uppercase">Премия</span>
                    </button>
                  </div>
                </div>
              ) : modal === 'salary_amount' ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-[8px] uppercase font-black text-gray-400 tracking-widest mb-1">{salaryType === 'salary' ? 'Сумма зарплаты' : 'Сумма премии'}</p>
                    <p className="text-lg font-black text-gray-900">{salaryPerson}</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[8px] uppercase font-bold text-gray-400 ml-1">Источник выплаты</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSalaryPaymentSource('cash')}
                          className={`p-4 rounded-2xl text-[10px] font-black uppercase transition-all ${salaryPaymentSource === 'cash' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-400'}`}
                        >
                          Наличные
                        </button>
                        <button
                          type="button"
                          onClick={() => setSalaryPaymentSource('bank')}
                          className={`p-4 rounded-2xl text-[10px] font-black uppercase transition-all ${salaryPaymentSource === 'bank' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-400'}`}
                        >
                          Карта (Р/С)
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] uppercase font-bold text-gray-400 ml-1">Сумма (₽)</label>
                      <input 
                        name="amount" 
                        type="number" 
                        placeholder="0" 
                        className="w-full p-5 bg-gray-50 rounded-2xl border-none text-xl font-black text-center" 
                        required 
                        autoFocus 
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase font-bold text-gray-400 ml-1">
                      {modal === 'staff_hookah' ? 'Количество кальянов' : modal === 'taxi' ? 'Сумма такси (₽)' : modal === 'staff' ? 'Количество' : 'Название расхода'}
                    </label>
                    <input 
                      name={modal === 'expense' ? 'title' : modal === 'staff_hookah' || modal === 'staff' ? 'count' : 'amount'} 
                      type={modal === 'expense' ? 'text' : 'number'} 
                      placeholder={modal === 'expense' ? 'Напр: Хозтовары' : '0'} 
                      className="w-full p-5 bg-gray-50 rounded-2xl border-none text-xl font-black text-center" 
                      required 
                      autoFocus 
                    />
                  </div>
                  {modal === 'expense' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-bold text-gray-400 ml-1">Сумма (₽)</label>
                          <input name="amount" type="number" placeholder="0" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-base font-bold" required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-bold text-gray-400 ml-1">Тип</label>
                          <select name="type" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-xs font-bold appearance-none">
                            <option value="variable">Переменный</option>
                            <option value="fixed">Постоянный</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase font-bold text-gray-400 ml-1">Источник</label>
                        <select name="payment_source" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-xs font-bold appearance-none">
                          <option value="cash">Наличные</option>
                          <option value="bank">Карта (Р/С)</option>
                        </select>
                      </div>
                    </>
                  )}
                  {modal === 'safe_manual' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase font-bold text-gray-400 ml-1">Сумма в сейфе (₽)</label>
                        <input name="amount" type="number" placeholder="0" defaultValue={data.shift?.start_cash} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-base font-bold" required />
                      </div>
                    </>
                  )}
                  {modal === 'staff' && (
                    <div className="space-y-1">
                      {/* Note removed per user request */}
                    </div>
                  )}
                </>
              )}
            {!['salary', 'salary_type'].includes(modal || '') && (
              <button 
                type="submit" 
                disabled={isSaving} 
                className={`w-full p-5 rounded-2xl font-black uppercase tracking-widest flex justify-center items-center gap-2 active:scale-95 transition-all ${
                  modal === 'delete_confirm' ? 'bg-red-500 text-white' : 'bg-gray-900 text-white'
                }`}
              >
                {isSaving ? <Loader2 className="animate-spin" /> : modal === 'password' ? 'Разблокировать' : modal === 'delete_confirm' ? 'Удалить всё' : 'Подтвердить'}
              </button>
            )}
            </form>
          </div>
        </div>
      )}

      <div className="px-4 space-y-6 pt-2">
        {/* Block: Персонал и касса */}
        <section className="bg-white rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5 relative overflow-hidden border border-gray-50">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Сотрудники</label>
              <input 
                placeholder="Имена через запятую" 
                className="w-full p-4 bg-gray-50/50 rounded-2xl text-[13px] border-none focus:ring-2 focus:ring-gray-100 font-bold placeholder:text-gray-200 transition-all"
                defaultValue={data.shift?.staff.join(', ')}
                disabled={isLocked}
                onBlur={e => handleSaveShift({ staff: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Наличные (₽)</label>
                <input 
                  type="number" 
                  inputMode="decimal"
                  placeholder="0" 
                  className="w-full p-4 bg-gray-50/50 rounded-2xl text-base border-none focus:ring-2 focus:ring-gray-100 font-black placeholder:text-gray-200 transition-all"
                  disabled={isLocked}
                  value={data.financials?.revenue_cash || ''} 
                  onChange={e => handleRevenueChange('cash', e.target.value)}
                  onBlur={e => handleSaveFin({ revenue_cash: parseFloat(e.target.value) || 0 })} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Карта (₽)</label>
                <input 
                  type="number" 
                  inputMode="decimal"
                  placeholder="0" 
                  className="w-full p-4 bg-gray-50/50 rounded-2xl text-base border-none focus:ring-2 focus:ring-gray-100 font-black placeholder:text-gray-200 transition-all"
                  disabled={isLocked}
                  value={data.financials?.revenue_card || ''} 
                  onChange={e => handleRevenueChange('card', e.target.value)}
                  onBlur={e => handleSaveFin({ revenue_card: parseFloat(e.target.value) || 0 })} 
                />
              </div>
            </div>
          </div>
        </section>

      {/* Block: Панель управления */}
      <section className="space-y-4">
        <div className="font-black text-gray-900 uppercase tracking-widest text-[10px] px-1 opacity-30">Панель управления</div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'staff_hookah', label: 'Кальян', icon: <Coffee size={24} />, color: 'text-gray-900' },
            { id: 'expense', label: 'Расход', icon: <Banknote size={24} />, color: 'text-gray-900' },
            { id: 'taxi', label: 'Такси', icon: <Car size={24} />, color: 'text-gray-900' },
            { id: 'salary', label: 'Зарплаты', icon: <WalletCards size={24} />, color: 'text-gray-900' },
            { id: 'staff', label: 'Стафф', icon: <UserCheck size={24} />, color: 'text-gray-900' },
            { id: 'safe', label: 'Сейф', icon: <ShieldCheck size={24} />, color: 'text-gray-900' },
          ].map((btn) => (
            <button 
              key={btn.id}
              type="button"
              onClick={() => !isLocked && setModal(btn.id as any)} 
              disabled={isLocked}
              className={`bg-white aspect-square rounded-[2rem] shadow-[0_10px_25px_rgba(0,0,0,0.02)] border border-gray-50 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all cursor-pointer select-none ${isLocked ? 'opacity-50' : 'hover:border-gray-100'}`}
            >
              <div className={`${btn.color} opacity-90`}>{btn.icon}</div>
              <span className="text-[10px] font-black uppercase tracking-tighter text-gray-900">{btn.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Block: Чек дня */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 border border-gray-50">
        <div className="font-black text-gray-900 uppercase tracking-widest text-[10px] opacity-30">Чек дня</div>

        {/* Expenses List */}
        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase text-gray-900 tracking-widest px-1 opacity-20">Расходы за день</div>
          <div className="space-y-2">
            {data.expenses.length > 0 ? data.expenses.map(exp => (
              <div key={exp.id} className="flex justify-between items-center group px-1">
                <div className="flex-1">
                  <div className="font-bold text-sm text-gray-900">{exp.title}</div>
                  <div className="text-[10px] font-bold text-gray-300 mt-0.5 uppercase tracking-widest">
                    {exp.time} • {exp.payment_source === 'bank' ? 'Р/С' : 'Нал'}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-sm font-black text-gray-900">-{exp.amount.toLocaleString()} ₽</div>
                  {!isLocked && (
                    <button onClick={() => handleDelete('expenses', exp.id)} className="text-gray-100 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                  )}
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-[10px] font-bold text-gray-200 uppercase tracking-widest italic">Нет расходов</div>
            )}
          </div>
        </div>

        {/* Operations & Data List */}
        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase text-gray-900 tracking-widest px-1 opacity-20">Операции и данные</div>
          <div className="space-y-2">
            {[...data.operations, ...data.discounts].length > 0 ? (
              <>
                {data.operations.map(op => (
                  <div key={op.id} className="flex justify-between items-center px-1">
                    <div className="flex-1">
                      <div className="font-bold text-sm text-gray-900">{op.type === 'staff_hookah' ? '💨 Кальян' : '🚕 Такси'}</div>
                      <div className="text-[10px] font-bold text-gray-300 mt-0.5 uppercase tracking-widest">
                        {op.type === 'staff_hookah' ? `${op.count} шт` : `${op.person} • ${op.amount} ₽`}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-sm font-black text-gray-900">
                        {op.type === 'taxi' ? `${op.amount.toLocaleString()} ₽` : `${op.count} шт`}
                      </div>
                      {!isLocked && (
                        <button onClick={() => handleDelete('operations', op.id)} className="text-gray-100 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                      )}
                    </div>
                  </div>
                ))}
                {data.discounts.map(d => (
                  <div key={d.id} className="flex justify-between items-center px-1">
                    <div className="flex-1">
                      <div className="font-bold text-sm text-gray-900">🧑‍🍳 {d.person}</div>
                      <div className="text-[10px] font-bold text-gray-300 mt-0.5 uppercase tracking-widest">Стафф • {d.count} шт</div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-sm font-black text-gray-900">{d.count} шт</div>
                      {!isLocked && (
                        <button onClick={() => handleDelete('discounts', d.id)} className="text-gray-100 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-4 text-[10px] font-bold text-gray-200 uppercase tracking-widest italic">Нет операций</div>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="pt-6 space-y-4 border-t border-gray-50">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Выручка</div>
              <div className="text-lg font-black text-gray-900">{(data.financials?.total_revenue || 0).toLocaleString()} ₽</div>
            </div>
            <div className="space-y-1 text-right">
              <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Расходы</div>
              <div className="text-lg font-black text-red-500">{(data.expenses.reduce((sum, e) => sum + e.amount, 0)).toLocaleString()} ₽</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="bg-gray-900 rounded-3xl p-6 flex justify-between items-center">
              <div className="text-[8px] font-black text-white/40 uppercase tracking-widest">Чистая прибыль</div>
              <div className="text-xl font-black text-white">{(data.financials?.profit || 0).toLocaleString()} ₽</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-gray-400">
                {format(parseISO(date), 'd MMMM yyyy, eeee', { locale: ru })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    {/* Lock Indicator for viewing */}
    {isLocked && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-full border border-gray-100 shadow-xl flex items-center gap-2">
          <Lock size={14} className="text-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Только чтение</span>
        </div>
      </div>
    )}
  </div>
);
}
