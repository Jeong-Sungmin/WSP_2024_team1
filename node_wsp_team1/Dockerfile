# Node.js 이미지를 기반으로 시작
FROM node:16

# 컨테이너 내부 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일을 컨테이너로 복사
COPY package*.json ./

# 의존성 설치
RUN npm install

# 프로젝트 소스 복사
COPY . .

# Nodemon 실행 설정 (개발 환경)
CMD ["npx", "nodemon", "index.js"]

# 애플리케이션이 사용하는 포트 노출
EXPOSE 3000
