import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Support both GET and HEAD requests (Gmail and other email clients use HEAD to check images)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename } = req.query;
  
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename required' });
  }

  try {
    // Security: Only allow alphanumeric, hyphens, and dots
    if (!/^[a-zA-Z0-9\-_.]+\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const imagePath = path.join(process.cwd(), 'public', 'uploads', 'images', filename);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Get file stats
    const stats = fs.statSync(imagePath);
    
    // Determine MIME type
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    // Set headers for both HEAD and GET requests
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow email clients to access
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    
    // For HEAD requests, just return headers without body
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    // For GET requests, stream the file
    const fileStream = fs.createReadStream(imagePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Error serving image:', error);
    return res.status(500).json({ error: 'Failed to serve image' });
  }
}

