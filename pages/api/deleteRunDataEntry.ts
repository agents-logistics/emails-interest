// pages/api/deleteRunDataEntry.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { rowId } = req.query;

  if (!rowId) {
    return res.status(400).json({ error: 'Missing rowId in query' });
  }

  try {
    await db.runData.delete({
      where: { rowId: String(rowId) },
    });
    res.status(200).json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
}
