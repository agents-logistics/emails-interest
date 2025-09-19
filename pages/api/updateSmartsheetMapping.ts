// pages/api/updateSmartsheetMapping.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { smartsheetId, updateData } = req.body;
  console.log("Here to update smartsheet");

  if (!smartsheetId || !updateData) {
    return res.status(400).json({ error: 'Missing smartsheetId or updateData in request body' });
  }

  try {
    const updatedMapping = await db.smartsheetMap.update({
      where: { smartsheetId },
      data: updateData,
    });
    res.status(200).json(updatedMapping);
  } catch (error) {
    console.error('Error updating smartsheet mapping:', error);
    res.status(500).json({ error: 'Failed to update smartsheet mapping' });
  }
}
