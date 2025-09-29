import type { NextApiRequest, NextApiResponse } from "next";
import { sendTransactionalEmail } from "@/lib/ses";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST with email data." });
    }

    // Parse request body
    const { to, subject, testContent } = req.body;
    
    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ 
        error: "Missing 'to' field. Provide an array of email addresses.",
        example: { to: ["test@example.com"], subject: "Test", testContent: true }
      });
    }

    const emailSubject = subject || "Amazon SES Test Email";
    const testHtml = testContent ? `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">🎉 Amazon SES Test Email</h2>
          <p>This is a test email sent from your application using Amazon SES.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Test Details:</strong><br>
            • Sent to: ${to.join(', ')}<br>
            • Timestamp: ${new Date().toISOString()}<br>
            • Service: Amazon SES<br>
            • From: info@progenetics1.co.il
          </div>
          <p>If you received this email, your SES configuration is working correctly! 🚀</p>
          <hr style="margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is a test email from the Progenetics email system.
          </p>
        </body>
      </html>
    ` : req.body.htmlContent || `
      <html>
        <body>
          <h1>Test Email</h1>
          <p>This is a test email sent via Amazon SES.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </body>
      </html>
    `;

    console.log('Sending test email via SES...');
    console.log(`To: ${to.join(', ')}`);
    console.log(`Subject: ${emailSubject}`);

    // Send the test email
    const result = await sendTransactionalEmail({
      to: to,
      replyTo: req.body.replyTo || 'info@progenetics1.co.il',
      subject: emailSubject,
      htmlContent: testHtml,
      fromEmail: req.body.fromEmail || 'info@progenetics1.co.il',
      fromName: req.body.fromName || 'Progenetics Test'
    });

    return res.status(200).json({
      message: "✅ Test email sent successfully via Amazon SES!",
      result: result,
      sentTo: to,
      subject: emailSubject,
      messageId: result.messageId,
      timestamp: new Date().toISOString(),
      instructions: [
        "Check the recipient inbox(es) for the test email",
        "If you're in SES Sandbox mode, emails can only be sent to verified addresses",
        "If email doesn't arrive, check AWS SES console for bounce/complaint reports"
      ]
    });

  } catch (error: any) {
    console.error('SES test send failed:', error);
    
    // Provide specific error guidance
    let errorGuidance: string[] = [];
    
    if (error.message.includes('not verified')) {
      errorGuidance = [
        "The sender email address is not verified in SES",
        "Go to AWS Console → SES → Verified identities",
        "Verify the email address or entire domain",
        "Wait for verification to complete before sending"
      ];
    } else if (error.message.includes('sandbox')) {
      errorGuidance = [
        "You're in SES Sandbox mode",
        "You can only send to verified email addresses",
        "Add recipient emails to verified identities, or request production access"
      ];
    } else if (error.message.includes('credentials')) {
      errorGuidance = [
        "AWS credentials issue",
        "Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY",
        "Ensure the IAM user has SES permissions"
      ];
    } else {
      errorGuidance = [
        "Check AWS SES console for detailed error information",
        "Verify that SES is enabled in your AWS region",
        "Ensure your AWS account is in good standing"
      ];
    }

    return res.status(500).json({
      error: "Failed to send test email",
      details: error.message,
      guidance: errorGuidance,
      suggestion: "Run /api/test-ses first to check your SES configuration"
    });
  }
}
