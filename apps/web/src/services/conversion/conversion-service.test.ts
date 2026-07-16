import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();
const createMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recommendation: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
    clickEvent: {
      create: (...args: unknown[]) => createMock(...args),
    },
  },
}));

const { conversionService } = await import("./conversion-service");

beforeEach(() => {
  findUniqueMock.mockReset();
  createMock.mockReset();
});

describe("conversionService.recordClick", () => {
  it("recommendationId가 실제로 존재하면 ClickEvent를 생성한다", async () => {
    findUniqueMock.mockResolvedValue({ id: "rec1" });
    createMock.mockResolvedValue({ id: "click1", recommendationId: "rec1" });

    const result = await conversionService.recordClick("rec1");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "rec1" },
      select: { id: true },
    });
    expect(createMock).toHaveBeenCalledWith({ data: { recommendationId: "rec1" } });
    expect(result).toEqual({ id: "click1", recommendationId: "rec1" });
  });

  it("존재하지 않는 recommendationId면 ClickEvent를 생성하지 않고 null을 반환한다", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await conversionService.recordClick("missing");

    expect(createMock).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
