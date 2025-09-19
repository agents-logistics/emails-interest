import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      try {
        const { runId } = req.query;

        if (!runId || isNaN(Number(runId))) {
          return res.status(400).json({ error: 'Missing or invalid runId parameter' });
        }

        const numericRunId = Number(runId);

        // Fetch RunData for the given runId
        const runData = await db.runData.findMany({
          where: { runId: numericRunId },
          select: { testName: true, matchedTestName: true },
        });

        // Extract unique test names from runData, including matchedTestName
        const runDataTestNames = new Set(
          runData.flatMap((data) => [data.testName, data.matchedTestName]).filter(Boolean) // Remove null/undefined
        );

        // Fetch all CommonTests with aliases
        const commonTests = await db.commonTests.findMany();

        // Create a map of aliases to test names
        const aliasMap = new Map();
        commonTests.forEach((test) => {
          aliasMap.set(test.test_name, test.test_name);
          if (test.alias) {
            test.alias.split(',').forEach((alias) => {
              aliasMap.set(alias.trim(), test.test_name);
            });
          }
        });

        // Filter CommonTests to include only tests or their aliases present in runData
        const filteredTests = commonTests.filter((test) =>
          Array.from(runDataTestNames).some(
            (testName) => aliasMap.get(testName) === test.test_name
          )
        );

        console.log(filteredTests);

        res.status(200).json(filteredTests);
      } catch (error) {
        console.error('Error fetching common tests:', error);
        res.status(500).json({ error: 'Failed to fetch common tests' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      break;
  }
}
