import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  buildFallbackChain,
  modelIdFor,
  resolveModel,
  type ProviderId,
} from "@/lib/ai/providers";
import { hasCommittedContent } from "@/lib/ai/stream-with-fallback";
import { searchFragrancesTool } from "@/lib/ai/tools/search-fragrances-tool";
import { recommendFragranceTool } from "@/lib/ai/tools/recommend-fragrance-tool";
import { recommendationService } from "@/services/recommendation/recommendation-service";
import type { SearchFragrancesToolResult } from "@/services/recommendation/recommendation-service";

const requestSchema = z.object({
  text: z.string().min(1),
});

const SYSTEM_PROMPT = `당신은 향수 추천 챗봇이다. 사용자의 취향(성별, 계열, 무드, 상황)을 파악해 향수를 추천한다.

규칙:
1. 향수를 추천하기 전에 반드시 searchFragrances 도구를 먼저 호출해서 카탈로그를 검색한다.
2. 추천을 확정할 때는 recommendFragrance 도구를 호출한다. fragranceId는 반드시 searchFragrances가
   방금 반환한 결과 안에 있는 값만 사용한다 — 없는 id를 지어내면 안 된다.
3. searchFragrances 결과에 사용자 취향에 맞는 향수가 없으면 recommendFragrance를 호출하지 말고,
   없다고 솔직하게 답한다.
4. 한국어로, 친근하지만 과장하지 않은 톤으로 답한다.`;

const tools = {
  searchFragrances: searchFragrancesTool,
  recommendFragrance: recommendFragranceTool,
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;

  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) {
    return NextResponse.json({ error: "대화를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.message.create({
    data: {
      conversationId,
      role: "user",
      parts: [{ type: "text", text: parsed.data.text }],
    },
  });

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  const modelMessages = await convertToModelMessages(
    history.map((message) => ({
      role: message.role,
      parts: message.parts,
    })) as Parameters<typeof convertToModelMessages>[0],
  );

  const chain = buildFallbackChain(conversation.assignedProvider as ProviderId);
  const assistantMessageId = randomUUID();

  for (const provider of chain) {
    const modelId = modelIdFor(provider);

    const result = streamText({
      model: resolveModel(provider),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools,
      // 기본값(1스텝)이면 searchFragrances 결과를 본 뒤 recommendFragrance를 호출하거나
      // 텍스트로 답할 기회 자체가 없다 — 검색→추천 확정까지 이어지도록 여유를 둔다.
      stopWhen: stepCountIs(5),
      onFinish: async (event) => {
        const searchResults: SearchFragrancesToolResult[] = [];
        let recommendCall: { fragranceId: string; reasonText: string } | undefined;

        for (const toolResult of event.toolResults) {
          if (toolResult.toolName === "searchFragrances") {
            searchResults.push(toolResult.output as SearchFragrancesToolResult);
          } else if (toolResult.toolName === "recommendFragrance") {
            recommendCall = toolResult.output as { fragranceId: string; reasonText: string };
          }
        }

        if (!recommendCall) return;

        const guard = recommendationService.verifyRecommendedFragrance(
          recommendCall.fragranceId,
          searchResults,
        );
        if (!guard.verified) return; // 환각 방지 가드레일 — "결과 없음"으로 처리(CLAUDE.md)

        await recommendationService.createRecommendation({
          conversationId,
          messageId: assistantMessageId,
          fragrance: guard.fragrance,
          reasonText: recommendCall.reasonText,
          modelProvider: provider,
          modelId,
        });
      },
    });

    // 첫 콘텐츠가 나오기 전까지만 폴백 허용 — 이미 스트리밍이 시작된 뒤 실패하면
    // 그대로 에러로 끝난다(ADR-0001, 실시간 스트리밍 UX를 지키기 위한 절충).
    // 인증 실패 등은 스트림 파트가 아니라 예외로 던져지는 경우도 있어 try/catch로 같이 잡는다.
    const committed = await hasCommittedContent(result.fullStream).catch(() => false);
    if (!committed) continue;

    return result.toUIMessageStreamResponse({
      onFinish: async ({ messages }) => {
        const assistantMessage = messages[messages.length - 1];
        await prisma.message.create({
          data: {
            id: assistantMessageId,
            conversationId,
            role: "assistant",
            parts: assistantMessage.parts as unknown as Prisma.InputJsonValue,
          },
        });
      },
    });
  }

  return NextResponse.json(
    { error: "모든 모델이 응답에 실패했습니다. 잠시 후 다시 시도해주세요." },
    { status: 502 },
  );
}
