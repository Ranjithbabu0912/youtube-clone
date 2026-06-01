import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, createContext, useContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import OtpVerificationModal from "../components/OtpVerificationModal";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [otpStep, setOtpStep] = useState(null); // 'otp' | 'mobile' | null
  const [verificationData, setVerificationData] = useState(null);

  useEffect(() => {
    const localUser = localStorage.getItem("user");
    if (localUser && localUser !== "undefined") {
      try {
        setUser(JSON.parse(localUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;

      let locationState = "Other";
      try {
        const geoRes = await fetch("https://ip-api.com/json/");
        const geoData = await geoRes.json();
        locationState = geoData.regionName || "Other";
      } catch (err) {
        console.error("Geo fetch error:", err);
      }

      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        locationState,
      };

      const response = await axiosInstance.post("/user/login", payload);
      
      if (response.data.status === "OTP_REQUIRED") {
        setVerificationData(response.data);
        setOtpStep("otp");
      } else if (response.data.status === "MOBILE_REQUIRED") {
        setVerificationData(response.data);
        setOtpStep("mobile");
      } else {
        login(response.data.result);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        const localUserStr = localStorage.getItem("user");
        if (localUserStr && localUserStr !== "undefined") return;
        try {
          let locationState = "Other";
          try {
            const geoRes = await fetch("https://ip-api.com/json/");
            const geoData = await geoRes.json();
            locationState = geoData.regionName || "Other";
          } catch (err) {
            console.error("Geo fetch error:", err);
          }

          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
            locationState,
          };

          const response = await axiosInstance.post("/user/login", payload);
          
          if (response.data.status === "OTP_REQUIRED") {
            setVerificationData(response.data);
            setOtpStep("otp");
          } else if (response.data.status === "MOBILE_REQUIRED") {
            setVerificationData(response.data);
            setOtpStep("mobile");
          } else {
            login(response.data.result);
          }
        } catch (error) {
          console.error(error);
          logout();
        }
      }
    });
    return () => unsubcribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout, handlegooglesignin }}>
      {children}
      {otpStep && (
        <OtpVerificationModal
          step={otpStep}
          setStep={setOtpStep}
          verificationData={verificationData}
          setVerificationData={setVerificationData}
          login={login}
        />
      )}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

