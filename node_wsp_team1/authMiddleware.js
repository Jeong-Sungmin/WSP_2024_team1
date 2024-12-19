// middleware/authMiddleware.js

const admin = require("firebase-admin");

/**
 * 토큰을 검증하고 사용자 정보를 req.user에 추가하는 미들웨어
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized: No token provided");
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).send("Unauthorized: Invalid token");
  }
}

/**
 * 사용자가 관리자인지 확인하는 미들웨어
 */
function verifyAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).send("Forbidden: Admins only");
  }
  next();
}

module.exports = {
  verifyToken,
  verifyAdmin,
};