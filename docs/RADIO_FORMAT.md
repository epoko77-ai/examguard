# 외부 수신기 입력

앱에서 Android·ESP32를 직접 제어하지 않습니다. 수신기 측에서 아래 JSON으로 변환하여 구역별 신호 비교 → 측정 파일 열기로 가져옵니다.

```json
{
  "schema": "examguard.radio.v1",
  "source": "Receiver A / manual zone survey",
  "isDemo": false,
  "samples": [
    {
      "deviceKey": "session-device-a",
      "name": "Advertised device name",
      "zone": "창가",
      "rssi": -64,
      "timestamp": "2026-11-07T09:00:00+09:00"
    }
  ]
}
```

한 파일 1 MB 이하, samples 1~5,000개, 기기 키 100개 이하, 구역 30개 이하입니다. source 80자, deviceKey 80자, name 120자, zone 40자, timestamp 40자 이하이며 빈 값은 거부합니다. RSSI는 유한한 수 -127~20, 시각은 시간대가 있는 ISO 문자열이어야 합니다. 불필요한 필드는 가져오지 않습니다.

`deviceKey`는 수신기 측의 같은 세션 내 익명 키를 권장합니다. 사람 이름·좌석 번호를 식별자로 쓰지 마세요. BLE 주소는 바뀔 수 있으므로 서로 다른 시간/수신기의 키가 같은 실물이라는 보장은 없습니다. 파일의 장비·표본·수집 조건은 제출자가 확인해야 합니다.

동일 기기를 구역별 3회 이상 측정한 구역이 2개 이상일 때 중앙값을 비교합니다. 1회 강한 신호는 최강 구역 결론에서 제외합니다. 구역은 수신기가 측정한 위치입니다. 벽·몸·방향·출력·시간에 영향을 받으며 dBm을 거리나 좌석으로 변환하지 않습니다.

`isDemo: true`는 연습 자료이며 보고서에서 제외됩니다. `public/radio-example.json`은 이 플래그가 켜진 가상 자료입니다. 앱은 제출된 측정값의 진위나 수신기 교정을 검증하지 않습니다.
