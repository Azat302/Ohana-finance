import { getDashboardSummaryAction, getRecurringExpensesAction } from './actions';
import Link from 'next/link';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay 
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronRight, TrendingUp, Wallet, Clock, Calendar as CalendarIcon, CreditCard } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [summaries, recurringExpenses] = await Promise.all([
    getDashboardSummaryAction(),
    getRecurringExpensesAction(),
  ]);
  const activeSummaries = summaries.filter(s => s.total_revenue > 0 || s.profit !== 0);
  const activeRecurring = recurringExpenses.filter(e => e.active).sort((a, b) => a.day_of_month - b.day_of_month);
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const totalMonthRevenue = activeSummaries.slice(0, 30).reduce((sum, s) => sum + s.total_revenue, 0);
  const totalWeekRevenue = activeSummaries.slice(0, 7).reduce((sum, s) => sum + s.total_revenue, 0);

  // Calendar logic
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const formatCompact = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${Math.round(val / 1000)}k`;
    return Math.round(val).toString();
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex justify-between items-center px-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Дашборд</h1>
        <Link 
          href={`/day/${todayStr}`}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-sm font-black shadow-lg shadow-blue-200 active:scale-95 transition-all"
        >
          Смена сегодня
        </Link>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 px-1">
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-400 text-[10px] uppercase font-black mb-2 tracking-widest">
            <TrendingUp size={12} className="text-green-500" /> Выручка 7дн
          </div>
          <div className="text-2xl font-black text-gray-900">{totalWeekRevenue.toLocaleString()} ₽</div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-400 text-[10px] uppercase font-black mb-2 tracking-widest">
            <TrendingUp size={12} className="text-blue-500" /> Выручка 30дн
          </div>
          <div className="text-2xl font-black text-gray-900">{totalMonthRevenue.toLocaleString()} ₽</div>
        </div>
      </div>

      {/* Mini Calendar */}
      <section className="px-1 space-y-3">
        <div className="flex items-center gap-2 px-2 text-gray-400 text-[10px] uppercase font-black tracking-widest">
          <CalendarIcon size={12} /> {format(today, 'LLLL yyyy', { locale: ru })}
        </div>
        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
              <div key={d} className="text-[10px] font-black text-gray-300 text-center uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const dStr = format(day, 'yyyy-MM-dd');
              const summary = summaries.find(s => s.date === dStr);
              const isCurrentMonth = isSameMonth(day, today);
              const isToday = isSameDay(day, today);
              const hasRecurring = activeRecurring.some(e => e.day_of_month === parseInt(format(day, 'd')));

              return (
                <Link
                  key={dStr}
                  href={`/day/${dStr}`}
                  className={`
                    aspect-square rounded-xl p-1 flex flex-col justify-between border transition-all active:scale-90 relative overflow-hidden
                    ${isCurrentMonth ? 'bg-white border-gray-50' : 'bg-gray-50/50 border-transparent opacity-30'}
                    ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                    ${summary ? 'hover:border-blue-200' : ''}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                      {format(day, 'd')}
                    </span>
                    {hasRecurring && isCurrentMonth && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm" />
                    )}
                  </div>
                  {summary && (
                    <div className="flex flex-col items-end">
                      {summary.total_revenue > 0 && (
                        <div className="text-[8px] font-black text-green-600 leading-tight">
                          {formatCompact(summary.total_revenue)}
                        </div>
                      )}
                      {summary.total_expenses > 0 && (
                        <div className="text-[8px] font-black text-red-500 leading-tight">
                          {formatCompact(summary.total_expenses)}
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Выручка</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Расходы</span>
            </div>
          </div>
        </div>
      </section>

      {/* Last 30 Days List */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-2 text-gray-400 text-[10px] uppercase font-black tracking-widest">
          <Clock size={12} /> История
        </div>
        <div className="space-y-2 px-1">
          {activeSummaries.map((s) => (
            <Link
              key={s.date}
              href={`/day/${s.date}`}
              className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex justify-between items-center hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              <div>
                <div className="font-bold text-gray-900">
                  {format(parseISO(s.date), 'd MMMM', { locale: ru })}
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-black tracking-tight">
                  {format(parseISO(s.date), 'eeee', { locale: ru })}
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <div className={`font-black text-lg ${s.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {s.profit > 0 ? '+' : ''}{s.profit.toLocaleString()} ₽
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                    Прибыль
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </Link>
          ))}
          {activeSummaries.length === 0 && (
            <div className="bg-white p-12 rounded-[2rem] border border-dashed border-gray-200 text-center">
              <p className="text-gray-400 text-sm font-medium">Данных пока нет.<br/>Откройте первую смену!</p>
            </div>
          )}
        </div>
      </section>

      {/* Mobile-only Permanent Expenses */}
      <section className="md:hidden space-y-3">
        <div className="flex items-center gap-2 px-2 text-gray-400 text-[10px] uppercase font-black tracking-widest">
          <CreditCard size={12} /> Постоянные траты
        </div>
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="space-y-4">
            {activeRecurring.map((exp) => (
              <div key={exp.id} className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-gray-900">{exp.title}</div>
                  <div className="text-[10px] text-gray-400 uppercase font-black tracking-tight">
                    {exp.day_of_month} число
                  </div>
                </div>
                <div className="text-right font-black text-gray-900">
                  {exp.amount.toLocaleString()} ₽
                </div>
              </div>
            ))}
            {activeRecurring.length === 0 && (
              <div className="text-center text-gray-400 text-xs py-4">Нет активных трат</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
