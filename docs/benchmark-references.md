# 초기 벤치마크와 기술 근거

확인 기준일: 2026-09-08. 아래 내용은 공개 상품 설명·제작 지침과 로컬 G7/PB 소스·계약 문서 조사입니다.
외부 유료 소스 구매·정밀 시각 비교·실제 기능 전수 시험을 수행한 결과는 아닙니다. 첫 업종 결정 후 해당 분야의 후보를 다시 선정합니다.

## 외부 상품과 제작 지침

| 출처 | 확인 내용 | 채택할 원리 |
|---|---|---|
| [Webflow Master](https://webflow.com/templates/html/master-architecture-website-template) | 홈·프로젝트 CMS·뉴스 CMS·문의·오류·스타일 가이드·라이선스 | 여러 페이지와 편집·운영 문서까지 상품화 |
| [Porto](https://themeforest.net/item/porto-responsive-wordpress-ecommerce-theme/9207399) | 제조·법률·의료·숙박 등 업종별 데모 | 공통 기반과 업종별 구성의 분리 |
| [Houzez](https://houzez.co/) | 매물 검색·상세·지도·문의·CRM 등 | 업종의 핵심 흐름을 기획하되 기능 모듈과 테마 범위 구분 |
| [Webflow 제출 기준](https://templates.webflow.com/submission-guidelines) | 재사용 컴포넌트, 스타일 변수, 스타일 가이드, 에셋 고지 | 토큰·문서·재사용 구조를 상품 기준에 포함 |
| [Framer 권장 지침](https://www.framer.com/help/articles/template-best-practices/) | 콘텐츠 변경을 견디는 레이아웃, 반응형, 편집성, 절제된 효과 | 사용자 콘텐츠로 바꾼 뒤의 경험 확인 |

플랫폼 전용 제출 규정이나 임의 파일 용량을 G7 테마의 의무로 복사하지 않습니다.
Master 상품의 재판매 제한·데모 이미지 권리 구분처럼 이용과 재배포 조건을 구별합니다.
현재 Framer 문서는 권장 지침이며 우리 상품의 외부 승인 절차로 가져오지 않습니다.

## G7/PB 기술 참조

- [G7 저장소](https://github.com/gnuboard/g7): `templates/_bundled/sirsoft-basic/template.json`, `components.json`, `editor-spec.json`, `routes.json`, `vite.config.ts`.
- G7 로컬 조사에서 테마의 React/ReactDOM/jsx-runtime을 외부 공유 인스턴스로 연결하는 IIFE 빌드 구성을 확인했습니다.
- G7 `app/Console/Commands/Template/UpdateTemplateCommand.php`의 조사 당시 기본값은 `layout-strategy=overwrite`였습니다. `JW BUSINESS 01` 고객 업데이트는 명시적 `layout-strategy=keep`으로 정했고, 로컬 G7에서 수정된 홈 레이아웃의 내용·잠금 버전 보존을 확인했습니다.
- [PB 네이티브 컴포넌트 계약](https://github.com/jiwonpapa/g7-page-builder/blob/main/docs/productization/native-components.md): manifest/IIFE export/spec과 실제 편집 자산 로드 연결.
- [PB 호스트 계약](https://github.com/jiwonpapa/g7-page-builder/blob/main/docs/productization/native-host-contract.md): 조사 당시 NE1~NE3는 로컬 G7 호스트 후보와 검증한 결과이며 stock G7 지원·운영 배포와 구분됐습니다.

이 기록은 고정된 지원 버전 선언이 아닙니다. 첫 테마 구현 때 실제 배포된 G7과 편집 확장 조합을 확인하고 상품별 지원표를 만듭니다.
