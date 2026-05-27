// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAX5ROrM38mr7wHYmAjfy_rmHYtttKQZCE",
  authDomain: "clone-8cb77.firebaseapp.com",
  projectId: "clone-8cb77",
  storageBucket: "clone-8cb77.firebasestorage.app",
  messagingSenderId: "603773838859",
  appId: "1:603773838859:web:480ef2641fdbd731fd090e",
  measurementId: "G-E0765838T2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };