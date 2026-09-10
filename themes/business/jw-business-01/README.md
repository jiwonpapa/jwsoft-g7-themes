# JW BUSINESS 01 — 일반 기업 홈페이지 테마

G7 설치 식별자는 **jwsoft-business01**, 버전은 0.1.0입니다. 기획 폴더명/상품명과 설치 식별자를 구분합니다. `jw-business-01`은 숫자로 시작하는 단어를 허용하지 않는 G7 규칙에 맞지 않아 설치 식별자로 쓰지 않습니다.

SIR 판매 근거를 따라 일반 기업 홈페이지의 공통 페이지와 여러 헤더·히어로·블록·모바일 메뉴 구성을 제공하는 첫 유료 테마입니다. 기본 데모는 전략·디지털 구축·운영개선을 제공하는 범용 B2B 기업이며 산업설비 시안은 출시 대상에서 제외했습니다.

첫 제안 A의 정돈된 조형을 유지하면서 범용 B2B 기업 데모 홈의 JSON UI, 반응형 시멘틱 CSS와 직접 생성한 이미지 10종으로 교체했습니다. 페이지·게시판 목록/상세/작성·오류 레이아웃과 헤더·히어로·모바일 메뉴 각 3종을 구현했습니다. G7 편집기 저장·복원, 비회원 비밀 문의 작성·열람·수정, 모바일 화면, 검색엔진 HTML과 고객 편집 보존을 확인했습니다. 실제 레이아웃 데이터 연결은 남아 있습니다.

## 구현

- G7 정상 IIFE export + components.json 계약, 공유 React 19 런타임, DOMPurify HTML 출력.
- 네이티브 레이아웃: 공통·홈·페이지·게시판 목록/상세/작성·오류 화면. 쇼핑용 제품·분류 레이아웃은 패키지에 포함하지 않습니다.
- 네이티브 일반 페이지용 시멘틱 콘텐츠 계약: 기업 소개·핵심 수치·가치·연혁·팀·서비스·진행 과정·FAQ·연락처·위치·개인정보 표현. 계약은 `contracts/page-content.json`에 있으며 실제 문구와 이미지는 G7 페이지 데이터가 소유합니다.
- Motion DOM/WAAPI 기반 섹션 등장·이미지 스크롤 깊이 효과와 Lucide 단색 선형 아이콘. 회사·서비스·프로젝트·인사이트·문의 내부 화면에도 목적별 전용 히어로 사진과 패럴랙스를 적용하며, 동작 줄이기 설정과 JavaScript 미실행 시 콘텐츠 노출을 보장합니다.
- 게시판 작성·수정·비밀글 열람은 `sirsoft-board` 공개 방문자 API와 권한 계약을 사용합니다. 관리자 API나 테마 전용 저장소를 사용하지 않습니다.
- SEO가 활성화된 모든 레이아웃은 `seo-config.json`으로 header/nav/main/article/form 등 시멘틱 HTML을 출력합니다.
- `layout-data.json`의 5개 슬롯은 raw node ID와 `children` 필드로 지정합니다. 슬롯은 설치 전에도 보이는 범용 기업 기본값을 가지며, 설치 모듈이 기존 값을 보존한 뒤 팩 콘텐츠로 교체합니다.
- `contracts/site-structure.json`은 설치 모듈이 생성할 10개 일반 페이지·4개 게시판·PC/모바일 공용 2단 메뉴·푸터 메뉴와 쇼핑 비포함 범위를 기계 판독 가능한 계약으로 제공합니다. 계약은 검토된 고정 데이터 팩만 허용하고 랜덤 생성을 금지합니다.
- `editor-spec.json`은 `header-standard|overlay|directory`, `hero-cover|split|editorial`, `mobile-panel|drawer|fullscreen`만 구조 프리셋으로 허용합니다. 클래스는 모두 `jw-` 시멘틱 토큰입니다.
- `contracts/slot-nodes.schema.json`은 허용 노드/필드·내부 링크·표현식 미포함 텍스트로 입력을 제한합니다. 임의 React 코드나 레이아웃 전체 삽입을 허용하지 않습니다.
- 공개 URL은 테마 `routes.json`이 소유합니다. 실제 G7 page/board/post API가 콘텐츠와 권한을 소유합니다. 이 테마는 쇼핑몰을 포함하지 않습니다.

