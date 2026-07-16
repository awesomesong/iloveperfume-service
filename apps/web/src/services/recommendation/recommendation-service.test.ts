import { describe, expect, it } from "vitest";
import { recommendationService } from "./recommendation-service";
import type { SearchFragrancesToolResult } from "./recommendation-service";

function fragrance(id: string) {
  return { id, name: `향수 ${id}` } as SearchFragrancesToolResult["fragrances"][number];
}

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
