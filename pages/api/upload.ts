import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { IncomingForm, File } from 'formidable';
import * as XLSX from 'xlsx';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js default body parser
  },
};

const uploadHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error parsing the form' });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const filePath = file.filepath;

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Use sheet_to_json with header: 1 to get rows as arrays
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

      if (rows.length === 0) {
        return res.status(400).json({ error: 'The file is empty' });
      }

      // Define a set of all possible columns
      const allColumns = Array.from({ length: 12 }, (_, i) => `Column_${i}`);

      const data = rows.reduce((acc, row) => {
        const rowData: Record<string, any> = {};

        // Fill the rowData with values or 'EMPTY'
        allColumns.forEach((col, colIndex) => {
          rowData[col] = row[colIndex] !== undefined && row[colIndex] !== null && row[colIndex] !== '' ? row[colIndex] : 'EMPTY';
        });

        // Check if the row is completely empty
        const isEmptyRow = allColumns.every(col => rowData[col] === 'EMPTY');
        if (!isEmptyRow) {
          acc.push(rowData);
        }

        return acc;
      }, [] as Array<Record<string, any>>);

      // Return the parsed data
      res.status(200).json({ data });
    } catch (parseError) {
      res.status(500).json({ error: 'Failed to parse XLSX file' });
    } finally {
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('Failed to delete temporary file', unlinkErr);
      });
    }
  });
};

export default uploadHandler;
