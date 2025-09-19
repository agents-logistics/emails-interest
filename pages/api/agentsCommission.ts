import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    console.log("In agents commision");
    const { agentId } = req.query;
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    try {
      const commissions = await db.agentsCommission.findMany({
        where: { agentId: String(agentId) },
      });
      res.status(200).json(commissions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch commissions' });
    }
  } else if (req.method === 'POST') {
    const { agentId, test_name, commission } = req.body;
    if (!agentId || !test_name || commission === undefined) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    try {
      const updatedCommission = await db.agentsCommission.upsert({
        where: {
          agentId_test_name: {
            agentId: String(agentId),
            test_name: String(test_name),
          },
        },
        update: { commission: parseFloat(commission) },
        create: {
          agentId: String(agentId),
          test_name: String(test_name),
          commission: parseFloat(commission),
        },
      });
      res.status(200).json(updatedCommission);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update commission' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
