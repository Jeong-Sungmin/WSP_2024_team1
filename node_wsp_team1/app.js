// app.js

const express = require("express");
const path = require("path");
const admin = require("firebase-admin");
const {
  saveUser,
  createData,
  readData,
  updateData,
  deleteData,
} = require("./controller/dbController");

const app = express();

// Firebase Admin SDK 초기화
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
      "https://wspteam1-5159b-default-rtdb.asia-southeast1.firebasedatabase.app/", // 실제 DB URL로 교체
  });
}

const db = admin.database();

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

// 보호된 라우트 예시: 클라이언트에서 idToken을 전달받아 인증 후 DB 접근
app.get("/protected", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized: No token provided");
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    // idToken 검증
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Realtime Database에서 해당 uid로 사용자 데이터 가져오기
    const userRef = admin.database().ref(`users/${uid}`);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).send("User not found in Realtime Database");
    }

    // 사용자 데이터 반환
    res.json(snapshot.val());
  } catch (error) {
    console.error("Error verifying token or fetching user data:", error);
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

// 예시: 데이터 생성 라우트
app.post("/create", async (req, res) => {
  const { path, data } = req.body;
  try {
    await createData(path, data);
    res.status(200).send("Data created successfully");
  } catch (error) {
    res.status(500).send("Error creating data");
  }
});

// 예시: 데이터 읽기 라우트
app.get("/read", async (req, res) => {
  const { path } = req.query;
  try {
    const data = await readData(path);
    if (data) {
      res.status(200).json(data);
    } else {
      res.status(404).send("No data found at the specified path");
    }
  } catch (error) {
    res.status(500).send("Error reading data");
  }
});

// 예시: 데이터 업데이트 라우트
app.patch("/update", async (req, res) => {
  const { path, updatedFields } = req.body;
  try {
    await updateData(path, updatedFields);
    res.status(200).send("Data updated successfully");
  } catch (error) {
    res.status(500).send("Error updating data");
  }
});

// 예시: 데이터 삭제 라우트
app.delete("/delete", async (req, res) => {
  const { path } = req.body;
  try {
    await deleteData(path);
    res.status(200).send("Data deleted successfully");
  } catch (error) {
    res.status(500).send("Error deleting data");
  }
});

// 예시: 사용자 정보 저장 라우트 (회원가입 및 로그인 후 호출)
app.post("/saveUser", async (req, res) => {
  const { idToken, user } = req.body; // 클라이언트에서 uid로 전송하도록 수정됨

  if (!idToken || !user) {
    return res.status(400).send("idToken and user data are required");
  }

  try {
    // idToken 검증
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    if (uid !== user.uid) {
      // 'uID'에서 'uid'로 변경
      return res.status(403).send("UID mismatch");
    }

    // 사용자 정보 저장
    await saveUser(user);
    res.status(200).send("User data saved successfully");
  } catch (error) {
    console.error("Error saving user data:", error);
    res.status(500).send("Error saving user data");
  }
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
