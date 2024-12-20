// app.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser"); // 쿠키 파서 추가
const admin = require("./firebaseAdmin"); // Firebase Admin 초기화 모듈 불러오기
const {
  saveUser,
  createFairyTale,
  addFairyTaleFields,
  createData,
  readData,
  updateData,
  deleteData,
  deleteFairyTale,
  getFairyTalesByUid,
  getFairyTaleDetails,
  getUsers,
  updateUser,
  getMyFairyTales,
} = require("./controller/dbController");
const fairytale = require("./controller/controller");
const { verifyToken, verifyAdmin } = require("./authMiddleware");

const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "private")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // 쿠키 파싱 미들웨어 등록

// /home 경로로 HTML 파일 서빙
app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/board.html"));
});

// /login 경로로 HTML 파일 서빙
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/login.html"));
});

// 관리자 페이지 라우트
// verifyToken, verifyAdmin 미들웨어 통해 인증 및 권한 체크 후 admin.html 서빙
app.get("/admin", verifyToken, verifyAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "/private/admin.html"));
});

// 로그인/회원가입/구글 로그인 성공 시 토큰을 쿠키에 설정하는 라우트
app.post("/setToken", async (req, res) => {
  const { idToken, user } = req.body;

  if (!idToken || !user) {
    return res.status(400).send("idToken과 user data 필요");
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    if (uid !== user.uid) {
      return res.status(403).send("UID 불일치");
    }

    // 신규 사용자일 경우 DB에 저장
    const userSnapshot = await admin
      .database()
      .ref(`users/${uid}`)
      .once("value");
    if (!userSnapshot.exists()) {
      await saveUser(user);
    }

    // HttpOnly 쿠키 설정
    res.cookie("idToken", idToken, {
      httpOnly: true,
      secure: false, // HTTPS 환경에서는 true로 설정 권장
      sameSite: "Strict",
      maxAge: 60 * 60 * 1000, // 1시간
    });

    res.status(200).send("토큰이 쿠키에 설정되었습니다.");
  } catch (error) {
    console.error("토큰 검증/저장 중 오류:", error);
    res.status(500).send("서버 오류");
  }
});

