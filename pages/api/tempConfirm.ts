import { NextApiRequest, NextApiResponse } from 'next';
const client = require('smartsheet');
import { db } from '@/lib/db';

const smartsheet = client.createClient({
  accessToken: process.env.SMARTSHEET_API_TOKEN,
  logLevel: 'info',
});

type ConfirmRequest = {
  sheetId: string;
  rowId: string;
  biopsyId: string;
  force?: boolean; // allow proceeding despite weird format warning
  markSaveForLater?: boolean; // record partial receipt without updating the sheet
};

// Compute 1st of next odd-numbered month
function getNextOddMonthFirst(today: Date) {
  const month = today.getUTCMonth() + 1; // 1..12
  let nextMonth = month + 1; // default next month
  if (month % 2 === 0) {
    // even month -> next is odd (month+1)
    nextMonth = month + 1;
  } else {
    // odd month -> jump to next odd: month+2
    nextMonth = month + 2;
  }
  let year = today.getUTCFullYear();
  if (nextMonth > 12) {
    nextMonth -= 12;
    year += 1;
  }
  return new Date(Date.UTC(year, nextMonth - 1, 1));
}

const getColMap = (sheet: any) => {
  const map = new Map<string, number>();
  sheet.columns.forEach((c: any) => map.set(c.title, c.id));
  return map;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { sheetId, rowId, biopsyId, force, markSaveForLater } = req.body as ConfirmRequest;
    if (!sheetId || !rowId || !biopsyId) return res.status(400).json({ error: 'Missing fields' });



    // Fetch sheet and column IDs
    const sheet = await smartsheet.sheets.getSheet({ id: sheetId });
    const colmap = getColMap(sheet);

    const receivedCheckboxCol = colmap.get('התקבלו  בחזרה דגימות תואמות לאלו שנשלחו');
    const receivedDateCol = colmap.get('תאריך קבלה במשרד - דגימות תואמות לאלו שנשלחו');
    const nextActionDateCol = colmap.get('תאריך הפעולה הבאה');
    const nextActionCol = colmap.get('הפעולה הבאה');
    const biopsyDetailsCol = colmap.get('פרטי הביופסיה');

    if (!receivedCheckboxCol || !receivedDateCol || !nextActionDateCol || !nextActionCol) {
      return res.status(400).json({ error: 'One or more required columns missing in sheet' });
    }

    // Load row to validate format
    const targetRow = sheet.rows.find((r: any) => String(r.id) === String(rowId));
    const biopsyCell = targetRow?.cells.find((c: any) => c.columnId === biopsyDetailsCol);
    const biopsyDetails: unknown = biopsyCell?.value;
    if (typeof biopsyDetails !== 'string') {
      // proceed anyway
    } else {
      const normalized = biopsyDetails.trim();
      const tokens = normalized.split(',').map((t) => t.trim()).filter(Boolean);
      const exact = tokens.some((t) => t === biopsyId);
      const weird = !exact && normalized.includes(biopsyId);
      if (weird && !force) {
        return res.status(200).json({
          warning: 'BIOPSY ID FOUND BUT FORMAT IS BAD',
          biopsyDetails: normalized,
          requireForce: true,
        });
      }
    }

    // Build update payload
    const now = new Date();
    const nextOddFirst = getNextOddMonthFirst(now);

    const buildCell = (columnId: number, value: any) => ({ columnId, value });

    const updatePayload = {
      sheetId: Number(sheetId),
      body: [
        {
          id: Number(rowId),
          cells: [
            buildCell(receivedCheckboxCol, true),
            buildCell(receivedDateCol, now.toISOString().split('T')[0]),
            buildCell(nextActionDateCol, nextOddFirst.toISOString().split('T')[0]),
            buildCell(nextActionCol, 'החזרת הביופסיה לפתולוגיה'),
          ],
        },
      ],
    };

    await smartsheet.sheets.updateRow(updatePayload);


  } catch (error) {
    console.error('Biopsy confirm error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}


