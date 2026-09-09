# 제작 도구 작업 공간

실행 가능한 제작 하네스는 `tools.theme_harness` Python 모듈입니다. 중앙 스택 고정, 새 테마 생성, 의존성 준비, 검사, 빌드, 독립 설치 ZIP 생성을 담당합니다.

```text
python3 -m tools.theme_harness init --category industrial --slug sample --identifier jwsoft-sample --name "JW SAMPLE"
python3 -m tools.theme_harness setup themes/industrial/sample
python3 -m tools.theme_harness check themes/industrial/sample
python3 -m tools.theme_harness build themes/industrial/sample
python3 -m tools.theme_harness package themes/industrial/sample
```

명령·설정·강제 규칙은 [테마 하네스](../docs/theme-harness.md), 변경 범위 선택 원칙은 [검증 정책](../docs/verification-policy.md)을 따릅니다.

하네스 업무 로직을 `.sh`·`.bash`·`.zsh`에 작성하지 않습니다. 셸 파일이 꼭 필요하면 단일 `exec` 명령만 전달할 수 있고, 하네스 검사가 저장소 전체에서 이를 강제합니다.
