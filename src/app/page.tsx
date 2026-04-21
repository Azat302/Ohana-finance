import { getDashboardSummaryAction, getRecurringExpensesAction } from './actions';
import { format } from 'date-fns';
import DashboardContent from '@/components/DashboardContent';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [summaries, recurringExpenses] = await Promise.all([
    getDashboardSummaryAction(),
    getRecurringExpensesAction(),
  ]);
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <DashboardContent 
      summaries={summaries} 
      recurringExpenses={recurringExpenses} 
      todayStr={todayStr} 
    />
  );
}
