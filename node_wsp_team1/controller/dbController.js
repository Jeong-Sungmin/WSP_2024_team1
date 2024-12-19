// controller/dbController.js

const admin = require("firebase-admin");
const path = require("path");

// Firebase Admin SDK 초기화
const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
      "https://wspteam1-5159b-default-rtdb.asia-southeast1.firebasedatabase.app/", // 실제 Database URL로 교체
  });
}

const db = admin.database();

/**
 * 사용자 정보를 Realtime Database에 저장하는 함수
 * @param {Object} user Firebase Auth 사용자 객체
 * @returns {Promise<void>}
 */
async function saveUser(user) {
  console.log("Received user object:", user); // 디버깅을 위한 로그

  const userInfo = {
    email: user.email,
    name: user.displayName ? user.displayName : user.email.split("@")[0],
    role: "user", // 기본 역할은 'user'
    uid: user.uid,
    Restrict_make: "4", // 최대 생성 가능한 동화 개수 (필요 시 조정)
  };

  // 특정 사용자를 'admin'으로 설정 (예: 특정 이메일)
  const adminEmails = ["admin@example.com"]; // 관리자의 이메일 목록
  if (adminEmails.includes(user.email)) {
    userInfo.role = "admin";
  }

  try {
    await db.ref(`users/${user.uid}`).set(userInfo);
    console.log(`User data saved for UID: ${user.uid}`);
  } catch (error) {
    console.error(`Error saving user data for UID ${user.uid}:`, error);
    throw error;
  }
}

/**
 * 초기 동화를 생성하는 함수
 * @param {string} uid 사용자 UID
 * @param {object} inputData 초기 입력 데이터 객체
 * @param {string} selectedType 선택된 타입
 * @returns {Promise<number>} 생성된 동화의 인덱스
 */
async function createFairyTale(uid, inputData, selectedType) {
  const counterRef = db.ref("folks/counter");

  try {
    // 트랜잭션을 사용하여 카운터를 안전하게 증가시킵니다.
    const transactionResult = await counterRef.transaction((currentValue) => {
      return (currentValue || 0) + 1;
    });

    if (transactionResult.committed) {
      const newIndex = transactionResult.snapshot.val();
      const fairyTalePath = `folks/${newIndex}`;
      const fairyTaleEntry = {
        uid: uid,
        createTime: admin.database.ServerValue.TIMESTAMP, // 서버 시간을 사용
        inputdata: inputData,
        selectedType: selectedType,
        // 나중에 추가될 필드들 (title, img, context, voice)는 여기 포함하지 않음
      };

      await db.ref(fairyTalePath).set(fairyTaleEntry);
      console.log(`Fairy tale created at path: ${fairyTalePath}`);

      // 사용자별 fairyTales 노드에 인덱스 추가 (조회 최적화를 위해)
      await db.ref(`users/${uid}/fairyTales/${newIndex}`).set(true);

      return newIndex;
    } else {
      throw new Error("Transaction not committed");
    }
  } catch (error) {
    console.error(`Error creating fairy tale for UID ${uid}:`, error);
    throw error;
  }
}

/**
 * 특정 동화에 필드를 추가하거나 업데이트하는 함수
 * @param {number} index 동화 인덱스
 * @param {object} fields 추가 또는 업데이트할 필드들 (title, img, context, voice)
 * @returns {Promise<void>}
 */
async function addFairyTaleFields(index, fields) {
  const fairyTalePath = `folks/${index}`;
  try {
    await db.ref(fairyTalePath).update(fields);
    console.log(`Fields updated for fairy tale at path: ${fairyTalePath}`);
  } catch (error) {
    console.error(
      `Error updating fields for fairy tale with index ${index}:`,
      error
    );
    throw error;
  }
}

/**
 * 글로벌 인덱스를 사용하여 동화를 삭제하는 함수
 * @param {number} index 동화 인덱스
 * @returns {Promise<void>}
 */
