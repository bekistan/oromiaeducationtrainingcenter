
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.db = exports.app = void 0;
var app_1 = require("firebase/app");
var firestore_1 = require("firebase/firestore");
var auth_1 = require("firebase/auth");

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
var firebaseConfig = {
    apiKey: "AIzaSyDCCBk25weEefkH_hfX-Yru5RE9yJ0XtQg", // User Provided
    authDomain: "oroedu-4a86c.firebaseapp.com", // Derived from User Provided Project ID
    projectId: "oroedu-4a86c", // User Provided
    storageBucket: "oroedu-4a86c.appspot.com", // Derived from User Provided Project ID
    messagingSenderId: "337131238082", // User Provided (Project Number)
    appId: "1:337131238082:web:fc94369715fbdfff96015b", // Retained as project number matches
    measurementId: "G-B31H6HWF15" // Retained - User should verify if Analytics is used
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

