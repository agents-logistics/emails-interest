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

const uploadImageHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({
    uploadDir: path.join(process.cwd(), 'uploads'),
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB limit for images
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parsing error:', err);
      return res.status(500).json({ error: 'Error parsing the form' });
    }

    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    try {
      // Validate it's an image
      const fileExtension = path.extname(file.originalFilename || '').toLowerCase();
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      
      if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({ error: 'Only image files are allowed' });
      }

      // Generate unique filename
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
      const finalFilePath = path.join(uploadDir, uniqueFilename);

      // Ensure upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Move file from temp location to permanent location
      fs.renameSync(file.filepath, finalFilePath);

      // Get file stats
      const stats = fs.statSync(finalFilePath);
      const fileSize = stats.size;

      // Return API route URL (works reliably in all environments)
      const imageUrl = `/api/images/${uniqueFilename}`;

      return res.status(200).json({
        url: imageUrl,
        filename: uniqueFilename,
        originalName: file.originalFilename || 'unknown',
        fileSize,
      });

    } catch (error: any) {
      console.error('Image upload error:', error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }
  });
};

export default uploadImageHandler;

