# REMO 고객상담 배포 완료

- 공개 상담: https://remo-iw18.vercel.app/contact.html
- Study Space: https://remo-iw18.vercel.app/study-space.html
- 배포: dpl_2vVFPFyx9ebZ1zNkfSaTTmv4DRjm / Production READY
- 반영일: 2026-10-15
- 모델: Gemini 3.5 Flash-Lite, GEMINI_MODEL Config 및 GEMINI_API_KEY Secret 사용

기존 문의 페이지를 고객상담으로 교체하고 공통 메뉴와 랜딩페이지에 연결했습니다. Google Doc 저장본의 7개 섹션을 검색한 후 Gemini가 답변과 출처를 반환합니다. 문서를 수정하면 저장본을 갱신하고 재배포해야 하며 실시간 동기화는 아닙니다.

32개 테스트 통과. 보호된 Production 배포에서 가격·출시 안내 생성 200, 문서 외 질문 안내 200, 외부 Origin 차단 403을 확인한 후 같은 배포를 승격했습니다. 공개 사이트의 브라우저에서도 노션 연동·동기화 준비 상태와 출처 펼치기를 확인했습니다. 배포 후 해당 배포의 최근 15분 error 로그 조회에는 결과가 없었습니다.

대화는 REMO DB에 저장하지 않습니다. 최대 최근 6개 대화와 질문·검색된 문서가 Google에 전송됩니다. 이용 제한은 IP별 15분당 10회, 사이트 전체 UTC 일자당 200회이며, 기존 요청 제한 테이블을 재사용합니다. 무료 티어 지원 모델을 사용하지만 Google 계정의 실제 결제 등급은 확인하지 않았습니다. 유료 계정은 사용량 요금이 적용될 수 있으며 이번 작업에서 Google 결제 설정을 변경하지 않았습니다.

Vercel CLI로 직접 배포했습니다. GitHub main은 아직 이 변경과 동기화되지 않았습니다. 오래된 main을 다시 배포하면 변경이 되돌아갈 수 있으므로 GitHub에는 이 전달 패키지를 반영해야 합니다. 키와 환경 비밀 값은 코드 및 전달 패키지에 포함하지 않았습니다.
