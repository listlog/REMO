import { getDb } from './db.mjs';

try {
  const sql = getDb();
  const [result] = await sql`SELECT 1 AS connected`;
  if (result?.connected !== 1) throw new Error('Unexpected result');
  console.log('Neon 연결 확인 성공. 데이터는 변경하지 않았습니다.');
} catch (error) {
  // Driver errors can contain connection details; never print raw errors.
  console.error(error.code === 'DATABASE_NOT_CONFIGURED'
    ? 'DATABASE_URL 설정이 필요합니다. 실제 DB 연결은 아직 확인되지 않았습니다.'
    : 'DB 연결 확인에 실패했습니다. Vercel 프로젝트의 Neon 연결 설정을 확인하세요.');
  process.exitCode = 1;
}
