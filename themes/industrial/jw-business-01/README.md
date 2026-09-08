# JW BUSINESS 01 — 설치 연결용 기본 구조

G7 설치 식별자는 **jwsoft-business01**, 버전은 0.1.0입니다. 기획 폴더명/상품명과 설치 식별자를 구분합니다. `jw-business-01`은 숫자로 시작하는 단어를 허용하지 않는 G7 규칙에 맞지 않아 설치 식별자로 쓰지 않습니다.

현재는 디자인 도안이 선택되지 않은 기술 구현입니다. 판매용 디자인·완성 테마 또는 전체 산업 팩으로 보고하지 않습니다.

## 구현

- G7 정상 IIFE export + components.json 계약, 공유 React 19 런타임, DOMPurify HTML 출력.
- 네이티브 레이아웃 13개: 공통 골격·홈·페이지·게시판·게시물·상품·분류·오류 6개.
- `layout-data.json`의 5개 슬롯은 raw node ID와 `children` 필드로 지정합니다. 같은 주 메뉴가 PC/모바일에 표시되고 푸터는 별도 슬롯입니다.
- `contracts/slot-nodes.schema.json`은 허용 노드/필드·내부 링크·표현식 미포함 텍스트로 입력을 제한합니다. 임의 React 코드나 레이아웃 전체 삽입을 허용하지 않습니다.
- 공개 URL은 테마 `routes.json`이 소유합니다. 실제 G7 page/board/post/product/category API가 콘텐츠와 권한을 소유합니다. 상품 링크의 product_code는 G7 코드 발급 서비스의 반환값을 사용합니다.

## 검사와 개발

```sh
npm ci
npm run typecheck
npm test
npm run build
```

실제 G7 설치 디렉터리 이름은 `templates/_bundled/jwsoft-business01`입니다. 개발 소스를 복사할 때 node_modules·개발 기획서를 제외하고, `dist`·`components.json`·`template.json`·`routes.json`·`layouts`·`lang`·계약/라이선스를 포함합니다.

```sh
php artisan template:install jwsoft-business01 --no-interaction
php artisan template:activate jwsoft-business01 --no-interaction
```

이 명령은 **격리 검사 환경에서만 실행한 근거**입니다. 실제 운영 배포는 하지 않았습니다. 재현 환경: G7 `b2dc5968`의 원자 저장 수정 + PHP 8.3.33/MySQL 8.4.

TS strict·Vitest 6개·실제 번들 빌드 통과. layout-data 저장소 `tests/php/Theme/NativeThemeBindingTest.php`의 정상 레이아웃 PUT·revision 충돌 거부·생성 객체 연결 54 assertions 통과. 비로그인 브라우저에서 공개 5개 경로의 제목/본문, 메뉴→페이지 이동, 390px 가로 넘침 없음을 확인했습니다. 자료는 판매용 콘텐츠가 아닌 검사 fixture입니다.

## 남은 범위

설치기의 manifest 입력 검증·팩 논리 참조 해석·슬롯/장부 실행 통합, 슬롯별 고객 수정 보존/복원은 아직 없습니다. 현재 설치기는 계속 실행을 거부합니다. 홈 상품/사례는 슬롯 존재와 허용 계약까지이며 완성된 섹션 디자인·사진·상품 옵션 선택/장바구니·문의 작성 화면·catalog 지원까지 구현한 것이 아닙니다. 공개 5개 경로는 기본 읽기 화면입니다. 콘텐츠별 상세 오류·빈 상태·페이지네이션 및 시각 디자인 확장은 별도 검증이 필요합니다.

`concurrency_capability`는 필요한 저장 의미를 선언합니다. 출시된 G7 버전의 자동 capability 탐지/지원 판정이 구현되었다는 뜻이 아닙니다. 공개 배포 전 지원 버전 조합과 전체 팩 설치/제거 재현이 필요합니다.
