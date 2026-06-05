# 모바일 청첩장 수정 안내

## 시작하기

`index.html`을 브라우저로 열면 청첩장을 확인할 수 있습니다.

실제 배포 전에는 VS Code의 Live Server 같은 로컬 서버로 확인하는 것을 권장합니다.

## 내용을 바꾸는 파일

대부분의 내용은 `invitation-data.js`만 수정하면 됩니다.

- 이름, 연락처, 부모님 성함
- 결혼식 날짜와 장소
- 초대 문구
- 교통편과 안내사항
- 계좌번호
- 사진 경로

사진은 `image` 폴더 안에 넣고 아래처럼 경로를 적습니다.

```js
image: "./image/main.jpg"
```

## 포함된 기능

- 모바일 반응형 레이아웃
- 예식일 달력과 실시간 카운트다운
- 연락처 연결
- 주소와 계좌번호 복사
- 세로형 갤러리 미리보기와 전체 사진 슬라이드
- 참석 여부와 교통편 전달
- 로그인으로 보호된 참석 현황 관리자 화면

참석 정보 수집과 모바일 편집은 아래 안내에 따라 Supabase를 연결하면 여러 기기에서 사용할 수 있습니다.

## 참석 정보 수집 설정

참석 정보는 Supabase를 연결하기 전까지 같은 브라우저의 미리보기 저장소에만 저장됩니다.

