import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fragrance: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

const { catalogService } = await import("./catalog-service");

beforeEach(() => {
  findManyMock.mockReset();
  findManyMock.mockResolvedValue([]);
});

describe("catalogService.searchFragrances", () => {
  it("discontinued 향수는 필터 없이도 항상 제외한다", async () => {
    await catalogService.searchFragrances();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ discontinued: false }),
      }),
    );
  });

  it("필터가 없으면 discontinued 제외 외에는 조건을 추가하지 않는다", async () => {
    await catalogService.searchFragrances();

    expect(findManyMock).toHaveBeenCalledWith({
      where: { discontinued: false },
      take: 5,
    });
  });

  it("gender, family는 등호 조건으로 변환한다", async () => {
    await catalogService.searchFragrances({ gender: "UNISEX", family: "우디" });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { discontinued: false, gender: "UNISEX", family: "우디" },
      take: 5,
    });
  });

  it("moodTags, occasionTags는 hasSome 조건으로 변환한다", async () => {
    await catalogService.searchFragrances({
      moodTags: ["은은한"],
      occasionTags: ["데이트", "오피스"],
    });

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        discontinued: false,
        moodTags: { hasSome: ["은은한"] },
        occasionTags: { hasSome: ["데이트", "오피스"] },
      },
      take: 5,
    });
  });

  it("빈 배열 태그는 조건에서 제외한다", async () => {
    await catalogService.searchFragrances({ moodTags: [], occasionTags: [] });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { discontinued: false },
      take: 5,
    });
  });

  it("limit을 지정하면 take에 반영하고, 기본값은 5다", async () => {
    await catalogService.searchFragrances({ limit: 10 });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });
});
