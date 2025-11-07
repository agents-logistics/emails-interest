import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Fetch the first (and should be only) configuration record
      const config = await db.emailToolSmartsheetConfig.findFirst();
      return res.status(200).json({ config: config || null });
    } catch (error) {
      console.error('Error fetching smartsheet config:', error);
      return res.status(500).json({ error: 'Failed to fetch configuration' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { 
        sheetId, 
        emailColumnName, 
        patientNameColumnName,
        testNameColumnName,
        priceColumnName,
        installmentColumnName,
        clalitStatusColumnName,
        clalitYesValue,
        clalitNoValue
      } = req.body;

      // Validate that sheetId is provided
      if (!sheetId || sheetId.trim() === '') {
        return res.status(400).json({ error: 'Sheet ID is required' });
      }

      // Check if a config already exists
      const existingConfig = await db.emailToolSmartsheetConfig.findFirst();

      let config;
      if (existingConfig) {
        // Update existing config
        config = await db.emailToolSmartsheetConfig.update({
          where: { id: existingConfig.id },
          data: {
            sheetId: sheetId.trim(),
            emailColumnName: emailColumnName?.trim() || null,
            patientNameColumnName: patientNameColumnName?.trim() || null,
            testNameColumnName: testNameColumnName?.trim() || null,
            priceColumnName: priceColumnName?.trim() || null,
            installmentColumnName: installmentColumnName?.trim() || null,
            clalitStatusColumnName: clalitStatusColumnName?.trim() || null,
            clalitYesValue: clalitYesValue?.trim() || null,
            clalitNoValue: clalitNoValue?.trim() || null,
          },
        });
      } else {
        // Create new config
        config = await db.emailToolSmartsheetConfig.create({
          data: {
            sheetId: sheetId.trim(),
            emailColumnName: emailColumnName?.trim() || null,
            patientNameColumnName: patientNameColumnName?.trim() || null,
            testNameColumnName: testNameColumnName?.trim() || null,
            priceColumnName: priceColumnName?.trim() || null,
            installmentColumnName: installmentColumnName?.trim() || null,
            clalitStatusColumnName: clalitStatusColumnName?.trim() || null,
            clalitYesValue: clalitYesValue?.trim() || null,
            clalitNoValue: clalitNoValue?.trim() || null,
          },
        });
      }

      return res.status(200).json({ config, success: true });
    } catch (error) {
      console.error('Error saving smartsheet config:', error);
      return res.status(500).json({ error: 'Failed to save configuration' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

