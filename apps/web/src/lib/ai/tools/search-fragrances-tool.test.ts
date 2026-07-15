import { beforeEach, describe, expect, it, vi } from "vitest";

const searchFragrancesMock = vi.fn();

vi.mock("@/services/catalog/catalog-service", () => ({
  catalogService: {
    searchFragrances: (...args: unknown[]) => searchFragrancesMock(...args),
  },
}));

const { searchFragrancesTool } = await import("./search-fragrances-tool");

const executionOptions = { toolCallId: "call_1", messages: [] } as unknown as Parameters<
  typeof searchFragrancesTool.execute
>[1];

beforeEach(() => {
  searchFragrancesMock.mockReset();
  searchFragrancesMock.mockResolvedValue([{ id: "f1", name: "테스트 향수" }]);
});

describe("searchFragrancesTool", () => {
  it("도구 입력을 그대로 catalogService.searchFragrances에 전달한다", async () => {
    const input = { gender: "UNISEX" as const, moodTags: ["은은한"] };

    await searchFragrancesTool.execute(input, executionOptions);

    expect(searchFragrancesMock).toHaveBeenCalledWith(input);
  });

  it("catalogService의 검색 결과를 fragrances 필드로 감싸서 반환한다", async () => {
    const result = await searchFragrancesTool.execute({}, executionOptions);

    expect(result).toEqual({ fragrances: [{ id: "f1", name: "테스트 향수" }] });
  });
});
