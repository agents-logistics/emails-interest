import type { NextApiRequest, NextApiResponse } from "next";
import { SESClient, GetAccountSendingEnabledCommand, ListVerifiedEmailAddressesCommand, GetSendQuotaCommand } from '@aws-sdk/client-ses';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Check required environment variables
    const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return res.status(400).json({ 
        error: "Missing required environment variables",
        missing: missingVars,
        required: requiredEnvVars,
        instructions: [
          "Set AWS_ACCESS_KEY_ID - Your AWS access key",
          "Set AWS_SECRET_ACCESS_KEY - Your AWS secret key", 
          "Set AWS_REGION - AWS region (e.g., us-east-1, eu-west-1)",
          "Get these from AWS Console → IAM → Users → Security credentials"
        ]
      });
    }

    console.log('Testing Amazon SES configuration...');
    console.log(`Region: ${process.env.AWS_REGION}`);
    console.log(`Access Key: ${process.env.AWS_ACCESS_KEY_ID?.substring(0, 10)}...`);

    // Initialize SES client
    const sesClient = new SESClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    let results: any = {
      region: process.env.AWS_REGION,
      accessKey: process.env.AWS_ACCESS_KEY_ID?.substring(0, 10) + '...',
    };

    // Test 1: Check account sending status
    console.log('Testing account sending status...');
    try {
      const sendingCommand = new GetAccountSendingEnabledCommand({});
      const sendingEnabled = await sesClient.send(sendingCommand);
      results.accountSendingEnabled = sendingEnabled.Enabled;
      console.log('Account sending enabled:', sendingEnabled.Enabled);
    } catch (error: any) {
      console.error('Account sending check failed:', error);
      results.accountSendingEnabled = { error: error.message };
    }

    // Test 2: Get verified email addresses
    console.log('Getting verified email addresses...');
    try {
      const verifiedCommand = new ListVerifiedEmailAddressesCommand({});
      const verifiedEmails = await sesClient.send(verifiedCommand);
      results.verifiedEmails = verifiedEmails.VerifiedEmailAddresses || [];
      console.log('Verified emails:', verifiedEmails.VerifiedEmailAddresses);
    } catch (error: any) {
      console.error('Verified emails check failed:', error);
      results.verifiedEmails = { error: error.message };
    }

    // Test 3: Get send quota
    console.log('Getting send quota...');
    try {
      const quotaCommand = new GetSendQuotaCommand({});
      const quota = await sesClient.send(quotaCommand);
      results.sendQuota = {
        max24HourSend: quota.Max24HourSend,
        maxSendRate: quota.MaxSendRate,
        sentLast24Hours: quota.SentLast24Hours
      };
      console.log('Send quota:', quota);
    } catch (error: any) {
      console.error('Send quota check failed:', error);
      results.sendQuota = { error: error.message };
    }

    // Analysis and recommendations
    let status = "✅ SES is working correctly";
    let recommendations: string[] = [];
    
    if (results.accountSendingEnabled?.error) {
      status = "❌ Cannot connect to SES";
      recommendations.push("Check your AWS credentials and region");
      recommendations.push("Ensure your IAM user has SES permissions");
    } else if (results.accountSendingEnabled === false) {
      status = "⚠️ SES account sending is disabled";
      recommendations.push("Your SES account sending is disabled");
      recommendations.push("Contact AWS support or check your account status");
    } else if (Array.isArray(results.verifiedEmails) && results.verifiedEmails.length === 0) {
      status = "⚠️ No verified email addresses";
      recommendations.push("You need to verify at least one email address or domain");
      recommendations.push("Go to AWS Console → SES → Verified identities");
      recommendations.push("Add and verify agents@progenetics.co.il or the entire progenetics.co.il domain");
    } else if (Array.isArray(results.verifiedEmails) && !results.verifiedEmails.includes('agents@progenetics.co.il')) {
      status = "⚠️ Current sender email not verified";
      recommendations.push("Your configured sender email (agents@progenetics.co.il) is not verified");
      recommendations.push("Either verify this email or use one of your verified emails");
      recommendations.push(`Verified emails: ${results.verifiedEmails.join(', ')}`);
    }

    // Check if in sandbox mode
    if (results.sendQuota?.max24HourSend === 200) {
      status += " (Sandbox Mode)";
      recommendations.push("You're in SES Sandbox mode - can only send to verified addresses");
      recommendations.push("To send to any email address, request production access in AWS Console");
    }

    return res.status(200).json({
      message: "Amazon SES test results",
      status: status,
      ...results,
      recommendations: recommendations,
      nextSteps: recommendations.length > 0 ? recommendations : [
        "SES is configured correctly!",
        "You can now send emails using Amazon SES",
        "Test sending an email using /api/test-ses-send"
      ]
    });

  } catch (error: any) {
    console.error('SES test error:', error);
    
    if (error.name === 'CredentialsError') {
      return res.status(401).json({
        error: "AWS credentials error",
        details: error.message,
        solution: [
          "Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY",
          "Ensure the credentials are valid and active",
          "Check that the IAM user has SES permissions"
        ]
      });
    }
    
    return res.status(500).json({ 
      error: "SES test failed", 
      details: error.message,
      suggestion: "Check your AWS credentials and SES configuration"
    });
  }
}
