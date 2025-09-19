const mailchimpTransactional = require('@mailchimp/mailchimp_transactional');

export interface TransactionalEmailData {
  to: string[];
  replyTo: string;
  subject: string;
  htmlContent: string;
  fromEmail?: string;
  fromName?: string;
}

export async function sendTransactionalEmail({
  to,
  replyTo,
  subject,
  htmlContent,
  fromEmail = 'noreply@progenetics1.co.il',
  fromName = 'Progenetics'
}: TransactionalEmailData) {
  try {
    if (!process.env.MAILCHIMP_API_KEY) {
      throw new Error('MAILCHIMP_API_KEY is required for Mailchimp Transactional emails.');
    }

    // Initialize Mailchimp Transactional client with your regular Mailchimp API key
    const mailchimpClient = mailchimpTransactional(process.env.MAILCHIMP_API_KEY);

    // First, let's test if the API key works by checking account info
    console.log('Testing API key with account info...');
    try {
      const accountInfo = await mailchimpClient.users.info();
      console.log('Account info retrieved successfully:', accountInfo);
    } catch (testError: any) {
      console.error('API key test failed:', testError.message);
      throw new Error(`API key test failed: ${testError.message}. Make sure Mailchimp Transactional is enabled in your account.`);
    }

    // Prepare message for Mailchimp Transactional API (simplified based on docs)
    const message = {
      from_email: fromEmail,
      from_name: fromName,
      subject: subject,
      html: htmlContent,
      to: to.map(email => ({
        email: email,
        type: 'to'
      })),
      headers: {
        'Reply-To': replyTo
      },
      track_opens: true,
      track_clicks: true,
      preserve_recipients: false // Each recipient won't see others
    };

    // Send the transactional email
    const response = await mailchimpClient.messages.send({
      message: message
    });

    // Log response for debugging
    console.log('Mailchimp response:', JSON.stringify(response, null, 2));

    // Check if response is valid
    if (!response) {
      throw new Error('No response received from Mailchimp Transactional API');
    }

    // Handle different response formats
    let results: any[] = [];
    if (Array.isArray(response)) {
      results = response;
    } else if (response.results && Array.isArray(response.results)) {
      results = response.results;
    } else if (response.data && Array.isArray(response.data)) {
      results = response.data;
    } else {
      // If response is not an array, treat as single result
      results = [response];
    }

    // Process response
    const sent = results.filter((r: any) => r.status === 'sent');
    const rejected = results.filter((r: any) => r.status === 'rejected');
    const queued = results.filter((r: any) => r.status === 'queued');

    if (rejected.length > 0) {
      console.warn('Some emails were rejected:', rejected);
    }

    return {
      success: sent.length > 0 || queued.length > 0,
      sent: sent.length,
      queued: queued.length,
      rejected: rejected.length,
      results: results,
      message: `Successfully sent/queued ${sent.length + queued.length} emails, ${rejected.length} rejected`
    };

  } catch (error: any) {
    console.error('Mailchimp Transactional API error:', error);
    
    // Handle 401 Unauthorized specifically
    if (error.status === 401 || error.code === 'ERR_BAD_REQUEST') {
      throw new Error(`Authentication failed (401): Your API key format looks correct, but access is denied.

This usually means:
1. Mailchimp Transactional is NOT enabled in your account
2. You need to activate Transactional email service first

Steps to fix:
1. Log into your Mailchimp account
2. Go to "Transactional" section in the main menu
3. If you see "Get Started" or "Activate", click it to enable the service
4. Once activated, your existing API key should work
5. Add and verify your sending domain (progenetics1.co.il)

Test your setup by visiting: /api/test-mailchimp`);
    }
    
    // Provide more specific error messages
    if (error.message && error.message.includes('Invalid API key')) {
      throw new Error('Invalid Mailchimp API key. Please check your MAILCHIMP_API_KEY environment variable.');
    }
    
    if (error.message && error.message.includes('authentication')) {
      throw new Error('Authentication failed. Please verify your Mailchimp API key and domain configuration.');
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Network error: Unable to connect to Mailchimp Transactional API.');
    }
    
    throw new Error(`Failed to send email via Mailchimp Transactional: ${error.message || 'Unknown error'}`);
  }
}
