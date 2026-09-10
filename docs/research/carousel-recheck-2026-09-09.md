# 캐러셀 재검증: Embla를 공통 기본으로 권장

2026-09-09. 사용자 표현 “엠버”는 대화상 Embla Carousel로 해석했습니다.

## 결론

**공통 기본은 Embla Carousel 8.6.0 계열로 변경하는 것을 권장합니다.** 기업형·상품·후기·사진 중심 테마에서는 작은 React 연결 코드, 스타일을 직접 소유하는 구조, shadcn과의 일관성이 폭넓은 내장 효과보다 우선입니다. 앞선 Swiper 우선안은 기능 폭을 우선했으며 실제 배포 용량을 확인하지 않은 추천이었습니다.

Swiper는 3D 전환·내장 Zoom·Virtual 등 구체적 요구가 생긴 테마에서만 다시 비교합니다. 공통 기본에 두 엔진을 모두 넣지 않습니다. 동일 요소의 transform을 Embla와 Motion이 동시에 제어하지 않도록 슬라이드 이동과 내부 콘텐츠 효과를 분리합니다.

이번 결과는 조사·빌드 크기 측정·라이선스 확인입니다. 테마에 설치하거나 G7 편집·공개 화면에서 동작을 검증한 결과가 아닙니다.

## 최신 상태와 선택 근거

