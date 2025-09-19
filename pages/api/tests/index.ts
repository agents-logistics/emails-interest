import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { TestCreateSchema } from "@/schemas";
import { z } from "zod";

// Accept BOTH payload styles:
// 1) CSV fields (validated by TestCreateSchema and transformed to arrays)
// 2) Direct arrays (validated by DirectSchema below)
const DirectSchema = z
  .object({
    name: z.string().trim().min(1, { message: "Test name is required" }),
    templateNames: z.array(z.string().trim().min(1)).min(1, { message: "At least one template name is required" }),
    installments: z.array(z.number().int().positive()).min(1, { message: "At least one installment is required" }),
    prices: z.array(z.number().nonnegative()).min(1, { message: "At least one price is required" }),
    emailCopies: z.array(z.string().email()).min(1, { message: "At least one email copy is required" }),
    icreditLink: z.string().url().refine(u => /^https?:\/\//i.test(u), { message: "iCredit link must start with http or https" }),
    iformsLink: z.string().url().refine(u => /^https?:\/\//i.test(u), { message: "iForms link must start with http or https" }),
  })
  .transform((input) => {
    return {
      name: input.name.trim(),
      templateNames: Array.from(new Set(input.templateNames.map((s) => s.trim()).filter(Boolean))),
      installments: Array.from(new Set(input.installments)).sort((a, b) => a - b),
      prices: Array.from(new Set(input.prices)).sort((a, b) => a - b),
      emailCopies: Array.from(new Set(input.emailCopies)),
      icreditLink: input.icreditLink,
      iformsLink: input.iformsLink,
    };
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const tests = await db.patientTest.findMany({
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({ tests });
    }

    if (req.method === "POST") {
      // Log incoming for debugging
      // console.log("POST /api/tests body:", req.body);

      type ParsedTest = {
        name: string;
        templateNames: string[];
        installments: number[];
        prices: number[];
        emailCopies: string[];
        icreditLink: string;
        iformsLink: string;
      };

      // If the client sends arrays directly, use DirectSchema, otherwise accept CSV and transform.
      const b: any = req.body;
      const looksLikeDirect =
        Array.isArray(b?.templateNames) ||
        Array.isArray(b?.installments) ||
        Array.isArray(b?.prices) ||
        Array.isArray(b?.emailCopies);

      let parsed: ParsedTest;
      if (looksLikeDirect) {
        parsed = DirectSchema.parse(req.body);
      } else {
        // Accept CSV-style payload and transform using TestCreateSchema
        parsed = TestCreateSchema.parse(req.body) as ParsedTest;
      }

      const created = await db.patientTest.create({
        data: {
          name: parsed.name,
          templateNames: parsed.templateNames,
          installments: parsed.installments,
          prices: parsed.prices,
          emailCopies: parsed.emailCopies,
          icreditLink: parsed.icreditLink,
          iformsLink: parsed.iformsLink,
        },
      });

      return res.status(201).json({ test: created });
    }

    if (req.method === "PUT") {
      const { id, ...updateData } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: "Test ID is required for update" });
      }

      type ParsedTest = {
        name: string;
        templateNames: string[];
        installments: number[];
        prices: number[];
        emailCopies: string[];
        icreditLink: string;
        iformsLink: string;
      };

      // Parse the update data using the same logic as POST
      const b: any = updateData;
      const looksLikeDirect =
        Array.isArray(b?.templateNames) ||
        Array.isArray(b?.installments) ||
        Array.isArray(b?.prices) ||
        Array.isArray(b?.emailCopies);

      let parsed: ParsedTest;
      if (looksLikeDirect) {
        parsed = DirectSchema.parse(updateData);
      } else {
        parsed = TestCreateSchema.parse(updateData) as ParsedTest;
      }

      const updated = await db.patientTest.update({
        where: { id },
        data: {
          name: parsed.name,
          templateNames: parsed.templateNames,
          installments: parsed.installments,
          prices: parsed.prices,
          emailCopies: parsed.emailCopies,
          icreditLink: parsed.icreditLink,
          iformsLink: parsed.iformsLink,
        },
      });

      return res.status(200).json({ test: updated });
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: "Test ID is required for delete" });
      }

      await db.patientTest.delete({
        where: { id },
      });

      return res.status(200).json({ message: "Test deleted successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    const message = err?.errors?.[0]?.message || err?.message || "Unexpected error";
    return res.status(400).json({ error: message });
  }
}
