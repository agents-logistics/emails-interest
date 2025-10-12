import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid ID" });
    }

    if (req.method === "DELETE") {
      // Delete CC default email
      await db.cCDefaultEmail.delete({
        where: { id },
      });

      return res.status(200).json({ message: "CC default email deleted successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    const message = err?.message || "Unexpected error";
    return res.status(400).json({ error: message });
  }
}