1. Supabase 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase-setup.sql`을 실행합니다. 이전 버전을 실행했다면 다시 실행해도 됩니다.
3. Authentication > Users에서 신랑과 신부 계정을 만듭니다.
4. 두 계정의 UUID를 `supabase-setup.sql` 마지막 예시처럼 `rsvp_admins` 테이블에 추가합니다.
5. Project Settings > API에서 Project URL과 anon key를 확인합니다.
6. `supabase-config.js`의 `supabaseUrl`, `supabaseAnonKey`에 값을 입력합니다.
7. 배포한 사이트의 `admin.html` 주소에서 일반관리자 계정으로 로그인합니다.

브라우저에 공개되는 설정에는 anon key만 사용해야 합니다. `service_role` key는 넣지 마세요.

## 모바일에서 청첩장 수정

Supabase 연결 후 `admin.html`에 로그인하면 일반관리자용 `청첩장 편집` 메뉴가 표시됩니다. 운영용 디자인 관리 화면은 `super-admin.html`에서 별도로 엽니다.

- 이름, 연락처, 예식 정보, 문구 수정
- 교통 안내, 공지사항, 양가 계좌번호 수정
- 메인, 프로필, 갤러리, 마지막 사진 업로드
- `일반 관리자 > 디자인 적용`에서 컬러테마와 영화테마 선택
- 같은 메뉴에서 현재 청첩장에만 적용할 메인 꾸밈, 문구 테마, 메인 사진 문구 위치 선택
- 결혼식 전날까지와 당일 이후의 섹션 순서 및 노출 설정
- 상단 빠른 입력에서 신랑·신부, 양가 부모님, 식장, 예식 일시를 한 번에 반영
- 초대 문구, 메인 영문 문구, 페이지 제목 추천 선택

갤러리는 관리자 화면의 버튼 하나로 최대 20장을 한 번에 선택해 관리할 수 있습니다. 청첩장에는 앞의 6장이 3:4 세로 미리보기로 표시되며, `사진 더보기` 버튼에서 전체 사진을 좌우 버튼 또는 스와이프로 볼 수 있습니다.

관리자 편집 화면의 사진은 URL을 직접 입력하지 않고 휴대폰 갤러리에서 선택합니다. 계좌번호는 신랑측과 신부측 각각 당사자, 아버지, 어머니 순서로 관리합니다.

`일반 관리자 > 디자인 적용`에서 프리셋을 고르면 관리자 화면 색상이 즉시 바뀝니다. `디자인 저장`을 누르면 공개 청첩장에도 적용됩니다.

`예식 정보`에서는 캘린더로 날짜와 시간을 고르고 화면 표시 형식을 선택합니다. 자동으로 만들어진 표시 문구는 다시 직접 수정할 수 있습니다. 등록된 식장은 주소와 교통 안내가 자동 입력되며, 다른 식장은 지도 검색 후 주소를 직접 입력할 수 있습니다. 안내사항은 최대 3개까지 추천 목록에서 고른 뒤 직접 수정할 수 있습니다. 계좌는 양가 각각 당사자, 아버지, 어머니 카드에서 은행과 계좌번호를 입력합니다. 섹션 순서는 체크박스와 위·아래 버튼으로 관리합니다.

사진과 선택한 메인 영상은 공개 청첩장에 표시하기 위해 Supabase Storage의 공개 버킷에 저장됩니다. 사진은 20MB 이하 JPG, PNG, WEBP, GIF, HEIC, HEIF, 메인 영상은 50MB 이하 MP4, WebM 또는 MOV 파일을 업로드할 수 있습니다. 주민등록증처럼 공개되면 안 되는 파일은 업로드하지 마세요.

## 하객 결혼식 사진·영상

청첩장의 `Wedding Snap` 섹션에서 하객이 휴대폰 갤러리 사진과 영상을 여러 개 선택해 업로드할 수 있습니다.

- 사진과 영상 원본은 `guest-photos` 비공개 Storage 버킷에 저장됩니다.
- 하객은 별도 가입 없이 이 휴대폰 브라우저에서 자신이 보낸 파일만 확인하고 삭제할 수 있습니다.
- 하객은 다른 하객이 보낸 파일을 볼 수 없습니다.
- 신랑과 신부는 `admin.html`의 `하객 사진·영상` 메뉴에서 전체 파일을 확인하고 삭제할 수 있습니다.
- 관리자 화면의 파일 링크는 30일 동안 유효합니다. 원본은 직접 삭제하기 전까지 비공개 버킷에 유지됩니다.
- `청첩장 편집`에서 미리보기 표시를 끄면 서울 시간 기준 `2026-10-04` 당일에만 화면과 서버 업로드가 열립니다.
- 예식 이후에는 업로드 버튼이 닫히고, 기존 파일을 확인하고 삭제하는 `내가 보낸 파일` 버튼만 유지됩니다.

이전 버전의 `supabase-setup.sql`을 실행했다면 SQL Editor에서 최신 파일을 다시 실행해 주세요. 사진·영상 업로드 정책과 방명록 숨김 관리 기능이 반영됩니다.

하객 사진과 영상은 파일당 최대 50MB입니다. 현재 구현은 일반 업로드 방식을 사용하므로 큰 파일은 모바일 네트워크 상태에 따라 업로드가 불안정할 수 있습니다.

하객별 파일 구분에는 Supabase 익명 로그인을 사용합니다. Supabase Dashboard의 Authentication > Providers > Anonymous Sign-Ins를 활성화해야 합니다. 브라우저 데이터 삭제, 시크릿 모드 종료, 휴대폰 변경 후에는 기존 익명 로그인 정보를 복구할 수 없으므로 해당 하객이 기존 파일을 직접 삭제할 수 없습니다. 관리자 화면에서는 계속 확인할 수 있습니다.

## 청첩장 공유

공개 화면의 `청첩장 공유하기` 버튼에서는 휴대폰 앱 공유, 링크 복사, 문자 공유를 선택할 수 있습니다. 배포 환경에서는 `/api/share` Vercel 함수가 Supabase의 최신 메인 사진, 예식 정보, 초대 문구를 읽어 카카오톡 등에서 사용할 Open Graph 미리보기 카드를 만듭니다.

카카오톡은 이미 공유한 주소의 미리보기 정보를 일정 시간 캐시할 수 있습니다. 사진이나 문구를 바꾼 직후에는 기존 카드가 잠시 보일 수 있습니다.

## 파일 구조

```text
index.html          브라우저에서 여는 진입 파일
invitation-data.js  직접 수정할 청첩장 데이터
styles.css          디자인
app.js              화면 렌더링과 기능
admin.html          일반관리자 전용 화면
super-admin.html    슈퍼관리자 전용 화면
admin.js            참석 현황 화면 기능
rsvp-storage.js     참석 정보 저장 연결
supabase-config.js  Supabase 연결 값
supabase-setup.sql  참석 정보, 모바일 편집, 사진 저장 정책
image/              사진을 넣는 폴더
```

## 디자인과 AI 확장 기능

관리자 화면은 별도 페이지로 분리됩니다.

- `admin.html` 일반관리자: 청첩장 편집, 디자인 적용, 참석 현황, 하객 사진·영상
- `super-admin.html` 슈퍼관리자: 테마 생성 및 수정, 디자인 요소 생성, AI 설정, AI 생성물 라이브러리

`슈퍼관리자 > 디자인 요소 생성`은 프레임, 문구 테마, 섹션 아이콘, 배경 장식을 카테고리별 미리보기 카드로 보여줍니다. `새 디자인 소스 만들기` 모달 하나에서 유형을 고르고, 파일 업로드 또는 AI 채팅 생성 결과를 미리보기 한 뒤 저장합니다.

`디자인 적용` 프리셋은 `appearance.design`에 저장됩니다. 프리셋 변경은 `hero.image`를 수정하지 않고 팔레트, 프레임, 문구 배열, 섹션 아이콘, 배경 장식만 변경합니다. 예전 `appearance.theme`, `appearance.movieConcept`, `appearance.heroDecoration`, `appearance.heroTextTheme` 데이터는 `design-system.js`가 새 구조로 자동 보정합니다.

AI 기능은 기본적으로 `Mock Mode`입니다. 프론트엔드에는 API Key를 저장하지 않습니다. Mock Mode를 끄면 `ai-design-service.js`가 `/api/ai-design` 서버 함수를 호출합니다.

이미지 생성 프롬프트는 흰색 배경 이미지를 요청합니다. `ai-postprocess.js`에는 흰색 및 near-white 배경 제거, 투명 PNG 또는 SVG 변환, 미리보기, 사용자 수락, 저장 순서가 정의되어 있습니다. 실제 픽셀 처리기는 백엔드 연결 시 구현해야 합니다.

### OpenAI API 연결 방법

텍스트 기반 팔레트, 프레임 방향, 문구 테마 추천은 `api/ai-design.js` 서버 함수에 연결되어 있습니다.

1. OpenAI API Key를 발급합니다.
2. Vercel 프로젝트의 Settings > Environment Variables에 `OPENAI_API_KEY`를 등록합니다.
3. 같은 화면에 Structured Outputs를 지원하는 모델명을 `OPENAI_MODEL`로 등록합니다.
4. 재배포합니다.
5. 관리자 > AI 설정에서 서버 AI 엔드포인트를 `/api/ai-design`으로 둡니다.
6. `Mock Mode`를 끄고 저장합니다.
7. `연결 테스트`를 눌러 정상 연결 메시지를 확인합니다.

API Key는 `supabase-config.js`, `invitation-data.js`, 관리자 입력값에 넣지 마세요. 브라우저에는 Key가 노출되지 않고 `api/ai-design.js` 서버 함수만 환경변수를 읽습니다.

`api/ai-design.js`는 관리자 로그인 JWT를 확인하고 `rsvp_admins`에 등록된 계정만 허용합니다. 운영 전에는 Vercel 사용량 제한과 OpenAI 프로젝트 예산 알림도 함께 설정하세요.

프레임, 섹션 아이콘, 배경 장식의 실제 이미지 생성까지 연결하려면 이미지 생성용 서버 함수를 추가하고 생성 결과를 흰색 배경 제거 후 `invitation-media` Storage에 저장해야 합니다. 현재 이 세 기능은 Mock Mode에서 디자인 방향과 후처리 계획을 반환합니다.

### Google Gemini API 연결 방법

Gemini도 같은 `api/ai-design.js` 서버 함수에서 사용할 수 있습니다.

1. [Google AI Studio](https://aistudio.google.com)에 로그인합니다.
2. 왼쪽 메뉴 또는 상단의 `Get API key`를 누릅니다.
3. `Create API key`를 누릅니다.
4. 새 Google Cloud 프로젝트를 만들거나 기존 프로젝트를 선택합니다.
5. 발급된 API Key를 복사합니다.
6. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인합니다.
7. 청첩장 프로젝트를 선택합니다.
8. `Settings` > `Environment Variables`로 이동합니다.
9. `Key`에 `GEMINI_API_KEY`, `Value`에 발급받은 API Key를 입력하고 저장합니다.
10. 같은 화면에서 선택 사항으로 `GEMINI_MODEL`을 추가합니다. 비워두면 `gemini-2.5-flash`를 사용합니다.
11. Vercel 프로젝트의 `Deployments` 메뉴로 이동합니다.
12. 최신 배포의 `...` 메뉴에서 `Redeploy`를 누르거나 새 커밋을 push해서 다시 배포합니다.
13. 배포가 끝나면 `super-admin.html`에 로그인합니다.
14. 슈퍼관리자 메뉴에서 `AI 설정`을 누릅니다.
15. Provider를 `Google Gemini`로 선택합니다.
16. 서버 AI 엔드포인트가 `/api/ai-design`인지 확인합니다.
17. `Mock Mode`를 끄고 저장합니다.
18. `연결 테스트`를 눌러 정상 연결 메시지를 확인합니다.

Gemini API Key도 브라우저 코드에 넣지 마세요. `api/ai-design.js` 서버 함수만 `GEMINI_API_KEY` 환경변수를 읽습니다.

`gemini-2.5-flash`와 `gemini-2.5-flash-lite`는 Gemini Developer API 무료 티어가 있지만 요청 제한이 있습니다. 무료 티어 사용 데이터는 Google 제품 개선에 사용될 수 있습니다. `gemini-2.5-flash-image` 이미지 생성은 공식 가격표 기준 무료 티어가 제공되지 않습니다.

### Kakao 소셜가입 연결 방법

일반관리자 로그인 화면의 `카카오로 시작` 버튼은 Supabase Auth의 Kakao Provider를 사용합니다. 현재 버튼은 `admin.js`에서 `provider="kakao"`로 연결되어 있습니다.

먼저 Supabase 콜백 URL에 들어가는 `<project-ref>`를 확인합니다.

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인합니다.
2. 청첩장에 연결할 프로젝트를 클릭합니다.
3. 왼쪽 아래 `Project Settings`를 누릅니다.
4. `General` 또는 `API` 화면에서 Project Ref를 확인합니다.
5. Project Ref가 `abcdefghijklmnop`라면 Supabase 콜백 URL은 아래처럼 됩니다.

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

```text
https://abcdefghijklmnop.supabase.co/auth/v1/callback
```

그다음 Kakao Developers에서 앱을 설정합니다.

1. [Kakao Developers](https://developers.kakao.com)에 로그인합니다.
2. 상단 메뉴에서 `내 애플리케이션`을 누릅니다.
3. `애플리케이션 추가하기`를 누릅니다.
4. 앱 이름과 사업자명을 입력하고 저장합니다.
5. 생성된 앱을 클릭합니다.
6. 왼쪽 메뉴에서 `앱 설정` > `플랫폼`을 누릅니다.
7. `Web 플랫폼 등록`을 누릅니다.
8. 사이트 도메인에 실제 배포 도메인을 입력합니다.

```text
https://도메인
http://localhost:5500
```

9. 왼쪽 메뉴에서 `제품 설정` > `카카오 로그인`을 누릅니다.
10. `활성화 설정`을 `ON`으로 바꿉니다.
11. 같은 화면의 `Redirect URI` 영역에서 `Redirect URI 등록`을 누릅니다.
12. 위에서 만든 Supabase 콜백 URL을 입력하고 저장합니다.
13. 왼쪽 메뉴에서 `앱 설정` > `앱 키`를 누릅니다.
14. `REST API 키`를 복사해 둡니다.
15. 왼쪽 메뉴에서 `제품 설정` > `카카오 로그인` > `보안`을 누릅니다.
16. `Client Secret`을 활성화하고 코드를 복사해 둡니다.

마지막으로 Supabase에 Kakao Provider를 등록합니다.

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 프로젝트를 엽니다.
2. 왼쪽 메뉴에서 `Authentication`을 누릅니다.
3. `Providers`를 누릅니다.
4. 목록에서 `Kakao`를 찾아 클릭합니다.
5. `Enable Kakao provider`를 켭니다.
6. Client ID에는 Kakao의 `REST API 키`를 입력합니다.
7. Client Secret에는 Kakao Login의 `Client Secret`을 입력합니다.
8. 저장합니다.
9. 왼쪽 메뉴에서 `Authentication` > `URL Configuration`으로 이동합니다.
10. `Site URL`에 실제 사이트 주소를 입력합니다.
11. `Redirect URLs` 또는 `Additional Redirect URLs`에 관리자 주소를 추가합니다.

```text
https://도메인/admin.html
http://localhost:5500/admin.html
```

12. 저장 후 일반관리자 로그인 화면에서 `카카오로 시작`을 눌러 테스트합니다.

### Naver 소셜가입 연결 방법

Naver는 Supabase 기본 Provider가 아니라 Custom OAuth Provider로 연결합니다. 현재 버튼은 `admin.js`에서 `provider="custom:naver"`로 연결되어 있으므로 Supabase의 Provider ID를 `naver`로 맞춥니다.

먼저 Supabase 콜백 URL을 준비합니다. Kakao와 같은 URL을 사용합니다.

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Naver Developers에서 앱을 설정합니다.

1. [Naver Developers](https://developers.naver.com)에 로그인합니다.
2. 상단 또는 오른쪽의 `Application` 메뉴를 누릅니다.
3. `애플리케이션 등록`을 누릅니다.
4. 애플리케이션 이름을 입력합니다.
5. 사용 API에서 `네이버 아이디로 로그인`을 선택합니다.
6. 제공 정보를 선택합니다. 기본으로 `이메일`, `이름`을 선택합니다.
7. 로그인 오픈 API 서비스 환경에서 `PC 웹`을 선택합니다.
8. 서비스 URL에 실제 사이트의 기본 도메인을 입력합니다. 가입자마다 만들어지는 청첩장 주소나 관리자 데이터 주소를 넣는 칸이 아닙니다. 네이버 로그인 버튼이 있는 서비스의 대표 도메인만 넣습니다.

```text
https://도메인
http://localhost:5500
```

운영 도메인이 `https://vividvows.co.kr`라면 서비스 URL은 아래처럼 입력합니다.

