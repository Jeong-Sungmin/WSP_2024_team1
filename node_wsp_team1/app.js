const express = require("express");
const path = require("path");
const admin = require("firebase-admin");

const app = express();

// Firebase Admin SDK 초기화
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
  databaseURL: "https://your-project-id.firebaseio.com", // Firestore를 사용하는 경우
});

// Middleware 설정
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 요청 본문 파싱

// /home 경로로 HTML 파일 서빙
app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/testAboutMainScreen.html"));
});

// /login 경로로 HTML 파일 서빙
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/login.html"));
});

// 보호된 라우트 예시
app.get("/protected", async (req, res) => {
  const idToken = req.headers.authorization?.split("Bearer ")[1];
  if (!idToken) {
    return res.status(401).send("Unauthorized: No token provided");
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    // Firestore에서 사용자 데이터 가져오기
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send("User not found");
    }
    res.json(userDoc.data());
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).send("Unauthorized: Invalid token");
  }
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

// main스크린에서 동화제작 버튼을 눌렀을 시, controller.js의 함수를 가져와서 실행 후
// display.html로 리다이렉트 하는 구문
app.post('/generate', async (req, res) => {
  try {
    const result = await fairytale.processFairytaleData(req.body);
    // display.html로 리다이렉트하고, 생성된 데이터를 쿼리 파라미터로 전달합니다.
    res.redirect(`/display.html?data=${encodeURIComponent(JSON.stringify(result))}`);
  } catch (error) {
    console.error('Error processing fairytale data:', error);
    res.status(500).send('Error processing fairytale data');
  }
});

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
