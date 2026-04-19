import ExpensesManager from '@/components/ExpensesManager';
import RecurringExpensesList from '@/components/RecurringExpensesList';
import { getRecurringExpensesAction } from '@/app/actions';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const recurringExpenses = await getRecurringExpensesAction();

  return (
    <div className="max-w-xl mx-auto space-y-12">
      <section>
        <ExpensesManager initialDate={today} />
      </section>
      
      <section className="pb-20">
        <div className="px-2 mb-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Настройка постоянных трат</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Здесь можно изменить или удалить регулярные платежи</p>
        </div>
        <RecurringExpensesList initialExpenses={recurringExpenses} />
      </section>
    </div>
  );
}
