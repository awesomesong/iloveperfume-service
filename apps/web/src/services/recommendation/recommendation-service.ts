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

export const recommendationService = {
  verifyRecommendedFragrance,
};
