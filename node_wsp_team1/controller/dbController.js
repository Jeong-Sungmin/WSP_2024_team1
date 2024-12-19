// controller/dbController.js

const admin = require("firebase-admin");
const path = require("path");

// Firebase Admin SDK 초기화
const serviceAccount = require(path.join(
  __dirname,
  "../serviceAccountKey.json"
));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
      "https://wspteam1-5159b-default-rtdb.asia-southeast1.firebasedatabase.app/", // 실제 DB URL로 교체
  });
}

const db = admin.database();

/**
 * 사용자 정보를 Realtime Database에 저장하는 함수
 * @param {Object} user Firebase Auth 사용자 객체
 * @returns {Promise<void>}
 */
async function saveUser(user) {
  console.log("Received user object:", user); // 디버깅을 위한 로그 추가
  const userInfo = {
    email: user.email,
    name: user.displayName ? user.displayName : user.email.split("@")[0],
    role: "user",
    uID: user.uid,
    Restrict_make: "4",
  };
  try {
    await db.ref(`users/${user.uid}`).set(userInfo);
    console.log(`User data saved for UID: ${user.uid}`);
  } catch (error) {
    console.error(`Error saving user data for UID ${user.uid}:`, error);
    throw error;
  }
}

/**
 * 사용자 특정 동화를 Realtime Database에서 삭제하는 함수
 * @param {string} uid 사용자 UID
 * @param {string} title 동화 제목
 * @returns {Promise<void>}
 */
async function deleteFairyTale(uid, title) {
  const path = `folks/${uid}/${title}`;
  try {
    console.log(`Attempting to delete fairy tale at path: ${path}`);
    await db.ref(path).remove();
    console.log(`Fairy tale '${title}' deleted for UID: ${uid}`);
  } catch (error) {
    console.error(
      `Error deleting fairy tale '${title}' for UID ${uid}:`,
      error
    );
    throw error;
  }
}

/**
 * 데이터 생성 함수
 * @param {string} path DB 상의 경로 (예: 'folks/uid/title1')
 * @param {object} data 저장할 데이터 객체
 * @returns {Promise<void>}
 */
async function createData(path, data) {
  try {
    await db.ref(path).set(data);
    console.log(`Data created at ${path}`);
  } catch (error) {
    console.error(`Error creating data at ${path}:`, error);
    throw error; // 상위에서 처리 가능하도록 에러 던짐
  }
}

/**
 * 데이터 읽기 함수
 * @param {string} path DB 상의 경로
 * @returns {Promise<any>} 데이터 객체
 */
async function readData(path) {
  try {
    const snapshot = await db.ref(path).once("value");
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log(`Data read from ${path}:`, data);
      return data;
    } else {
      console.log(`No data found at ${path}`);
      return null;
    }
  } catch (error) {
    console.error(`Error reading data at ${path}:`, error);
    throw error;
  }
}

/**
 * 데이터 업데이트 함수
 * @param {string} path DB 상의 경로
 * @param {object} updatedFields 업데이트할 필드들
 * @returns {Promise<void>}
 */
async function updateData(path, updatedFields) {
  try {
    await db.ref(path).update(updatedFields);
    console.log(`Data updated at ${path}`);
  } catch (error) {
    console.error(`Error updating data at ${path}:`, error);
    throw error;
  }
}

/**
 * 데이터 삭제 함수
 * @param {string} path DB 상의 경로
 * @returns {Promise<void>}
 */
async function deleteData(path) {
  try {
    await db.ref(path).remove();
    console.log(`Data deleted at ${path}`);
  } catch (error) {
    console.error(`Error deleting data at ${path}:`, error);
    throw error;
  }
}

module.exports = {
  saveUser,
  deleteFairyTale, // 새로 추가된 함수
  createData,
  readData,
  updateData,
  deleteData,
};
