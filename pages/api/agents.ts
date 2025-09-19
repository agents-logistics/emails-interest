import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'POST':
      const { agentName } = req.body;
      if (!agentName) {
        return res.status(400).json({ error: 'Agent name is required' });
      }
      try {
        const newAgent = await db.agents.create({
          data: { agentName },
        });
        res.status(201).json(newAgent);
      } catch (error) {
        res.status(500).json({ error: 'Failed to create agent' });
      }
      break;
    case 'GET':
      try {
        const agents = await db.agents.findMany();
        res.status(200).json(agents);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch agents' });
      }
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
