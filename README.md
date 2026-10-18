# 강호쟁패(가제) — 1단계 프로토타입

정적 웹앱(HTML/CSS/JS, 빌드 없음). 기획서 `design/기획서_v0.5.2.md` 10-1 범위.

- 실행: `python3 -m http.server 8765` 후 http://localhost:8765/ (디버그: `?debug=1`, 시드: `?seed=1`, 폐관 경과: `?debug=1&offline=600`)
- 저장: localStorage `murim_save_v5`
- 로직 테스트: `node tests/logic.test.js` (완료 기준 #17·#18·#21·#26·#28·#32·#33·#34)
- 구성: `js/data.js`(8장 데이터) · `js/duel.js`(F8 일기토) · `js/game.js`(규칙) · `js/ui.js`(화면)
