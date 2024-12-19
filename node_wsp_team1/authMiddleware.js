// authMiddleware.js
const admin = require("./firebaseAdmin");

/**
 * 토큰을 검증하고, 인증된 사용자 정보를 req.user에 저장하는 미들웨어
 */
async function verifyToken(req, res, next) {
  // 쿠키에서 토큰 추출
  const token = req.cookies.idToken;

  if (!token) {
    return res.status(401).send("Unauthorized: No token provided");
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    res.status(401).send("Unauthorized: Invalid token");
  }
}

/**
 * 관리자 권한을 확인하는 미들웨어
 */
async function verifyAdmin(req, res, next) {
  const uid = req.user.uid;

  try {
    const userSnapshot = await admin
      .database()
      .ref(`users/${uid}`)
      .once("value");
    const userData = userSnapshot.val();

    if (userData && userData.role === "admin") {
      next();
    } else {
      res.status(403).send("Forbidden: Admins only");
    }
  } catch (error) {
    console.error("Error verifying admin role:", error);
    res.status(500).send("Internal Server Error");
  }
}

module.exports = {
  verifyToken,
  verifyAdmin,
};
