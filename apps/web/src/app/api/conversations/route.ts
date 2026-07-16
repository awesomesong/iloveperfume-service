import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { pickRandomProvider } from "@/lib/ai/providers";

const requestSchema = z.object({
  sessionId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const sessionId = parsed.data.sessionId ?? randomUUID();

  const conversation = await prisma.conversation.create({
    data: {
      sessionId,
      assignedProvider: pickRandomProvider(),
    },
  });

  return NextResponse.json({ id: conversation.id, sessionId: conversation.sessionId });
}
