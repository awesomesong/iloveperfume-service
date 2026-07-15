# CLAUDE.md

이 리포는 I Love Perfume 리뉴얼 프로젝트다. 전체 계획은 [PLAN.md](./PLAN.md), 되돌리기 비싼 결정의 근거는 `docs/adr/`를 참고한다.

## 지금 검증 중인 것

"AI 챗봇이 향수를 추천하면 사용자가 구매 링크를 클릭하는가" — 이 한 가지 가설 외에는 아직 아무것도 확정하지 않았다. 코드를 추가하기 전에 그게 이 가설 검증에 필요한지부터 확인한다.

## 워크스페이스 구조

```
apps/web        Next.js 16 앱 (Vercel). 지금은 이것 하나뿐.
```

pnpm workspace만 쓰고 packages/는 미리 쪼개지 않는다 (ADR-0000). apps/realtime(Fly.io)은 WebSocket 지속 연결이 실제로 필요한 기능이 생겼을 때만, 새 ADR과 함께 추가한다.

## 도메인 경계(Bounded Context) — 반드시 지킬 규칙

MSA로 쪼갠 게 아니라 모듈러 모놀리스(Modular Monolith)다 — 배포는 앱 하나, DB도 하나지만, 컨텍스트 간 데이터 접근은 반드시 아래 서비스 모듈을 거치게 한다.

```
Catalog ← Recommendation ← Conversation
              ↑
      Conversion/Affiliate
```

- Conversation, Recommendation, Conversion 코드에서 다른 컨텍스트의 Prisma 모델을 직접 호출하지 않는다. 반드시 그 컨텍스트의 서비스 모듈(예: `catalogService.searchFragrances()`)을 통해서만 읽는다.
- Conversation은 Conversion을 알아서는 안 된다 (의존 방향 위반).
- Recommendation은 `fragranceSnapshotJson`과 `disclosure`를 필수로 기록한다 — 카탈로그가 나중에 바뀌어도 사용자가 그 순간 본 화면과 제휴 고지 사실을 그대로 재현하기 위함.
- AI가 추천한 `fragranceId`는 반드시 그 턴의 도구 호출 결과 안에 있어야 한다. 아니면 추천을 버리고 "결과 없음"으로 처리한다(환각 방지 가드레일 — 이 프로젝트에서 가장 중요한 런타임 검증).

## 명령어

```
pnpm dev      apps/web 개발 서버
pnpm build    apps/web 빌드
pnpm lint     apps/web 린트
```

## 지금 하지 않는 것

PLAN.md 7번(재방문/장기 개인화 기능)과 8번(스케일 전환점) 섹션에 트리거 조건이 적혀 있다. 그 신호가 오기 전까지는 미리 만들지 않는다.
