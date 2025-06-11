// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDfc4Vk_Rpagh5TWdsTOzwjYK8uiH0Oass",
  authDomain: "identityverifierapp.firebaseapp.com",
  projectId: "identityverifierapp",
  storageBucket: "identityverifierapp.firebasestorage.app",
  messagingSenderId: "105527807738",
  appId: "1:105527807738:web:1242b36f8301bf9cd58343",
  measurementId: "G-M3NLHCP076"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const storage = getStorage(app);