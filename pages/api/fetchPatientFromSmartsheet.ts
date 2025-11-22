import { NextApiRequest, NextApiResponse } from 'next';
const client = require('smartsheet');
import { db } from '@/lib/db';

const smartsheet = client.createClient({
  accessToken: process.env.SMARTSHEET_API_TOKEN,
  logLevel: 'info',
});

// Helper function to build column map
const getColMap = (sheet: any) => {
  const map = new Map<string, number>();
  sheet.columns.forEach((c: any) => map.set(c.title, c.id));
  return map;
};

// Helper to extract data from a row
const extractRowData = async (row: any, config: any, colmap: Map<string, number>) => {
  const result: any = {};
  
  const patientNameColId = config.patientNameColumnName ? colmap.get(config.patientNameColumnName) : null;
  const testNameColId = config.testNameColumnName ? colmap.get(config.testNameColumnName) : null;
  const priceColId = config.priceColumnName ? colmap.get(config.priceColumnName) : null;
  const clalitStatusColId = config.clalitStatusColumnName ? colmap.get(config.clalitStatusColumnName) : null;
  const emailSentDateColId = config.emailSentDateColumnName ? colmap.get(config.emailSentDateColumnName) : null;

  // Extract row ID
  result.rowId = row.id;

  // Extract patient name
  if (patientNameColId) {
    const patientNameCell = row.cells.find((c: any) => c.columnId === patientNameColId);
    result.patientName = patientNameCell?.value || '';
  }

  // Extract price
  if (priceColId) {
    const priceCell = row.cells.find((c: any) => c.columnId === priceColId);
    const priceValue = priceCell?.value;
    
    result.rawPrice = priceValue;

    // Convert to number if it's a valid number
    if (priceValue !== undefined && priceValue !== null && priceValue !== '') {
      const numPrice = Number(priceValue);
      result.price = isNaN(numPrice) ? null : numPrice;
    } else {
      result.price = null;
    }
  }

  // Extract Clalit status
  if (clalitStatusColId) {
    const clalitCell = row.cells.find((c: any) => c.columnId === clalitStatusColId);
    const clalitValue = clalitCell?.value;
    
    // Parse allowed values
    const allowedValues = config.clalitAllowedValues 
      ? config.clalitAllowedValues.split(',').map((v: string) => v.trim().toLowerCase()).filter((v: string) => v.length > 0)
      : [];
      
    // Fallback to legacy Yes value if allowedValues is empty
    if (allowedValues.length === 0 && config.clalitYesValue) {
        allowedValues.push(config.clalitYesValue.trim().toLowerCase());
    }

    // Determine empty behavior (default to true/include if not set)
    const includeIfEmpty = config.clalitEmptyAction !== false; 

    if (clalitValue !== undefined && clalitValue !== null && String(clalitValue).trim() !== '') {
      const valueStr = String(clalitValue).trim().toLowerCase();
      
      if (allowedValues.length > 0) {
          if (allowedValues.includes(valueStr)) {
              result.clalitStatus = true;
          } else {
              // Value present but not in allowed list -> Exclude
              result.clalitStatus = false; 
          }
      } else {
          // No allowed values configured at all. 
          // Fallback to legacy behavior: 
          if (config.clalitNoValue && valueStr === config.clalitNoValue.toLowerCase()) {
              result.clalitStatus = false;
          } else {
              // Unmatched value -> Default action
              result.clalitStatus = includeIfEmpty ? null : false;
          }
      }
    } else {
      // Empty value
      result.clalitStatus = includeIfEmpty ? null : false;
    }
  }

  // Extract email sent date if configured
  if (emailSentDateColId) {
     const dateCell = row.cells.find((c: any) => c.columnId === emailSentDateColId);
     result.emailSentDate = dateCell?.value;
  }

  // Extract and map test name
  if (testNameColId) {
    const testNameCell = row.cells.find((c: any) => c.columnId === testNameColId);
    const smartsheetTestName = testNameCell?.value;
    
    result.smartsheetTestName = smartsheetTestName; // Save raw name for UI display

    if (smartsheetTestName && String(smartsheetTestName).trim() !== '') {
      const testNameStr = String(smartsheetTestName).trim();
      
      // Look up the mapping in the database
      const mapping = await db.testNameMapping.findUnique({
        where: { smartsheetTestName: testNameStr }
      });
      
      if (mapping) {
        // Mapping found - return the app test ID
        result.testId = mapping.appTestId;
      } else {
        // No mapping found - return the unmapped test name with a warning
        result.unmappedTestName = testNameStr;
        result.testMappingWarning = `Test "${testNameStr}" found in Smartsheet but no mapping configured.`;
      }
    }
  }

  return result;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { email } = req.body;

    if (!email || email.trim() === '') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get configuration from database
    const config = await db.emailToolSmartsheetConfig.findFirst();

    if (!config) {
      return res.status(400).json({ error: 'Smartsheet not configured. Please configure it in the Smartsheet Maps page.' });
    }

    if (!config.sheetId) {
      return res.status(400).json({ error: 'Sheet ID not configured' });
    }

    if (!config.emailColumnName) {
      return res.status(400).json({ error: 'Email column not configured' });
    }

    // Fetch the sheet from Smartsheet
    const sheet = await smartsheet.sheets.getSheet({ id: config.sheetId });
    const colmap = getColMap(sheet);

    // Get column IDs
    const emailColId = colmap.get(config.emailColumnName);

    if (!emailColId) {
      return res.status(400).json({ 
        error: `Email column "${config.emailColumnName}" not found in Smartsheet` 
      });
    }

    // Search for matching rows
    const matchingRows: any[] = [];
    
    for (const row of sheet.rows) {
      const emailCell = row.cells.find((c: any) => c.columnId === emailColId);
      const emailValue = emailCell?.value;
      
      if (emailValue && String(emailValue).trim().toLowerCase() === email.trim().toLowerCase()) {
        matchingRows.push(row);
      }
    }

    // Handle results
    if (matchingRows.length === 0) {
      return res.status(200).json({ 
        found: false,
        error: 'No patient found with this email in Smartsheet'
      });
    }

    // If multiple matches, return all of them
    if (matchingRows.length > 1) {
      const matches = await Promise.all(
        matchingRows.map(row => extractRowData(row, config, colmap))
      );

      return res.status(200).json({
        found: true,
        multipleMatches: true,
        matches
      });
    }

    // Single match found - extract data
    const row = matchingRows[0];
    const result = await extractRowData(row, config, colmap);
    result.found = true;

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Smartsheet fetch error:', error);
    return res.status(500).json({ 
      error: error?.message || 'Failed to fetch data from Smartsheet' 
    });
  }
}
