# JW Theme Harness

상태: Python 하네스 1차 구현. `JW BUSINESS 01`에 필요한 설정·검사·빌드·설치 ZIP 생성 기능과 해당 테마 전용 GitHub Actions 검사를 연결했습니다. 첫 테마 제작 중 발견되는 요구만 반영하며 범용 하네스 확정을 별도 선행 단계로 두지 않습니다.

## 목적과 기준 파일

- `theme-stack.json`: 허용 기능, 정확한 npm 버전, 필수 script, 라이선스 고지, 런타임 포함 경로의 중앙 기준입니다.
- `themes/*/*/theme.harness.json`: 테마 식별자·버전·채택 기능만 선언합니다.
- `templates/theme-scaffold`: 새 테마가 시작할 최소 G7 manifest·Tailwind·TypeScript·검사 구조입니다.
- `tools/theme_harness`: 셸 없이 위 기준을 적용하는 Python 모듈입니다.

테마의 `package.json`과 lockfile을 개별 기준으로 삼지 않습니다. 모든 테마는 `tailwind`를 포함해야 하며, 중앙 스택에 없는 패키지나 검증 전 기능은 `setup`에서 거부합니다. 현재 `interactive-ui`는 G7 ReactDOM 호환 실증 전이므로 선택할 수 없습니다.

## 명령

저장소 루트에서 실행합니다.

```text
python3 -m tools.theme_harness init \
  --category business \
  --slug jw-sample-01 \
  --identifier jwsoft-sample01 \
  --name "JW SAMPLE 01" \
  --features tailwind,icons

python3 -m tools.theme_harness setup themes/business/jw-sample-01
python3 -m tools.theme_harness check themes/business/jw-sample-01
python3 -m tools.theme_harness build themes/business/jw-sample-01
python3 -m tools.theme_harness package themes/business/jw-sample-01
python3 -m tools.theme_harness verify-data-pack themes/business/jw-sample-01 /path/to/layout-data-pack.zip
```

`init`는 비어 있는 새 경로만 생성하고 기본적으로 npm 설치까지 실행합니다. 네트워크 설치를 미룰 때만 `--skip-install`을 사용합니다. `setup`은 `package.json`을 중앙 값으로 맞추고 lockfile·라이선스 원문·제3자 고지를 갱신합니다.

`build`는 일반 검사 후 TypeScript, 테마 단위 시험, Vite 빌드를 차례로 실행하고 소스·중앙 스택·산출물 해시를 기록합니다. `package`는 이 빌드를 다시 확인한 뒤 `releases/<identifier>-<version>.zip`을 만듭니다. 다른 위치가 필요하면 `--output-dir`을 지정합니다.

`verify-data-pack`은 테마 `layout-data.json`과 `site_structure_contract`를 팩 디렉터리 또는 ZIP에 직접 대조합니다. 필수 페이지·slug, 게시판 설정·최소 게시물 수, PC/모바일 2단 메뉴·푸터 메뉴, 슬롯 참조 유형, 본문 논리 참조, 이미지 파일·해시, manifest 파일 목록·해시·counts, 쇼핑 포함 여부를 검사합니다. 팩 자체 schema 검사와 실제 G7 삽입은 레이아웃 데이터 모듈이 담당하고, 이 명령은 두 프로젝트 사이의 계약 누락을 설치 전에 차단합니다.

## 현재 강제 항목

- manifest 식별자·버전·자산 경로 일치
- 중앙 스택과 `package.json`·lockfile의 정확한 버전 일치
- Python 3.11 이상, Node 22.12 이상, npm 11.19.0 도구 조건
- 검증 상태가 `approved`인 기능만 사용
- Tailwind 4의 `jw` prefix, theme/utilities 한정 import, 전역 Preflight 금지
- 런타임 소스의 CDN·원격 import 금지와 `template.json` externals 금지
- SEO가 활성화된 레이아웃의 `seo-config.json` 존재와 사용 컴포넌트 전체의 시멘틱 매핑
- 선택 기능의 실제 설치 패키지 버전·라이선스 메타데이터와 동봉 원문 해시 확인
- `.sh`·`.bash`·`.zsh`는 주석·`set -euo pipefail` 외 단일 `exec` 진입점만 허용
- 최신 중앙 스택·소스로 생성한 빌드인지와 배포 자산 해시 확인
- ZIP에는 G7 런타임 manifest·layout·언어·계약·빌드 자산·선택 라이선스만 포함
- ZIP 내부 `JW-THEME-MANIFEST.json`에 각 파일 SHA-256 기록
- 테마와 함께 인수할 레이아웃 데이터 팩의 사이트 구조·슬롯·참조·manifest 일치 확인

패키지는 파일 순서와 ZIP 시간을 고정해 같은 입력에서 같은 결과가 나오도록 생성합니다. `src`, `tests`, `node_modules`, npm 설정, 하네스 설정, 원본 CSS와 내부 빌드 상태는 설치 ZIP에 넣지 않습니다.

## 현재 경계

이 하네스는 테마 제작·정적 계약·빌드·패키징과 데이터 팩의 사전 호환성 대조를 담당합니다. 실제 G7 설치·활성화, 편집·저장·Undo, 브라우저 조작, 레이아웃 데이터 설치·제거 수명주기는 각 프로젝트의 통합 검사 대상입니다. 테마 CI는 하네스 단위 시험과 설치 ZIP 생성을 실행하지만 다른 비공개 저장소의 데이터 팩을 자동으로 가져오지 않습니다.
