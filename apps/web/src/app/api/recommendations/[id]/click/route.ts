import { NextResponse } from "next/server";
import { conversionService } from "@/services/conversion/conversion-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: recommendationId } = await params;

  const clickEvent = await conversionService.recordClick(recommendationId);
  if (!clickEvent) {
    return NextResponse.json({ error: "추천을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ id: clickEvent.id }, { status: 201 });
}
