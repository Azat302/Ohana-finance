import ExpensesPageContent from '@/components/ExpensesPageContent';
import { getRecurringExpensesAction } from '@/app/actions';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const recurringExpenses = await getRecurringExpensesAction();

  return <ExpensesPageContent today={today} recurringExpenses={recurringExpenses} />;
}
