'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Lock, 
  LayoutGrid, 
  TrendingUp, 
  Banknote, 
  Users, 
  BarChart3, 
  Calendar, 
  MessageSquare, 
  Settings,
  ArrowRight,
  Wallet,
  CreditCard,
  History,
  X,
  Loader2,
  Clock,
  CircleDollarSign,
  User
} from 'lucide-react';
import ExpensesManager from './ExpensesManager';
import RecurringExpensesList from './RecurringExpensesList';
import { RecurringExpense, GlobalBalances, ActionLog, Expense } from '@/types';
import { parseISO, startOfMonth, startOfWeek, format, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { saveGlobalBalancesAction, getActionLogsAction, getFullDayAction, runMigrationAction } from '@/app/actions';

interface Props {
  today: string;
  recurringExpenses: RecurringExpense[];
  summaries: any[];
  initialBalances: GlobalBalances;
}

export default function HubContent({ today, recurringExpenses, summaries, initialBalances }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'menu' | 'expenses' | 'salaries' | 'analytics' | 'calendar' | 'agent' | 'settings' | 'history'>('menu');
  const [balances, setBalances] = useState<GlobalBalances>(initialBalances);
  const [editingBalance, setEditingBalance] = useState<'safe' | 'bank' | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState<string>('');
  const [salaries, setSalaries] = useState<Expense[]>([]);
  const [isLoadingSalaries, setIsLoadingSalaries] = useState(false);
  const [salaryMonth, setSalaryMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

  const handleMigration = async () => {
    if (!confirm('Вы уверены, что хотите запустить перенос данных из Google Sheets в Supabase? Это может занять время.')) return;
    
    setIsMigrating(true);
    setMigrationStatus('Перенос данных запущен...');
    try {
      const result = await runMigrationAction();
      if (result.success) {
        setMigrationStatus('Миграция успешно завершена!');
        alert('Данные перенесены! Теперь не забудь поменять USE_SUPABASE=true в .env.local');
      } else {
        setMigrationStatus(`Ошибка: ${result.error}`);
      }
    } catch (err) {
      setMigrationStatus('Произошла критическая ошибка при миграции');
    } finally {
      setIsMigrating(false);
    }
  };

  const HUB_PASSWORD = '123';

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await getActionLogsAction();
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch logs');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadSalaries = async () => {
    setIsLoadingSalaries(true);
    try {
      const monthStart = startOfMonth(parseISO(`${salaryMonth}-01`));
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      const daysInMonth = summaries.filter(s => {
        const d = parseISO(s.date);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      });

      // Параллельная загрузка данных для всех дней месяца
      const results = await Promise.all(
        daysInMonth.map(day => getFullDayAction(day.date))
      );

      const allSalaries = results.flatMap(dayData => 
        dayData.expenses.filter(e => 
          e.title.startsWith('ЗП ') || e.title.startsWith('Премия ')
        )
      );

      setSalaries(allSalaries.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (error) {
      console.error('Error loading salaries:', error);
    } finally {
      setIsLoadingSalaries(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadLogs();
    } else if (activeTab === 'salaries') {
      loadSalaries();
    }
  }, [activeTab, selectedLogDate, salaryMonth]);

  const groupedLogs = useMemo(() => {
    const groups: { [key: string]: ActionLog[] } = {};
    const filteredLogs = logs.filter(log => !selectedLogDate || log.date === selectedLogDate);
    
    filteredLogs.forEach(log => {
      if (!groups[log.date]) groups[log.date] = [];
      groups[log.date].push(log);
    });
    return groups;
  }, [logs, selectedLogDate]);

  const handleBalanceSave = async () => {
    if (!editingBalance) return;
    const value = parseFloat(tempValue) || 0;
    setIsSaving(true);
    try {
      const newBalances = { ...balances, [editingBalance]: value };
      const result = await saveGlobalBalancesAction({ [editingBalance]: value });
      if (!result.success) throw new Error(result.error);
      setBalances(newBalances);
      setEditingBalance(null);
    } catch (error: any) {
      console.error('Save balance error:', error);
      alert('Ошибка при сохранении: ' + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const activeSummaries = summaries.filter(s => s.total_revenue > 0 || s.profit !== 0);
    
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    const currentWeekRevenue = activeSummaries
      .filter(s => {
        const d = parseISO(s.date);
        return d >= monday && d <= now;
      })
      .reduce((sum, s) => sum + s.total_revenue, 0);

    const currentMonthStart = startOfMonth(now);
    const currentMonthRevenue = activeSummaries
      .filter(s => {
        const d = parseISO(s.date);
        return d >= currentMonthStart && d <= now;
      })
      .reduce((sum, s) => sum + s.total_revenue, 0);

    const currentMonthProfit = activeSummaries
      .filter(s => {
        const d = parseISO(s.date);
        return d >= currentMonthStart && d <= now;
      })
      .reduce((sum, s) => sum + s.profit, 0);

    return { currentWeekRevenue, currentMonthRevenue, currentMonthProfit };
  }, [summaries]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 w-full max-w-sm text-center space-y-6">
          <div className="bg-purple-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-purple-500">
            <Lock size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Вход в Хаб</h2>
            <p className="text-gray-400 text-sm font-medium">Введите пароль администратора</p>
          </div>
          <div className="space-y-4">
            <input 
              type="password" 
              placeholder="••••" 
              className="w-full p-5 bg-gray-50 rounded-2xl text-center text-2xl font-black tracking-[0.5em] border-none focus:ring-2 focus:ring-purple-500 transition-all"
              autoFocus
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (e.target.value === HUB_PASSWORD) setIsAuthenticated(true);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // TAB RENDERING
  if (activeTab === 'settings') {
    return (
      <div className="space-y-8 pb-20">
        <button 
          onClick={() => setActiveTab('menu')}
          className="flex items-center gap-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-purple-600 transition-colors"
        >
          <LayoutGrid size={14} /> Назад в Хаб
        </button>
        
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Настройки системы</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Миграция и конфигурация</p>
          </div>

          <div className="p-6 bg-purple-50 rounded-[2rem] space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500 p-2 rounded-xl text-white">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase">Миграция в Supabase</h3>
                <p className="text-[10px] font-bold text-purple-400 uppercase">Перенос данных из Google Sheets</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 font-medium">
              Эта функция перенесет все ваши данные из Google Таблиц в новую базу данных PostgreSQL на Supabase. 
              Запускайте только после того, как настроите SQL и пропишете ключи в .env.local.
            </p>

            {migrationStatus && (
              <div className={`p-3 rounded-xl text-[10px] font-black uppercase ${migrationStatus.includes('ошибка') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {migrationStatus}
              </div>
            )}

            <button
              onClick={handleMigration}
              disabled={isMigrating}
              className="w-full bg-gray-900 text-white p-4 rounded-2xl font-black uppercase tracking-widest flex justify-center items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {isMigrating ? <Loader2 className="animate-spin" size={18} /> : 'Запустить перенос данных'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'expenses') {
    return (
      <div className="space-y-8 pb-20">
        <button 
          onClick={() => setActiveTab('menu')}
          className="flex items-center gap-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-purple-600 transition-colors"
        >
          <LayoutGrid size={14} /> Назад в Хаб
        </button>
        <ExpensesManager recurringExpenses={recurringExpenses} today={today} />
      </div>
    );
  }

  if (activeTab === 'history') {
    return (
      <div className="space-y-8 pb-20">
        <button 
          onClick={() => setActiveTab('menu')}
          className="flex items-center gap-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-purple-600 transition-colors"
        >
          <LayoutGrid size={14} /> Назад в Хаб
        </button>
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 min-h-[500px] flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">История действий</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input 
                type="date" 
                value={selectedLogDate}
                onChange={(e) => setSelectedLogDate(e.target.value)}
                className="text-xs font-bold uppercase p-2 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-purple-500"
              />
              {selectedLogDate && (
                <button 
                  onClick={() => setSelectedLogDate('')}
                  className="text-[10px] font-black uppercase text-purple-500 bg-purple-50 px-3 py-2 rounded-xl"
                >
                  Сброс
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 space-y-8 overflow-y-auto max-h-[600px] pr-2 scrollbar-hide">
            {isLoadingLogs ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-purple-500" size={32} />
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Загрузка истории...</p>
              </div>
            ) : Object.keys(groupedLogs).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="bg-gray-50 p-6 rounded-[2rem] text-gray-300">
                  <Clock size={48} />
                </div>
                <p className="text-gray-400 text-sm font-medium">За этот период действий не найдено</p>
              </div>
            ) : (
              Object.entries(groupedLogs)
                .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                .map(([date, dayLogs]) => (
                  <div key={date} className="space-y-4">
                    <div className="sticky top-0 bg-white/80 backdrop-blur-sm py-2 z-10">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                        {format(parseISO(date), 'd MMMM yyyy', { locale: ru })}
                      </h3>
                    </div>
                    <div className="border-l-2 border-gray-100 ml-2 space-y-6">
                      {dayLogs
                        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                        .map((log) => (
                        <div key={log.id} className="relative pl-8">
                          <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-purple-500 border-2 border-white shadow-sm" />
                          <div className="bg-gray-50/50 hover:bg-gray-50 p-4 rounded-2xl transition-colors">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-sm font-bold text-gray-800 leading-tight">
                                {log.description}
                              </p>
                              <span className="text-[9px] font-black text-gray-300 uppercase shrink-0 ml-2">
                                {format(parseISO(log.timestamp), 'HH:mm')}
                              </span>
                            </div>
                            {log.details && (
                              <p className="text-[11px] text-gray-500 font-medium mt-1 italic">
                                {log.details.startsWith('{') ? 'Технические данные обновлены' : log.details}
                              </p>
                            )}
                            {(log.ip || log.user_agent) && (
                              <div className="mt-2 flex items-center gap-3 text-[8px] font-black text-gray-300 uppercase tracking-widest border-t border-gray-100/50 pt-2">
                                {log.ip && (
                                  <span className="flex items-center gap-1">
                                    IP: <span className="text-gray-400">{log.ip}</span>
                                  </span>
                                )}
                                {log.user_agent && (
                                  <span className="flex items-center gap-1 truncate max-w-[150px]">
                                    DEV: <span className="text-gray-400 truncate" title={log.user_agent}>
                                      {log.user_agent.includes('iPhone') ? 'iPhone' : 
                                       log.user_agent.includes('Android') ? 'Android' : 
                                       log.user_agent.includes('Windows') ? 'Windows' : 
                                       log.user_agent.includes('Macintosh') ? 'Mac' : 'Device'}
                                    </span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
          
          <p className="text-center text-[9px] font-black text-gray-300 uppercase tracking-widest mt-8">
            Все воздействия с Ohana Финанс сохраняются здесь
          </p>
        </div>
      </div>
    );
  }

  if (activeTab === 'salaries') {
    return (
      <div className="space-y-6 pb-20">
        <button 
          onClick={() => setActiveTab('menu')}
          className="flex items-center gap-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-purple-600 transition-colors"
        >
          <LayoutGrid size={14} /> Назад
        </button>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-gray-900 tracking-tighter uppercase italic">Зарплаты</h2>
            <input 
              type="month" 
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(e.target.value)}
              className="text-[10px] font-black uppercase p-2 bg-gray-50 rounded-xl border-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {isLoadingSalaries ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-2">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-[9px] font-black uppercase tracking-widest">Загрузка...</span>
            </div>
          ) : salaries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 italic">
              <span className="text-[9px] font-black uppercase tracking-widest">Нет данных</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {salaries.map((salary) => (
                <div key={salary.id} className="py-3 flex items-center justify-between group">
                  <div className="flex flex-col">
                    <div className="text-xs font-black text-gray-800 uppercase tracking-tight">
                      {salary.title.replace('ЗП ', '').replace('Премия ', '')}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">
                        {format(parseISO(salary.date), 'dd.MM')}
                      </span>
                      <span className="text-[9px] font-black text-purple-400 uppercase tracking-tighter">
                        {salary.title.startsWith('Премия') ? 'Премия' : 'ЗП'}
                      </span>
                      <span className="text-[9px] font-medium text-gray-300 uppercase tracking-tighter">
                        {salary.payment_source === 'cash' ? 'Нал' : 'Р/С'}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-black text-gray-900">
                    {salary.amount.toLocaleString()} ₽
                  </div>
                </div>
              ))}
              <div className="pt-4 mt-2 border-t border-gray-100 flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Итого за месяц:</span>
                <span className="text-sm font-black text-purple-600">
                  {salaries.reduce((sum, s) => sum + s.amount, 0).toLocaleString()} ₽
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback for development tabs
  if (activeTab !== 'menu') {
    const tabNames: {[key: string]: string} = {
      analytics: 'Аналитика',
      calendar: 'Календарь',
      agent: 'Чат с агентом'
    };

    return (
      <div className="space-y-8 pb-20">
        <button 
          onClick={() => setActiveTab('menu')}
          className="flex items-center gap-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-purple-600 transition-colors"
        >
          <LayoutGrid size={14} /> Назад в Хаб
        </button>
        <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 text-center space-y-4">
          <div className="text-4xl">🏗️</div>
          <h2 className="text-xl font-black text-gray-900">Раздел {tabNames[activeTab] || activeTab} в разработке</h2>
          <p className="text-gray-400 text-sm font-medium">Мы скоро добавим сюда функционал</p>
        </div>
      </div>
    );
  }

  const hubItems = [
    { id: 'settings', name: 'Настройки БАЗЫ', icon: Settings, color: 'text-red-500', bg: 'bg-red-50' },
    { id: 'expenses', name: 'Расходы', icon: Banknote, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'salaries', name: 'Зарплаты', icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'analytics', name: 'Аналитика', icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'calendar', name: 'Календарь', icon: Calendar, color: 'text-green-500', bg: 'bg-green-50' },
    { id: 'agent', name: 'Чат с агентом', icon: MessageSquare, color: 'text-pink-500', bg: 'bg-pink-50' },
  ];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <header className="px-2 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Хаб управления</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Центр управления Ohana</p>
        </div>
        <button 
          onClick={() => setActiveTab('history')}
          className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-gray-400 hover:text-purple-500 transition-colors active:scale-95"
        >
          <History size={20} />
        </button>
      </header>

      {/* Global Balances */}
      <section className="grid grid-cols-1">
        <button 
          onClick={() => {
            setEditingBalance('safe');
            setTempValue(balances.safe.toString());
          }}
          className="bg-white p-6 rounded-[2rem] border border-gray-100 flex flex-col items-start gap-2 active:scale-95 transition-all relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={80} />
          </div>
          <div className="bg-emerald-50 text-emerald-500 p-2 rounded-xl">
            <Wallet size={16} />
          </div>
          <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Сейф (наличные)</div>
          <div className="text-xl font-black text-gray-900">{balances.safe.toLocaleString()} ₽</div>
          <div className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter mt-1">
            Нажмите, чтобы изменить вручную
          </div>
        </button>
      </section>

      {/* Balance Edit Modal */}
      {editingBalance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900 uppercase italic">
                {editingBalance === 'safe' ? 'Редактировать сейф' : 'Редактировать счет'}
              </h3>
              <button onClick={() => setEditingBalance(null)} className="text-gray-400"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Сумма (₽)</label>
                <input 
                  type="number" 
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="w-full p-6 bg-gray-50 rounded-3xl border-none text-3xl font-black focus:ring-2 focus:ring-purple-500" 
                  autoFocus
                />
              </div>
              <button 
                onClick={handleBalanceSave}
                disabled={isSaving}
                className="w-full bg-gray-900 text-white p-6 rounded-3xl font-black uppercase tracking-widest flex justify-center items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Block */}
      <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <TrendingUp size={14} className="text-purple-500" /> Аналитика за месяц
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase">Выручка</div>
            <div className="text-2xl font-black text-gray-900">{stats.currentMonthRevenue.toLocaleString()} ₽</div>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-[10px] font-bold text-gray-400 uppercase">Чистая прибыль</div>
            <div className="text-2xl font-black text-green-600">{stats.currentMonthProfit.toLocaleString()} ₽</div>
          </div>
        </div>
        <div className="h-2 bg-gray-50 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-purple-500" 
            style={{ width: `${Math.min(100, (stats.currentMonthProfit / (stats.currentMonthRevenue || 1)) * 100)}%` }} 
          />
        </div>
        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-tighter text-gray-400">
          <span>Маржинальность: {stats.currentMonthRevenue ? Math.round((stats.currentMonthProfit / stats.currentMonthRevenue) * 100) : 0}%</span>
          <span>Неделя: {stats.currentWeekRevenue.toLocaleString()} ₽</span>
        </div>
      </section>

      {/* Hub Grid */}
      <div className="grid grid-cols-2 gap-4 px-1">
        {hubItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className="bg-white p-6 rounded-[2rem] border border-gray-100 flex flex-col items-start gap-4 transition-all active:scale-95 hover:border-purple-200 group relative overflow-hidden"
          >
            <div className={`${item.bg} ${item.color} p-3 rounded-2xl group-hover:scale-110 transition-transform`}>
              <item.icon size={24} />
            </div>
            <div className="w-full flex justify-between items-end">
              <span className="text-sm font-black text-gray-900 uppercase tracking-tighter leading-none">{item.name}</span>
              <ArrowRight size={14} className="text-gray-300 group-hover:text-purple-500 transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
