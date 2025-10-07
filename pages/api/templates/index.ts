import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { TemplateCreateSchema } from "@/schemas";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { testId } = req.query;
      const where = typeof testId === "string" && testId.length > 0 ? { testId } : undefined;
      const templates = await db.emailTemplate.findMany({
        where,
        include: {
          attachments: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({ templates });
    }

    if (req.method === "POST") {
      const parsed = TemplateCreateSchema.parse(req.body);

      // Ensure test exists
      const test = await db.patientTest.findUnique({ where: { id: parsed.testId } });
      if (!test) {
        return res.status(400).json({ error: "Invalid testId" });
      }

      const created = await db.emailTemplate.create({
        data: {
          testId: parsed.testId,
          body: parsed.body,
          ...(parsed.subject && { subject: parsed.subject }),
          isRTL: parsed.isRTL ?? true,
          ...(parsed.reply_to && { reply_to: parsed.reply_to }),
        },
        include: {
          attachments: true,
        },
      });

      return res.status(201).json({ template: created });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    const message = err?.errors?.[0]?.message || err?.message || "Unexpected error";
    return res.status(400).json({ error: message });
  }
}
