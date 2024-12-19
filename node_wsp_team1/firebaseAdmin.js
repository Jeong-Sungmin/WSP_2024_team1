// firebaseAdmin.js
const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    databaseURL:
      "https://wspteam1-5159b-default-rtdb.asia-southeast1.firebasedatabase.app/",
  });
}

module.exports = admin;
