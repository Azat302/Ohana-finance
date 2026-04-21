'use client';

import { useState, useMemo } from 'react';
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
  isSameDay,
  addMonths,
  subMonths,
  getYear,
  getMonth,
  setYear,
  setMonth
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronRight, TrendingUp, Calendar as CalendarIcon, CreditCard, ChevronLeft } from 'lucide-react';

interface Props {
  summaries: any[];
  recurringExpenses: any[];
  todayStr: string;
}

export default function DashboardContent({ summaries, recurringExpenses, todayStr }: Props) {
  const [viewDate, setViewDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const activeSummaries = useMemo(() => 
    summaries.filter(s => s.total_revenue > 0 || s.profit !== 0),
    [summaries]
  );

  const activeRecurring = useMemo(() => 
    recurringExpenses.filter(e => e.active).sort((a, b) => a.day_of_month - b.day_of_month),
    [recurringExpenses]
  );

  // Stats logic
  const stats = useMemo(() => {
    const now = new Date();
    
    // Revenue from Monday of current week
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    const currentWeekRevenue = activeSummaries
      .filter(s => {
        const d = parseISO(s.date);
        return d >= monday && d <= now;
      })
      .reduce((sum, s) => sum + s.total_revenue, 0);

    // Revenue for current month
    const currentMonthStart = startOfMonth(now);
    const currentMonthRevenue = activeSummaries
      .filter(s => {
        const d = parseISO(s.date);
        return d >= currentMonthStart && d <= now;
      })
      .reduce((sum, s) => sum + s.total_revenue, 0);

    return { currentWeekRevenue, currentMonthRevenue };
  }, [activeSummaries]);

  // Calendar logic
  const { calendarDays, monthStart } = useMemo(() => {
    const mStart = startOfMonth(viewDate);
    const mEnd = endOfMonth(viewDate);
    const cStart = startOfWeek(mStart, { weekStartsOn: 1 });
    const cEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
    
    return {
      monthStart: mStart,
      calendarDays: eachDayOfInterval({ start: cStart, end: cEnd })
    };
  }, [viewDate]);

  const years = useMemo(() => {
    const currentYear = getYear(new Date());
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);

  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

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
            <TrendingUp size={12} className="text-green-500" /> Выручка (нед)
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.currentWeekRevenue.toLocaleString()} ₽</div>
          <div className="text-[8px] text-gray-400 mt-1 uppercase font-bold">С понедельника</div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-400 text-[10px] uppercase font-black mb-2 tracking-widest">
            <TrendingUp size={12} className="text-blue-500" /> Выручка (мес)
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.currentMonthRevenue.toLocaleString()} ₽</div>
          <div className="text-[8px] text-gray-400 mt-1 uppercase font-bold">{format(new Date(), 'LLLL', { locale: ru })}</div>
        </div>
      </div>

      {/* Mini Calendar */}
      <section className="px-1 space-y-3">
        <div className="flex items-center justify-between px-2">
          <button 
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-2 text-gray-900 text-sm uppercase font-black tracking-widest hover:text-blue-600 transition-colors"
          >
            <CalendarIcon size={14} className="text-blue-500" />
            {format(viewDate, 'LLLL yyyy', { locale: ru })}
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft size={16} className="text-gray-400" />
            </button>
            <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {showPicker && (
          <div className="bg-white p-4 rounded-[2rem] shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {years.map(y => (
                <button 
                  key={y}
                  onClick={() => setViewDate(setYear(viewDate, y))}
                  className={`py-2 rounded-xl text-xs font-black ${getYear(viewDate) === y ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}
                >
                  {y}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {months.map((m, i) => (
                <button 
                  key={m}
                  onClick={() => {
                    setViewDate(setMonth(viewDate, i));
                    setShowPicker(false);
                  }}
                  className={`py-2 rounded-xl text-[10px] font-black uppercase ${getMonth(viewDate) === i ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

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
              const isCurrentMonth = isSameMonth(day, viewDate);
              const isToday = isSameDay(day, new Date());
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
                  {summary && isCurrentMonth && (
                    <div className="text-[7px] font-black text-green-600 leading-none truncate">
                      {Math.round(summary.total_revenue / 1000)}k
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
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
