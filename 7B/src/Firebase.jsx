import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB-guj7_IN7Fxjj3ivhCq-d-do1Z8fIk6U",
  authDomain: "sevenbeans-c6b49.firebaseapp.com",
  projectId: "sevenbeans-c6b49",
  storageBucket: "sevenbeans-c6b49.appspot.com", // ✅ FIXED
  messagingSenderId: "681122166243",
  appId: "1:681122166243:web:bde3627122d220d453dcd6",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});
