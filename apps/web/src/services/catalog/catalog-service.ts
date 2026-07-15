import { prisma } from "@/lib/prisma";

export type SearchFragrancesFilters = {
  gender?: "MALE" | "FEMALE" | "UNISEX";
  family?: string;
  moodTags?: string[];
  occasionTags?: string[];
  limit?: number;
};

const DEFAULT_LIMIT = 5;

// discontinued 향수는 항상 제외 — 카탈로그가 최신 판매 상품만 추천 대상이 되게 함.
// (Recommendation.fragranceSnapshotJson이 과거 추천의 스냅샷을 별도로 보존하므로
// 여기서 discontinued를 제외해도 지난 추천 기록은 훼손되지 않는다.)
async function searchFragrances(filters: SearchFragrancesFilters = {}) {
  const { gender, family, moodTags, occasionTags, limit = DEFAULT_LIMIT } = filters;

  return prisma.fragrance.findMany({
    where: {
      discontinued: false,
      ...(gender ? { gender } : {}),
      ...(family ? { family } : {}),
      ...(moodTags && moodTags.length > 0 ? { moodTags: { hasSome: moodTags } } : {}),
      ...(occasionTags && occasionTags.length > 0
        ? { occasionTags: { hasSome: occasionTags } }
        : {}),
    },
    take: limit,
  });
}

export const catalogService = {
  searchFragrances,
};
