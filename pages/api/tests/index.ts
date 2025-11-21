import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { TestCreateSchema, PricingOptionSchema } from "@/schemas";
import { z } from "zod";

// Schema for direct API calls (arrays instead of CSV)
const DirectSchema = z
  .object({
    name: z.string().trim().min(1, { message: "Test name is required" }),
    templateNames: z.array(z.string().trim().min(1)).min(1, { message: "At least one template name is required" }),
    pricingOptions: z.array(PricingOptionSchema).min(1, { message: "At least one pricing option is required" }),
  })
  .transform((input) => {
    return {
      name: input.name.trim(),
      templateNames: Array.from(new Set(input.templateNames.map((s) => s.trim()).filter(Boolean))),
      pricingOptions: input.pricingOptions,
    };
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const tests = await db.patientTest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          pricingOptions: {
            orderBy: [
              { installment: "asc" },
              { price: "asc" }
            ]
          }
        }
      });
      return res.status(200).json({ tests });
    }

    if (req.method === "POST") {
      type ParsedTest = {
        name: string;
        templateNames: string[];
        pricingOptions: Array<{
          installment: number;
          price: number;
          icreditText: string;
          icreditLink: string;
          iformsText: string;
          iformsLink: string;
          isGlobalDefault?: boolean;
          isPriceDefault?: boolean;
        }>;
      };

      // If the client sends arrays directly, use DirectSchema, otherwise accept CSV and transform.
      const b: any = req.body;
      const looksLikeDirect = Array.isArray(b?.templateNames);

      let parsed: ParsedTest;
      if (looksLikeDirect) {
        parsed = DirectSchema.parse(req.body);
      } else {
        // Accept CSV-style payload with pricingOptions array
        parsed = TestCreateSchema.parse(req.body) as ParsedTest;
      }

      const created = await db.patientTest.create({
        data: {
          name: parsed.name,
          templateNames: parsed.templateNames,
          pricingOptions: {
            create: parsed.pricingOptions.map(opt => ({
              installment: opt.installment,
              price: opt.price,
              icreditText: opt.icreditText,
              icreditLink: opt.icreditLink,
              iformsText: opt.iformsText,
              iformsLink: opt.iformsLink,
              isGlobalDefault: opt.isGlobalDefault || false,
              isPriceDefault: opt.isPriceDefault || false,
            }))
          }
        },
        include: {
          pricingOptions: true
        }
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
        pricingOptions: Array<{
          installment: number;
          price: number;
          icreditText: string;
          icreditLink: string;
          iformsText: string;
          iformsLink: string;
          isGlobalDefault?: boolean;
          isPriceDefault?: boolean;
        }>;
      };

      // Parse the update data using the same logic as POST
      const b: any = updateData;
      const looksLikeDirect = Array.isArray(b?.templateNames);

      let parsed: ParsedTest;
      if (looksLikeDirect) {
        parsed = DirectSchema.parse(updateData);
      } else {
        parsed = TestCreateSchema.parse(updateData) as ParsedTest;
      }

      // Delete all existing pricing options and create new ones
      // This is simpler than trying to diff and update individually
      await db.testPricingOption.deleteMany({
        where: { testId: id }
      });

      const updated = await db.patientTest.update({
        where: { id },
        data: {
          name: parsed.name,
          templateNames: parsed.templateNames,
          pricingOptions: {
            create: parsed.pricingOptions.map(opt => ({
              installment: opt.installment,
              price: opt.price,
              icreditText: opt.icreditText,
              icreditLink: opt.icreditLink,
              iformsText: opt.iformsText,
              iformsLink: opt.iformsLink,
              isGlobalDefault: opt.isGlobalDefault || false,
              isPriceDefault: opt.isPriceDefault || false,
            }))
          }
        },
        include: {
          pricingOptions: true
        }
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
