import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { EmailPreviewSchema, REQUIRED_TEMPLATE_TOKENS } from "@/schemas";
import { renderTemplate } from "@/lib/utils";
import { sendTransactionalEmail } from "@/lib/ses";


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
      body = parsed.body!;
      isRTL = parsed.isRTL ?? true;
      // No validation - placeholders are optional
    }

    let rendered = renderTemplate(body, {
      nameOnTemplate: parsed.nameOnTemplate,
      installment: parsed.installment,
      price: parsed.price,
      icreditText: icreditText,
      icreditLink: icreditLink,
      iformsText: iformsText,
      iformsLink: iformsLink,
      patientName: parsed.patientName,
    });

    // Apply RTL inline styles to content if needed (Gmail-compatible)
    if (isRTL) {
      // Apply RTL direction to all div elements that don't already have explicit text-align
      rendered = rendered.replace(/<div(?![^>]*text-align)([^>]*?)>/g, '<div$1 style="direction: rtl; text-align: right;">');
      
      // For divs that already have text-align, add direction: rtl to their existing styles
      rendered = rendered.replace(/<div([^>]*?)style="([^"]*?)text-align:\s*(left|center|right)([^"]*?)"([^>]*?)>/g, 
        '<div$1style="direction: rtl; $2text-align: $3$4"$5>');
      
      // Apply RTL to any remaining elements that might need it
      rendered = rendered.replace(/<p(?![^>]*direction)([^>]*?)>/g, '<p$1 style="direction: rtl; text-align: right;">');
      rendered = rendered.replace(/<span(?![^>]*direction)([^>]*?)>/g, '<span$1 style="direction: rtl;">');
    }

    // Create proper HTML email structure with enhanced RTL support
    const htmlEmail = `<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'he' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${parsed.subject ?? test.name}</title>
  <style>
    body {
      font-family: ${isRTL ? 'Arial, "David", "Times New Roman"' : 'Arial, sans-serif'};
      direction: ${isRTL ? 'rtl' : 'ltr'};
      text-align: ${isRTL ? 'right' : 'left'};
      margin: 0;
      padding: 20px;
      background-color: #ffffff;
      color: #333333;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 20px;
      direction: ${isRTL ? 'rtl' : 'ltr'};
      text-align: ${isRTL ? 'right' : 'left'};
    }
  </style>
</head>
<body style="font-family: ${isRTL ? 'Arial, \'David\', \'Times New Roman\'' : 'Arial, sans-serif'}; direction: ${isRTL ? 'rtl' : 'ltr'}; text-align: ${isRTL ? 'right' : 'left'}; margin: 0; padding: 20px; background-color: #ffffff; color: #333333; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; direction: ${isRTL ? 'rtl' : 'ltr'}; text-align: ${isRTL ? 'right' : 'left'};">
    ${rendered}
  </div>
</body>
</html>`;

    // Prepare recipients: primary recipient + all email copies (no CC, send separate emails)
    const allRecipients = [parsed.toEmail, ...test.emailCopies];
    console.log('allRecipients', allRecipients);
    const replyToEmail = test.emailCopies.length > 0 ? test.emailCopies[0] : 'agents@progenetics.co.il';
    
    try {
      // Send transactional email via Amazon SES
      const emailResult = await sendTransactionalEmail({
        to: allRecipients,
        replyTo: replyToEmail,
        subject: parsed.subject ?? test.name,
        htmlContent: htmlEmail,
        fromEmail: 'agents@progenetics.co.il', // Using verifiable email instead of noreply
        fromName: 'Progenetics'
      });

      return res.status(200).json({
        message: "Email sent successfully via Amazon SES",
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
