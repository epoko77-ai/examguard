# ExamGuard

**사진으로 스마트안경 도감 후보를 찾고, 실물 확인과 점검 기록까지 이어가는 오픈소스 감독관 도구.**

[웹앱 열기](https://epoko77-ai.github.io/examguard/) · [기획 검토](docs/REVIEW.md) · [사진 대조 모델 설명](docs/MODEL_CARD.md) · [기여하기](CONTRIBUTING.md)

> 현장 검증 전 프로토타입입니다. 사진 검색 결과는 닮은 도감 후보이며, 기종·소유자·부정행위의 확정 판정이 아닙니다.

## 할 수 있는 일

| 기능 | 실제 동작 |
| --- | --- |
| 사진 → 도감 후보 3개 | 휴대전화 촬영/파일 선택 → 확대·위치 조정 → 기기 내 CLIP 이미지 유사도 검색 → 부품 위치 대조 |
| 3초 실물 대조 도감 | Ray-Ban Meta Wayfarer, Even G1, XREAL Air 2, Xiaomi Mijia Smart Audio, HUAWEI Eyewear 2 + 일반 안경 비교. 자체 도식·관찰 위치·공식 자료 링크 |
| 준비 체크 | 휴대전화 전원 종료, 전자기기 수거, 허용 장비 확인 |
| Bluetooth 기기 확인 | 지원 브라우저의 선택창에서 감독관이 선택한 BLE 기기를 기록. 구역·확인 상태 수동 지정 |
| 광학 검사 | 후면 카메라/사진, 반사 강조·윤곽·반전 필터, 확대, 정지, 지원 장비에서 조명. 현재 사진을 도감 검색으로 전달 |
| 구역별 신호 비교 | Android·ESP32 등 외부 수신기의 [JSON 측정 파일](docs/RADIO_FORMAT.md)을 가져와 반복 측정 중앙값 비교 |
| 점검 기록 | 현장 관찰·선택 기록을 JSON으로 내보내기. 연습 자료·사진·브라우저 기기 ID 제외 |
| PWA | 기본 도감과 앱은 사전 캐시 후 오프라인 이용. 사진 모델은 첫 검색 때 별도 다운로드 |

완전히 전원이 꺼진 기기는 그 상태에서 전자 기능을 사용할 수 없습니다. 시험장에서는 **전원 종료·수거 확인이 먼저**입니다. 앱은 남아 있는 기기의 추가 확인과 실물 대조를 돕습니다. 허용 보조기기·감독 장비·교실 밖 신호도 있으므로 수거 후 환경을 무전파 공간으로 단정하지 않습니다.

## 빠르게 사용하기

1. 인터넷이 되는 곳에서 앱을 열고 **기본 도감 오프라인 준비 완료** 표시를 확인합니다.
2. 도감에서 안경 사진을 찍거나 선택합니다. 얼굴·주변 물체를 빼고 안경을 크게 맞춘 뒤 **도감 후보 찾기**를 누릅니다.
3. 첫 검색은 모델과 실행 엔진 약 104 MB를 받습니다. 사진은 업로드하지 않습니다. 오프라인 사용 전 같은 기기에서 검색까지 한 번 실행하고 연결을 끊어 다시 확인하세요.
4. 후보 카드의 카메라·충전부·스피커·렌즈 구조와 실물을 대조합니다. 앞면이 닮은 것만으로 판단하지 않습니다.
5. 현장에서는 준비 체크 후 기기·관찰 기록을 남기고, 필요한 보고서를 내려받습니다. 새로고침·새 점검으로 기록이 지워집니다.

## 지원 범위

| 환경 | 도감·사진 파일 | 카메라·필터 | BLE 선택창 | 사진 대조 |
| --- | --- | --- | --- | --- |
| Android Chromium | 지원 | 권한·장비에 따라 | Web Bluetooth 제공 환경 | WASM·메모리가 충분한 환경 |
| 데스크톱 Chromium | 지원 | 연결된 카메라 | OS·어댑터·브라우저에 따라 | WASM 지원 환경 |
| iPhone/iPad Safari | 지원 | 권한·장비에 따라 | Safari 미지원 | WASM·메모리가 충분한 환경, 실기기 검증 필요 |
| 기타 브라우저 | 기본 도감 이용 | API 제공 여부에 따라 | API 제공 여부에 따라 | 미지원 시 수동 도감 이용 |

HTTPS 또는 localhost가 필요합니다. iOS 전 기종 조명·IR 지원을 보장하지 않습니다. 카메라 필터는 밝기·윤곽 보정이며 핀홀/HUD 검출기가 아닙니다. 사진 검색은 9개 참조 이미지 기반의 실험 기능으로 신형·개조 제품, 다른 프레임, 일반 안경에서 잘못된 후보를 낼 수 있습니다. 정확도 수치·적발 확률을 제공하지 않습니다.

## 로컬 실행

Node.js 22.18 이상이 필요합니다. 의존성 버전은 `package-lock.json`으로 고정합니다.

```sh
npm ci
npm run setup:models
npm run dev
```

`setup:models`는 고정된 모델 리비전을 SHA-256으로 검증하고 로컬 WASM 파일을 준비합니다. `public/models`, `public/ort`는 Git에 넣지 않습니다. 모델 설치를 생략해도 기본 도감·기록 기능은 이용할 수 있습니다.

```sh
npm test
npm run build
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

브라우저 테스트는 `/examguard/` 하위 경로에 실제 빌드 결과를 서빙합니다. Chromium·모바일 WebKit에서 화면, 권한 거부, 보고서 분리, 입력 처리, 실제 WASM 사진 추론, 캐시 후 오프라인 재추론을 검사합니다. Bluetooth는 API 모의 입력을 사용하므로 실제 하드웨어 탐지 성능을 검증하지 않습니다. 동일 참조 사진의 검색 테스트는 통합 동작 검사이며 현장 정확도 평가가 아닙니다.

## 구조와 배포

- `src/data/guides.ts`: 기종·공식 근거·관찰 위치
- `src/lib/photo-worker.ts`: 전용 Worker에서 로컬 모델 실행
- `public/visual-references.json`: 정규화된 512차원 참조 벡터
- `docs/reference-sources.json`: 출처, 해시, 크롭 위치, 권리 정보
- `src/lib/core.ts`: 기록·보고서·RSSI 파일 검증
- `scripts/build-sw.mjs`: 같은 출처의 앱 파일만 캐시. 모델은 요청할 때만 캐시
- `.github/workflows/pages.yml`: 검사·브라우저 테스트 통과 후 GitHub Pages 배포

GitHub에서 포크한 뒤 Settings → Pages → Source를 **GitHub Actions**로 설정합니다. 모델 파일은 CI에서 다운로드하여 배포 산출물에만 포함합니다. 다른 HTTPS 정적 호스팅에는 `dist/`를 배포하면 됩니다. 별도 API 키·백엔드·계정은 필요하지 않습니다.

## 기존 도구와의 관계

BLE 스캐너를 새로 발명한 프로젝트는 아닙니다. ExamGuard는 **시험장 준비 → 선택/측정 기록 → 사진 도감 대조 → 관찰 기록 → 인계용 보고서**를 연결합니다. 네이티브/ESP32 도구의 측정 결과를 가져오는 방식으로 함께 사용할 수 있습니다. 구현 범위와 [기존 프로젝트 비교](docs/REVIEW.md#기존-오픈소스와의-관계)를 공개합니다.

## 개인정보·라이선스

사진과 현장 기록은 브라우저 메모리에만 있습니다. 서버 업로드·추적 스크립트·얼굴 인식·소유자 식별 기능은 없습니다. 다운로드한 보고서는 사용자가 관리합니다. [데이터 흐름](docs/PRIVACY.md)을 확인하세요.

앱 코드·자체 도식은 [MIT](LICENSE). CLIP 모델과 ONNX Runtime의 MIT 고지를 포함합니다. 테스트 사진과 출처별 권리는 [제3자 자료 고지](docs/THIRD_PARTY.md)에 따릅니다. 제조사 제품 사진 원본을 앱에 재배포하지 않습니다. 상표는 각 소유자에게 있으며 공식 제휴 제품이 아닙니다.

---

**English:** ExamGuard is an open-source, local-processing inspection companion for exam proctors. It combines a smart-glasses field guide, experimental on-device photo similarity search, explicit Web Bluetooth selections, optical image enhancement, imported RSSI comparisons, and a factual report. It does not identify people, silently scan a room, classify cheating, or guarantee the absence of electronics. Contributions with licensed reference photos and reproducible device measurements are welcome.
