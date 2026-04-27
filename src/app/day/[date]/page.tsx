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
    <div className="space-y-0">
      <OperationalPanel 
        initialData={data} 
        date={date} 
        scheduledExpenses={scheduledExpenses}
      />
    </div>
  );
}
