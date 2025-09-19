import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { runId } = req.query;

  if (!runId) {
    return res.status(400).json({ error: 'runId is required' });
  }

  try {
    const runIdNumber = Number(runId);

    // Only delete runData, not testsRunId, agentLink, or bonusRuns
    await db.runData.deleteMany({ where: { runId: runIdNumber } });

    res.status(200).json({ message: 'Run data deleted successfully' });
  } catch (error) {
    console.error('Error deleting run data:', error);
    res.status(500).json({ error: 'Failed to delete run data' });
  }
}
