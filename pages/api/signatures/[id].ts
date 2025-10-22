import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import * as z from "zod";

const SignatureUpdateSchema = z.object({
  email: z.string().email({ message: "Valid email is required" }).optional(),
  name: z.string().min(1, { message: "Name is required" }).optional(),
  content: z.string().min(1, { message: "Signature content is required" }).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid ID" });
    }

    if (req.method === "GET") {
      // Get single signature
      const signature = await db.signature.findUnique({
        where: { id },
      });

      if (!signature) {
        return res.status(404).json({ error: "Signature not found" });
      }

      return res.status(200).json({ signature });
    }

    if (req.method === "PUT") {
      // Update signature
      const parsed = SignatureUpdateSchema.parse(req.body);

      // If updating email, check if new email already exists
      if (parsed.email) {
        const existing = await db.signature.findUnique({
          where: { email: parsed.email },
        });

        if (existing && existing.id !== id) {
          return res.status(400).json({ error: "Signature for this email already exists" });
        }
      }

      const signature = await db.signature.update({
        where: { id },
        data: parsed,
      });

      return res.status(200).json({ signature });
    }

    if (req.method === "DELETE") {
      // Delete signature
      await db.signature.delete({
        where: { id },
      });

      return res.status(200).json({ message: "Signature deleted successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    const message = err?.message || "Unexpected error";
    return res.status(400).json({ error: message });
  }
}

