import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { EmailPreviewSchema, REQUIRED_TEMPLATE_TOKENS } from "@/schemas";
import { renderTemplate } from "@/lib/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const parsed = EmailPreviewSchema.parse(req.body);
    
    // Get link texts and URLs from request body
    const icreditText = (req.body as any).icreditText as string;
    const icreditLink = (req.body as any).icreditLink as string;
    const iformsText = (req.body as any).iformsText as string;
    const iformsLink = (req.body as any).iformsLink as string;

    if (!icreditText || !icreditLink || !iformsText || !iformsLink) {
      return res.status(400).json({ error: "All link texts and URLs are required" });
    }

    // Fetch the test and validate selections
    const test = await db.patientTest.findUnique({
      where: { id: parsed.testId },
      include: {
        pricingOptions: true
      }
    });
    if (!test) return res.status(400).json({ error: "Invalid testId" });

    // Validate nameOnTemplate against the chosen test
    if (!test.templateNames.includes(parsed.nameOnTemplate)) {
      return res.status(400).json({ error: "nameOnTemplate not in allowed list for this test" });
    }
    
    // Validate that the combination of installment and price exists in pricing options
    const pricingOption = test.pricingOptions.find(
      opt => opt.installment === parsed.installment && opt.price === parsed.price
    );
    if (!pricingOption) {
      return res.status(400).json({ error: "Invalid combination of installment and price for this test" });
    }

    // Load template body
    let body: string;
    let isRTL: boolean = true;
    if (parsed.templateId) {
      const template = await db.emailTemplate.findUnique({
        where: { id: parsed.templateId },
      });
      if (!template) return res.status(400).json({ error: "Invalid templateId" });
      body = template.body;
      isRTL = template.isRTL ?? true;
    } else {
      // Raw body preview (e.g. when creating a new template)
      body = parsed.body!;
      isRTL = parsed.isRTL ?? true;
      // No validation - placeholders are optional
    }

    const preview = renderTemplate(body, {
      nameOnTemplate: parsed.nameOnTemplate,
      installment: parsed.installment,
      price: parsed.price,
      icreditText: icreditText,
      icreditLink: icreditLink,
      iformsText: iformsText,
      iformsLink: iformsLink,
      patientName: parsed.patientName,
    });

    return res.status(200).json({
      preview,
      isRTL,
      to: parsed.toEmail,
      cc: test.emailCopies,
    });
  } catch (err: any) {
    const message = err?.errors?.[0]?.message || err?.message || "Unexpected error";
    return res.status(400).json({ error: message });
  }
}
