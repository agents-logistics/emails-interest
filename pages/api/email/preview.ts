import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import { db } from "@/lib/db";
import { EmailPreviewSchema, REQUIRED_TEMPLATE_TOKENS } from "@/schemas";
import { renderTemplate } from "@/lib/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { attachmentId } = req.query;
      if (attachmentId && typeof attachmentId === "string") {
        // Handle attachment download
        const attachment = await db.emailAttachment.findUnique({
          where: { id: attachmentId },
        });

        if (!attachment) {
          return res.status(404).json({ error: "Attachment not found" });
        }

        // Check if file exists
        if (!fs.existsSync(attachment.filePath)) {
          return res.status(404).json({ error: "File not found on server" });
        }

        // Set headers for file download
        res.setHeader('Content-Type', attachment.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
        res.setHeader('Content-Length', attachment.fileSize.toString());

        // Stream the file
        const fileStream = fs.createReadStream(attachment.filePath);
        fileStream.pipe(res);

        return;
      }

      return res.status(400).json({ error: "Attachment ID required" });
    }

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

    // Get attachments for this test (if templateId is provided)
    let attachments: any[] = [];
    if (parsed.templateId) {
      const template = await db.emailTemplate.findUnique({
        where: { id: parsed.templateId },
        include: {
          attachments: true,
        },
      });
      if (template) {
        attachments = template.attachments.map(att => ({
          id: att.id,
          filename: att.filename,
          originalName: att.originalName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
        }));
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
      if (defaultTemplate) {
        attachments = defaultTemplate.attachments.map(att => ({
          id: att.id,
          filename: att.filename,
          originalName: att.originalName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
        }));
      }
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
    }

    // Render template with placeholders replaced
    let preview = renderTemplate(body, {
      nameOnTemplate: parsed.nameOnTemplate,
      installment: parsed.installment,
      price: parsed.price,
      icreditText: icreditText,
      icreditLink: icreditLink,
      iformsText: iformsText,
      iformsLink: iformsLink,
      patientName: parsed.patientName,
    });

    // Convert relative image URLs to absolute URLs for preview
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://emails.progenetics1.co.il';
    preview = preview.replace(/<img([^>]*?)src="\/uploads\/images\/([^"]+)"([^>]*?)>/gi, (match, before, filename, after) => {
      return `<img${before}src="${baseUrl}/uploads/images/${filename}"${after}>`;
    });

    // SIMPLIFIED PREVIEW RENDERING - Match send.ts exactly
    // Just ensure proper paragraph spacing for email clients while preserving all existing styles
    
    // Handle paragraphs without any style attribute
    preview = preview.replace(/<p([^>]*?)>/gi, (match, attributes) => {
      // Check if this p tag already has a style attribute
      if (attributes.includes('style=')) {
        return match; // Leave it as is, we'll handle it in the next step
      }
      // Add default styles for paragraphs without style
      const rtlStyles = isRTL ? 'direction: rtl; text-align: right; ' : '';
      return `<p${attributes} style="${rtlStyles}margin: 0 0 1em 0; line-height: 1.6;">`;
    });
    
    // Enhance paragraphs with existing styles - preserve ALL styles including font-size
    preview = preview.replace(/<p([^>]*?)style="([^"]*?)"([^>]*?)>/gi, (match, before, styleContent, after) => {
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

    return res.status(200).json({
      preview,
      isRTL,
      to: parsed.toEmail,
      cc: test.emailCopies,
      attachments,
    });
  } catch (err: any) {
    const message = err?.errors?.[0]?.message || err?.message || "Unexpected error";
    return res.status(400).json({ error: message });
  }
}
