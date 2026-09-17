# REMO 홈페이지
HTML · CSS · JavaScript로 만든 다중 페이지 시안입니다. 설치나 Node.js 서버 없이 index.html을 브라우저에서 열면 됩니다.

GitHub 저장소는 https://github.com/listlog/REMO 를 사용합니다. Vercel 배포 설정은 vercel.json에 포함되어 있으며, 업로드와 연결 순서는 [DEPLOY.md](DEPLOY.md)를 참고하세요.

## 페이지
- index.html: 메인. 하단 팀원 사진 10개 영역을 제거했습니다.
- about.html: 팀 소개
- team.html: 팀원 10명. 프로젝트 이동 링크가 없습니다.
- projects.html: 프로젝트 목록과 상태 필터
- project-1.html ~ project-3.html: 프로젝트 소개 양식
- contact.html: 대표 연락처와 공식 채널 공간
- terms.html / privacy.html: 정책 연결 페이지. 확정 정책이 없어 준비 중 안내만 표시합니다.

## 내용 입력
각 HTML의 content-space 요소 안에 소개 글을 넣으세요. aria-label과 주석에 해당 공간의 용도가 적혀 있습니다.
이미지 공간에는 짧은 안내가 표시됩니다. image-placeholder 요소를 실제 img 요소로 교체할 때 적절한 alt 설명을 작성하고 기존 영역의 크기/비율을 유지하세요.
팀원별 이름·역할·핵심 역량·공개 연락처는 team.html의 각 member-card에 입력합니다.
시안의 역할·성과·연락처는 임의로 채우지 않았습니다. 프로젝트의 세 상태는 레이아웃과 필터를 확인하기 위한 예시입니다.
홈/목록/프로젝트 소개의 내용을 함께 갱신하세요.
문의 페이지는 안내용이며 서버로 정보를 전송하는 기능이 없습니다.

## 디자인 및 동작
styles.css에서 전체 색상, 간격, 모바일 배치를 조정합니다.
app.js는 모바일 메뉴와 프로젝트 필터만 처리합니다.
상단 메뉴, 약관·개인정보처리방침 링크, 프로젝트 이동은 HTML 링크로 작동합니다.
외부 라이브러리·웹 폰트·분석 도구·쿠키를 추가하지 않았습니다.
