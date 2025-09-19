import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db'; 

export const config = {
  api: {
    bodyParser: false, // Disable default body parsing to handle file uploads
  },
};

const assignAgents = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const runId = parseInt(req.query.runid as string, 10);

  if (!runId) {
    return res.status(400).json({ error: 'Missing or invalid runId.' });
  }

  const form = formidable({
    multiples: true, // Allow multiple file uploads
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error parsing form data' });
    }

    const fileArray = Array.isArray(files.files) ? files.files : [files.files];

    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({ error: 'No files provided.' });
    }

    try {
      // Fetch RunData for the provided runId
      const runData = await db.runData.findMany({
        where: { runId },
      });

      if (!runData || runData.length === 0) {
        return res.status(404).json({ error: 'No RunData found for the provided runId.' });
      }

      // Process each file and extract agent ID from filename
      for (const file of fileArray) {
        if (!file) {
          continue;
        }

        // Extract agent ID from filename (format: filename_AGENT_agentId.xlsx)
        const fileName = file.originalFilename || '';
        const agentMatch = fileName.match(/_AGENT_([^.]+)/);
        
        if (!agentMatch) {
          console.warn(`Could not extract agent ID from filename: ${fileName}`);
          continue;
        }
        
        const agentId = agentMatch[1];
        console.log(`Processing file: ${fileName} with Agent ID: ${agentId}`);

        const filePath = file.filepath;
        const fileBuffer = fs.readFileSync(filePath);

        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Parse the Excel sheet to JSON
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

        for (const row of rows) {
          const documentNumber = row['Document Number'];
          const customerName = row['Customer Name'];
          const testName = row['Test Name'];
          const agentColumn = row['Agents'];
          const commissionColumn = row['Commission']; // Get the Commission column value

          if (agentColumn === 'V') {
            const matchedRunData = runData.find(
              (entry) =>
                entry.documentNumber === documentNumber &&
                entry.customerName.toLowerCase() === customerName?.toLowerCase() &&
                entry.matchedTestName?.toLowerCase() === testName?.toLowerCase()
            );

            if (matchedRunData) {
              const currentAgents = matchedRunData.agents ? matchedRunData.agents.split(',') : [];

              // Ensure the agentId is added only if it's not already present
              if (agentId && !currentAgents.includes(agentId)) {
                currentAgents.push(agentId);
              }

              // Join the agents list
              const updatedAgents = currentAgents.join(',');

              // Update the database
              await db.runData.update({
                where: { rowId: matchedRunData.rowId },
                data: { agents: updatedAgents },
              });

              // Update the in-memory runData for consistency
              matchedRunData.agents = updatedAgents;

              // Handle special commission if provided
              if (commissionColumn && !isNaN(parseFloat(commissionColumn))) {
                const specialCommissionValue = parseFloat(commissionColumn);
                
                // Check if a special commission record already exists for this combination
                const existingSpecialCommission = await db.specialCommission.findUnique({
                  where: {
                    runId_agentId_documentNumber_testName_customerName: {
                      runId: runId,
                      agentId: agentId,
                      documentNumber: documentNumber,
                      testName: testName,
                      customerName: customerName,
                    },
                  },
                });

                if (existingSpecialCommission) {
                  // Update existing special commission
                  await db.specialCommission.update({
                    where: {
                      runId_agentId_documentNumber_testName_customerName: {
                        runId: runId,
                        agentId: agentId,
                        documentNumber: documentNumber,
                        testName: testName,
                        customerName: customerName,
                      },
                    },
                    data: { specialCommission: specialCommissionValue },
                  });
                  console.log(
                    `Updated special commission ${specialCommissionValue}% for Agent: ${agentId}, Document: ${documentNumber}, Customer: ${customerName}, Test: ${testName} (File: ${fileName})`
                  );
                } else {
                  // Create new special commission record
                  await db.specialCommission.create({
                    data: {
                      runId: runId,
                      agentId: agentId,
                      documentNumber: documentNumber,
                      testName: testName,
                      customerName: customerName,
                      specialCommission: specialCommissionValue,
                    },
                  });
                  console.log(
                    `Created special commission ${specialCommissionValue}% for Agent: ${agentId}, Document: ${documentNumber}, Customer: ${customerName}, Test: ${testName} (File: ${fileName})`
                  );
                }
              }

              console.log(
                `Updated RunData for Document: ${documentNumber}, Customer: ${customerName}, Test: ${testName} with Agent: ${agentId} (File: ${fileName})`
              );
            } else {
              console.warn(
                `No matching RunData found for Document: ${documentNumber}, Customer: ${customerName}, Test: ${testName} (File: ${fileName})`
              );
            }
          }
        }

        // Clean up temporary file
        fs.unlinkSync(filePath);
      }

      res.status(200).json({
        message: 'Agents assigned successfully.',
      });
    } catch (err) {
      console.error('Error processing files:', err);
      res.status(500).json({ error: 'Failed to process files and assign agents.' });
    }
  });
};

export default assignAgents;
