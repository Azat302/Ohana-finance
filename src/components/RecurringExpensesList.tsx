'use client';

import { useState } from 'react';
import { RecurringExpense } from '@/types';
import { saveRecurringExpenseAction, deleteItemAction } from '@/app/actions';
import { Plus, Trash2, Power, Edit2, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  initialExpenses: RecurringExpense[];
}

export default function RecurringExpensesList({ initialExpenses }: Props) {
  const [expenses, setExpenses] = useState<RecurringExpense[]>(initialExpenses);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', amount: '', day: '1' });

  const handleSave = async (item: RecurringExpense) => {
    await saveRecurringExpenseAction(item);
    setExpenses(prev => {
      const exists = prev.find(e => e.id === item.id);
      if (exists) return prev.map(e => e.id === item.id ? item : e);
      return [...prev, item];
    });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Точно удалить?')) return;
    await deleteItemAction('recurring_expenses', id, '');
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const toggleActive = async (item: RecurringExpense) => {
    const updated = { ...item, active: !item.active };
    await saveRecurringExpenseAction(updated);
    setExpenses(prev => prev.map(e => e.id === item.id ? updated : e));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {expenses.map(exp => (
          <div key={exp.id} className={`bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex justify-between items-center ${!exp.active ? 'opacity-50' : ''}`}>
            {editingId === exp.id ? (
              <div className="w-full space-y-3">
                <input 
                  className="w-full p-3 bg-gray-50 rounded-xl font-bold" 
                  value={editForm.title} 
                  onChange={e => setEditForm({...editForm, title: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="p-3 bg-gray-50 rounded-xl font-bold" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} />
                  <input type="number" className="p-3 bg-gray-50 rounded-xl font-bold" value={editForm.day} onChange={e => setEditForm({...editForm, day: e.target.value})} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleSave({ id: exp.id, title: editForm.title, amount: parseFloat(editForm.amount) || 0, day_of_month: parseInt(editForm.day) || 1, active: exp.active })}
                    className="flex-1 bg-gray-900 text-white p-3 rounded-xl font-black uppercase tracking-widest text-xs"
                  >
                    Сохранить
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-3 bg-gray-100 rounded-xl text-xs font-black uppercase tracking-widest">Отмена</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <div className="font-black text-gray-900 text-lg tracking-tight">{exp.title}</div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex gap-2">
                    <span>{exp.day_of_month} число</span>
                    <span>•</span>
                    <span className="text-blue-500">{exp.amount.toLocaleString()} ₽</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleActive(exp)}
                    className={`p-3 rounded-2xl transition-all active:scale-90 ${exp.active ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400'}`}
                  >
                    <Power size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      setEditingId(exp.id);
                      setEditForm({ title: exp.title, amount: exp.amount.toString(), day: exp.day_of_month.toString() });
                    }}
                    className="p-3 bg-blue-50 text-blue-500 rounded-2xl active:scale-90 transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(exp.id)}
                    className="p-3 bg-red-50 text-red-400 rounded-2xl active:scale-90 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
