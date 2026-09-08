# 저장소 구조와 테마별 배포

상태: 제안 구조. 현재 실제 폴더는 안내 문서뿐이며 아래 runtime 구조와 패키지는 미구현입니다.

## 개발 구조

```text
packages/
  foundation/           토큰 규격·기본 UI·접근성 동작
  g7-adapter/           공개 호스트 연결
  assets/               재배포 가능한 공통 자산
tools/theme/            Python 검사 선택·패키징
themes/<industry>/<identifier>/
  product.md
  design/               선택 도안·토큰·섹션 규칙
  template.json
  routes.json
  components.json
  editor-spec.json
  layouts/
  src/
  assets/
  tests/
```

G7에 설치되는 폴더는 `templates/<identifier>`이며 저장소의 업종 디렉터리는 개발용 분류입니다.
G7 manifest에 없는 필드를 임의로 넣지 않습니다. 상품·제작 메타데이터는 product 문서나 별도 제작 설정에 둡니다.

## 구현 언어와 런타임

- TypeScript/React: 컴포넌트와 상호작용. G7 공유 React 계약 사용.
- JSON: 실제 G7 route/layout/component/editor-spec 선언과 별도 제작용 토큰.
- CSS: 테마별 표현. 허용 토큰·공통 컨트롤 사용.
- Python: 검사 범위·실행·패키징 제어. 셸은 짧은 실행 진입점만.
- Node/Vite: 로컬·CI에서 브라우저 자산 빌드. 정확한 도구 버전은 첫 구현 때 G7과 맞춰 고정.

현재 조사된 G7 템플릿은 `dist/js/components.iife.js`, `dist/css/components.css`와 manifest/spec을 사용합니다.
네이티브 편집기 자산 탐색과 공개 페이지 asset 로드가 동일하다고 추정하지 않고 대표 구현에서 둘 다 연결합니다.
private renderer/registry를 import하거나 G7 코어 구현을 테마 소스 안에 복제하지 않습니다.

## 판매 전달물

```text
<identifier>-<version>/
  install/<identifier>.zip
  developer/            테마 소스·필요 공통 소스·규칙·관련 하네스/시험
  docs/                 설치·편집·업데이트·지원 조합
  asset-licenses/        에셋 및 제3자 고지
  CHANGELOG.md
```

개발 시에는 중앙 원본을 참조하고 패키징 때 해당 버전의 필요한 파일을 포함합니다.
설치 ZIP에는 runtime 자산만 넣습니다. 개발 하네스는 별도 developer 폴더에 전달하며 웹 서버 실행 의존성이 아닙니다.
개발 키트에는 재현에 필요한 버전·잠금 파일·실행 안내를 포함하되 개인 경로·계정·비밀 값·다른 테마는 제외합니다.
테마 내부 에셋 경로는 다른 테마 폴더나 저장소 상위 경로를 참조하지 않습니다.

## 버전·업데이트

- 테마 버전은 독립적이며 공통 기반 버전도 각 테마가 명시적으로 채택합니다.
- 공통 라이브러리 수정이 이미 판매한 ZIP을 바꾸지 않습니다. 변경은 새 버전으로 제공합니다.
- G7·편집 확장·모듈 지원 조합을 실제 시험 범위대로 명시합니다.
- 고객 편집 원본과 테마 기본값을 분리합니다. 기본 레이아웃 업데이트가 고객 내용을 덮어쓰지 않도록 정책과 실제 G7 동작을 확인합니다.
- 초기 자동 업데이트 서버·DRM·판매자 공통 CDN 의존성은 만들지 않습니다. 배포 채널과 상품 약관은 후속 결정입니다.
