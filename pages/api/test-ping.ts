import type { NextApiRequest, NextApiResponse } from "next";

const mailchimpTx = require("@mailchimp/mailchimp_transactional");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!process.env.MAILCHIMP_API_KEY) {
      return res.status(400).json({ error: "MAILCHIMP_API_KEY is required" });
    }

    console.log('Testing ping with API key:', process.env.MAILCHIMP_API_KEY?.substring(0, 10) + '...');

    // Initialize client with your API key
    const mailchimpClient = mailchimpTx(process.env.MAILCHIMP_API_KEY);

    // Test ping
    console.log('Calling users.ping()...');
    const response = await mailchimpClient.users.ping();
    console.log('Ping response:', response);

    return res.status(200).json({
      message: "Ping test successful!",
      response: response,
      timestamp: new Date().toISOString(),
      status: "✅ Mailchimp Transactional is working!"
    });

  } catch (error: any) {
    console.error('Ping test failed:', error);
    
    // Handle specific error types
    if (error.status === 401) {
      return res.status(401).json({
        error: "Authentication failed (401)",
        message: "Your API key is invalid or Mailchimp Transactional is not activated",
        apiKeyFormat: process.env.MAILCHIMP_API_KEY?.substring(0, 10) + '...',
        solutions: [
          "Check if your API key is correct",
          "Ensure Mailchimp Transactional is activated in your account",
          "Verify you're using the right API key format (should end with -us14 etc.)"
        ],
        details: error.message
      });
    }

    if (error.status === 403) {
      return res.status(403).json({
        error: "Forbidden (403)",
        message: "Access denied - check your account permissions",
        details: error.message
      });
    }

    if (error.status === 500) {
      return res.status(500).json({
        error: "Server error (500)",
        message: "Mailchimp server error",
        details: error.message
      });
    }

    // Generic error
    return res.status(500).json({
      error: "Ping test failed",
      message: error.message || "Unknown error",
      status: error.status || "unknown",
      code: error.code || "unknown",
      details: {
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
}
