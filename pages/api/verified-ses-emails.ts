import type { NextApiRequest, NextApiResponse } from "next";
import { getVerifiedSESEmails } from "@/lib/ses";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    console.log('Fetching verified SES emails...');

    const verifiedEmails = await getVerifiedSESEmails();

    return res.status(200).json({
      verifiedEmails,
      count: verifiedEmails.length,
      message: `Found ${verifiedEmails.length} verified email address(es)`
    });

  } catch (error: any) {
    console.error('Failed to fetch verified SES emails:', error);
    return res.status(500).json({ 
      error: "Failed to fetch verified emails", 
      details: error.message,
      verifiedEmails: ['agents@progenetics.co.il'] // Fallback
    });
  }
}

