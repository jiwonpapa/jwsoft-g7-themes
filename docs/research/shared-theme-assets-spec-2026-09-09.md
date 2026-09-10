# 여러 테마의 공통 UI·외부 애셋 도입 조사

작성: 2026-09-09. 상태: **공통 스택 확정과 하네스 1차 반영**. 인터랙티브 UI의 G7 런타임 호환성은 아직 검증 전입니다.

## 결론

외부 라이브러리를 공통 소스에서 관리하고, 각 테마가 필요한 기능을 선택해 자기 설치 ZIP에 빌드 결과를 포함합니다. 고객 서버에서 npm 실행·CDN·공통 플러그인 별도 설치를 요구하지 않습니다.

권장: **Tailwind CSS 4 + shadcn/ui(Radix 기반 우선 검증) + Lucide + Embla + Motion**. 캐러셀은 [추가 실측·라이선스 재검증](carousel-recheck-2026-09-09.md)에 따라 Embla 우선으로 수정했습니다. Masonry와 PhotoSwipe는 갤러리 기능에 선택 포함합니다. 공통 기반의 가칭은 `JW Theme Foundation`입니다. 별도 저장소나 서버를 먼저 만들 필요 없이 현재 테마 저장소의 공통 패키지로 시작합니다.

공통화 대상은 UI 동작·토큰 이름·편집 규칙·의존성·배포 방식입니다. 테마마다 섹션 구성·색·여백·타이포그래피·사진 표현은 달라집니다. 라이브러리 도입으로 업종별 디자인과 G7 연결 작업까지 없어지는 것은 아닙니다.

## 현재 코드에서 확인한 제약