// 보호된 라우트 예: 사용자 정보 반환
app.get("/protected", verifyToken, async (req, res) => {
  const uid = req.user.uid;
  try {
    const snapshot = await admin.database().ref(`users/${uid}`).once("value");
    if (!snapshot.exists()) {
      return res.status(404).send("User not found");
    }
    res.json(snapshot.val());
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).send("Internal Server Error");
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

// 예시: 데이터 생성 라우트 (보호 필요)
app.post("/create", verifyToken, async (req, res) => {
  const { path, data } = req.body;
  try {
    await createData(path, data);
    res.status(200).send("Data created successfully");
  } catch (error) {
    res.status(500).send("Error creating data");
  }
});

// 예시: 데이터 읽기 라우트 (보호 필요)
app.get("/read", verifyToken, async (req, res) => {
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

// 예시: 데이터 업데이트 라우트 (보호 필요)
app.patch("/update", verifyToken, async (req, res) => {
  const { path, updatedFields } = req.body;
  try {
    await updateData(path, updatedFields);
    res.status(200).send("Data updated successfully");
  } catch (error) {
    res.status(500).send("Error updating data");
  }
});

// 사용자용: 초기 동화 생성 라우트
app.post("/createFairyTale", verifyToken, async (req, res) => {
  const { inputData, selectedType } = req.body;

  if (!inputData || !selectedType) {
    return res.status(400).send("inputData and selectedType are required");
  }

  try {
    const uid = req.user.uid;
    const index = await createFairyTale(uid, inputData, selectedType);
    res
      .status(200)
      .json({ message: "Fairy tale created successfully", index: index });
  } catch (error) {
    console.error("Error creating fairy tale:", error);
    res.status(500).send("Error creating fairy tale");
  }
});

// 사용자용: 특정 동화에 필드 추가하는 라우트
app.patch("/addFairyTaleFields/:index", verifyToken, async (req, res) => {
  const index = parseInt(req.params.index, 10);
  const { title, img, context, voice } = req.body;

  if (isNaN(index)) {
    return res.status(400).send("Valid fairy tale index is required");
  }

  if (!title && !img && !context && !voice) {
    return res
      .status(400)
      .send("At least one field (title, img, context, voice) is required");
  }

  const fieldsToUpdate = {};
  if (title) fieldsToUpdate.title = title;
  if (img) fieldsToUpdate.img = img;
  if (context) fieldsToUpdate.context = context;
  if (voice) fieldsToUpdate.voice = voice;

  try {
    const fairyTale = await getFairyTaleDetails(index);
    // req.user.role은 verifyToken/verifyAdmin에서 설정됨
    if (fairyTale.uid !== req.user.uid && req.user.role !== "admin") {
      return res
        .status(403)
        .send("Forbidden: You can only modify your own fairy tales");
    }

    await addFairyTaleFields(index, fieldsToUpdate);
    res
      .status(200)
      .send(`Fields added successfully to fairy tale with index ${index}`);
  } catch (error) {
    console.error(
      `Error adding fields to fairy tale with index ${index}:`,
      error
    );
    res.status(500).send("Error adding fields to fairy tale");
  }
});

// 데이터 삭제 라우트 (보호 필요)
app.delete("/delete", verifyToken, async (req, res) => {
  const { path } = req.body;
  try {
    await deleteData(path);
    res.status(200).send("Data deleted successfully");
  } catch (error) {
    res.status(500).send("Error deleting data");
  }
});

app.post("/saveUser", async (req, res) => {
  const { idToken, user } = req.body;
  if (!idToken || !user) {
    return res.status(400).send("idToken과 사용자 데이터가 필요합니다.");
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    if (uid !== user.uid) {
      return res.status(403).send("UID 불일치 오류");
    }

    const userSnapshot = await admin
      .database()
      .ref(`users/${uid}`)
      .once("value");
    if (!userSnapshot.exists()) {
      await saveUser(user);
      console.log("새로운 사용자를 데이터베이스에 저장했습니다.");
    } else {
      console.log("사용자가 이미 존재합니다. 업데이트하지 않습니다.");
    }

    res.status(200).send("사용자 데이터가 성공적으로 처리되었습니다.");
  } catch (error) {
    console.error("사용자 데이터 처리 중 오류:", error);
    res.status(500).send("사용자 데이터 처리 중 서버 오류가 발생했습니다.");
  }
});

// 관리자용: 모든 사용자 목록 조회
app.get("/admin/users", verifyToken, verifyAdmin, async (req, res) => {
  const searchQuery = req.query.search || "";
  try {
    const users = await getUsers(searchQuery);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).send("Error fetching users");
  }
});

// 관리자용: 특정 사용자 정보 업데이트
app.patch("/admin/users/:uid", verifyToken, verifyAdmin, async (req, res) => {
  const uid = req.params.uid;
  const updatedData = req.body;

  if (!uid || !updatedData) {
    return res.status(400).send("uid and updatedData are required");
  }

  try {
    await updateUser(uid, updatedData);
    res.status(200).send(`User data updated successfully for UID ${uid}`);
  } catch (error) {
    res.status(500).send("Error updating user data");
  }
});

// 관리자용: 특정 사용자의 동화 목록 조회
app.get(
  "/admin/users/:uid/fairyTales",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const uid = req.params.uid;
    if (!uid) {
      return res.status(400).send("uid is required");
    }
    try {
      const fairyTales = await getFairyTalesByUid(uid);
      res.status(200).json(fairyTales);
    } catch (error) {
      console.error(`Error fetching fairy tales for UID ${uid}:`, error);
      res.status(500).send("Error fetching fairy tales");
    }
  }
);

// 관리자용: 특정 동화 상세 정보 조회
app.get(
  "/admin/fairyTale/:index",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const index = parseInt(req.params.index, 10);
    if (isNaN(index)) {
      return res.status(400).send("Valid fairy tale index is required");
    }

    try {
      const fairyTale = await getFairyTaleDetails(index);
      res.status(200).json(fairyTale);
    } catch (error) {
      console.error(
        `Error fetching fairy tale details for index ${index}:`,
        error
      );
      res.status(500).send("Error fetching fairy tale details");
    }
  }
);

// 관리자용: 특정 동화 삭제
app.delete(
  "/admin/fairyTale/:index",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const index = parseInt(req.params.index, 10);
    if (isNaN(index)) {
      return res.status(400).send("Valid fairy tale index is required");
    }

    try {
      await deleteFairyTale(index);
      res
        .status(200)
        .send(`Fairy tale with index ${index} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting fairy tale with index ${index}:`, error);
      res.status(500).send("Error deleting fairy tale");
    }
  }
);

// 사용자용: 자신의 모든 동화 조회
app.get("/user/fairyTales", verifyToken, async (req, res) => {
  const uid = req.user.uid;
  try {
    const fairyTales = await getMyFairyTales(uid);
    res.status(200).json(fairyTales);
  } catch (error) {
    console.error("Error fetching user's fairy tales:", error);
    res.status(500).send("Error fetching your fairy tales");
  }
});

// 메인스크린 동화제작 예시
app.post("/generateExpert", async (req, res) => {
  try {
    const result = await fairytale.processFairytaleDataExpert(req.body);
    res.json(result);
    console.log("generate complete");
  } catch (error) {
    console.error("Error processing fairy tale data:", error);
    res.status(500).send("Error processing fairy tale data");
  }
});

app.post("/generateBeginner", async (req, res) => {
  try {
    const result = await fairytale.processFairytaleDataBeginner(req.body);
    res.json(result);
    console.log("generate complete");
  } catch (error) {
    console.error("Error processing fairy tale data:", error);
    res.status(500).send("Error processing fairy tale data");
  }
});

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
