import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const firework = await prisma.firework.findUnique({
      where: { id },
    });

    if (!firework) {
      return NextResponse.json(
        { error: "Firework not found" },
        { status: 404 }
      );
    }

    // Check if expired
    if (firework.expiresAt && new Date() > firework.expiresAt) {
      // Delete expired firework
      await prisma.firework.delete({ where: { id } });
      return NextResponse.json(
        { error: "Firework expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: firework.message,
    });
  } catch (error) {
    console.error("Error getting firework:", error);
    return NextResponse.json(
      { error: "Failed to get firework" },
      { status: 500 }
    );
  }
}
