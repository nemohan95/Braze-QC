import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [riskRules, disclaimers, linkRules, keywordRules, additionalRules] = await Promise.all([
      prisma.riskRule.findMany({
        orderBy: [{ entity: "asc" }, { variant: "asc" }]
      }),
      prisma.disclaimerRule.findMany({
        orderBy: [
          { entity: "asc" },
          { silo: "asc" },
          { emailType: "asc" },
          { kind: "asc" },
        ],
      }),
      prisma.linkRule.findMany({
        orderBy: [
          { entity: "asc" },
          { silo: "asc" },
          { emailType: "asc" },
          { kind: "asc" },
        ],
      }),
      prisma.keywordRule.findMany({
        orderBy: [{ keyword: "asc" }]
      }),
      prisma.additionalRule.findMany({
        orderBy: [
          { topic: "asc" },
          { silo: "asc" },
          { entity: "asc" },
        ],
      }),
    ]);

    return NextResponse.json({
      riskRules,
      disclaimers,
      linkRules,
      keywordRules,
      additionalRules,
    });
  } catch (error) {
    console.error("Failed to fetch rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    );
  }
}