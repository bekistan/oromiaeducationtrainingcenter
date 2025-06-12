
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.db = exports.app = void 0;
var app_1 = require("firebase/app");
var firestore_1 = require("firebase/firestore");
var auth_1 = require("firebase/auth");

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// USER MUST VERIFY ALL THESE ARE THE CORRECT AND INTENDED CREDENTIALS FOR PROJECT oromiaedurent-hm4zc.
var firebaseConfig = {
    apiKey: "AIzaSyDsw6ox_fmME37xw9qQhmv6MJW53CD7O68", // From error log
    authDomain: "oromiaedurent-hm4zc.firebaseapp.com", // Updated to match new projectId
    projectId: "oromiaedurent-hm4zc", // From error log
    storageBucket: "oromiaedurent-hm4zc.appspot.com", // Updated to match new projectId
    messagingSenderId: "337131238082", // Placeholder - VERIFY if this is correct for oromiaedurent-hm4zc
    appId: "1:337131238082:web:fc94369715fbdfff96015b", // Placeholder - VERIFY if this is correct for oromiaedurent-hm4zc
    measurementId: "G-B31H6HWF15" // Placeholder - VERIFY if this is correct for oromiaedurent-hm4zc
};

var app;
// Ensure Firebase is initialized only once
if (!(0, app_1.getApps)().length) {
    exports.app = app = (0, app_1.initializeApp)(firebaseConfig);
}
else {
    exports.app = app = (0, app_1.getApp)();
}
var db = (0, firestore_1.getFirestore)(app);
exports.db = db;
var auth = (0, auth_1.getAuth)(app);
exports.auth = auth;
