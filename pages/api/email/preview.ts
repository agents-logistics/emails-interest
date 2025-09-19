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

    // Fetch the test and validate selections
    const test = await db.patientTest.findUnique({
      where: { id: parsed.testId },
    });
    if (!test) return res.status(400).json({ error: "Invalid testId" });

    // Validate nameOnTemplate, installment, price against the chosen test
    if (!test.templateNames.includes(parsed.nameOnTemplate)) {
      return res.status(400).json({ error: "nameOnTemplate not in allowed list for this test" });
    }
    if (!test.installments.includes(parsed.installment)) {
      return res.status(400).json({ error: "installment not in allowed list for this test" });
    }
    if (!test.prices.includes(parsed.price)) {
      return res.status(400).json({ error: "price not in allowed list for this test" });
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
      const hasAllTokens = REQUIRED_TEMPLATE_TOKENS.every((t) => body.includes(t));
      if (!hasAllTokens) {
        return res.status(400).json({
          error: `Template must include: ${REQUIRED_TEMPLATE_TOKENS.join(", ")}`,
        });
      }
    }

    const preview = renderTemplate(body, {
      nameOnTemplate: parsed.nameOnTemplate,
      installment: parsed.installment,
      price: parsed.price,
      icreditLink: test.icreditLink,
      iformsLink: test.iformsLink,
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
