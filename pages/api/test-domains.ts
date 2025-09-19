import type { NextApiRequest, NextApiResponse } from "next";

const mailchimpTransactional = require('@mailchimp/mailchimp_transactional');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!process.env.MAILCHIMP_API_KEY) {
      return res.status(400).json({ error: "MAILCHIMP_API_KEY is required" });
    }

    // Initialize Mailchimp Transactional client
    const mailchimpClient = mailchimpTransactional(process.env.MAILCHIMP_API_KEY);

    console.log('Testing sender domains...');
    
    try {
      // Get sender domains
      const domains = await mailchimpClient.senders.domains();
      console.log('Sender domains response:', domains);

      // Check if progenetics1.co.il is in the list
      const progeneticsDomain = domains.find((domain: any) => 
        domain.domain === 'progenetics1.co.il'
      );

      let domainStatus: any = {
        found: !!progeneticsDomain,
        details: progeneticsDomain || null,
        needsSetup: !progeneticsDomain
      };

      // Additional domain info if found
      if (progeneticsDomain) {
        domainStatus = {
          ...domainStatus,
          verified: progeneticsDomain.verified || false,
          dkim: progeneticsDomain.dkim || {},
          spf: progeneticsDomain.spf || {},
          valid_signing: progeneticsDomain.valid_signing || false
        };
      }

      return res.status(200).json({
        message: "Sender domains test results",
        totalDomains: domains.length,
        allDomains: domains,
        progeneticsDomain: domainStatus,
        instructions: progeneticsDomain ? 
          "Domain found! Check verification and DKIM status above." :
          "Domain not found. You need to add progenetics1.co.il as a sender domain.",
        nextSteps: progeneticsDomain ? [
          "If verified=false, complete email verification",
          "If DKIM is invalid, check your DNS records",
          "Ensure all required DNS records are properly configured"
        ] : [
          "Go to Mailchimp Transactional → Sending Domains",
          "Click 'Add Domain'", 
          "Add 'progenetics1.co.il'",
          "Configure DKIM records in your DNS",
          "Complete email verification"
        ]
      });

    } catch (domainError: any) {
      console.error('Domain check failed:', domainError);
      
      // Check if it's a 401 error (service not activated)
      if (domainError.status === 401) {
        return res.status(401).json({
          error: "Mailchimp Transactional not activated",
          message: "401 Unauthorized - Transactional service is not enabled in your account",
          solution: [
            "Log into your Mailchimp account",
            "Navigate to 'Transactional' section",
            "Activate the service if available",
            "Note: May require a paid plan or additional billing"
          ]
        });
      }

      return res.status(500).json({
        error: "Failed to check sender domains",
        details: domainError.message,
        suggestion: "Check if Mailchimp Transactional is properly activated"
      });
    }

  } catch (error: any) {
    console.error('Test domains API error:', error);
    return res.status(500).json({ 
      error: "Test failed", 
      details: error.message 
    });
  }
}
