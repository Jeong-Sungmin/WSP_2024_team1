// public/firebaseConfig.js

// Firebase SDK를 import 합니다. Firebase v9 모듈형 SDK를 사용합니다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Firebase 프로젝트 설정 정보 (Firebase 콘솔에서 확인 가능)
const firebaseConfig = {
  apiKey: "AIzaSyDikOBIbiOzvaYCP9RyfvDSafWdZUhrbTE",
  authDomain: "wspteam1-5159b.firebaseapp.com",
  projectId: "wspteam1-5159b",
  storageBucket: "wspteam1-5159b.firebasestorage.app",
  messagingSenderId: "703049004724",
  appId: "1:703049004724:web:5a6a8d1d009f855be349e1",
  measurementId: "G-M9TKHKS6HC",
};
// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Firebase를 외부에서 사용할 수 있도록 export 합니다.
export {
  app,
  auth,
  provider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
};
