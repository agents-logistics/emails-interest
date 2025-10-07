import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import { db } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid attachment ID" });
    }

    if (req.method === "DELETE") {
      // Find the attachment
      const attachment = await db.emailAttachment.findUnique({
        where: { id },
      });

      if (!attachment) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      // Delete the file from disk
      if (fs.existsSync(attachment.filePath)) {
        fs.unlinkSync(attachment.filePath);
      }

      // Delete the database record
      await db.emailAttachment.delete({
        where: { id },
      });

      return res.status(200).json({ message: "Attachment deleted successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    const message = err?.message || "Unexpected error";
    return res.status(500).json({ error: message });
  }
}

