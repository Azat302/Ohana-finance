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
  ArrowRight,
  Wallet,
  History,
  X,
  Loader2,
  Clock,
  Settings,
  Fingerprint,
} from 'lucide-react';
import ExpensesManager from './ExpensesManager';
import { GlobalBalances, ActionLog, Expense, DashboardSummary } from '@/types';
import { parseISO, startOfMonth, startOfWeek, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  getActionLogAction, 
  getExpensesByMonthAction,
  saveGlobalBalancesAction
} from '@/app/actions';

interface Props {
  today: string;
  summaries: DashboardSummary[];
  initialBalances: GlobalBalances;
}

export default function HubContent({ today, summaries, initialBalances }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'menu' | 'expenses' | 'salaries' | 'analytics' | 'calendar' | 'agent' | 'settings' | 'history'>('menu');
  const [isFaceIdSupported, setIsFaceIdSupported] = useState(false);
  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(false);

  useEffect(() => {
    // Check for Face ID support
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      setIsFaceIdSupported(true);
      const enabled = localStorage.getItem('faceIdEnabled') === 'true';
      setIsFaceIdEnabled(enabled);
      
      // Автоматический вход через Face ID при загрузке, если включено
      if (enabled && !isAuthenticated) {
        handleFaceIdAuth();
      }
    }
  }, []);

  const handleToggleFaceId = async () => {
    if (isFaceIdEnabled) {
      if (confirm('Вы уверены, что хотите отключить Face ID?')) {
        localStorage.removeItem('faceIdEnabled');
        localStorage.removeItem('faceIdCredentialId');
        setIsFaceIdEnabled(false);
      }
      return;
    }

    try {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        alert('Ваше устройство не поддерживает WebAuthn');
        return;
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userID = 'admin-' + Date.now();
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "Ohana Finance",
          id: window.location.hostname,
        },
        user: {
          id: Uint8Array.from(userID, c => c.charCodeAt(0)),
          name: "admin",
          displayName: "Admin",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      if (credential) {
        localStorage.setItem('faceIdEnabled', 'true');
        localStorage.setItem('faceIdCredentialId', btoa(String.fromCharCode(...new Uint8Array(credential.rawId))));
        setIsFaceIdEnabled(true);
        alert('Face ID успешно настроен!');
      }
    } catch (err: any) {
      console.error('Face ID Error:', err);
      if (err.name !== 'NotAllowedError') {
        alert('Не удалось настроить Face ID. Убедитесь, что ваше устройство поддерживает биометрию и HTTPS.');
      }
    }
  };

  const handleFaceIdAuth = async () => {
    try {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) return;
      const credentialIdB64 = localStorage.getItem('faceIdCredentialId');
      if (!credentialIdB64) return;

      const credentialId = Uint8Array.from(atob(credentialIdB64), c => c.charCodeAt(0));
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [{
          id: credentialId,
          type: 'public-key',
        }],
        userVerification: "required",
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      if (assertion) {
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      console.error('Face ID Auth Error:', err);
      // Не показываем ошибку при авто-входе, чтобы не спамить
    }
  };
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
  
  const HUB_PASSWORD = 'OhanaBest302!';

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await getActionLogAction();
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadSalaries = async () => {
    setIsLoadingSalaries(true);
    try {
      const results = await getExpensesByMonthAction(salaryMonth);
      const staffExpenses = (results || []).filter((e: Expense) => {
        if (!e.title) return false;
        const title = e.title.toLowerCase().trim();
        return title.startsWith('зп') || 
               title.startsWith('премия') || 
               title.includes('зарплата');
      });
      setSalaries(staffExpenses);
    } catch (err: any) {
      console.error('Error loading salaries:', err);
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
  }, [activeTab, salaryMonth]);

  const sortedSalaries = useMemo(() => {
    return [...salaries].sort((a, b) => b.date.localeCompare(a.date));
  }, [salaries]);

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
    try {
      if (!summaries || !Array.isArray(summaries)) {
        return { currentWeekRevenue: 0, currentMonthRevenue: 0, currentMonthProfit: 0 };
      }
      
      const now = new Date();
      const activeSummaries = summaries.filter(s => s && s.date && (Number(s.total_revenue) > 0 || Number(s.profit) !== 0));
      
      const monday = startOfWeek(now, { weekStartsOn: 1 });
      const currentMonthStart = startOfMonth(now);

      const currentWeekRevenue = activeSummaries
        .filter(s => {
          try {
            const d = parseISO(s.date);
            return d >= monday && d <= now;
          } catch { return false; }
        })
        .reduce((sum, s) => sum + (Number(s.total_revenue) || 0), 0);

      const currentMonthRevenue = activeSummaries
        .filter(s => {
          try {
            const d = parseISO(s.date);
            return d >= currentMonthStart && d <= now;
          } catch { return false; }
        })
        .reduce((sum, s) => sum + (Number(s.total_revenue) || 0), 0);

      const currentMonthProfit = activeSummaries
        .filter(s => {
          try {
            const d = parseISO(s.date);
            return d >= currentMonthStart && d <= now;
          } catch { return false; }
        })
        .reduce((sum, s) => sum + (Number(s.profit) || 0), 0);

      return { currentWeekRevenue, currentMonthRevenue, currentMonthProfit };
    } catch (err) {
      console.error('Stats calculation error:', err);
      return { currentWeekRevenue: 0, currentMonthRevenue: 0, currentMonthProfit: 0 };
    }
  }, [summaries]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-3xl font-black text-gray-900">Хаб управления</h2>
            <p className="mt-2 text-sm text-gray-600">Введите пароль администратора</p>
          </div>
          <div className="mt-8 space-y-4">
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-4 py-4 text-center text-2xl tracking-widest border-2 border-gray-200 rounded-2xl focus:ring-blue-500 focus:border-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password === HUB_PASSWORD) {
                    setIsAuthenticated(true);
                  }
                }}
              />
            </div>
            <button
              onClick={() => {
                if (password === HUB_PASSWORD) {
                  setIsAuthenticated(true);
                } else {
                  alert('Неверный пароль');
                }
              }}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-sm text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-95"
            >
              Войти
            </button>

            {isFaceIdEnabled && (
              <button
                onClick={handleFaceIdAuth}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 border-2 border-gray-200 rounded-2xl shadow-sm text-lg font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-95"
              >
                <Fingerprint className="h-6 w-6 text-blue-600" />
                Вход по Face ID
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <LayoutGrid className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 leading-none">OHANA</h1>
              <p className="text-xs font-bold text-blue-600 tracking-tighter uppercase mt-0.5">Control Hub</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('menu')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 pb-24">
        {activeTab === 'menu' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-50 rounded-lg text-green-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-gray-500">Выручка недели</span>
                </div>
                <div className="text-2xl font-black text-gray-900">
                  {stats.currentWeekRevenue.toLocaleString()} ₸
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-gray-500">Выручка месяца</span>
                </div>
                <div className="text-2xl font-black text-gray-900">
                  {stats.currentMonthRevenue.toLocaleString()} ₸
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-gray-500">Прибыль месяца</span>
                </div>
                <div className="text-2xl font-black text-purple-600">
                  {stats.currentMonthProfit.toLocaleString()} ₸
                </div>
              </div>
            </div>

            {/* Балансы */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  Текущие остатки
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setEditingBalance('safe');
                    setTempValue(balances.safe.toString());
                  }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-blue-50 transition-colors group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-gray-600">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase">Сейф</div>
                      <div className="text-xl font-black text-gray-900">{balances.safe.toLocaleString()} ₸</div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                </button>
                <button
                  onClick={() => {
                    setEditingBalance('bank');
                    setTempValue(balances.bank.toString());
                  }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-blue-50 transition-colors group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-gray-600">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase">Р/С (Банк)</div>
                      <div className="text-xl font-black text-gray-900">{balances.bank.toLocaleString()} ₸</div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                </button>
              </div>
            </div>

            {/* Меню разделов */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => setActiveTab('expenses')}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-blue-200 transition-all group text-left"
              >
                <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
                <div className="font-black text-gray-900">Расходы</div>
                <div className="text-xs font-bold text-gray-500">Учет трат</div>
              </button>

              <button 
                onClick={() => setActiveTab('salaries')}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-blue-200 transition-all group text-left"
              >
                <div className="h-12 w-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="font-black text-gray-900">Зарплаты</div>
                <div className="text-xs font-bold text-gray-500">Выплаты персоналу</div>
              </button>

              <button 
                onClick={() => setActiveTab('history')}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-blue-200 transition-all group text-left"
              >
                <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <History className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="font-black text-gray-900">История</div>
                <div className="text-xs font-bold text-gray-500">Лог действий</div>
              </button>

              <button 
                onClick={() => setActiveTab('analytics')}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-blue-200 transition-all group text-left"
              >
                <div className="h-12 w-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="font-black text-gray-900">Аналитика</div>
                <div className="text-xs font-bold text-gray-500">Графики и отчеты</div>
              </button>

              <button 
                onClick={() => setActiveTab('calendar')}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-blue-200 transition-all group text-left"
              >
                <div className="h-12 w-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-rose-600" />
                </div>
                <div className="font-black text-gray-900">Календарь</div>
                <div className="text-xs font-bold text-gray-500">События и смены</div>
              </button>

              <button 
                onClick={() => setActiveTab('agent')}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-blue-200 transition-all group text-left"
              >
                <div className="h-12 w-12 bg-cyan-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-6 w-6 text-cyan-600" />
                </div>
                <div className="font-black text-gray-900">Агент</div>
                <div className="text-xs font-bold text-gray-500">ИИ Помощник</div>
              </button>

              <button 
                onClick={() => setActiveTab('settings')}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-blue-200 transition-all group text-left"
              >
                <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Settings className="h-6 w-6 text-gray-600" />
                </div>
                <div className="font-black text-gray-900">Настройки</div>
                <div className="text-xs font-bold text-gray-500">Face ID и прочее</div>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <ExpensesManager initialDate={today} />
          </div>
        )}

        {activeTab === 'salaries' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-gray-900">Выплаты персоналу</h2>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                <Calendar className="h-5 w-5 text-gray-400 ml-2" />
                <input 
                  type="month" 
                  value={salaryMonth}
                  onChange={(e) => setSalaryMonth(e.target.value)}
                  className="border-none focus:ring-0 text-sm font-bold text-gray-700 bg-transparent"
                />
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Дата</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Сотрудник / Тип</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Сумма</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Источник</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoadingSalaries ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
                          <p className="text-gray-500 font-bold">Загрузка...</p>
                        </td>
                      </tr>
                    ) : sortedSalaries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-bold">
                          Нет данных за выбранный месяц
                        </td>
                      </tr>
                    ) : (
                      sortedSalaries.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-gray-600">
                            {format(parseISO(s.date), 'dd MMM', { locale: ru })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-black text-gray-900">{s.title}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
              <div className="text-sm font-black text-blue-600">{s.amount.toLocaleString()} ₸</div>
            </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                              s.payment_source === 'cash' 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'bg-purple-50 text-purple-700'
                            }`}>
                              {s.payment_source === 'cash' ? 'Нал' : 'Р/С'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveTab('menu')}
                  className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50"
                >
                  <ArrowRight className="h-5 w-5 rotate-180" />
                </button>
                <h2 className="text-2xl font-black text-gray-900">История действий</h2>
              </div>
              <input 
                type="date"
                value={selectedLogDate}
                onChange={(e) => setSelectedLogDate(e.target.value)}
                className="text-sm font-bold text-gray-700 border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {isLoadingLogs ? (
              <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Загрузка логов...</p>
              </div>
            ) : Object.keys(groupedLogs).length === 0 ? (
              <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Логи не найдены</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedLogs).sort((a, b) => b[0].localeCompare(a[0])).map(([date, dateLogs]) => (
                  <div key={date} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-gray-100" />
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                        {format(parseISO(date), 'dd MMMM yyyy', { locale: ru })}
                      </span>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                    <div className="grid gap-3">
                      {dateLogs.map((log) => (
                        <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-gray-50 rounded-xl text-gray-400 group-hover:text-blue-500 transition-colors">
                              <Clock className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-gray-900">{log.timestamp}</span>
                                <span className="text-xs font-black text-blue-600 uppercase">{log.action_type}</span>
                              </div>
                              <p className="text-sm font-bold text-gray-500">{log.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-2">
              <button 
                onClick={() => setActiveTab('menu')}
                className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50"
              >
                <ArrowRight className="h-5 w-5 rotate-180" />
              </button>
              <h2 className="text-2xl font-black text-gray-900">Настройки</h2>
            </div>
            
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${isFaceIdEnabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                    <Fingerprint className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Вход по Face ID</h3>
                    <p className="text-sm font-bold text-gray-500">
                      {isFaceIdEnabled ? 'Включено' : 'Используйте биометрию для быстрого входа'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleFaceId}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
                    isFaceIdEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      isFaceIdEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {['analytics', 'calendar', 'agent'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-20 w-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mb-6">
              {activeTab === 'analytics' && <BarChart3 className="h-10 w-10 text-blue-600" />}
              {activeTab === 'calendar' && <Calendar className="h-10 w-10 text-blue-600" />}
              {activeTab === 'agent' && <MessageSquare className="h-10 w-10 text-blue-600" />}
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Раздел в разработке</h2>
            <p className="text-gray-500 font-bold mb-8">Этот функционал появится в ближайшем обновлении</p>
            <button 
              onClick={() => setActiveTab('menu')}
              className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all"
            >
              Вернуться в меню
            </button>
          </div>
        )}
      </main>

      {editingBalance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Изменить баланс</h3>
            <p className="text-gray-500 font-bold mb-6 uppercase text-xs tracking-widest">
              {editingBalance === 'safe' ? 'Сейф' : 'Р/С (Банк)'}
            </p>
            
            <div className="space-y-6">
              <input
                type="number"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="w-full px-4 py-4 text-2xl font-black text-center bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-0 transition-colors"
                autoFocus
              />
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setEditingBalance(null)}
                  className="py-4 px-4 rounded-2xl font-black text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleBalanceSave}
                  disabled={isSaving}
                  className="py-4 px-4 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
