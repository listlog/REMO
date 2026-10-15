# Study Space 출시 알림 사전예약

2026-10-08: 기존 REMO Production에 DB 적용과 배포를 완료했습니다. 실제 접수가 활성화됐고 일일 데이터 정리 작업이 등록됐습니다. 아래 절차는 유지보수용입니다.

이메일 신청, 필수 동의, 중복 방지, 접수자의 취소 링크, 기존 관리자 로그인으로 조회·영구 삭제, 하루 한 번 만료 데이터 정리를 구현했습니다.
자동 이메일 발송은 포함하지 않습니다. 문의 이메일은 미정이며 취소 링크로 철회할 수 있습니다.
보관 기준: 알림 발송 후 관리자 삭제, 미출시 시 신청일부터 6개월 만료 후 일일 작업에서 정리.

## 적용할 대상
listlog/REMO 저장소 / Vercel dataflow2 팀의 remo-iw18 / 기존 연결된 Neon DB.
새 Vercel 프로젝트나 DB를 만들지 않습니다.

1. Neon SQL 편집기에서 schema-reservations.sql 실행. 기존 테이블·데이터를 변경하지 않습니다.
2. 기존 DATABASE_URL 및 REMO_ADMIN_PASSWORD 유지.
3. Production에 CRON_SECRET 설정: 32자 이상 무작위 영문·숫자. 소스나 채팅에 기록하지 않습니다.
4. 코드 배포 후 REMO_RESERVATIONS_ENABLED=true를 Production에 설정하고 재배포. 적용 전 값은 false 또는 미설정으로 둡니다.
5. Vercel Cron Jobs에서 /api/reservations?action=cleanup 일일 작업 활성 여부 확인.
6. /api/reservations?action=status의 accepting:true를 확인하고 본인 테스트 이메일로 신청 → 관리자 조회 → 취소 링크 삭제 → 목록에서 제거 확인.
7. 실제 신청을 받을 준비가 되면 접수 활성 상태로 운영. Preview 환경은 접수 중단 상태를 유지합니다.

관리 화면: reservations-admin.html. 기존 게시판 관리자 로그인 후 사전예약 관리 링크가 보입니다.
출시 알림을 별도 발송한 뒤 신청을 삭제합니다. 전체 이메일 자동 발송과 결제는 포함하지 않습니다.
취소 링크는 본인만 보관해야 합니다. 동일 이메일을 재입력해도 기존 취소 권한은 바뀌지 않습니다.
문의 이메일 확정 시 안내 문구에 추가할 수 있습니다.

## 검증
node build.mjs
node --test verify-content.test.mjs verify-board.test.mjs verify-reservations.test.mjs
공개 빌드는 서버 코드·SQL·테스트·비밀 값을 제외합니다.
신청 이메일/취소 코드/비밀번호는 로그에 기록하지 않습니다.
매일 만료 신청 및 하루 지난 요청 제한 해시를 삭제하며, 신규 접수와 관리자 조회 때도 만료 데이터를 정리합니다.
운영 시 Cron 실행 성공 여부를 확인해야 합니다.

Vercel Cron 인증: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
