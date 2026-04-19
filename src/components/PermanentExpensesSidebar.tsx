import { RecurringExpense } from '@/types';
import { CreditCard, Calendar } from 'lucide-react';

interface Props {
  expenses: RecurringExpense[];
}

export default function PermanentExpensesSidebar({ expenses }: Props) {
  const activeExpenses = expenses.filter(e => e.active).sort((a, b) => a.day_of_month - b.day_of_month);
  const totalAmount = activeExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (activeExpenses.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 h-fit sticky top-20">
      <div className="flex items-center gap-2 mb-6 px-1">
        <CreditCard size={18} className="text-blue-500" />
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Постоянные траты</h2>
      </div>

      <div className="space-y-4">
        {activeExpenses.map((exp) => (
          <div key={exp.id} className="flex justify-between items-start group">
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {exp.title}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-black tracking-tight">
                <Calendar size={10} />
                {exp.day_of_month} число
              </div>
            </div>
            <div className="text-right">
              <div className="font-black text-gray-900">{exp.amount.toLocaleString()} ₽</div>
              <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Сумма</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-dashed border-gray-100">
        <div className="flex justify-between items-center">
          <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Итого в месяц</div>
          <div className="text-xl font-black text-blue-600">{totalAmount.toLocaleString()} ₽</div>
        </div>
      </div>
    </div>
  );
}
