// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDikOBIbiOzvaYCP9RyfvDSafWdZUhrbTE",
  authDomain: "wspteam1-5159b.firebaseapp.com",
  projectId: "wspteam1-5159b",
  storageBucket: "wspteam1-5159b.firebasestorage.app",
  messagingSenderId: "703049004724",
  appId: "1:703049004724:web:5a6a8d1d009f855be349e1",
  measurementId: "G-M9TKHKS6HC",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
