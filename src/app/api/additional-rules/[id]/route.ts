import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface UpdateData {
  topic: string;
  silo: string;
  entity: string;
  text: string;
  links?: string;
  notes?: string;
  active: boolean;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data: UpdateData = await request.json();

    // Validate required fields
    if (!data.topic || !data.silo || !data.entity || !data.text) {
      return NextResponse.json(
        { error: "Missing required fields: topic, silo, entity, text" },
        { status: 400 }
      );
    }

    const updatedRule = await prisma.additionalRule.update({
      where: { id },
      data: {
        topic: data.topic,
        silo: data.silo,
        entity: data.entity,
        text: data.text,
        links: data.links ? data.links : undefined,
        notes: data.notes ? data.notes : undefined,
        active: data.active,
      },
    });

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error("Failed to update additional rule:", error);

    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 }
    );
  }
}