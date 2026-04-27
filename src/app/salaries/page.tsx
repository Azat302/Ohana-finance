import SalariesContent from '@/components/SalariesContent';
import { getSalariesAction } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function SalariesPage() {
  const initialSalaries = await getSalariesAction();

  return (
    <main className="min-h-screen pb-20 bg-black">
      <SalariesContent initialSalaries={initialSalaries} />
    </main>
  );
}