```text
https://vividvows.co.kr
```

Vercel 기본 도메인을 그대로 쓰는 경우에는 아래처럼 입력합니다.

```text
https://mobile-wedding-expanded.vercel.app
```

로컬에서만 테스트할 때는 임시로 아래 주소를 사용할 수 있습니다. 운영 배포 후에는 실제 도메인으로 바꿉니다.

```text
http://localhost:5500
```

일반관리자 가입 후 생성되는 개인 청첩장 페이지와 관리자 데이터는 Supabase 로그인 완료 후 사이트 내부에서 만들어집니다. Naver Developers의 서비스 URL에 가입자별 주소를 미리 등록하지 않습니다.

로그인 후 일반관리자 페이지로 돌아오게 하려면 Supabase의 Redirect URL에는 `admin.html`까지 포함한 주소를 추가합니다.

```text
https://mobile-wedding-expanded.vercel.app/admin.html
```

Naver Developers의 서비스 URL은 대표 도메인이고, Supabase Redirect URL은 로그인 후 실제로 돌아올 관리자 페이지 주소입니다.

9. Callback URL에 Supabase 콜백 URL을 입력합니다.

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

10. 등록을 완료합니다.
11. 생성된 애플리케이션 상세 화면에서 Client ID와 Client Secret을 복사해 둡니다.

