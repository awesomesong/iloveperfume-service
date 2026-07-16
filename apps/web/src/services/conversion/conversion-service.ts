import { prisma } from "@/lib/prisma";

// 존재하지 않는 recommendationId로 클릭이 기록되지 않도록 먼저 확인한다 —
// ClickEvent는 클릭 전환율(MVP 성공 지표)의 원천 데이터라 무결성이 중요하다.
async function recordClick(recommendationId: string) {
  const recommendation = await prisma.recommendation.findUnique({
    where: { id: recommendationId },
    select: { id: true },
  });
  if (!recommendation) return null;

  return prisma.clickEvent.create({
    data: { recommendationId },
  });
}

export const conversionService = {
  recordClick,
};
