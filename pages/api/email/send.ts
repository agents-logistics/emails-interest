import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { EmailPreviewSchema, REQUIRED_TEMPLATE_TOKENS } from "@/schemas";
import { renderTemplate } from "@/lib/utils";
import { sendTransactionalEmail } from "@/lib/mailchimp";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const base = EmailPreviewSchema.parse(req.body);
    const subject =
      typeof (req.body as any).subject === "string" && (req.body as any).subject.trim().length > 0
        ? (req.body as any).subject.trim()
        : undefined;
    const parsed = { ...base, subject };

    // Fetch the test and validate selections
    const test = await db.patientTest.findUnique({
      where: { id: parsed.testId },
    });
    if (!test) return res.status(400).json({ error: "Invalid testId" });

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
      body = parsed.body!;
      isRTL = parsed.isRTL ?? true;
      const hasAllTokens = REQUIRED_TEMPLATE_TOKENS.every((t) => body.includes(t));
      if (!hasAllTokens) {
        return res.status(400).json({
          error: `Template must include: ${REQUIRED_TEMPLATE_TOKENS.join(", ")}`,
        });
      }
    }

    const rendered = renderTemplate(body, {
      nameOnTemplate: parsed.nameOnTemplate,
      installment: parsed.installment,
      price: parsed.price,
      icreditLink: test.icreditLink,
      iformsLink: test.iformsLink,
      patientName: parsed.patientName,
    });

    // Prepare recipients: primary recipient + all email copies (no CC, send separate emails)
    const allRecipients = [parsed.toEmail, ...test.emailCopies];
    const replyToEmail = test.emailCopies.length > 0 ? test.emailCopies[0] : 'noreply@progenetics.co.il';
    
    try {
      // Send transactional email via Mailchimp
      const emailResult = await sendTransactionalEmail({
        to: allRecipients,
        replyTo: replyToEmail,
        subject: parsed.subject ?? test.name,
        htmlContent: rendered,
        fromEmail: 'noreply@progenetics.co.il',
        fromName: 'Progenetics'
      });

      return res.status(200).json({
        message: "Email sent successfully via Mailchimp Transactional",
        recipients: allRecipients,
        replyTo: replyToEmail,
        subject: parsed.subject ?? test.name,
        isRTL,
        sent: emailResult.sent,
        queued: emailResult.queued || 0,
        rejected: emailResult.rejected || 0,
        details: emailResult.results,
      });
      
    } catch (emailError: any) {
      console.error('Email sending failed:', emailError);
      
      // Return error but with email content for debugging
      return res.status(500).json({
        error: `Failed to send email: ${emailError.message}`,
        recipients: allRecipients,
        replyTo: replyToEmail,
        subject: parsed.subject ?? test.name,
        // Include rendered content for debugging purposes
        renderedContent: rendered,
      });
    }
  } catch (err: any) {
    const message = err?.errors?.[0]?.message || err?.message || "Unexpected error";
    return res.status(400).json({ error: message });
  }
}
