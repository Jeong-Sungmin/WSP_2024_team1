// authMiddleware.js
const admin = require("./firebaseAdmin");

/**
 * 토큰을 검증하고, 인증된 사용자 정보를 req.user에 저장하는 미들웨어
 */
async function verifyToken(req, res, next) {
  // 쿠키에서 토큰 추출
  const token = req.cookies.idToken;

  console.log("verifyToken Middleware: Received request");
  console.log("verifyToken Middleware: Extracted token:", token);

  if (!token) {
    console.warn("verifyToken Middleware: No ID token found in cookies.");
    return res.status(401).send("Unauthorized: No token provided");
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    console.log("verifyToken Middleware: Decoded Token:", decodedToken);
    next();
  } catch (error) {
    console.error(
      "verifyToken Middleware: Error verifying Firebase ID token:",
      error
    );
    res.status(401).send("Unauthorized: Invalid token");
  }
}

/**
 * 관리자 권한을 확인하는 미들웨어
 */
async function verifyAdmin(req, res, next) {
  if (!req.user || !req.user.uid) {
    console.warn(
      "verifyAdmin Middleware: req.user or req.user.uid is undefined."
    );
    return res.status(403).send("Forbidden: User not authenticated");
  }

  const uid = req.user.uid;

  console.log(`verifyAdmin Middleware: Verifying admin role for UID: ${uid}`);

  try {
    const userSnapshot = await admin
      .database()
      .ref(`users/${uid}`)
      .once("value");
    const userData = userSnapshot.val();

    console.log("verifyAdmin Middleware: Retrieved user data:", userData);

    if (userData && userData.role === "admin") {
      console.log(`verifyAdmin Middleware: User UID ${uid} is an admin.`);
      next();
    } else {
      console.warn(`verifyAdmin Middleware: User UID ${uid} is not an admin.`);
      res.status(403).send("Forbidden: Admins only");
    }
  } catch (error) {
    console.error("verifyAdmin Middleware: Error verifying admin role:", error);
    res.status(500).send("Internal Server Error");
  }
}

module.exports = {
  verifyToken,
  verifyAdmin,
};
