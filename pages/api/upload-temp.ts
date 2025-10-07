import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { IncomingForm, File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js default body parser
  },
};

const uploadHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({
    uploadDir: path.join(process.cwd(), 'uploads'),
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB limit
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error parsing the form' });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    try {
      // Generate unique filename
      const fileExtension = path.extname(file.originalFilename || '');
      const uniqueFilename = `temp_${uuidv4()}${fileExtension}`;
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      const finalFilePath = path.join(tempDir, uniqueFilename);

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Move file from temp location to temp attachments location
      fs.renameSync(file.filepath, finalFilePath);

      // Get file stats
      const stats = fs.statSync(finalFilePath);
      const fileSize = stats.size;

      // Determine MIME type
      const mimeType = file.mimetype || getMimeType(fileExtension);

      // Return temp file info
      res.status(200).json({
        tempFile: {
          id: uniqueFilename,
          filename: uniqueFilename,
          originalName: file.originalFilename || 'unknown',
          filePath: finalFilePath,
          fileSize,
          mimeType,
        }
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });
};

// Basic MIME type detection
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

export default uploadHandler;


