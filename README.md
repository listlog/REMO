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

## 게시판
- /board.html: 누구나 목록·검색·글 읽기. 작성·수정·삭제·복원은 관리자만 허용합니다.
- board-schema.sql을 Neon Query에서 한 번 실행합니다. 기존 홈페이지 데이터는 변경하지 않습니다.
- REMO_ADMIN_PASSWORD를 Vercel 프로젝트의 Production 환경변수로 직접 설정합니다(12~256자, 다른 계정과 다른 비밀번호 권장). 비밀번호는 저장소나 프런트엔드에 넣지 않습니다. 환경변수 변경 후 재배포합니다.
- 게시판 → 관리자 로그인 → 글쓰기. 분류는 공지, 팀 소식, 프로젝트입니다.
- 삭제한 글은 공개 목록에서 숨겨지고 휴지통에서 복원 가능합니다. 영구 삭제 기능은 없습니다.
- 관리자 세션은 HttpOnly·SameSite=Strict 쿠키이며 Vercel에서는 Secure를 적용합니다. 8시간 후 만료하고 로그아웃 시 즉시 무효화합니다. 비밀번호 변경 후 이전 세션은 사용할 수 없습니다.
- 모든 쓰기 요청은 동일 출처 확인과 서버 권한 검사를 거칩니다. 로그인은 IP 해시당 15분에 10회로 제한합니다.
- 관리자 비밀번호 미설정 시 방문자 읽기만 가능하며 로그인과 글쓰기는 열리지 않습니다.
- 실제 글이 없으면 빈 게시판을 표시합니다. 테스트 게시물은 배포 DB에 넣지 않습니다.
- npm test: 입력 검증, 관리자 권한, 세션, 요청 출처, 검색, 복원, 정적 파일 분리를 검사합니다.