Supabase에서 Custom OAuth Provider를 만듭니다.

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 프로젝트를 엽니다.
2. 왼쪽 메뉴에서 `Authentication`을 누릅니다.
3. `Providers`를 누릅니다.
4. `Add provider` 또는 `New provider`를 누릅니다.
5. `Custom OAuth` 또는 `Custom OAuth2` provider를 선택합니다. `OIDC`, `Auto-discovery`, `OpenID Connect`가 아니라 OAuth2 수동 설정을 선택해야 합니다.
6. Provider ID를 `naver`로 입력합니다. 이 값이 `custom:naver`의 `naver` 부분입니다.
7. Client ID에는 Naver Client ID를 입력합니다.
8. Client Secret에는 Naver Client Secret을 입력합니다.
9. 화면에 `Issuer URL` 또는 `발급자 URL`이 필수로 보이면 아래 값을 입력합니다.

```text
Issuer URL: https://nid.naver.com
```

10. OAuth endpoint를 아래처럼 입력합니다.

```text
Authorization URL: https://nid.naver.com/oauth2.0/authorize
Token URL: https://nid.naver.com/oauth2.0/token
UserInfo URL: https://openapi.naver.com/v1/nid/me
Scope: name email
```

11. `JWKS URI`가 선택 입력이면 비워둡니다. 필수로 요구되면 현재 화면이 OIDC 검증 방식일 수 있으니 Supabase의 `Manual configuration` 선택 여부를 다시 확인합니다.
12. 저장합니다.
13. 왼쪽 메뉴에서 `Authentication` > `URL Configuration`으로 이동합니다.
14. `Site URL`에 실제 사이트 주소를 입력합니다.
15. `Redirect URLs` 또는 `Additional Redirect URLs`에 관리자 주소를 추가합니다.

