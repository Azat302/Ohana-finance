import HubContent from '@/components/HubContent';
import { getRecurringExpensesAction, getDashboardSummaryAction, getGlobalBalancesAction } from '@/app/actions';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function HubPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [recurringExpenses, summaries, balances] = await Promise.all([
    getRecurringExpensesAction(),
    getDashboardSummaryAction(),
    getGlobalBalancesAction(),
  ]);

  return (
    <HubContent 
      today={today} 
      recurringExpenses={recurringExpenses} 
      summaries={summaries} 
      initialBalances={balances}
    />
  );
}
