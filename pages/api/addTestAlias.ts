import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const {  testName, alias } = req.body;
    console.log("HERE");
    console.log(testName);
    console.log(alias);

    try {
      const existingTest = await db.commonTests.findUnique({ where: { test_name: testName } });
      console.log(existingTest);

      if (!existingTest) {
        return res.status(404).json({ error: 'Test not found' });
      }

      const updatedAlias = existingTest.alias ? `${existingTest.alias},${alias}` : alias;

      await db.commonTests.update({
        where: { test_name: testName },
        data: { alias: updatedAlias },
      });

      res.status(200).json({ message: 'Alias added successfully' });
    } catch (error) {
      console.error('Error adding alias:', error);
      res.status(500).json({ error: 'Failed to add alias' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
