# Study Space 배포 완료

공개 랜딩페이지: https://remo-iw18.vercel.app/study-space.html
프로젝트 소개: https://remo-iw18.vercel.app/project-1.html
사전예약 관리: https://remo-iw18.vercel.app/reservations-admin.html

Vercel: dataflow2 / remo-iw18
배포일: 2026-10-08
최종 배포: dpl_B5xsvXY4Um1SCLiqKAfs7uMXacw8
배포 상태: READY / Production

프로젝트 1 이름과 대표 이미지를 기존 Neon DB에 반영했습니다. 예약 테이블과 요청 제한 테이블이 생성됐으며 접수가 활성화됐습니다. 매일 만료 데이터 정리 작업이 등록됐습니다. 관리자 비밀번호는 기존 설정을 유지했습니다. 임시 DB 적용 경로는 최종 배포에서 제거됐습니다.

실제 API 신청 202, 중복 202, 취소 200, 비로그인 목록 401 및 데이터 정리 인증 200/401을 확인했습니다. 테스트 신청 데이터는 삭제됐습니다. 이메일 자동 발송은 연결하지 않았습니다.

이번 배포는 Vercel CLI로 직접 적용했습니다. GitHub main은 아직 업데이트되지 않았으므로 이전 main을 다시 배포하면 페이지와 예약 코드가 되돌아갈 수 있습니다. ZIP과 로컬 release 폴더의 변경 파일을 GitHub에 반영해야 합니다. 환경 파일과 비밀 값은 전달 패키지에 포함되지 않습니다.
