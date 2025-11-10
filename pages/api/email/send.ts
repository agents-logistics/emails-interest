import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { EmailPreviewSchema, REQUIRED_TEMPLATE_TOKENS } from "@/schemas";
import { renderTemplate } from "@/lib/utils";
import { sendTransactionalEmail, EmailAttachment } from "@/lib/ses";
const client = require('smartsheet');

const smartsheet = client.createClient({
  accessToken: process.env.SMARTSHEET_API_TOKEN,
  logLevel: 'info',
});

// Helper function to build column map
const getColMap = (sheet: any) => {
  const map = new Map<string, number>();
  sheet.columns.forEach((c: any) => map.set(c.title, c.id));
  return map;
};

// Helper function to update Smartsheet with email sent date
async function updateSmartsheetEmailSentDate(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get configuration from database
    const config = await db.emailToolSmartsheetConfig.findFirst();

    // If no config or required fields not configured, skip silently
    if (!config || !config.sheetId || !config.emailColumnName || !config.emailSentDateColumnName) {
      return { success: true }; // Skip silently - not an error
    }

    // Fetch the sheet from Smartsheet
    const sheet = await smartsheet.sheets.getSheet({ id: config.sheetId });
    const colmap = getColMap(sheet);

    // Get column IDs
    const emailColId = colmap.get(config.emailColumnName);
    const emailSentDateColId = colmap.get(config.emailSentDateColumnName);

    if (!emailColId || !emailSentDateColId) {
      return { 
        success: false, 
        error: `Required columns not found in Smartsheet. Email column: ${config.emailColumnName}, Email sent date column: ${config.emailSentDateColumnName}` 
      };
    }

    // Search for matching rows
    const matchingRows: any[] = [];
    
    for (const row of sheet.rows) {
      const emailCell = row.cells.find((c: any) => c.columnId === emailColId);
      const emailValue = emailCell?.value;
      
      if (emailValue && String(emailValue).trim().toLowerCase() === email.trim().toLowerCase()) {
        matchingRows.push(row);
      }
    }

    // If no match or multiple matches, skip silently
    if (matchingRows.length === 0) {
      console.log(`No matching row found in Smartsheet for email: ${email}`);
      return { success: true }; // Skip silently
    }

    if (matchingRows.length > 1) {
      console.log(`Multiple rows found in Smartsheet for email: ${email}`);
      return { success: true }; // Skip silently
    }

    // Single match found - update the row with today's date
    const row = matchingRows[0];
    
    // Format date as dd/mm/yyyy
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const formattedDate = `${dd}/${mm}/${yyyy}`;

    // Build update payload
    const updatePayload = {
      sheetId: Number(config.sheetId),
      body: [
        {
          id: Number(row.id),
          cells: [
            { columnId: emailSentDateColId, value: formattedDate }
          ],
        },
      ],
    };

    await smartsheet.sheets.updateRow(updatePayload);
    console.log(`Successfully updated Smartsheet row ${row.id} with email sent date: ${formattedDate}`);

    return { success: true };

  } catch (error: any) {
    console.error('Smartsheet update error:', error);
    return { 
      success: false, 
      error: error?.message || 'Failed to update Smartsheet' 
    };
  }
}

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
    const excludedAttachmentIds: string[] = (req.body as any).excludedAttachmentIds || [];

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

    // Validate that replyTo email is verified in SES
    const { getVerifiedSESEmails } = await import('@/lib/ses');
    const verifiedEmails = await getVerifiedSESEmails();
    if (!verifiedEmails.includes(parsed.replyTo)) {
      return res.status(400).json({ 
        error: `The reply-to email (${parsed.replyTo}) is not verified in AWS SES. Please verify it first or select a verified email address.` 
      });
    }

    // Load template body and get subject/clalitText from template
    let body: string;
    let isRTL: boolean = true;
    let templateSubject: string | null = null;
    let clalitText: string | null = null;

    if (parsed.templateId) {
      // Use specific template
      const template = await db.emailTemplate.findUnique({
        where: { id: parsed.templateId },
      });
      if (!template) return res.status(400).json({ error: "Invalid templateId" });
      body = template.body;
      isRTL = template.isRTL ?? true;
      templateSubject = template.subject;
      clalitText = template.clalitText;
    } else {
      // Try to get default template for this test
      const defaultTemplate = await db.emailTemplate.findFirst({
        where: { testId: parsed.testId },
        orderBy: { createdAt: 'asc' } // Get the first/oldest template as default
      });

      if (defaultTemplate) {
        templateSubject = defaultTemplate.subject;
        clalitText = defaultTemplate.clalitText;
      }

      body = parsed.body!;
      isRTL = parsed.isRTL ?? true;
    }

    // If location ID is provided, fetch the location's template text
    let locationText: string | undefined;
    if (parsed.location) {
      const location = await db.bloodTestLocation.findUnique({
        where: { id: parsed.location },
      });
      if (location) {
        locationText = location.templateText;
      }
    }

    // Fetch signature based on signatureId (if provided)
    let signatureContent: string | undefined;
    if (parsed.signatureId) {
      const signatureRecord = await db.signature.findUnique({
        where: { id: parsed.signatureId },
      });
      if (signatureRecord) {
        signatureContent = signatureRecord.content;
      }
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
      clalitText: clalitText || undefined,
      sendClalitInfo: parsed.sendClalitInfo,
      signature: signatureContent,
      // Optional blood test scheduling fields
      dayOfWeek: parsed.dayOfWeek,
      date: parsed.date,
      hour: parsed.hour,
      location: locationText,
    });

    // Extract images and prepare them as inline attachments
    const imageMap = new Map<string, string>(); // filename -> CID
    const inlineImages: { filename: string; filePath: string; cid: string }[] = [];
    
    // Log a sample of the rendered HTML to debug
    console.log('=== RENDERED HTML SAMPLE (first 500 chars) ===');
    console.log(rendered.substring(0, 500));
    console.log('==============================================');
    
    // Find all images in the HTML - match both relative and absolute URLs
    // Matches: /uploads/images/file.png OR /api/images/file.png OR https://domain.com/uploads/images/file.png OR https://domain.com/api/images/file.png
    const imageRegex = /<img([^>]*?)src="(?:https?:\/\/[^\/]+)?(?:\/uploads\/images\/|\/api\/images\/)([^"]+)"([^>]*?)>/gi;
    let match;
    let imageCounter = 0;
    
    while ((match = imageRegex.exec(rendered)) !== null) {
      const filename = match[2];
      console.log(`Found image in template: ${filename}`);
      
      if (!imageMap.has(filename)) {
        const cid = `image${imageCounter++}_${filename.replace(/\.[^.]+$/, '')}@progenetics`;
        imageMap.set(filename, cid);
        
        const imagePath = path.join(process.cwd(), 'public', 'uploads', 'images', filename);
        if (fs.existsSync(imagePath)) {
          inlineImages.push({ filename, filePath: imagePath, cid });
          console.log(`✓ Image file exists, will embed as CID: ${cid}`);
        } else {
          console.log(`✗ Image file not found at: ${imagePath}`);
        }
      }
    }
    
    // Replace image URLs with CID references (both relative and absolute)
    rendered = rendered.replace(imageRegex, (match, before, filename, after) => {
      const cid = imageMap.get(filename);
      if (cid) {
        return `<img${before}src="cid:${cid}"${after}>`;
      }
      return match;
    });
    
    console.log(`Replaced ${inlineImages.length} images with CID references`);

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

    // Create proper HTML email structure with responsive design
    const htmlEmail = `<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'he' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${parsed.subject ?? templateSubject ?? test.name}</title>
  <style>
    /* Responsive styles for email clients that support CSS */
    @media only screen and (max-width: 599px) {
      .email-container {
        background-color: transparent !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        padding: 20px !important;
      }
      .email-body-wrapper {
        padding: 10px !important;
      }
      body {
        padding: 10px !important;
      }
    }
    @media only screen and (max-width: 479px) {
      .email-container {
        padding: 10px !important;
      }
      .email-body-wrapper {
        padding: 5px !important;
      }
      body {
        padding: 5px !important;
      }
    }
    @media only screen and (max-width: 319px) {
      .email-container {
        padding: 5px !important;
      }
      .email-body-wrapper {
        padding: 0 !important;
      }
      body {
        padding: 2px !important;
      }
    }
    /* Ensure text doesn't overflow on small screens */
    .email-body-wrapper {
      word-wrap: break-word;
      overflow-wrap: break-word;
      max-width: 100%;
      font-size: 16px !important;
      line-height: 1.6 !important;
    }
    /* Responsive images */
    .email-body-wrapper img {
      max-width: 100% !important;
      height: auto !important;
    }
    /* Responsive tables */
    .email-body-wrapper table {
      max-width: 100% !important;
      width: 100% !important;
    }
    /* Responsive links - ensure they don't break layout */
    .email-body-wrapper a {
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    /* Email client font-size compatibility */
    .email-body-wrapper p {
      font-size: 16px !important;
      line-height: 1.6 !important;
    }
    .email-body-wrapper span[style*="font-size"] {
      /* Preserve user-selected font sizes from Quill editor - don't inherit */
    }
    .email-body-wrapper div {
      font-size: inherit !important;
    }
    /* Gmail-specific fixes */
    .gmail_default .email-body-wrapper {
      font-size: 16px !important;
    }
    /* Ensure tables inherit base font size */
    .email-body-wrapper table {
      font-size: 16px !important;
    }
  </style>
</head>
<body style="font-family: ${isRTL ? 'Arial, \'David\', \'Times New Roman\', sans-serif' : 'Arial, Helvetica, sans-serif'}; direction: ${isRTL ? 'rtl' : 'ltr'}; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div class="email-body-wrapper" style="font-size: 16px; line-height: 1.6;">
      ${rendered}
    </div>
  </div>
</body>
</html>`;

    // Prepare recipients: primary recipient as TO, CC emails from request
    const toRecipients = [parsed.toEmail];
    
    // Parse CC emails from comma-separated string
    const ccRecipients = parsed.ccEmails
      ? parsed.ccEmails.split(',').map(email => email.trim()).filter(email => email.length > 0)
      : [];
    
    console.log('toRecipients', toRecipients);
    console.log('ccRecipients', ccRecipients);

    // Use reply_to from request
    const replyToEmail = parsed.replyTo;
    console.log('replyToEmail', replyToEmail);

    // Use custom subject from form if provided, otherwise use template subject, or fall back to test name
    const emailSubject = parsed.subject || templateSubject || test.name;
    console.log('emailSubject', emailSubject);

    // Load attachments from template (excluding any that are in excludedAttachmentIds)
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
          // Skip if this attachment is excluded
          if (excludedAttachmentIds.includes(attachment.id)) {
            continue;
          }
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
          // Skip if this attachment is excluded
          if (excludedAttachmentIds.includes(attachment.id)) {
            continue;
          }
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

    // Add inline images as attachments with CID
    for (const inlineImage of inlineImages) {
      const fileContent = fs.readFileSync(inlineImage.filePath);
      const ext = path.extname(inlineImage.filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      const mimeType = mimeTypes[ext] || 'application/octet-stream';
      
      emailAttachments.push({
        filename: inlineImage.filename,
        content: fileContent,
        mimeType: mimeType,
        cid: inlineImage.cid,
        inline: true,
      });
    }
    
    console.log(`Added ${inlineImages.length} inline images as CID attachments`);

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
      // Use replyToEmail as fromEmail so the email appears in sender's Sent folder
      const emailResult = await sendTransactionalEmail({
        to: toRecipients,
        cc: ccRecipients,
        replyTo: replyToEmail,
        subject: emailSubject,
        htmlContent: htmlEmail,
        fromEmail: replyToEmail,
        fromName: 'Progenetics',
        attachments: emailAttachments
      });

      // After successful email send, try to update Smartsheet
      const smartsheetResult = await updateSmartsheetEmailSentDate(parsed.toEmail);
      
      // Build response object
      const responseData: any = {
        message: "Email sent successfully via Amazon SES",
        toRecipients: toRecipients,
        ccRecipients: ccRecipients,
        replyTo: replyToEmail,
        subject: emailSubject,
        isRTL,
        attachmentsCount: emailAttachments.length,
        sent: emailResult.sent,
        queued: emailResult.queued || 0,
        rejected: emailResult.rejected || 0,
        details: emailResult.results,
      };

      // If Smartsheet update failed, add error to response
      if (!smartsheetResult.success && smartsheetResult.error) {
        responseData.smartsheetUpdateError = smartsheetResult.error;
      }

      return res.status(200).json(responseData);
      
    } catch (emailError: any) {
      console.error('Email sending failed:', emailError);
      
      return res.status(500).json({
        error: `Failed to send email: ${emailError.message}`,
        toRecipients: toRecipients,
        ccRecipients: ccRecipients,
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
