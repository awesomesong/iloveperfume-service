import { prisma } from "@/lib/prisma";
import type { catalogService } from "@/services/catalog/catalog-service";

type Fragrance = Awaited<ReturnType<typeof catalogService.searchFragrances>>[number];

export type SearchFragrancesToolResult = {
  fragrances: Fragrance[];
};

export type RecommendationGuardResult =
  | { verified: true; fragrance: Fragrance }
  | { verified: false };

// AI가 추천한 fragranceId는 반드시 같은 턴에서 searchFragrances 도구가 실제로
// 반환한 결과 안에 있어야 한다 — 없으면 환각으로 간주하고 추천을 버린다.
// (CLAUDE.md 도메인 경계 규칙, 이 프로젝트에서 가장 중요한 런타임 검증)
function verifyRecommendedFragrance(
  fragranceId: string,
  toolResults: SearchFragrancesToolResult[],
): RecommendationGuardResult {
  const fragrance = toolResults
    .flatMap((result) => result.fragrances)
    .find((candidate) => candidate.id === fragranceId);

  return fragrance ? { verified: true, fragrance } : { verified: false };
}

export type CreateRecommendationInput = {
  conversationId: string;
  messageId: string;
  fragrance: Fragrance;
  reasonText: string;
  modelProvider: string;
  modelId: string;
};

// fragranceSnapshotJson은 가드레일을 통과한 시점의 fragrance 객체를 그대로 저장한다 —
// 카탈로그가 나중에 바뀌어도 사용자가 그 순간 본 화면을 재현하기 위함(CLAUDE.md 도메인 규칙).
async function createRecommendation(input: CreateRecommendationInput) {
  const { conversationId, messageId, fragrance, reasonText, modelProvider, modelId } = input;

  return prisma.recommendation.create({
    data: {
      conversationId,
      messageId,
      fragranceId: fragrance.id,
      fragranceSnapshotJson: fragrance,
      disclosure: fragrance.disclosureText,
      reasonText,
      modelProvider,
      modelId,
    },
  });
}

export const recommendationService = {
  verifyRecommendedFragrance,
  createRecommendation,
};
