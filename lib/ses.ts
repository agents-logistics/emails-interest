import { SESClient, SendEmailCommand, SendEmailCommandInput, SendRawEmailCommand } from '@aws-sdk/client-ses';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  mimeType: string;
  cid?: string; // Content-ID for inline images
  inline?: boolean; // Whether this is an inline attachment
}

export interface TransactionalEmailData {
  to: string[];
  cc?: string[];
  replyTo: string;
  subject: string;
  htmlContent: string;
  fromEmail?: string;
  fromName?: string;
  attachments?: EmailAttachment[];
}

export async function sendTransactionalEmail({
  to,
  cc,
  replyTo,
  subject,
  htmlContent,
  fromEmail = 'info@progenetics1.co.il',
  fromName = 'Progenetics',
  attachments = []
}: TransactionalEmailData) {
  try {
    // Check required environment variables
    if (!process.env.AWS_ACCESS_KEY_ID) {
      throw new Error('AWS_ACCESS_KEY_ID is required for Amazon SES emails.');
    }
    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS_SECRET_ACCESS_KEY is required for Amazon SES emails.');
    }
    if (!process.env.AWS_REGION) {
      throw new Error('AWS_REGION is required for Amazon SES emails.');
    }

    // Initialize SES client
    const sesClient = new SESClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    console.log('Sending email via Amazon SES...');
    console.log(`From: ${fromName} <${fromEmail}>`);
    console.log(`To: ${to.join(', ')}`);
    if (cc && cc.length > 0) {
      console.log(`CC: ${cc.join(', ')}`);
    }
    console.log(`Subject: ${subject}`);
    console.log(`Attachments: ${attachments.length}`);

    let response;

    if (attachments.length > 0) {
      // Use SendRawEmail for emails with attachments
      const boundary = `----=_NextPart_${Date.now()}`;
      const relatedBoundary = `----=_Related_${Date.now()}`;

      // Build list of all recipients (to + cc)
      const allDestinations = [...to, ...(cc || [])];

      // Separate inline and regular attachments
      const inlineAttachments = attachments.filter(a => a.inline && a.cid);
      const regularAttachments = attachments.filter(a => !a.inline);

      // Create multipart email with attachments
      let rawEmail = [
        `From: ${fromName} <${fromEmail}>`,
        `To: ${to.join(', ')}`,
        ...(cc && cc.length > 0 ? [`Cc: ${cc.join(', ')}`] : []),
        `Reply-To: ${replyTo}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ``,
        `--${boundary}`
      ];

      // If we have inline attachments, use multipart/related
      if (inlineAttachments.length > 0) {
        rawEmail.push(
          `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
          ``,
          `--${relatedBoundary}`,
          `Content-Type: text/html; charset=UTF-8`,
          `Content-Transfer-Encoding: 7bit`,
          ``,
          htmlContent,
          ``
        );

        // Add inline attachments with CID
        for (const attachment of inlineAttachments) {
          rawEmail.push(
            `--${relatedBoundary}`,
            `Content-Type: ${attachment.mimeType}`,
            `Content-Transfer-Encoding: base64`,
            `Content-ID: <${attachment.cid}>`,
            `Content-Disposition: inline; filename="${attachment.filename}"`,
            ``,
            attachment.content.toString('base64'),
            ``
          );
        }

        rawEmail.push(`--${relatedBoundary}--`, ``);
      } else {
        // No inline attachments, just add HTML content
        rawEmail.push(
          `Content-Type: text/html; charset=UTF-8`,
          `Content-Transfer-Encoding: 7bit`,
          ``,
          htmlContent,
          ``
        );
      }

      // Add regular attachments
      for (const attachment of regularAttachments) {
        rawEmail.push(
          `--${boundary}`,
          `Content-Type: ${attachment.mimeType}`,
          `Content-Transfer-Encoding: base64`,
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          ``,
          attachment.content.toString('base64'),
          ``
        );
      }

      rawEmail.push(`--${boundary}--`);

      const rawEmailString = rawEmail.join('\r\n');

      const params = {
        Source: fromEmail,
        Destinations: allDestinations,
        RawMessage: {
          Data: new Uint8Array(Buffer.from(rawEmailString, 'utf-8')),
        },
      };

      const command = new SendRawEmailCommand(params);
      response = await sesClient.send(command);
    } else {
      // Use regular SendEmail for emails without attachments
      const params: SendEmailCommandInput = {
        Source: `${fromName} <${fromEmail}>`,
        Destination: {
          ToAddresses: to,
          ...(cc && cc.length > 0 && { CcAddresses: cc }),
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: 'UTF-8',
            },
          },
        },
        ReplyToAddresses: [replyTo],
      };

      const command = new SendEmailCommand(params);
      response = await sesClient.send(command);
    }

    console.log('SES response:', JSON.stringify(response, null, 2));

    // Process response
    const messageId = response.MessageId;
    if (!messageId) {
      throw new Error('No MessageId received from Amazon SES');
    }

    return {
      success: true,
      sent: to.length + (cc ? cc.length : 0),
      queued: 0,
      rejected: 0,
      results: [
        {
          messageId: messageId,
          status: 'sent',
          to: to,
          ...(cc && cc.length > 0 && { cc: cc }),
          subject: subject,
        }
      ],
      message: `Successfully sent email to ${to.length} recipients${cc && cc.length > 0 ? ` and ${cc.length} CC recipients` : ''}`,
      messageId: messageId,
    };

  } catch (error: any) {
    console.error('Amazon SES error:', error);
    
    // Handle specific SES errors
    if (error.name === 'MessageRejected') {
      throw new Error(`Email rejected by SES: ${error.message}. Check that your sender email (${fromEmail}) is verified in SES.`);
    }
    
    if (error.name === 'MailFromDomainNotVerifiedException') {
      throw new Error(`Domain not verified: ${error.message}. You need to verify ${fromEmail.split('@')[1]} in Amazon SES.`);
    }
    
    if (error.name === 'ConfigurationSetDoesNotExistException') {
      throw new Error(`Configuration set error: ${error.message}`);
    }
    
    if (error.name === 'AccountSendingNotEnabledException') {
      throw new Error(`SES account not enabled: ${error.message}. Your SES account might be in sandbox mode.`);
    }
    
    if (error.name === 'SendingPausedException') {
      throw new Error(`Sending paused: ${error.message}. Check your SES account status.`);
    }
    
    if (error.name === 'CredentialsError' || error.message?.includes('credentials')) {
      throw new Error(`AWS credentials error: ${error.message}. Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.`);
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Network error: Unable to connect to Amazon SES.');
    }
    
    throw new Error(`Failed to send email via Amazon SES: ${error.message || 'Unknown error'}`);
  }
}

// Helper function to verify SES configuration
export async function verifySESConfiguration() {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
      return {
        success: false,
        error: 'Missing required environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION'
      };
    }

    const sesClient = new SESClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // You can add more verification logic here if needed
    // For now, just check if we can initialize the client
    
    return {
      success: true,
      region: process.env.AWS_REGION,
      message: 'SES configuration appears valid'
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}
