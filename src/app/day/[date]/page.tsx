import { getFullDayAction, getRecurringExpensesAction } from '@/app/actions';
import OperationalPanel from '@/components/OperationalPanel';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CreditCard } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ date: string }>;
}

export default async function DailyReportPage({ params }: Props) {
  const { date } = await params;
  const [data, recurringExpenses] = await Promise.all([
    getFullDayAction(date),
    getRecurringExpensesAction(),
  ]);

  const dayOfMonth = parseInt(format(parseISO(date), 'd'));
  const scheduledExpenses = recurringExpenses.filter(e => e.active && e.day_of_month === dayOfMonth);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-xl font-bold">Смена</h1>
          <p className="text-sm text-gray-500">
            {format(parseISO(date), 'd MMMM yyyy, eeee', { locale: ru })}
          </p>
        </div>
      </header>

      {scheduledExpenses.length > 0 && (
        <section className="px-1">
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

      <OperationalPanel initialData={data} date={date} />
    </div>
  );
}
