import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { EmailPreviewSchema, REQUIRED_TEMPLATE_TOKENS } from "@/schemas";
import { renderTemplate } from "@/lib/utils";
import { sendTransactionalEmail, EmailAttachment } from "@/lib/ses";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Parse JSON body
    const base = EmailPreviewSchema.parse(req.body);
    const subject =
      typeof (req.body as any).subject === "string" && (req.body as any).subject.trim().length > 0
        ? (req.body as any).subject.trim()
        : undefined;
    const parsed = { ...base, subject };

    // Get link texts and URLs and temporary attachment IDs
    const icreditText = (req.body as any).icreditText as string;
    const icreditLink = (req.body as any).icreditLink as string;
    const iformsText = (req.body as any).iformsText as string;
    const iformsLink = (req.body as any).iformsLink as string;
    const temporaryAttachmentIds: string[] = (req.body as any).temporaryAttachmentIds || [];

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

    // Load template body and get reply_to/subject from template
    let body: string;
    let isRTL: boolean = true;
    let templateReplyTo: string | null = null;
    let templateSubject: string | null = null;

    if (parsed.templateId) {
      // Use specific template
      const template = await db.emailTemplate.findUnique({
        where: { id: parsed.templateId },
      });
      if (!template) return res.status(400).json({ error: "Invalid templateId" });
      body = template.body;
      isRTL = template.isRTL ?? true;
      templateReplyTo = template.reply_to;
      templateSubject = template.subject;
    } else {
      // Try to get default template for this test
      const defaultTemplate = await db.emailTemplate.findFirst({
        where: { testId: parsed.testId },
        orderBy: { createdAt: 'asc' } // Get the first/oldest template as default
      });

      if (defaultTemplate) {
        templateReplyTo = defaultTemplate.reply_to;
        templateSubject = defaultTemplate.subject;
      }

      body = parsed.body!;
      isRTL = parsed.isRTL ?? true;
    }

    // Render template with placeholders replaced
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

    // Convert relative image URLs to absolute URLs for email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://emails.progenetics1.co.il';
    
    // Handle both old static path and new API route path
    rendered = rendered.replace(/<img([^>]*?)src="(\/uploads\/images\/|\/api\/images\/)([^"]+)"([^>]*?)>/gi, (match, before, path, filename, after) => {
      return `<img${before}src="${baseUrl}/api/images/${filename}"${after}>`;
    });

    // SIMPLIFIED EMAIL RENDERING - Quill outputs clean HTML already
    // Just ensure proper paragraph spacing for email clients while preserving all existing styles
    
    // Handle paragraphs without any style attribute
    rendered = rendered.replace(/<p([^>]*?)>/gi, (match, attributes) => {
      // Check if this p tag already has a style attribute
      if (attributes.includes('style=')) {
        return match; // Leave it as is, we'll handle it in the next step
      }
      // Add default styles for paragraphs without style
      const rtlStyles = isRTL ? 'direction: rtl; text-align: right; ' : '';
      return `<p${attributes} style="${rtlStyles}margin: 0 0 1em 0; line-height: 1.6;">`;
    });
    
    // Enhance paragraphs with existing styles - preserve ALL styles including font-size
    rendered = rendered.replace(/<p([^>]*?)style="([^"]*?)"([^>]*?)>/gi, (match, before, styleContent, after) => {
      let styles = styleContent.trim();
      
      // Add RTL styles if needed and not present
      if (isRTL && !styles.includes('direction:')) {
        styles = 'direction: rtl; text-align: right; ' + styles;
      }
      
      // Add line-height if not present
      if (!styles.includes('line-height')) {
        styles += '; line-height: 1.6';
      }
      
      // Add margin if not present
      if (!styles.includes('margin')) {
        styles = 'margin: 0 0 1em 0; ' + styles;
      }
      
      // Clean up any double semicolons or spaces
      styles = styles.replace(/;;+/g, ';').replace(/\s+/g, ' ').trim();
      
      return `<p${before}style="${styles}"${after}>`;
    });
    
    // Preserve font-size and other styles in spans (Quill uses spans for inline formatting)
    // No need to modify spans, they already have correct inline styles from Quill

    // Create proper HTML email structure
    const htmlEmail = `<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'he' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${parsed.subject ?? test.name}</title>
</head>
<body style="font-family: ${isRTL ? 'Arial, \'David\', \'Times New Roman\', sans-serif' : 'Arial, Helvetica, sans-serif'}; direction: ${isRTL ? 'rtl' : 'ltr'}; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    ${rendered}
  </div>
</body>
</html>`;

    // Prepare recipients: primary recipient as TO, email copies as BCC (hidden from recipients)
    const toRecipients = [parsed.toEmail];
    const bccRecipients = test.emailCopies;
    console.log('toRecipients', toRecipients);
    console.log('bccRecipients', bccRecipients);

    // Use reply_to from template if available, otherwise fall back to first email copy or default
    const replyToEmail = templateReplyTo || (test.emailCopies.length > 0 ? test.emailCopies[0] : 'agents@progenetics.co.il');
    console.log('replyToEmail', replyToEmail);

    // Use subject from template if available, otherwise use provided subject, or fall back to test name
    const emailSubject = templateSubject || parsed.subject || test.name;
    console.log('emailSubject', emailSubject);

    // Load attachments from template
    let emailAttachments: EmailAttachment[] = [];
    if (parsed.templateId) {
      const template = await db.emailTemplate.findUnique({
        where: { id: parsed.templateId },
        include: {
          attachments: true,
        },
      });
      if (template && template.attachments.length > 0) {
        for (const attachment of template.attachments) {
          if (fs.existsSync(attachment.filePath)) {
            const fileContent = fs.readFileSync(attachment.filePath);
            emailAttachments.push({
              filename: attachment.originalName,
              content: fileContent,
              mimeType: attachment.mimeType,
            });
          }
        }
      }
    } else {
      // For raw body, try to get attachments from the default template
      const defaultTemplate = await db.emailTemplate.findFirst({
        where: { testId: parsed.testId },
        include: {
          attachments: true,
        },
        orderBy: { createdAt: 'asc' }
      });
      if (defaultTemplate && defaultTemplate.attachments.length > 0) {
        for (const attachment of defaultTemplate.attachments) {
          if (fs.existsSync(attachment.filePath)) {
            const fileContent = fs.readFileSync(attachment.filePath);
            emailAttachments.push({
              filename: attachment.originalName,
              content: fileContent,
              mimeType: attachment.mimeType,
            });
          }
        }
      }
    }

    // Add temporary attachments (per-email, not saved to template)
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    for (const tempFileId of temporaryAttachmentIds) {
      const tempFilePath = path.join(tempDir, tempFileId);
      if (fs.existsSync(tempFilePath)) {
        const fileContent = fs.readFileSync(tempFilePath);
        const fileExtension = path.extname(tempFileId);
        const mimeType = getMimeType(fileExtension);
        
        emailAttachments.push({
          filename: tempFileId.replace('temp_', ''),
          content: fileContent,
          mimeType,
        });

        // Clean up temporary file after reading
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {
          console.error('Failed to delete temp file:', e);
        }
      }
    }

    function getMimeType(extension: string): string {
      const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.txt': 'text/plain',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
      };
      return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
    }
    
    try {
      // Send transactional email via Amazon SES
      const emailResult = await sendTransactionalEmail({
        to: toRecipients,
        bcc: bccRecipients,
        replyTo: replyToEmail,
        subject: emailSubject,
        htmlContent: htmlEmail,
        fromEmail: 'agents@progenetics.co.il',
        fromName: 'Progenetics',
        attachments: emailAttachments
      });

      return res.status(200).json({
        message: "Email sent successfully via Amazon SES",
        toRecipients: toRecipients,
        bccRecipients: bccRecipients,
        replyTo: replyToEmail,
        subject: emailSubject,
        isRTL,
        attachmentsCount: emailAttachments.length,
        sent: emailResult.sent,
        queued: emailResult.queued || 0,
        rejected: emailResult.rejected || 0,
        details: emailResult.results,
      });
      
    } catch (emailError: any) {
      console.error('Email sending failed:', emailError);
      
      return res.status(500).json({
        error: `Failed to send email: ${emailError.message}`,
        toRecipients: toRecipients,
        bccRecipients: bccRecipients,
        replyTo: replyToEmail,
        subject: emailSubject,
        attachmentsCount: emailAttachments.length,
        renderedContent: rendered,
      });
    }
  } catch (err: any) {
    const message = err?.errors?.[0]?.message || err?.message || "Unexpected error";
    return res.status(400).json({ error: message });
  }
}
