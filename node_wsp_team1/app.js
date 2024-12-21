// app.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser"); // 쿠키 파서 추가
const admin = require("./firebaseAdmin"); // Firebase Admin 초기화 모듈 불러오기
const {
  saveUser,
  createFairyTale,
  deleteFairyTale,
  getFairyTalesByUid,
  getFairyTaleDetails,
  getUsers,
  updateUser,
  updateFairyTale,
} = require("./controller/dbController");
const fairytale = require("./controller/controller");
const { verifyToken, verifyAdmin } = require("./authMiddleware");

const app = express();

// 미들웨어 설정
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "private")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // 쿠키 파싱 미들웨어 등록

// 기본 라우트
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

// /login 라우트 -> login.html
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/board", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "board.html"));
});
// 관리자 페이지 라우트
// verifyToken, verifyAdmin 미들웨어 통해 인증 및 권한 체크 후 admin.html 서빙
app.get("/admin", verifyToken, verifyAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "private", "admin.html"));
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
      console.log("새로운 사용자를 데이터베이스에 저장했습니다.");
    } else {
      console.log("사용자가 이미 존재합니다. 업데이트하지 않습니다.");
    }

    // HttpOnly 쿠키 설정
    res.cookie("idToken", idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS 환경에서는 true로 설정 권장
      sameSite: "Strict",
      maxAge: 4 * 60 * 60 * 1000, // 4시간
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

// 로그아웃 라우트: 세션 쿠키 삭제
app.post("/logout", (req, res) => {
  res.clearCookie("idToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  res.status(200).send("로그아웃 성공");
});

// 사용자 데이터 저장 라우트
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
    console.error("Error fetching users:", error);
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
    console.error("Error updating user data:", error);
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

// 사용자용: 자신의 특정 동화 삭제
app.delete("/user/fairyTales/:index", verifyToken, async (req, res) => {
  const index = req.index;
  //req로 받아온 index값을 통해 동화 삭제
  if (isNaN(index)) {
    return res.status(400).send("Valid fairy tale index is required");
  }

  try {
    await deleteFairyTale(index);
    res.status(200).send(`Fairy tale with index ${index} deleted successfully`);
  } catch (error) {
    console.error(`Error deleting fairy tale with index ${index}:`, error);
    res.status(500).send("Error deleting fairy tale");
  }
});

// 메인스크린 동화제작 예시
app.post("/generateExpert", verifyToken, async (req, res) => {
  try {
    const inputData = req.body;
    console.log("Received inputData for /generateExpert:", inputData);

    // `req.user`가 정의되어 있는지 확인
    if (!req.user) {
      console.warn("Unauthorized access: req.user is undefined");
      return res.status(401).send("Unauthorized: User not authenticated");
    }

    const uid = req.user.uid;
    console.log(`Authenticated user UID: ${uid}`);

    if (!inputData) {
      return res.status(400).send("inputData and result are required");
    }
    const index = await createFairyTale(uid, inputData);
    console.log("Fairy tale created with index:", index);

    const result = await fairytale.processFairytaleDataExpert(req.body, index);
    if (!result) {
      return res.status(400).send("inputData and result are required");
    }
    console.log("Processed fairy tale result for /generateExpert:", result);

    const update = await updateFairyTale(index, result);

    return res.status(200).json({
      message: "Fairy tale created successfully",
      index: index,
      update,
    });
  } catch (error) {
    console.error("Error in /generateExpert:", error);

    // 이미 응답을 보냈는지 확인 후 에러 응답
    if (!res.headersSent) {
      return res.status(500).send("Error processing fairy tale data");
    }
  }
});

app.post("/generateBeginner", verifyToken, async (req, res) => {
  try {
    const inputData = req.body;
    console.log("Received inputData for /generateBeginner:", inputData);

    // `req.user`가 정의되어 있는지 확인
    if (!req.user) {
      console.warn("Unauthorized access: req.user is undefined");
      return res.status(401).send("Unauthorized: User not authenticated");
    }

    const uid = req.user.uid;
    console.log(`Authenticated user UID: ${uid}`);

    //먼저 db 한번 등록후 counter 값 받아오기

    if (!inputData) {
      return res.status(400).send("inputData and result are required");
    }

    //여기서 db 1차 등록
    const index = await createFairyTale(uid, inputData);
    console.log("Fairy tale created with index:", index);

    // 여기서 동화 및 이미지 , Tts 생성
    const result = await fairytale.processFairytaleDataBeginner(
      req.body,
      index
    );
    if (!result) {
      return res.status(400).send("inputData and result are required");
    }
    console.log("Processed fairy tale result for /generateBeginner:", result);

    const update = await updateFairyTale(index, result);
    return res.status(200).json({
      message: "Fairy tale created successfully",
      index: index,
      update,
    });
  } catch (error) {
    console.error("Error in /generateBeginner:", error); // 라우트 이름 수정

    // 이미 응답을 보냈는지 확인 후 에러 응답
    if (!res.headersSent) {
      return res.status(500).send("Error processing fairy tale data");
    }
  }
});

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
