import * as googleDb from './google-sheets';
import * as supabaseDb from './supabase-db';

export async function migrateGoogleToSupabase() {
  console.log('Starting migration from Google Sheets to Supabase...');

  try {
    // 1. Get all summaries (dates)
    const summaries = await googleDb.getDashboardSummary();
    const dates = summaries.map(s => s.date);
    console.log(`Found ${dates.length} days to migrate.`);

    for (const date of dates) {
      console.log(`Migrating data for ${date}...`);
      const fullDay = await googleDb.getFullDay(date);

      // Save Shift
      if (fullDay.shift) {
        await supabaseDb.saveShift(fullDay.shift);
      }

      // Save Financials
      if (fullDay.financials) {
        await supabaseDb.saveFinancials(fullDay.financials);
      }

      // Save Expenses
      for (const expense of fullDay.expenses) {
        await supabaseDb.addExpense(expense);
      }

      // Save Operations
      for (const operation of fullDay.operations) {
        await supabaseDb.addOperation(operation);
      }

      // Save Discounts
      for (const discount of fullDay.discounts) {
        await supabaseDb.addDiscount(discount);
      }

      // Save Safe Transactions
      for (const transaction of fullDay.safe_transactions) {
        await supabaseDb.addSafeTransaction(transaction);
      }
    }

    // 2. Migrate Recurring Expenses
    console.log('Migrating recurring expenses...');
    const recurring = await googleDb.getRecurringExpenses();
    console.log(`Found ${recurring.length} recurring expenses.`);
    for (const item of recurring) {
      await supabaseDb.saveRecurringExpense(item);
    }
    
    // 3. Migrate Global Balances
    console.log('Migrating global balances...');
    const balances = await googleDb.getGlobalBalances();
    await supabaseDb.saveGlobalBalances(balances);

    // 4. Migrate Action Logs (History)
    console.log('Migrating action logs...');
    const logs = await googleDb.getActionLogs();
    for (const log of logs) {
      await supabaseDb.addActionLog(log);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
