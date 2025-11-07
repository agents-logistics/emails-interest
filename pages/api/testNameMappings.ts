import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Fetch all test name mappings with test details
      const mappings = await db.testNameMapping.findMany({
        include: {
          test: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          smartsheetTestName: 'asc'
        }
      });

      // Transform the response to include appTestName
      const formattedMappings = mappings.map(mapping => ({
        id: mapping.id,
        smartsheetTestName: mapping.smartsheetTestName,
        appTestId: mapping.appTestId,
        appTestName: mapping.test.name,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt
      }));

      return res.status(200).json({ mappings: formattedMappings });
    } catch (error) {
      console.error('Error fetching test name mappings:', error);
      return res.status(500).json({ error: 'Failed to fetch test name mappings' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { smartsheetTestName, appTestId } = req.body;

      // Validation
      if (!smartsheetTestName || smartsheetTestName.trim() === '') {
        return res.status(400).json({ error: 'Smartsheet test name is required' });
      }

      if (!appTestId || appTestId.trim() === '') {
        return res.status(400).json({ error: 'App test ID is required' });
      }

      // Check if the test exists
      const testExists = await db.patientTest.findUnique({
        where: { id: appTestId }
      });

      if (!testExists) {
        return res.status(400).json({ error: 'Selected test does not exist' });
      }

      // Check if mapping already exists
      const existingMapping = await db.testNameMapping.findUnique({
        where: { smartsheetTestName: smartsheetTestName.trim() }
      });

      if (existingMapping) {
        return res.status(400).json({ 
          error: `A mapping for "${smartsheetTestName.trim()}" already exists` 
        });
      }

      // Create the mapping
      const mapping = await db.testNameMapping.create({
        data: {
          smartsheetTestName: smartsheetTestName.trim(),
          appTestId: appTestId.trim()
        },
        include: {
          test: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Format response
      const formattedMapping = {
        id: mapping.id,
        smartsheetTestName: mapping.smartsheetTestName,
        appTestId: mapping.appTestId,
        appTestName: mapping.test.name,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt
      };

      return res.status(201).json({ mapping: formattedMapping, success: true });
    } catch (error: any) {
      console.error('Error creating test name mapping:', error);
      return res.status(500).json({ error: 'Failed to create test name mapping' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;

      if (!id || id.trim() === '') {
        return res.status(400).json({ error: 'Mapping ID is required' });
      }

      // Check if mapping exists
      const mapping = await db.testNameMapping.findUnique({
        where: { id: id.trim() }
      });

      if (!mapping) {
        return res.status(404).json({ error: 'Mapping not found' });
      }

      // Delete the mapping
      await db.testNameMapping.delete({
        where: { id: id.trim() }
      });

      return res.status(200).json({ success: true, message: 'Mapping deleted successfully' });
    } catch (error) {
      console.error('Error deleting test name mapping:', error);
      return res.status(500).json({ error: 'Failed to delete test name mapping' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

