// app.js

const express = require("express");
const path = require("path");
const admin = require("firebase-admin");
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
  getDetailedFairyTalesByUid,
  getUsers,
  updateUser,
  getMyFairyTales,
  getFairyTaleDetails,
} = require("./controller/dbController");
const fairytale = require("./controller/controller");
const { verifyToken, verifyAdmin } = require("./middleware/authMiddleware"); // 미들웨어 import
const app = express();

// Middleware 설정
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 요청 본문 파싱

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

// /home 경로로 HTML 파일 서빙
app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/testAboutMainScreen.html"));
});

// /login 경로로 HTML 파일 서빙
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/login.html"));
});

// 보호된 라우트 예시: 클라이언트에서 idToken을 전달받아 인증 후 DB 접근
app.get("/protected", verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    // Realtime Database에서 해당 uid로 사용자 데이터 가져오기
    const userRef = admin.database().ref(`users/${uid}`);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
      return res.status(404).send("User not found in Realtime Database");
    }

    // 사용자 데이터 반환
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

// 예시: 데이터 생성 라우트
app.post("/create", verifyToken, async (req, res) => {
  // 보호된 라우트로 변경
  const { path, data } = req.body;
  try {
    await createData(path, data);
    res.status(200).send("Data created successfully");
  } catch (error) {
    res.status(500).send("Error creating data");
  }
});

// 예시: 데이터 읽기 라우트
app.get("/read", verifyToken, async (req, res) => {
  // 보호된 라우트로 변경
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
app.patch("/update", verifyToken, async (req, res) => {
  // 보호된 라우트로 변경
  const { path, updatedFields } = req.body;
  try {
    await updateData(path, updatedFields);
    res.status(200).send("Data updated successfully");
  } catch (error) {
    res.status(500).send("Error updating data");
  }
});

/**
 * 사용자용: 초기 동화 생성 라우트
 * 인증된 사용자만 접근 가능
 */
app.post("/createFairyTale", verifyToken, async (req, res) => {
  const { inputData, selectedType } = req.body;

  if (!inputData || !selectedType) {
    return res.status(400).send("inputData and selectedType are required");
  }

  try {
    const uid = req.user.uid; // 인증된 사용자의 UID
    const index = await createFairyTale(uid, inputData, selectedType);
    res
      .status(200)
      .json({ message: "Fairy tale created successfully", index: index });
  } catch (error) {
    console.error("Error creating fairy tale:", error);
    res.status(500).send("Error creating fairy tale");
  }
});

/**
 * 사용자용: 특정 동화에 필드 추가하는 라우트
 * 인증된 사용자만 접근 가능
 */
app.patch("/addFairyTaleFields/:index", verifyToken, async (req, res) => {
  const index = parseInt(req.params.index, 10);
  const { title, img, context, voice } = req.body;

  if (isNaN(index)) {
    return res.status(400).send("Valid fairy tale index is required");
  }

  // 최소 하나 이상의 필드가 있어야 합니다.
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

// 예시: 데이터 삭제 라우트
app.delete("/delete", verifyToken, async (req, res) => {
  // 보호된 라우트로 변경
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

/**
 * 관리자용: 모든 사용자 목록을 조회하거나 검색하는 라우트
 * 관리자만 접근 가능
 */
app.get("/admin/users", verifyToken, verifyAdmin, async (req, res) => {
  const searchQuery = req.query.search || "";

  try {
    const users = await getUsers(searchQuery);
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Error fetching users");
  }
});

/**
 * 관리자용: 특정 사용자의 정보를 업데이트하는 라우트
 * 관리자만 접근 가능
 */
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
    console.error(`Error updating user data for UID ${uid}:`, error);
    res.status(500).send("Error updating user data");
  }
});

/**
 * 관리자용: 특정 사용자의 동화 목록을 조회하는 라우트
 * 관리자만 접근 가능
 */
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

/**
 * 관리자용: 특정 동화의 상세 정보를 조회하는 라우트
 * 관리자만 접근 가능
 */
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

/**
 * 관리자용: 특정 동화를 삭제하는 라우트
 * 관리자만 접근 가능
 */
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

/**
 * 사용자용: 자신의 모든 동화를 조회하는 라우트
 * 인증된 사용자만 접근 가능
 */
app.get("/user/fairyTales", verifyToken, async (req, res) => {
  const uid = req.user.uid; // 인증된 사용자의 UID

  try {
    const fairyTales = await getMyFairyTales(uid);
    res.status(200).json(fairyTales);
  } catch (error) {
    console.error("Error fetching user's fairy tales:", error);
    res.status(500).send("Error fetching your fairy tales");
  }
});

// main스크린에서 동화제작 버튼을 눌렀을 시, controller.js의 함수를 가져와서 실행 후
// display.html로 리다이렉트 하는 구문
app.post("/generate", async (req, res) => {
  try {
    const result = await fairytale.processFairytaleData(req.body);
    // display.html로 리다이렉트하고, 생성된 데이터를 쿼리 파라미터로 전달합니다.
    res.redirect(
      `/display.html?data=${encodeURIComponent(JSON.stringify(result))}`
    );
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
