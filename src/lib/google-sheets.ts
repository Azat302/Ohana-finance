import { google } from 'googleapis';
import { Shift, Financials, Expense, Operation, FullDayData, DashboardSummary, RecurringExpense, Discount } from '@/types';
import { cache } from 'react';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

let cachedAuth: any = null;
async function getSheetsClient() {
  if (!cachedAuth) {
    try {
      console.log('Initializing Google Auth...');
      cachedAuth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: SCOPES,
      });
      console.log('Google Auth initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Auth:', error);
      throw error;
    }
  }
  return google.sheets({ version: 'v4', auth: cachedAuth });
}

// --- Reading ---

export const getFullDay = cache(async (date: string): Promise<FullDayData> => {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges: ['shifts!A:D', 'financials!A:E', 'expenses!A:G', 'operations!A:G', 'discounts!A:F'],
    });

    const valueRanges = response.data.valueRanges || [];
    console.log(`Fetched data for ${date}, sheets:`, valueRanges.map(vr => vr.range));
    
    const shiftRow = (valueRanges[0].values || []).find(r => r[0] === date);
    let staff: string[] = [];
    try {
      staff = JSON.parse(shiftRow?.[1] || '[]');
    } catch (e) {
      staff = shiftRow?.[1] ? [shiftRow[1]] : [];
    }
    
    const shift: Shift | null = shiftRow ? {
      date: shiftRow[0],
      staff,
      start_cash: parseFloat(shiftRow[2]) || 0,
      end_cash: parseFloat(shiftRow[3]) || 0,
    } : null;

    const finRow = (valueRanges[1].values || []).find(r => r[0] === date);
    const financials: Financials | null = finRow ? {
      date: finRow[0],
      revenue_cash: parseFloat(finRow[1]) || 0,
      revenue_card: parseFloat(finRow[2]) || 0,
      total_revenue: parseFloat(finRow[3]) || 0,
      profit: parseFloat(finRow[4]) || 0,
    } : null;

    const expenses: Expense[] = (valueRanges[2].values || [])
      .filter(r => r[1] === date)
      .map(r => ({
        id: r[0],
        date: r[1],
        title: r[2],
        amount: parseFloat(r[3]) || 0,
        time: r[4] || '',
        type: (r[5] as any) || 'variable',
        payment_source: (r[6] as any) || 'cash',
        payment_type: 'cash',
      }));

    const operations: Operation[] = (valueRanges[3].values || [])
      .filter(r => r[1] === date)
      .map(r => ({
        id: r[0],
        date: r[1],
        type: r[2] as any,
        person: r[3],
        amount: parseFloat(r[4]) || 0,
        count: parseInt(r[5]) || 0,
        note: r[6],
      }));

    const discounts: Discount[] = (valueRanges[4].values || [])
      .filter(r => r[1] === date)
      .map(r => ({
        id: r[0],
        date: r[1],
        person: r[2],
        amount: parseFloat(r[3]) || 0,
        count: parseInt(r[5]) || 1, // Column 6
        note: r[4],
      }));

    return { date, shift, financials, expenses, operations, discounts };
  } catch (error: any) {
    console.error(`Error getFullDay for date ${date}:`, error.message);
    if (error.response) console.error('API Error Response:', error.response.data);
    return { date, shift: null, financials: null, expenses: [], operations: [], discounts: [] };
  }
});

export const getDashboardSummary = cache(async (): Promise<DashboardSummary[]> => {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'financials!A:E',
    });
    const rows = response.data.values || [];
    if (rows.length <= 1) return [];
    return rows.slice(1).map(r => {
      const rev = parseFloat(r[3]) || 0;
      const profit = parseFloat(r[4]) || 0;
      return {
        date: r[0],
        total_revenue: rev,
        total_expenses: rev - profit,
        profit: profit,
      };
    }).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 31); // 31 to cover full month
  } catch (error) {
    return [];
  }
});

export const getRecurringExpenses = cache(async (): Promise<RecurringExpense[]> => {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'recurring_expenses!A:E',
    });
    const rows = response.data.values || [];
    if (rows.length <= 1) return [];
    return rows.slice(1).map(r => ({
      id: r[0],
      title: r[1],
      amount: parseFloat(r[2]) || 0,
      day_of_month: parseInt(r[3]) || 1,
      active: r[4] === 'TRUE' || r[4] === 'true',
    }));
  } catch (error) {
    return [];
  }
});

// --- Writing ---

export async function saveShift(shift: Shift) {
  const sheets = await getSheetsClient();
  const range = 'shifts!A:D';
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(r => r[0] === shift.date);
  const values = [[shift.date, JSON.stringify(shift.staff), shift.start_cash, shift.end_cash]];
  if (rowIndex === -1) {
    await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range, valueInputOption: 'USER_ENTERED', requestBody: { values } });
  } else {
    await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `shifts!A${rowIndex + 1}:D${rowIndex + 1}`, valueInputOption: 'USER_ENTERED', requestBody: { values } });
  }
}

export async function saveFinancials(fin: Financials) {
  const sheets = await getSheetsClient();
  const range = 'financials!A:E';
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(r => r[0] === fin.date);
  const values = [[fin.date, fin.revenue_cash, fin.revenue_card, fin.total_revenue, fin.profit]];
  if (rowIndex === -1) {
    await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range, valueInputOption: 'USER_ENTERED', requestBody: { values } });
  } else {
    await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `financials!A${rowIndex + 1}:E${rowIndex + 1}`, valueInputOption: 'USER_ENTERED', requestBody: { values } });
  }
}

export async function addExpense(expense: Expense) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({ 
    spreadsheetId: SPREADSHEET_ID, 
    range: 'expenses!A:G', 
    valueInputOption: 'USER_ENTERED', 
    requestBody: { 
      values: [[
        expense.id, 
        expense.date, 
        expense.title, 
        expense.amount, 
        expense.time, 
        expense.type, 
        expense.payment_source
      ]] 
    } 
  });
}

export async function addOperation(op: Operation) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'operations!A:G',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[op.id, op.date, op.type, op.person, op.amount, op.count || 1, op.note || '']]
    }
  });
}

export async function addDiscount(discount: Discount) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'discounts!A:F',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[discount.id, discount.date, discount.person, discount.amount, discount.note || '', discount.count || 1]]
    }
  });
}

export async function saveRecurringExpense(item: RecurringExpense) {
  const sheets = await getSheetsClient();
  const range = 'recurring_expenses!A:E';
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(r => r[0] === item.id);
  const values = [[item.id, item.title, item.amount, item.day_of_month, item.active]];
  if (rowIndex === -1) {
    await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range, valueInputOption: 'USER_ENTERED', requestBody: { values } });
  } else {
    await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `recurring_expenses!A${rowIndex + 1}:E${rowIndex + 1}`, valueInputOption: 'USER_ENTERED', requestBody: { values } });
  }
}

export async function deleteRowById(sheetName: string, id: string) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!A:A` });
  const rows = response.data.values || [];
  const rowIndex = rows.findIndex(r => r[0] === id);
  if (rowIndex !== -1) {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName)?.properties?.sheetId;
    if (sheetId !== undefined) {
      await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody: { requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 } } }] } });
    }
  }
}
