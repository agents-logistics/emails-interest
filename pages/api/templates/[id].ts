import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { TemplateCreateSchema } from "@/schemas";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid template ID" });
    }

    if (req.method === "GET") {
      const template = await db.emailTemplate.findUnique({
        where: { id },
        include: {
          attachments: true,
        },
      });

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      return res.status(200).json({ template });
    }

    if (req.method === "PUT") {
      const parsed = TemplateCreateSchema.parse(req.body);

      // Ensure template exists
      const existingTemplate = await db.emailTemplate.findUnique({
        where: { id },
      });

      if (!existingTemplate) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Ensure test exists
      const test = await db.patientTest.findUnique({
        where: { id: parsed.testId },
      });

      if (!test) {
        return res.status(400).json({ error: "Invalid testId" });
      }

      const updated = await db.emailTemplate.update({
        where: { id },
        data: {
          testId: parsed.testId,
          body: parsed.body,
          ...(parsed.subject !== undefined && { subject: parsed.subject }),
          isRTL: parsed.isRTL ?? true,
          ...(parsed.clalitText !== undefined && { clalitText: parsed.clalitText }),
        },
        include: {
          attachments: true,
        },
      });

      return res.status(200).json({ template: updated });
    }

    if (req.method === "DELETE") {
      // Ensure template exists
      const existingTemplate = await db.emailTemplate.findUnique({
        where: { id },
      });

      if (!existingTemplate) {
        return res.status(404).json({ error: "Template not found" });
      }

      await db.emailTemplate.delete({
        where: { id },
      });

      return res.status(200).json({ message: "Template deleted successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("Template API error:", err);
    const message = err?.errors?.[0]?.message || err?.message || "Unexpected error";
    return res.status(400).json({ error: message });
  }
}
