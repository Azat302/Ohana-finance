import HubContent from '@/components/HubContent';
import { getDashboardSummaryAction, getGlobalBalancesAction } from '@/app/actions';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function HubPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [summaries, balances] = await Promise.all([
    getDashboardSummaryAction(),
    getGlobalBalancesAction(),
  ]);

  return (
    <HubContent 
      today={today} 
      summaries={summaries} 
      initialBalances={balances}
    />
  );
}