- 테마 `themes/business/jw-business-01`: 중앙 하네스로 Tailwind 4와 DOMPurify를 정확 버전으로 고정했고 React 19 개발 의존성과 Vite IIFE 빌드 기반을 유지합니다. Lucide·Embla·Motion 등은 실제 사용 테마가 기능을 선언할 때만 포함합니다.
- 테마 `vite.config.ts`: 현재 `react`만 external 처리합니다. 외부 UI를 넣으려면 ReactDOM·JSX runtime의 실제 import까지 검사해야 합니다.
- G7 `/Users/neojins/workspace/gnuboard7/package.json`: Tailwind 4·React 19 계열을 선언합니다. 이것만으로 모든 테마 클래스가 G7 CSS에 포함된다고 보장할 수 없습니다.
- G7 `resources/js/core/template-engine/G7CoreGlobals.ts`의 `initReactGlobals`: React·ReactDOM·ReactJSXRuntime을 공개합니다. ReactDOM은 `react-dom/client`에 `createPortal`과 배칭 함수를 더한 형태이며 이 초기화 코드에 `flushSync` 노출은 없습니다.
- [Radix 원본](https://github.com/radix-ui/primitives/blob/main/packages/react/primitive/src/primitive.tsx)은 사용자 정의 이벤트 전달 시 `ReactDOM.flushSync`를 호출합니다. 따라서 현재 전역 객체에 단순 연결하는 것으로 호환된다고 판정할 수 없습니다. 선택 버전과 실제 G7 조합으로 확인하고, 필요하면 공개 호스트 계약 보완을 요구해야 합니다. no-op 대체나 ReactDOM 사본 번들로 감추지 않습니다.
- G7 테마의 `components.json`과 [shadcn CLI 설정 파일](https://ui.shadcn.com/docs/installation/manual)이 이름은 같지만 형식은 다릅니다. shadcn CLI는 공통 UI 개발 폴더에서만 사용하고 G7 manifest를 덮어쓰지 않습니다.

위 내용은 현재 로컬 코드와 공식 자료의 대조 결과입니다. 하네스 패키지 설치·빌드·독립 ZIP은 실행했지만 G7 수정과 인터랙티브 UI 브라우저 실증은 하지 않았습니다.

## Tailwind 기반 UI 비교

| 후보 | 장점 | 이 제품에서의 부담 | 권고 |
|---|---|---|---|
| shadcn/ui + Radix | 컴포넌트 소스를 보유해 공통 규약에 맞게 수정 가능. Tailwind 4·React 19 대응. 키보드·포커스 동작 기반 제공 | 가져온 소스의 업데이트를 직접 반영해야 함. G7 ReactDOM 계약·Portal·ref 확인 필요 | 우선 검증 대상 |
| shadcn/ui + Base UI | 같은 소스 소유 방식으로 다른 headless 기반 선택 가능 | Radix와 혼용하면 행동·의존성 관리가 복잡해짐. G7 호환 실증은 별도 필요 | Radix 비교 대상, 자동 대체하지 않음 |
| Headless UI | Tailwind와 사용하기 좋은 무스타일 React UI | 완성된 스타일·변형을 조합하는 작업이 더 남음 | 소규모 UI 기반의 대안 |
| daisyUI | CSS 컴포넌트와 테마 변수로 빠르게 구성. prefix/root 설정 제공 | 복잡한 상호작용·편집 노드 계약을 별도로 설계해야 함 | 단순 사이트에는 적합, 전체 테마 공통 1순위는 아님 |
| Flowbite React | Tailwind 기반의 완성 UI와 테마 설정 제공 | 자체 UI 체계를 우리 디자인 규격과 조정해야 함 | 빠른 표준형 사이트의 대안 |

이 순위는 이 저장소의 편집 가능성·여러 업종 디자인·개별 패키징 요구를 기준으로 한 판단입니다. 인기나 속도 실측 순위가 아닙니다.

shadcn은 전체 사이트 프레임워크가 아니라 가져와 관리하는 UI 소스 기반으로 사용합니다. G7이 라우팅·데이터·렌더링을 소유하므로 Next.js 서버나 별도 React 앱을 설치하지 않습니다. shadcn 기본 스타일을 모든 업종의 최종 디자인으로 고정하지 않습니다.

근거: [shadcn Tailwind 4/React 19](https://ui.shadcn.com/docs/tailwind-v4), [CLI 기반 선택](https://ui.shadcn.com/docs/cli), [Radix 접근성·합성](https://www.radix-ui.com/primitives/docs/overview/introduction), [Base UI](https://base-ui.com/react/overview/quick-start), [Headless UI](https://headlessui.com/), [daisyUI 설정](https://daisyui.com/docs/config/), [Flowbite React](https://flowbite-react.com/).

## 기능별 라이브러리

| 기능 | 우선 후보 | 공통화할 내용 |
|---|---|---|
| CSS·반응형·디자인 토큰 | Tailwind CSS 4 | 컴파일된 CSS, 공통 토큰 이름, 테마별 값, 클래스·변수 충돌 방지 |
| 버튼·입력·탭·아코디언·메뉴·Dialog | shadcn/ui + 단일 headless 기반 | 허용 속성, 상태, 포커스, Portal, 편집 속성 전달 |
| 아이콘 | Lucide | 필요한 SVG만 정적 import, 크기·선 굵기·색·접근성 이름 규칙 |
| 히어로·상품·후기 슬라이더 | Embla | 공통 탐색 UI·정지·반응형 규칙, Autoplay/Fade 선택 포함, 썸네일 연결 |
| 등장·전환·순차 표시·패럴랙스 | Motion | 효과 preset, 속도·강도 범위, reduced motion, 정리 동작 |
| 벽돌형 갤러리 | Masonry (`masonry-layout`) | 이미지 로딩/리사이즈 후 배치, React 수명주기 연결, 읽기 순서 |
| 사진 확대·제품 갤러리 뷰어 | PhotoSwipe | 이미지 크기·설명·확대·닫기·포커스 복귀 |
| 한국어 기본 글꼴 | Pretendard | WOFF2와 CSS 로컬 내장, 한글 범위·굵기·fallback |

### 슬라이더 선택

[재검증 보고](carousel-recheck-2026-09-09.md)에 따라 **Embla Carousel 8.6.0**을 기본으로 권장합니다. 동일 Vite/IIFE 조건에서 React 기본 JS gzip은 Embla 8.17KB, Swiper 24.88KB였으며 Swiper 기본 CSS는 1.12KB가 더 필요했습니다. Embla 자체 조작 UI·스타일은 별도이므로 완성 화면 전체 성능 차이로 해석하지 않습니다.

[shadcn Carousel](https://ui.shadcn.com/docs/components/carousel)이 실제 Embla를 사용하며, 우리가 UI 소스와 디자인을 공통 관리하는 구조에 잘 맞습니다. Autoplay와 Fade는 필요할 때 같은 버전 계열로 추가합니다. Embla 9 RC는 기본 안정판으로 채택하지 않습니다.

[Swiper](https://swiperjs.com/react)는 내장 Zoom·Virtual·3D 효과 등 구체적 고급 요구가 있는 테마에서만 재검토합니다. 두 엔진을 공통 기본에 중복 포함하지 않습니다. 버전·실측·저작권 원문 동봉 조건은 재검증 보고를 따릅니다.

### 벽돌 레이아웃

상품 비교 목록은 일반 CSS Grid를 기본으로 하고, 높이가 다른 사례·포트폴리오 사진에 Masonry를 적용합니다. CSS columns는 간단한 세로 흐름 표현으로 쓸 수 있지만 실제 빈 공간 배치와 읽기 순서 요구를 동일하게 충족한다고 취급하지 않습니다.

[Masonry](https://masonry.desandro.com/)는 npm 설치와 Vanilla JS 초기화를 지원하며 MIT입니다. jQuery는 필요하지 않습니다. 이미지 크기를 미리 확보하고 로딩·항목 변경·컨테이너 크기 변경 후 배치를 갱신하며 unmount 시 정리합니다. 변형된 시각 순서와 키보드 이동을 함께 확인합니다.

[Isotope](https://isotope.metafizzy.co/license.html)는 필터·정렬까지 검토할 때의 별도 후보입니다. GPLv3·상업용·OEM 조건이 나뉘고 인터페이스 빌더/SDK/toolkit에는 OEM 안내가 있으므로 기본 공통 의존성으로 넣지 않습니다. 페이지 단위 목록 필터를 설치된 전체 데이터 검색처럼 표시하지 않습니다.

### 패럴랙스·효과

[Motion](https://motion.dev/docs/react-scroll-animations)의 viewport 진입과 scroll-linked 기능으로 reveal·stagger·패럴랙스·진행 표시를 구성합니다. 단순 hover/focus는 CSS로 처리합니다. 공통 preset 예시는 `none`, `fade`, `slide-up`, `stagger`, `parallax`이며 구체적 강도와 시간은 선택 도안에서 정합니다.

[GSAP 공식 약관](https://gsap.com/community/standard-license/)은 상업용 무상 사용을 허용하지만 Webflow와 경쟁하는 시각적 애니메이션 제작 도구에 관한 제한이 있습니다. 모든 테마 사용이 금지된다는 뜻은 아닙니다. 다만 편집 기능을 제공할 이 제품에서는 MIT인 Motion을 공통 기본으로 선택하고, GSAP은 고급 연출 요구와 해당 사용 범위가 명확해질 때 별도 검토하는 것이 합리적입니다.

[Lenis](https://github.com/darkroomengineering/lenis)는 부드러운 스크롤을 위한 선택 후보이며 패럴랙스 자체에 필수는 아닙니다. 공식 문서에 iframe·중첩 스크롤·Safari 관련 제약이 있어 기본 스크롤을 대체하지 않습니다. 편집 화면에서는 효과·자동 재생·스크롤 보정을 멈추고 내용을 바로 선택할 수 있게 합니다.

[Magic UI 공개 저장소](https://github.com/magicuidesign/magicui)의 MIT 효과 소스는 필요한 것만 선별해 규약에 편입할 수 있습니다. 상용 제품의 효과 모음을 통째로 복제하거나, Motion+ 유료 컴포넌트를 오픈소스 Motion과 동일한 조건으로 취급하지 않습니다.

### 아이콘·폰트·사진

[Lucide](https://lucide.dev/)는 필요한 아이콘만 포함할 수 있습니다. JSON의 아이콘 키는 빌드 시 정해진 허용 목록으로 해석하고 전체 아이콘 동적 로더는 기본으로 쓰지 않습니다. [ISC 고지](https://lucide.dev/license)와 포함 자산의 관련 고지를 보존합니다.

[Pretendard](https://github.com/orioncactus/pretendard)는 SIL OFL로 상업 사용·재배포를 안내합니다. 배포된 웹폰트와 해당 CSS를 함께 로컬로 가져오고 CSS 안의 하위 폰트 URL도 검사합니다. 데모 문구에 나오는 글자만 남기는 서브셋은 고객의 새 한국어 콘텐츠를 보장하지 못합니다.

[PhotoSwipe](https://photoswipe.com/getting-started/)는 사전 이미지 너비·높이를 요구합니다. 레이아웃 데이터 팩의 이미지 계약에 URL뿐 아니라 width·height·alt·caption·원본/썸네일 관계를 포함하도록 맞춥니다. 이미지 크기와 참조는 설치 후 실제 미디어로 해석되어야 합니다.

## 공통 규약 권장안

1. **원본 중앙 관리, 배포 개별 내장:** 현재 저장소 `packages/foundation`에 UI·토큰·외부 기능 연결 코드를 관리합니다. G7 공개 연결은 `packages/g7-adapter`, 재배포 원본은 `packages/assets`로 구분합니다. 실제 필요가 생긴 파일부터 작성하며 빈 패키지를 늘리지 않습니다.
2. **각 테마가 채택 버전과 기능을 명시:** 테마 A에서 쓰지 않는 Masonry·PhotoSwipe·고급 효과는 A의 배포물에서 제외합니다. 편집기에서 추가할 수 있다고 선언한 기능은 처음부터 해당 테마 ZIP에 포함합니다.
3. **CDN 금지 범위:** JS·CSS·폰트·아이콘·효과 JSON·이미지·WASM 등 테마 실행에 필요한 모든 자산을 자체 호스팅합니다. 실행 중 npm/CDN 조회·원격 registry·외부 폰트 import·라이선스 서버 접속에 의존하지 않습니다. G7 호스트 런타임만 공개 계약으로 공유하며 React 사본은 넣지 않습니다.
4. **CSS 격리:** Tailwind prefix와 `--jw-*` 의미 토큰을 사용하고 루트 범위로 적용합니다. 전역 Preflight를 중복 주입하지 않습니다. 필요한 reset은 테마 범위에서 정의합니다. prefix만으로 전역 reset·Portal·제3자 CSS까지 격리된다고 판단하지 않습니다. [Tailwind Preflight와 prefix](https://tailwindcss.com/docs/preflight).
5. **편집값과 빌드 연결:** 공통 TSX뿐 아니라 JSON 레이아웃과 editor-spec의 허용 변형도 CSS 입력으로 관리합니다. 설치 데이터에서 클래스 문자열을 무한 생성하지 않습니다. 고정 variant와 CSS 변수로 처리하고 허용 클래스는 빌드에 포함합니다. [Tailwind 소스 탐지](https://tailwindcss.com/docs/detecting-classes-in-source-files).
6. **G7 편집 유지:** 라이브러리는 공개 노드 뒤의 동작 구현으로 사용합니다. 슬라이드·갤러리 항목·제목·링크·사진을 편집 가능한 구조로 노출하고 하나의 불투명한 HTML 덩어리로 저장하지 않습니다. 변경·Undo·저장은 G7에 남깁니다. Portal에도 해당 테마 토큰/스타일 범위가 적용되어야 합니다.
7. **데이터팩은 콘텐츠 소유:** 팩이 Swiper나 Motion의 내부 옵션 구조에 직접 종속되지 않도록 이미지·콘텐츠 참조와 테마의 의미 있는 preset을 사용합니다. 옵션 가격·재고·주문 처리는 G7 해당 모듈 소유입니다.
8. **동작 수명 관리:** 초기화·속성 변경·재배치·해제를 공통으로 처리합니다. 같은 페이지의 여러 인스턴스와 편집기 재마운트에서 이벤트가 중복되지 않아야 합니다. 자동 재생에는 정지 조작과 포커스 정책을 둡니다. reduced motion에서는 이동·자동 재생을 제한하고 내용은 보입니다.
9. **버전·고지:** 정확한 패키지 버전과 lockfile, 가져온 UI 소스의 upstream 버전/commit, 원본 LICENSE·제3자 고지를 보관합니다. 외부 개발자를 JW SOFT나 sirsoft로 바꾸지 않습니다. 우리의 통합 코드와 외부 원저작자를 구분합니다.
10. **업데이트:** 공통 패키지 수정은 각 테마가 명시적으로 채택해 새 ZIP으로 배포합니다. 설치된 테마나 고객 콘텐츠를 자동 변경하지 않습니다. API 파괴 변경은 공통 버전과 테마 호환 표에 기록합니다.
11. **하네스 구현:** 설치·설정·검사·패키징의 본체는 TypeScript 또는 Python 모듈로 구현합니다. 큰 셸 스크립트 하네스는 금지합니다. 셸 진입점이 필요해도 단일 CLI 명령 전달만 허용하고 조건 분기·반복·JSON 처리·파일 수집·판정 로직은 넣지 않습니다.

Tailwind 4의 공식 기본 브라우저 범위는 Chrome 111+, Safari 16.4+, Firefox 128+입니다. 실제 제품 지원 범위는 선정 라이브러리·사용 CSS 기능을 합쳐 실증한 조합으로 확정합니다. [브라우저 호환성](https://tailwindcss.com/docs/compatibility).

## 패키지와 검증

현재 IIFE 방식으로 우선 검증합니다. 기능별 파일 분리/지연 로딩은 G7 공개 자산 로더가 지원하는 방식을 확인한 뒤 적용합니다. 일반 Vite 앱처럼 dynamic import가 자동으로 분할된다고 가정하지 않습니다. 현재 CSS 출력 파일명 규칙도 폰트·이미지 출력까지 처리하도록 확인해야 합니다.

설치물은 기존 manifest·layout·component/editor spec, 사전 빌드 JS/CSS, 테마 자산, 라이선스 고지를 포함합니다. 공통 소스는 개발 전달물에 해당 버전으로 포함하며 다른 테마 폴더를 참조하지 않습니다.

정확한 patch 버전과 용량은 아직 확정하지 않습니다. 선정 시점의 안정 버전을 잠그고 대표 화면을 빌드한 실제 전송량·실행 비용·이미지 로딩을 측정합니다. 프로젝트에 근거 없는 일괄 KB 기준을 만들지 않습니다.

| 도입 검증 | 완료 증거 |
|---|---|
| 공유 런타임 | IIFE 내 React 중복 없음, 모든 external export 존재, Dialog·Select·메뉴 실제 조작 |
| CSS·Portal | 공개 화면과 G7 편집기 모두 표시 정상, 관리자 CSS 오염 없음, 동적 허용 변형 표시 |
| 컴포넌트 수명 | 재편집·항목 추가/삭제·재마운트·다중 슬라이더·이미지 지연 로딩에서 정상 |
| 편집 계약 | 슬라이드/사진/텍스트 개별 선택, 변경·Undo·저장·재접속 후 유지 |
| 로컬 자산 완결성 | 다른 origin 요청 차단 후 자체 G7 origin에서 초기 로딩·기능 조작·이미지/폰트 정상, 누락 URL 0 |
| 대표 화면 | 헤더/Dialog·상품 슬라이더·사례 Masonry·사진 확대·패럴랙스를 desktop/mobile에서 확인 |
| 접근성·동작 축소 | 키보드·포커스 복귀·자동 재생 정지·reduced motion 확인 |
| 독립 설치·업데이트 | 테마 하나만 설치해 실행, 외부 공통 폴더 불필요, 기존 고객 레이아웃 보존 |

이 표는 신규 인터랙티브 UI 도입에 필요한 통합 검사 계획입니다. 중앙 버전·라이선스·CDN 금지·빌드·ZIP 검사는 [구현된 하네스](../theme-harness.md)가 담당하며, 표의 G7 편집·브라우저 항목은 아직 통과하지 않았습니다.

## 바로 다음 작업

다음은 대표 인터랙티브 컴포넌트의 G7 호환 실증과 디자인 도안 비교입니다. 중앙 스택과 하네스는 먼저 고정했으며, 대규모 테마 스타일 작업에 앞서 공유 ReactDOM과 편집기 CSS 계약을 실증해야 합니다.

## 배포 고지 근거

- [shadcn/ui MIT 안내](https://github.com/shadcn-ui/ui/blob/main/README.md)
- [Swiper MIT](https://github.com/nolimits4web/swiper/blob/master/LICENSE)
- [Motion MIT](https://github.com/motiondivision/motion/blob/main/LICENSE.md)
- [PhotoSwipe MIT](https://github.com/dimsemenov/PhotoSwipe/blob/master/LICENSE)
- Lucide·Pretendard·Masonry·GSAP·Isotope는 위 해당 절의 공식 라이선스 링크 참조.
- 유료 UI·블록·효과·사진은 개별 재배포 조건을 따릅니다. 웹사이트 제작 허용을 테마 소스 재판매 허용으로 확대하지 않습니다. Tailwind Plus 라이선스 페이지는 이번 비로그인 조회에서 로그인으로 이동해 실제 조항을 확인하지 못했으므로 도입 후보에 포함하지 않았습니다.