async function deleteFairyTale(index) {
  const path = `folks/${index}`;

  try {
    // 삭제할 동화의 소유자 UID를 먼저 조회합니다.
    const snapshot = await db.ref(path).once("value");
    const fairyTale = snapshot.val();

    if (!fairyTale) {
      throw new Error(`Fairy tale with index ${index} does not exist.`);
    }

    const uid = fairyTale.uid;

    // 동화 삭제
    await db.ref(path).remove();
    console.log(`Fairy tale with index ${index} deleted successfully.`);

    // 사용자별 fairyTales 노드에서도 인덱스 제거
    await db.ref(`users/${uid}/fairyTales/${index}`).remove();
    console.log(`Fairy tale index ${index} removed from user ${uid}.`);
  } catch (error) {
    console.error(`Error deleting fairy tale with index ${index}:`, error);
    throw error;
  }
}

/**
 * 특정 사용자의 모든 동화를 조회하는 함수
 * @param {string} uid 사용자 UID
 * @returns {Promise<Array<{index: number, data: object}>>}
 */
async function getFairyTalesByUid(uid) {
  try {
    const fairyTalesSnapshot = await db
      .ref(`users/${uid}/fairyTales`)
      .once("value");
    const fairyTalesIndices = fairyTalesSnapshot.val();

    if (!fairyTalesIndices) {
      return [];
    }

    const indices = Object.keys(fairyTalesIndices);
    if (indices.length === 0) {
      return [];
    }

    const promises = indices.map((index) =>
      db.ref(`folks/${index}`).once("value")
    );
    const snapshots = await Promise.all(promises);

    const fairyTales = snapshots.map((snapshot) => ({
      index: parseInt(snapshot.key, 10),
      data: snapshot.val(),
    }));

    return fairyTales;
  } catch (error) {
    console.error(`Error fetching fairy tales for UID ${uid}:`, error);
    throw error;
  }
}

/**
 * 사용자 자신의 모든 동화를 조회하는 함수
 * @param {string} uid 사용자 UID
 * @returns {Promise<Array<{index: number, data: object}>>}
 */
async function getMyFairyTales(uid) {
  try {
    const fairyTales = await getFairyTalesByUid(uid);
    return fairyTales;
  } catch (error) {
    console.error(`Error fetching my fairy tales for UID ${uid}:`, error);
    throw error;
  }
}

/**
 * 모든 사용자를 조회하거나, 검색어에 따라 필터링하는 함수
 * @param {string} searchQuery 검색어 (이름 또는 이메일)
 * @returns {Promise<Array<Object>>} 사용자 목록
 */
async function getUsers(searchQuery = "") {
  try {
    const usersSnapshot = await db.ref("users").once("value");
    const usersData = usersSnapshot.val();

    if (!usersData) {
      return [];
    }

    const users = Object.values(usersData);

    if (searchQuery.trim() === "") {
      return users;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();

    const filteredUsers = users.filter((user) => {
      return (
        (user.name && user.name.toLowerCase().includes(lowerCaseQuery)) ||
        (user.email && user.email.toLowerCase().includes(lowerCaseQuery))
      );
    });

    return filteredUsers;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

/**
 * 특정 사용자의 정보를 업데이트하는 함수
 * @param {string} uid 사용자 UID
 * @param {object} updatedData 업데이트할 데이터 객체
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
 * 특정 인덱스의 동화 데이터를 조회하는 함수
 * @param {number} index 동화 인덱스
 * @returns {Promise<object>} 동화 데이터
 */
async function getFairyTaleDetails(index) {
  try {
    const snapshot = await db.ref(`folks/${index}`).once("value");
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      throw new Error(`Fairy tale with index ${index} does not exist.`);
    }
  } catch (error) {
    console.error(
      `Error fetching fairy tale details for index ${index}:`,
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
  createFairyTale, // 초기 동화 생성 함수
  addFairyTaleFields, // 동화 필드 추가 함수 (여러 필드 한 번에 업데이트 가능)
  deleteFairyTale, // 글로벌 인덱스를 사용하여 동화를 삭제하는 함수
  getFairyTalesByUid, // 특정 사용자의 모든 동화를 조회하는 함수
  getMyFairyTales, // 사용자 자신의 동화 목록을 조회하는 함수
  getUsers, // 모든 사용자 또는 검색된 사용자 목록을 조회하는 함수
  updateUser, // 특정 사용자의 정보를 업데이트하는 함수
  getFairyTaleDetails, // 특정 동화의 상세 데이터를 조회하는 함수
  createData, // 데이터 생성 함수
  readData, // 데이터 읽기 함수
  updateData, // 데이터 업데이트 함수
  deleteData, // 데이터 삭제 함수
};