구매자용 설치·프리셋·사이트 구성·업데이트 안내는 [한국어 사용 안내](docs/customer-guide.ko.md)에 정리했습니다. 설치 ZIP은 G7 실행 자산만 포함하고, 사용 안내는 판매 전달물의 `docs` 묶음으로 제공합니다.

## 검사와 개발

저장소 루트에서 중앙 하네스를 실행합니다.

```text
python3 -m tools.theme_harness setup themes/business/jw-business-01
python3 -m tools.theme_harness check themes/business/jw-business-01
python3 -m tools.theme_harness build themes/business/jw-business-01
python3 -m tools.theme_harness package themes/business/jw-business-01
```

중앙 스택은 Tailwind 4를 `jw` prefix와 Preflight 미사용 조건으로 빌드합니다. 현재 테마는 `tailwind`, `sanitize-html`, `contract-tests`, `icons`, `motion` 기능을 채택했습니다. 개발 설치 ZIP은 `releases/jwsoft-business01-0.1.0.zip`으로 재현 생성되며, 실제 데이터 팩 설치·제거와 지원 조합 확정 전에는 판매 출시본으로 판정하지 않습니다.

실제 활성 설치 디렉터리는 `templates/jwsoft-business01`입니다. 로컬 번들 설치 시험용 원본은 `templates/_bundled/jwsoft-business01`에 둘 수 있습니다. 개발 소스를 복사할 때 node_modules·개발 기획서를 제외하고, `dist`·`components.json`·`template.json`·`routes.json`·`layouts`·`lang`·계약/라이선스를 포함합니다.

개발 ZIP 업데이트는 아래처럼 고객 레이아웃을 보존하는 `keep`을 명시합니다. G7 명령의 기본값인 `overwrite`는 고객이 테마 기본 레이아웃으로 초기화할 때만 사용합니다.

```sh
php artisan template:update jwsoft-business01 \
  --zip=/path/to/jwsoft-business01-0.1.0.zip \
  --layout-strategy=keep \
  --force --no-interaction
```

로컬 `g7pb-dev` 관리자 수동 설치 화면에서 ZIP manifest 검증 통과를 확인했습니다. 설치·활성화·ZIP 업데이트도 확인했고, 수정된 홈 레이아웃의 내용과 잠금 버전이 `keep` 업데이트 뒤 유지됐습니다. 실제 운영 배포는 하지 않았습니다.

현재 변경은 TS strict, Vitest 26개, Python 하네스 시험 6개와 실제 번들 빌드로 확인합니다. 로컬 G7에서 홈 공개 경로 200, 1440px 대표 조합과 390px 모바일 메뉴의 가로 넘침·초점 이동·ESC 복귀·배경 스크롤 잠금을 확인했습니다. 편집기에서 한·영 프리셋 라벨과 이미지 선택기, 히어로 `cover → split` 저장·재진입 뒤 `cover` 복원을 확인했습니다. 별도 방문자 세션에서는 비회원 비밀 문의 작성·정상/오류 암호 열람·수정을, 390px에서는 문의 폼과 비밀글 잠금 화면을 확인했습니다. 신규 ZIP 설치·활성화 뒤 홈 크롤러 응답에서 제목·본문·Organization JSON-LD, 시멘틱 태그와 내부 링크 누락 없음도 확인했습니다.

## 남은 범위

테마는 설치기가 소비할 사이트 구조와 슬롯 계약을 제공합니다. 레이아웃 데이터 설치기의 manifest 입력 검증·팩 논리 참조 해석·슬롯/장부 실행 통합, 팩 제거 시 고객 수정 보존은 아직 별도 프로젝트에서 진행 중입니다. 테마의 홈·페이지·게시판 목록/상세/작성·빈 상태·페이지네이션 레이아웃은 구현했습니다. 실제 회사·서비스 페이지와 프로젝트·인사이트·문의 게시판, 두 페이지 분량의 검토된 게시물·이미지·메뉴는 레이아웃 데이터 모듈 설치로 연결해야 합니다.

`concurrency_capability`는 필요한 저장 의미를 선언합니다. 출시된 G7 버전의 자동 capability 탐지/지원 판정이 구현되었다는 뜻이 아닙니다. 공개 배포 전 지원 버전 조합과 전체 팩 설치/제거 재현이 필요합니다.
