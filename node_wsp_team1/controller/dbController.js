// controller/dbController.js
const admin = require("../firebaseAdmin"); // Firebase Admin 초기화 모듈 불러오기
const db = admin.database();

/**
 * 사용자 정보를 Realtime Database에 저장하는 함수
 * @param {Object} user - 사용자 정보 객체 (uid, email, name 등)
 * @returns {Promise<void>}
 */
async function saveUser(user) {
  console.log("받은 사용자 객체:", user); // 디버깅을 위한 로그

  const userInfo = {
    email: user.email,
    name: user.name,
    role: "user", // 기본 역할은 'user'
    uid: user.uid,
    Restrict_make: "4", // 최대 생성 가능한 동화 개수 (필요 시 조정)
  };

  // // 특정 사용자를 'admin'으로 설정 (예: 특정 이메일)
  // const adminEmails = ["mis084110@gmail.com"]; // 관리자의 이메일 목록
  // if (adminEmails.includes(user.email)) {
  //   userInfo.role = "admin";
  // }

  try {
    await db.ref(`users/${user.uid}`).set(userInfo);
    console.log(`UID: ${user.uid}의 사용자 데이터가 저장되었습니다.`);
  } catch (error) {
    console.error(`UID: ${user.uid}의 사용자 데이터 저장 중 오류:`, error);
    throw error;
  }
}

/**
 * 모든 사용자 또는 검색된 사용자 목록을 조회하는 함수
 * @param {string} searchQuery 검색어
 * @returns {Promise<Array>} 사용자 목록 배열
 */
async function getUsers(searchQuery) {
  try {
    const snapshot = await db.ref("users").once("value");
    const usersData = snapshot.val();
    if (!usersData) return [];
    const users = [];

    for (const uid in usersData) {
      const user = usersData[uid];
      if (
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        users.push(user);
      }
    }

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

/**
 * 특정 사용자의 정보를 업데이트하는 함수
 * @param {string} uid 사용자 UID
 * @param {Object} updatedData 업데이트할 데이터 객체
 * @returns {Promise<void>}
 */
async function updateUser(uid, updatedData) {
  try {
    await db.ref(`users/${uid}`).update(updatedData);
    console.log(`User data updated for UID: ${uid}`);
  } catch (error) {
    console.error(`Error updating user data for UID ${uid}:`, error);
    throw error;
  }
}

/**
 * 특정 사용자의 동화 목록을 조회하는 함수
 * @param {string} uid 사용자 UID
 * @returns {Promise<Array>} 동화 목록 배열
 */
async function getFairyTalesByUid(uid) {
  const fairyTalesSnapshot = await db
    .ref(`users/${uid}/fairyTales`)
    .once("value");
  const fairyTalesIndices = fairyTalesSnapshot.val();
  if (!fairyTalesIndices) return [];
  const indices = Object.keys(fairyTalesIndices);
  const promises = indices.map((index) =>
    db.ref(`folks/${index}`).once("value")
  );
  const snapshots = await Promise.all(promises);
  return snapshots.map((snapshot) => ({
    index: parseInt(snapshot.key, 10),
    data: snapshot.val(),
  }));
}

/**
 * 특정 동화의 상세 정보를 조회하는 함수
 * @param {number} index 동화 인덱스
 * @returns {Promise<Object>} 동화 상세 정보 객체
 */
async function getFairyTaleDetails(index) {
  const snapshot = await db.ref(`folks/${index}`).once("value");
  if (snapshot.exists()) {
    return snapshot.val();
  } else {
    throw new Error(`Fairy tale with index ${index} does not exist.`);
  }
}

/**
 * 동화를 생성하는 함수
 * @param {string} uid 사용자 UID
 * @param {string} inputData 동화 입력 데이터
 * @param {string} selectedType 동화 유형
 * @returns {Promise<number>} 생성된 동화의 인덱스
 */
async function createFairyTale(uid, inputData, selectedType) {
  const counterRef = db.ref("folks/counter");
  const transactionResult = await counterRef.transaction((currentValue) => {
    return (currentValue || 0) + 1;
  });
  if (transactionResult.committed) {
    const newIndex = transactionResult.snapshot.val();
    const fairyTalePath = `folks/${newIndex}`;
    const fairyTaleEntry = {
      uid: uid,
      createTime: admin.database.ServerValue.TIMESTAMP,
      inputdata: inputData,
      selectedType: selectedType,
    };
    await db.ref(fairyTalePath).set(fairyTaleEntry);
    await db.ref(`users/${uid}/fairyTales/${newIndex}`).set(true);
    return newIndex;
  } else {
    throw new Error("Transaction not committed");
  }
}

/**
 * 동화에 필드를 추가하는 함수
 * @param {number} index 동화 인덱스
 * @param {Object} fields 추가할 필드 객체
 * @returns {Promise<void>}
 */
async function addFairyTaleFields(index, fields) {
  const fairyTalePath = `folks/${index}`;
  await db.ref(fairyTalePath).update(fields);
}

/**
 * 기타 CRUD 함수들...
 */
async function createData(path, data) {
  await db.ref(path).set(data);
}

async function readData(path) {
  const snapshot = await db.ref(path).once("value");
  return snapshot.exists() ? snapshot.val() : null;
}

async function updateData(path, updatedFields) {
  await db.ref(path).update(updatedFields);
}

async function deleteData(path) {
  await db.ref(path).remove();
}

async function deleteFairyTale(index) {
  const path = `folks/${index}`;
  const snapshot = await db.ref(path).once("value");
  const fairyTale = snapshot.val();
  if (!fairyTale)
    throw new Error(`Fairy tale with index ${index} does not exist.`);
  const uid = fairyTale.uid;
  await db.ref(path).remove();
  await db.ref(`users/${uid}/fairyTales/${index}`).remove();
}

/**
 * 사용자용: 자신의 모든 동화를 조회하는 함수
 * @param {string} uid 사용자 UID
 * @returns {Promise<Array>} 동화 목록 배열
 */
async function getMyFairyTales(uid) {
  return getFairyTalesByUid(uid);
}

module.exports = {
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
};
