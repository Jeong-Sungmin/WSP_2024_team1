const express = require("express");
const path = require("path");

const app = express();

// Static 파일 서빙 설정
app.use(express.static(path.join(__dirname)));

// /home 경로로 HTML 파일 서빙
app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "testAboutMainScreen.html"));
});

// 기본 라우트
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Home Page</title>
      </head>
      <body>
        <h1>Hello, Docker and Node.js!</h1>
        <button onclick="location.href='/home'">Go to Home</button>
      </body>
    </html>
  `);
});

// 서버 실행
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});