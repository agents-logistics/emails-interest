import type { NextApiRequest, NextApiResponse } from "next";
import { verifySESConfiguration } from "@/lib/ses";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    console.log('Verifying SES configuration...');

    // Check environment variables
    const envVars = {
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 
        `${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'NOT SET',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 
        `${process.env.AWS_SECRET_ACCESS_KEY.substring(0, 8)}...` : 'NOT SET',
      AWS_REGION: process.env.AWS_REGION || 'NOT SET'
    };

    // Verify configuration
    const verification = await verifySESConfiguration();

    // Determine overall status
    let overallStatus = "✅ Configuration Valid";
    let issues: string[] = [];
    let recommendations: string[] = [];

    if (!verification.success) {
      overallStatus = "❌ Configuration Invalid";
      issues.push(verification.error || "Unknown configuration error");
    }

    // Check individual environment variables
    if (envVars.AWS_ACCESS_KEY_ID === 'NOT SET') {
      issues.push("AWS_ACCESS_KEY_ID is not set");
      recommendations.push("Set AWS_ACCESS_KEY_ID environment variable");
    }
    
    if (envVars.AWS_SECRET_ACCESS_KEY === 'NOT SET') {
      issues.push("AWS_SECRET_ACCESS_KEY is not set");
      recommendations.push("Set AWS_SECRET_ACCESS_KEY environment variable");
    }
    
    if (envVars.AWS_REGION === 'NOT SET') {
      issues.push("AWS_REGION is not set");
      recommendations.push("Set AWS_REGION environment variable (e.g., 'us-east-1')");
    }

    // Additional recommendations
    if (issues.length === 0) {
      recommendations.push("✅ All environment variables are set");
      recommendations.push("Next: Run /api/test-ses to verify SES permissions");
      recommendations.push("Then: Run /api/test-ses-send to test email sending");
    } else {
      recommendations.push("Add missing environment variables to your .env.local file");
      recommendations.push("Get AWS credentials from AWS Console → IAM → Users");
      recommendations.push("Ensure IAM user has SES permissions (AmazonSESFullAccess)");
    }

    return res.status(issues.length > 0 ? 400 : 200).json({
      message: "SES configuration check results",
      status: overallStatus,
      environmentVariables: envVars,
      verification: verification,
      issues: issues,
      recommendations: recommendations,
      nextSteps: issues.length === 0 ? [
        "1. Run /api/test-ses to verify SES connection",
        "2. Verify your sender email/domain in AWS SES Console",
        "3. Test email sending with /api/test-ses-send"
      ] : [
        "1. Fix the configuration issues listed above",
        "2. Restart your development server",
        "3. Run this test again to verify fixes"
      ],
      setupInstructions: {
        "Step 1": "Create AWS IAM user with SES permissions",
        "Step 2": "Get Access Key ID and Secret Access Key",
        "Step 3": "Add environment variables to .env.local",
        "Step 4": "Choose AWS region (us-east-1, eu-west-1, etc.)",
        "Step 5": "Verify sender email/domain in SES Console"
      }
    });

  } catch (error: any) {
    console.error('SES configuration test error:', error);
    return res.status(500).json({ 
      error: "Configuration test failed", 
      details: error.message 
    });
  }
}
