import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const mappings = await db.smartsheetMap.findMany();
      res.status(200).json(mappings);
    } catch (error) {
      console.error('Error fetching smartsheet mappings:', error);
      res.status(500).json({ error: 'Failed to fetch smartsheet mappings' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