- npm registry 직접 조회: Embla core/react/autoplay/fade의 `latest`는 **8.6.0**, 게시일 2025-04-04. `next`는 **9.0.0-rc03**입니다.
- GitHub 공개 API: Embla RC03은 2026-08-21, RC02는 2026-04-10에 배포됐습니다. 안정판 배포 간격은 길지만 후속 개발은 진행 중입니다. RC를 판매 테마의 기본 안정판으로 쓰지 않습니다. [Embla RC03](https://github.com/davidjerleke/embla-carousel/releases/tag/v9.0.0-rc03), [안정판](https://github.com/davidjerleke/embla-carousel/releases/tag/v8.6.0).
- Swiper `latest`는 **14.2.0**, npm 게시일 2026-08-26입니다. 현재도 유지보수되는 제품이며 오래됐다는 이유로 배제하는 것이 아닙니다. [Swiper 14.2.0](https://github.com/nolimits4web/swiper/releases/tag/v14.2.0).
- [현재 shadcn Carousel](https://ui.shadcn.com/docs/components/carousel)은 Embla를 사용하며 옵션·이벤트·플러그인을 노출합니다. 현대 React/Tailwind 컴포넌트 생태계에 실제 채택된 근거입니다. 시장 점유율 1위 또는 가장 빠른 성장이라는 통계는 조사하지 않았습니다.
- Embla React 8.6.0은 React 19 peer 범위를 선언합니다. core와 reactive-utils에 의존하며 해당 core/utils는 추가 dependencies가 없습니다. 선택한 React 훅 경로에 ReactDOM 기반 Dialog를 추가하지 않으므로 앞선 Radix `flushSync` 문제와는 별개입니다. 그래도 G7 런타임 실증은 필요합니다.
- 최신 Embla 사이트의 기능을 8.6.0에 그대로 대입하지 않습니다. 플러그인은 core와 호환되는 동일 버전 계열로 고정합니다.

## 직접 빌드한 용량

환경: Node 26.7.0, Vite 7.3.6, minifier esbuild, ES2020, production, IIFE, sourcemap 없음. React는 양쪽 모두 external입니다. gzip level 9로 각 출력 파일을 압축해 합산했습니다. 단위는 **십진 KB(1KB=1,000 bytes)**입니다.

| 포함 경로 | 최소화 JS | gzip JS | gzip 기본/모듈 CSS | gzip 합계 |
|---|---:|---:|---:|---:|
| Embla React | 19.87KB | 8.17KB | 미포함 | 8.17KB |
| Embla React + Autoplay | 22.17KB | 8.92KB | 미포함 | 8.92KB |
| Embla React + Autoplay + Fade | 25.02KB | 9.93KB | 미포함 | 9.93KB |
| Swiper React core | 80.39KB | 24.88KB | 1.12KB | 26.00KB |
| Swiper + Navigation/Pagination/A11y/Autoplay | 103.31KB | 31.51KB | 2.18KB | 33.69KB |
| 위 Swiper 구성 + EffectFade | 106.46KB | 32.59KB | 2.23KB | 34.82KB |

이는 **선택 export를 유지한 라이브러리 의존성 번들**입니다. 제품 화면을 만들거나 동일한 조작 UI 전체를 구현한 시험은 아닙니다. Embla에는 화살표·페이지 표시·스타일·접근성 공통 UI가 추가돼야 하며, shadcn 래퍼와 Lucide도 이 수치에 없습니다. Swiper 선택 구성에는 해당 내장 모듈이 들어갑니다. 따라서 9.93 대 34.82를 동일 기능 완제품의 차이로 광고하지 않습니다.

비슷한 기본 React 경로의 JS만 비교하면 Embla가 약 67% 작습니다. 이것이 실행속도·프레임률·메모리·LCP가 67% 개선된다는 뜻은 아닙니다. 이미지 비용과 실제 페이지의 나머지 코드는 별도입니다. 이번 측정에서는 Swiper 전체 bundle을 넣고 Embla 최소 core와 비교하는 방식도 사용하지 않았습니다.

npm 압축 해제 크기는 Embla core 489,743B + React 50,629B, Swiper 3,733,419B입니다. 타입·map·다양한 배포 형식과 지원 파일이 포함된 설치 디스크 크기이며 브라우저 전송량이나 원본 코드 LOC가 아닙니다. repo 전체 크기만으로 제품 성능을 판단하지 않습니다.

원본: [결과 JSON](carousel-audit-2026-09-09/results.json), [버전·게시일·무결성](carousel-audit-2026-09-09/registry.json), [측정 스크립트](carousel-audit-2026-09-09/measure.mjs).

## 필요한 기능과 남는 작업

| 요구 | Embla 기반 처리 |
|---|---|
| 제품·후기 카드 스와이프 | React 훅과 공통 CSS/버튼 |
| 자동 재생 | 8.6.0 Autoplay 선택 포함, 정지 조작·포커스 정책 적용 |
| 히어로 페이드 | 8.6.0 Fade 선택 포함 |
| 썸네일과 메인 사진 연결 | 공개 API로 두 캐러셀 동기화, 공통 컴포넌트로 한 번 구현 |
| 사진 확대 | 앞서 선정한 PhotoSwipe와 연결 |
| 반응형 크기·간격 | Tailwind 토큰과 CSS 기반 |
| 키보드·ARIA·현재 슬라이드 표시 | 공통 UI에서 작성하고 검증; core 설치만으로 완료로 판정하지 않음 |
| 편집기 | 항목 선택/수정 중 자동 재생과 드래그 충돌 제어, 추가·삭제 후 갱신 |

스타일과 일부 조작 코드를 직접 소유하는 비용은 있습니다. 다만 공통 패키지에서 한 번 작성해 테마별로 재사용할 이번 구조에는 적합합니다. 단순한 가로 목록에는 CSS overflow/scroll snap만으로 충분한지도 먼저 판단합니다.

## 저작권·재배포 확인

확인 범위: Embla core, React wrapper, reactive-utils, Autoplay, Fade **8.6.0** 및 Swiper **14.2.0**.

| 항목 | 확인 결과 |
|---|---|
| 라이선스 | 전부 package.json에 MIT 명시. Embla v8.6.0 태그의 LICENSE와 Swiper 배포 LICENSE 원문 확인 |
| 유료 테마에 포함·판매 | MIT가 수정·배포·판매를 허용하므로 고지 보존 조건으로 가능 |
| 고객의 상업용 홈페이지 | 사용 가능, MIT 원문에 사이트별 요금·로열티 조건 없음 |
| 필수 보존 | 원저작권 고지와 허가 고지를 포함한 LICENSE 원문을 설치 ZIP·개발 소스 전달물에 포함 |
| 저작자 | Embla: David Jerleke. Swiper: Vladimir Kharlampidi. JW SOFT/sirsoft로 대체하면 안 됨 |
| 별도 확인 대상 | 제3자 플러그인·유료 블록·데모 사진·로고는 라이브러리 MIT의 적용 대상으로 자동 간주하지 않음 |

[Embla v8.6.0 원문](https://raw.githubusercontent.com/davidjerleke/embla-carousel/v8.6.0/LICENSE), [Swiper 원문](https://raw.githubusercontent.com/nolimits4web/swiper/master/LICENSE).

실제 내려받은 Embla 8.6.0 패키지 다섯 개는 루트에 LICENSE 원문 파일이 없고 README에 링크가 있습니다. npm 패키지만 복사하는 것으로 고지 동봉을 보장하지 못합니다. 이번 조사에서 [해당 태그의 LICENSE 사본](carousel-audit-2026-09-09/Embla-8.6.0-LICENSE.txt)과 SHA-256을 확보했습니다. 상세는 [라이선스 점검 기록](carousel-audit-2026-09-09/license-check.json)에 있습니다. 이는 조사 증거이며 실제 테마 ZIP 동봉은 도입 단계에 구현할 항목입니다.

## 권장 규약 수정

기본 캐러셀은 Embla 8.6.0, 선택 플러그인은 같은 계열의 Autoplay·Fade입니다. 필요한 경우만 추가합니다. 공통 UI 이름과 데이터 계약은 외부 패키지의 이름에 묶지 않고 Carousel·Gallery 수준으로 관리합니다. Swiper는 특정 테마의 검증된 고급 요구가 있을 때만 별도 채택합니다.

각 테마에 필요한 코드·스타일·고지를 내장하며 CDN은 사용하지 않습니다. 공개 화면과 편집기의 반응형·키보드·동작 축소·재마운트·항목 변경을 통과한 뒤 설치 스펙을 확정합니다.

## 재현

격리 임시 폴더에 `carousel-audit-2026-09-09`의 package.json, package-lock.json, measure.mjs를 복사합니다. `npm ci --ignore-scripts --no-audit --no-fund`로 잠긴 조사 의존성을 준비합니다. 실제 측정에 사용한 Vite 7.3.6의 ESM entry 절대 경로를 `JW_AUDIT_VITE_ENTRY`로 전달하고 `node measure.mjs`를 실행합니다. 이 환경 변수는 개발 측정 전용이며 고객 실행 의존성이 아닙니다. 결과 파일을 덮어쓰므로 증거 원본 폴더에서 바로 실행하지 않습니다.

첫 시험은 임시 package.json의 name/CSS 파일명 누락으로 Swiper CSS 출력 단계에서 실패했습니다. 측정 설정에 `cssFileName`을 지정한 뒤 전체 여섯 구성을 다시 빌드해 표의 결과를 얻었습니다. 제품 코드와 설치 의존성은 변경하지 않았습니다.
