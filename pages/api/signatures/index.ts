import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import * as z from "zod";

const SignatureSchema = z.object({
  email: z.string().email({ message: "Valid email is required" }),
  name: z.string().min(1, { message: "Name is required" }),
  content: z.string().min(1, { message: "Signature content is required" }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      // List all signatures
      const signatures = await db.signature.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return res.status(200).json({ signatures });
    }

    if (req.method === "POST") {
      // Create new signature
      const parsed = SignatureSchema.parse(req.body);

      // Check if email already exists
      const existing = await db.signature.findUnique({
        where: { email: parsed.email },
      });

      if (existing) {
        return res.status(400).json({ error: "Signature for this email already exists" });
      }

      const signature = await db.signature.create({
        data: {
          email: parsed.email,
          name: parsed.name,
          content: parsed.content,
        },
      });

      return res.status(201).json({ signature });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    const message = err?.errors?.[0]?.message || err?.message || "Unexpected error";
    return res.status(400).json({ error: message });
  }
}

