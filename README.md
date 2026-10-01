# REMO 홈페이지

HTML/CSS/JavaScript 화면과 Vercel Node.js 함수, Neon Postgres를 사용합니다.
대상 프로젝트: remo-iw18 / https://remo-iw18.vercel.app

## 콘텐츠 수정
Vercel → Storage → neon-teal-field → Data Editor에서 public 스키마를 선택합니다.
- remo_members: 팀원 1~10의 name(이름), role(역할), skills(핵심 역량), public_contact(공개 연락처), image_url(사진 URL).
- remo_projects: 프로젝트 1~3의 title(제목), period(기간), description(설명), participants(참여자), activities(수행 내용), process(과정), results(성과), image_url, status.
- remo_page_content: page와 label로 위치를 확인하고 content(글) 또는 image_url을 입력합니다.
- published가 true인 행만 홈페이지 API로 제공됩니다. false로 바꾸면 팀원과 프로젝트는 숨겨집니다. 일반 페이지의 비공개 글은 빈 공간으로 남습니다.
- image_url에는 공개 HTTPS 이미지 주소를 입력하세요. 글은 HTML이 아닌 일반 텍스트로 표시됩니다.

초기 데이터는 팀원 10명, 프로젝트 3개, 페이지 공간 23개이며 소개와 연락처는 비워 두었습니다. DB를 수정한 뒤 홈페이지를 새로고침하면 반영됩니다. 관리용 작성 기능은 Vercel/Neon의 로그인된 Data Editor를 사용합니다.

## 개발과 배포
Node.js 24에서 패키지를 설치하고 npm run build로 공개 파일을 dist에 생성합니다.
api/content.js는 공개 콘텐츠를 조회하는 GET 전용 함수이고, db.mjs는 서버 전용 연결입니다.
DATABASE_URL은 Vercel의 Neon 연결로 공급하며 GitHub와 브라우저 코드에는 저장하지 않습니다.
로컬 DB 점검은 .env.local에 접속 정보를 넣고 npm run db:check로 실행합니다.
index.html을 직접 열어 정적 시안을 볼 수도 있지만 실제 DB 조회에는 Vercel 함수가 필요합니다.

schema.sql은 초기 테이블/빈 행을 생성하며 기존 행은 덮어쓰지 않습니다. 배포 때 자동 실행하지 않습니다.
약관과 개인정보처리방침은 아직 내용 준비 중입니다.
