# node-tar CTF 서비스 (safe version)

이 프로젝트는 `node-tar`를 사용하는 이미지 업로드 웹 서비스 예제입니다.  
CTF 문제로 사용할 때는 출제자가 보안 체크 부분을 이해한 뒤 직접 수정해서 사용해야 합니다.

## 기능 개요

- `POST /upload`
  - 필드 이름 `file`로 `.tar` 파일을 업로드합니다.
  - 서버는 `uploads/` 디렉토리에 tar 파일을 저장한 뒤,
  - `node-tar`를 이용해 `public/` 디렉토리 아래로 압축을 해제합니다.
  - **정상 버전(현재 코드)은 아래 조건을 만족하는 엔트리만 해제합니다.**
    - regular file (일반 파일) 타입
    - 파일 이름이 `.jpg`로 끝남
    - 경로 탈출 없이 `public/` 디렉토리 내부에만 위치

- `GET /images/*`
  - `public/` 디렉토리 아래의 파일을 정적 서빙합니다.

- `GET /flag`
  - 프로젝트 루트에 있는 `isadmin.txt` 파일 내용을 읽습니다.
  - 내용이 `true` 이면 플래그를 반환합니다.
  - 기본값은 `false`입니다.

## 로컬 실행 방법

```bash
npm install
npm start
```

- 서버는 기본적으로 `http://localhost:3000/` 에서 실행됩니다.

## Docker로 실행하기

```bash
docker build -t node-tar-ctf-safe .
docker run -p 3000:3000 --name node-tar-ctf node-tar-ctf-safe
```

- 이후 브라우저에서 `http://localhost:3000` 으로 접속합니다.

## CTF 출제자 참고

- 현재 코드는 가능한 한 **안전하게** 작성되어 있습니다.
- 출제자가 의도한 취약점을 만들고 싶다면:
  - `server.js` 안의
    - 파일 타입 검사
    - 확장자 검사
    - 경로 탈출 방지 로직
  - 등을 이해한 뒤, 직접 수정하여 사용해야 합니다.

