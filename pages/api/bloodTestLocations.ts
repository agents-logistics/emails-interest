import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // GET: Fetch all blood test locations
    if (req.method === "GET") {
      const locations = await db.bloodTestLocation.findMany({
        orderBy: { name: 'asc' }
      });
      return res.status(200).json({ locations });
    }

    // POST: Create a new blood test location
    if (req.method === "POST") {
      const { name, templateText } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: "Location name is required" });
      }

      if (!templateText || typeof templateText !== 'string' || templateText.trim().length === 0) {
        return res.status(400).json({ error: "Template text is required" });
      }

      // Check if location with this name already exists
      const existing = await db.bloodTestLocation.findUnique({
        where: { name: name.trim() }
      });

      if (existing) {
        return res.status(400).json({ error: "A location with this name already exists" });
      }

      const location = await db.bloodTestLocation.create({
        data: {
          name: name.trim(),
          templateText: templateText.trim(),
        }
      });

      return res.status(201).json({ location });
    }

    // PUT: Update an existing blood test location
    if (req.method === "PUT") {
      const { id, name, templateText } = req.body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: "Location ID is required" });
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: "Location name is required" });
      }

      if (!templateText || typeof templateText !== 'string' || templateText.trim().length === 0) {
        return res.status(400).json({ error: "Template text is required" });
      }

      // Check if another location with this name exists (excluding current location)
      const existing = await db.bloodTestLocation.findFirst({
        where: {
          name: name.trim(),
          NOT: { id }
        }
      });

      if (existing) {
        return res.status(400).json({ error: "Another location with this name already exists" });
      }

      const location = await db.bloodTestLocation.update({
        where: { id },
        data: {
          name: name.trim(),
          templateText: templateText.trim(),
        }
      });

      return res.status(200).json({ location });
    }

    // DELETE: Delete a blood test location
    if (req.method === "DELETE") {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: "Location ID is required" });
      }

      await db.bloodTestLocation.delete({
        where: { id }
      });

      return res.status(200).json({ message: "Location deleted successfully" });
    }

    // Method not allowed
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("Blood test locations API error:", error);
    return res.status(500).json({ 
      error: error.message || "Internal server error" 
    });
  }
}