```text
https://도메인/admin.html
http://localhost:5500/admin.html
```

16. 저장 후 일반관리자 로그인 화면에서 `네이버로 시작`을 눌러 테스트합니다.

### AI 기능 확장 계획

현재 연결 준비가 된 AI 기능은 슈퍼관리자 영역입니다.

- `슈퍼관리자 > AI 설정`: Provider, 서버 엔드포인트, Mock Mode 설정
- `슈퍼관리자 > 테마 생성 및 수정`: `/api/ai-design` 서버 함수로 연결 가능
- `슈퍼관리자 > 디자인 요소 생성`: `/api/ai-design` 서버 함수로 연결 가능

추가 구현이 필요한 AI 기능은 일반관리자 영역입니다.

- `일반관리자 > 교통안내 AI`: 예식장 기준 가장 가까운 기차역, 지하철역, 버스정류장, 차량, 대중교통, 도보 안내 초안 생성
- `일반관리자 > 식장안내 AI`: 주차, 식사, 층, 홀, 포토부스, 엘리베이터, 유아동반, 화환 여부 등 안내사항 초안 생성

다음 구현 전에 확인해야 할 정보는 아래와 같습니다.

- 배포 플랫폼: Vercel, Netlify, 자체 서버 중 무엇인지
- 실제 서비스 도메인
- Supabase Project Ref 또는 Supabase URL
- AI Provider: Gemini만 사용할지, OpenAI도 함께 남길지
- 교통안내에 사용할 지도 API: Kakao Maps, Naver Maps, Google Maps 중 선택
- AI 결과 적용 방식: 바로 덮어쓰기 또는 미리보기 후 적용
- 교통안내 대상: 한국 예식장만 지원할지, 해외 예식장도 지원할지
- 식장안내 필수 항목: 주차, 식사, 층/홀, 포토부스, 엘리베이터, 유아동반, 화환 여부 등

