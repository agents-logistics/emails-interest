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

    // Test 1: Check if API key is valid
    console.log('Testing API key...');
    let accountInfo;
    try {
      accountInfo = await mailchimpClient.users.info();
      console.log('Account info:', accountInfo);
    } catch (error: any) {
      console.error('Account info failed:', error);
      return res.status(401).json({ 
        error: "API key test failed", 
        details: error.message,
        suggestion: "Make sure Mailchimp Transactional is enabled in your account and you're using the correct API key"
      });
    }

    // Test 2: Check sending domains
    console.log('Checking sending domains...');
    let domains;
    try {
      domains = await mailchimpClient.senders.domains();
      console.log('Domains:', domains);
    } catch (error: any) {
      console.error('Domains check failed:', error);
      domains = { error: error.message };
    }

    // Test 3: Try a simple ping
    console.log('Testing ping...');
    let pingResult;
    try {
      pingResult = await mailchimpClient.users.ping();
      console.log('Ping result:', pingResult);
    } catch (error: any) {
      console.error('Ping failed:', error);
      pingResult = { error: error.message };
    }

    return res.status(200).json({
      message: "Mailchimp Transactional API test results",
      account: accountInfo,
      domains: domains,
      ping: pingResult,
      suggestions: [
        "If account info is successful but domains fail, you need to add and verify progenetics.co.il domain",
        "Go to Mailchimp Transactional → Sending Domains → Add Domain",
        "Set up DKIM records in your DNS",
        "Verify domain ownership via email"
      ]
    });

  } catch (error: any) {
    console.error('Test API error:', error);
    return res.status(500).json({ 
      error: "Test failed", 
      details: error.message 
    });
  }
}
