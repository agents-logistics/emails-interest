import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import * as z from "zod";

const CCDefaultEmailSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Valid email is required" }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      // List all CC default emails
      const ccDefaultEmails = await db.cCDefaultEmail.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return res.status(200).json({ ccDefaultEmails });
    }

    if (req.method === "POST") {
      // Create new CC default email
      const parsed = CCDefaultEmailSchema.parse(req.body);

      // Check if email already exists
      const existing = await db.cCDefaultEmail.findUnique({
        where: { email: parsed.email },
      });

      if (existing) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const ccDefaultEmail = await db.cCDefaultEmail.create({
        data: {
          name: parsed.name,
          email: parsed.email,
        },
      });

      return res.status(201).json({ ccDefaultEmail });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    const message = err?.errors?.[0]?.message || err?.message || "Unexpected error";
    return res.status(400).json({ error: message });
  }
}