교통안내와 식장안내는 하객 이동에 직접 영향을 주므로 `AI 초안 생성 -> 관리자 확인 -> 적용` 흐름으로 구현하는 것을 권장합니다.

## 하객 사진·영상 업로드 정책 변경

하객 사진과 영상은 익명 로그인 세션을 만든 뒤 `guestPhotos.uploadSlug/익명사용자ID/파일명` 경로로 저장합니다. 운영 중인 프로젝트에서 업로드 권한 오류가 발생하면 SQL Editor에서 `supabase-guest-photo-policy-fix.sql`을 실행하세요. Storage RLS는 경로 문자열 대신 Storage가 자동으로 기록하는 `owner_id`와 현재 로그인 사용자의 `auth.uid()`를 비교합니다. `guestPhotos.eventDate`와 `guestPhotos.previewVisible`은 화면에서 업로드 버튼 노출 시점을 제어합니다.

Supabase Dashboard의 `Authentication > Providers > Anonymous Sign-Ins`도 활성화해야 합니다. 익명 로그인 사용자는 로그인하지 않은 `anon` 역할이 아니라 `authenticated` 역할로 Storage 정책을 통과합니다.

### 하객 사진·영상 업로드 오류 복구 순서

`new row violates row-level security policy` 오류가 보이면 다음 순서대로 설정합니다.

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인합니다.
2. 현재 청첩장에 연결한 Supabase 프로젝트를 선택합니다.
3. 왼쪽 메뉴에서 `SQL Editor`를 누릅니다.
4. `New query`를 눌러 빈 쿼리를 만듭니다.
5. 프로젝트 파일 `supabase-guest-photo-policy-fix.sql`의 내용을 붙여 넣습니다.
6. 오른쪽 아래 `Run` 버튼을 누릅니다.
7. 오류 없이 완료되면 왼쪽 메뉴에서 `Authentication`을 누릅니다.
8. `Providers` 화면에서 `Anonymous Sign-Ins` 항목을 찾습니다.
9. `Enable Anonymous Sign-Ins`를 켜고 저장합니다.
10. 청첩장 페이지를 새로고침한 뒤 웨딩스냅 사진 또는 영상을 다시 업로드합니다.

SQL 패치는 비공개 `guest-photos` 버킷을 확인하고, 파일당 최대 용량을 50MB로 설정하며, 업로드·본인 조회·본인 삭제 정책을 `owner_id = auth.uid()` 기준으로 다시 만듭니다.
