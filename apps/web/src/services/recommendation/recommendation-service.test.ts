import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchFragrancesToolResult } from "./recommendation-service";

const createMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recommendation: {
      create: (...args: unknown[]) => createMock(...args),
    },
  },
}));

const { recommendationService } = await import("./recommendation-service");

function fragrance(id: string) {
  return { id, name: `향수 ${id}` } as SearchFragrancesToolResult["fragrances"][number];
}

beforeEach(() => {
  createMock.mockReset();
});

describe("recommendationService.verifyRecommendedFragrance", () => {
  it("도구 호출 결과 안에 fragranceId가 있으면 검증에 통과하고 그 향수를 반환한다", () => {
    const toolResults: SearchFragrancesToolResult[] = [
      { fragrances: [fragrance("f1"), fragrance("f2")] },
    ];

    const result = recommendationService.verifyRecommendedFragrance("f2", toolResults);

    expect(result).toEqual({ verified: true, fragrance: fragrance("f2") });
  });

  it("여러 번의 도구 호출 결과에 걸쳐 있어도 찾아낸다", () => {
    const toolResults: SearchFragrancesToolResult[] = [
      { fragrances: [fragrance("f1")] },
      { fragrances: [fragrance("f2"), fragrance("f3")] },
    ];

    const result = recommendationService.verifyRecommendedFragrance("f3", toolResults);

    expect(result).toEqual({ verified: true, fragrance: fragrance("f3") });
  });

  it("도구 호출 결과 안에 없는 fragranceId는 환각으로 간주해 검증에 실패한다", () => {
    const toolResults: SearchFragrancesToolResult[] = [{ fragrances: [fragrance("f1")] }];

    const result = recommendationService.verifyRecommendedFragrance("hallucinated-id", toolResults);

    expect(result).toEqual({ verified: false });
  });

  it("도구 호출이 아예 없었으면(빈 검색 결과) 항상 검증에 실패한다", () => {
    const result = recommendationService.verifyRecommendedFragrance("f1", []);

    expect(result).toEqual({ verified: false });
  });

  it("도구 호출은 있었지만 검색 결과가 빈 배열이면 검증에 실패한다", () => {
    const toolResults: SearchFragrancesToolResult[] = [{ fragrances: [] }];

    const result = recommendationService.verifyRecommendedFragrance("f1", toolResults);

    expect(result).toEqual({ verified: false });
  });
});

describe("recommendationService.createRecommendation", () => {
  it("fragrance 스냅샷과 disclosure를 채워서 prisma.recommendation.create를 호출한다", async () => {
    const fullFragrance = {
      id: "f1",
      name: "테스트 향수",
      disclosureText: "이 링크는 제휴 링크입니다.",
    } as SearchFragrancesToolResult["fragrances"][number];
    createMock.mockResolvedValue({ id: "rec1" });

    await recommendationService.createRecommendation({
      conversationId: "conv1",
      messageId: "msg1",
      fragrance: fullFragrance,
      reasonText: "은은하고 포근한 무드를 원하셔서 추천했어요.",
      modelProvider: "anthropic",
      modelId: "claude-sonnet-5",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        conversationId: "conv1",
        messageId: "msg1",
        fragranceId: "f1",
        fragranceSnapshotJson: fullFragrance,
        disclosure: "이 링크는 제휴 링크입니다.",
        reasonText: "은은하고 포근한 무드를 원하셔서 추천했어요.",
        modelProvider: "anthropic",
        modelId: "claude-sonnet-5",
      },
    });
  });
});
