# GitHub + Vercel 배포

대상 저장소: https://github.com/listlog/REMO

## 1. GitHub 업로드

이 폴더의 **내용물**을 저장소 최상위에 올립니다. index.html과 vercel.json이 저장소를 열었을 때 바로 보여야 합니다.
시안 이미지, 생성 프롬프트, 검증 스크립트, 압축 파일은 올릴 필요가 없습니다.

웹에서 업로드하는 경우 저장소의 `uploading an existing file` 또는 `Add file → Upload files`를 선택하고, 이 폴더 안의 파일을 업로드한 뒤 커밋합니다. ZIP 파일 자체를 업로드하지 마세요.

## 2. Vercel 연결

1. 저장소 소유자 listlog 계정과 연결된 Vercel에서 https://vercel.com/new 를 엽니다.
2. GitHub 저장소 목록에서 `listlog/REMO`를 선택해 Import 합니다. 목록에 없으면 Vercel GitHub 앱의 저장소 접근 설정에서 REMO를 허용합니다.
3. 아래 값을 확인한 뒤 Deploy 합니다.

| 설정 | 값 |
| --- | --- |
| Framework Preset | Other |
| Root Directory | ./ (저장소 최상위) |
| Build Command | 비워 둠 |
| Output Directory | . |
| Install Command | 비워 둠 |
| Environment Variables | 필요 없음 |

포함된 vercel.json이 정적 HTML 배포 설정을 지정합니다. Node.js 서버나 패키지 설치가 필요하지 않습니다.
만약 파일을 저장소의 remo 하위 폴더에 넣었다면 Root Directory를 `remo`로 바꿉니다. 권장 구성은 파일이 저장소 최상위에 있는 형태입니다.

## 3. 공개 후 확인

Vercel이 실제로 발급한 주소에서 홈, 팀원 소개, 프로젝트, 정책 링크와 모바일 메뉴를 확인합니다.
이후 연결된 Production Branch에 변경 사항을 올리면 Vercel이 새 배포를 진행합니다.
본문과 이미지는 아직 시안용 빈 공간이며, 정책 페이지는 내용 준비 중 상태입니다.

## 참고

- https://vercel.com/docs/builds/configure-a-build
- https://vercel.com/docs/git/vercel-for-github
- https://vercel.com/docs/project-configuration/vercel-json
