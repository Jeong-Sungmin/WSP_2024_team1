// controller/dbController.js
const admin = require("../firebaseAdmin"); // Firebase Admin 초기화 모듈 불러오기
const fs = require('fs').promises;
const path = require('path');
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
    name: user.displayName || "익명", // 이름이 없는 경우 '익명'으로 설정
    role: "user", // 기본 역할은 'user'
    uid: user.uid,
    fairyTales: {}, // 사용자가 생성한 동화 목록
    // Restrict_make: "4", // 최대 생성 가능한 동화 개수 (필요 시 조정)
  };

  // // 특정 사용자를 'admin'으로 설정 (예: 특정 이메일)
  // const adminEmails = ["mis084110@gmail.com"]; // 관리자의 이메일 목록
  // if (adminEmails.includes(user.email)) {
  //   userInfo.role = "admin";
  // }

  try {
    await db.ref(`users/${user.uid}`).set(userInfo);
    console.log(`UID: ${user.uid}의 사용자 데이터가 저장되었습니다.`);
    console.log("저장된 사용자 정보:", userInfo);
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

//**
/* 특정 사용자의 동화 목록에서 각 동화의 story 값을 조회하는 함수
 * @param {string} uid - 사용자 UID
 * @returns {Promise<Array>} - 동화의 story 값 배열
 */
async function getFairyTalesByUid(uid) {
  try {
    // 1. 사용자의 동화 인덱스 조회
    const fairyTalesSnapshot = await db
      .ref(`users/${uid}/fairyTales`)
      .once("value");
    const fairyTalesIndices = fairyTalesSnapshot.val();

    if (!fairyTalesIndices) return []; // 동화가 없을 경우 빈 배열 반환

    const indices = Object.keys(fairyTalesIndices);

    // 2. 각 인덱스에 해당하는 story 값 조회
    const promises = indices.map((index) =>
      db.ref(`folks/${index}/result/story`).once("value")
    );

    //  const snapshots = await Promise.all(promises);

    //  // 3. story 값 추출 및 배열로 반환
    //  const stories = snapshots
    //    .map((snapshot, idx) => ({
    //      index: indices[idx],
    //      story: snapshot.val(),
    //    }))
    //    .filter(tale => tale.story !== null && tale.story !== undefined); // story가 존재하는 경우만 필터링

    return promises;
  } catch (error) {
    console.error("Error in getFairyTalesByUid:", error);
    throw error;
  }
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
 * @returns {Promise<number>} 생성된 동화의 인덱스
 */
async function createFairyTale(uid, inputData) {
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
    };
    await db.ref(fairyTalePath).set(fairyTaleEntry);
    await db.ref(`users/${uid}/fairyTales/${newIndex}`).set(true);
    return newIndex;
  } else {
    throw new Error("Transaction not committed");
  }
}

//동화 결과 업데이트  함수
async function updateFairyTale(index, result) {
  const path = `folks/${index}`;
  const snapshot = await db.ref(path).once("value");
  const fairyTale = snapshot.val();
  const output = { result };
  if (!fairyTale)
    throw new Error(`Fairy tale with index ${index} does not exist.`);
  await db.ref(path).update({ result });
}

//동화 삭제 함수
async function deleteFairyTale(index) {
  const path = `folks/${index}`;
  const snapshot = await db.ref(path).once("value");
  const fairyTale = snapshot.val();
  if (!fairyTale)
    throw new Error(`Fairy tale with index ${index} does not exist.`);
  const uid = fairyTale.uid;
  await fs.rm(path.join(__dirname, '..', 'public', `${index}`), { recursive: true, force: true });
  await db.ref(path).remove();
  await db.ref(`users/${uid}/fairyTales/${index}`).remove();
}

module.exports = {
  saveUser,
  createFairyTale,
  deleteFairyTale,
  getFairyTalesByUid,
  getFairyTaleDetails,
  getUsers,
  updateUser,
  updateFairyTale,
};
