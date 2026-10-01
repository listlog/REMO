# REMO GitHub + Vercel 배포

저장소: https://github.com/listlog/REMO
프로젝트: dataflow2 / remo-iw18
DB: neon-teal-field (Preview, Production에 연결)

- Framework: Other
- Root Directory: 저장소 최상위
- Build Command: node build.mjs
- Output Directory: dist
- Install Command: 자동 감지
- Node.js: 24.x
- 서버 환경 변수: DATABASE_URL

vercel.json의 설정을 사용합니다. 코드의 api/content.js도 함께 올려야 합니다.
dist는 HTML/CSS/JS만 포함하며 서버 코드, SQL, 환경 파일, 문서는 공개 정적 결과물에서 제외합니다.

배포 후 /api/content에서 200 응답과 members/projects/pages 배열을 확인하고 홈, 팀원 소개, 프로젝트 필터와 상세 페이지를 점검합니다. DB가 미설정이거나 조회에 실패하면 503을 반환하고 홈페이지에 재시도 안내를 표시합니다.
