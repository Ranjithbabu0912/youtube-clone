import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import OtpVerificationModal from "../components/OtpVerificationModal";
import { toast } from "sonner";

const getGeographicalState = async () => {
  try {
    const res = await axiosInstance.get("/user/detect-location");
    if (res.data && res.data.region) {
      console.log("Geographical location detected via backend proxy:", res.data.region);
      return res.data.region;
    }
  } catch (e) {
    console.warn("Backend geolocation proxy lookup failed. Trying client-side fallback...", e);
  }

  // Fallback to client-side API calls if backend is unavailable
  try {
    const res = await fetch("https://freeipapi.com/api/json");
    if (res.ok) {
      const data = await res.json();
      if (data && data.regionName) {
        console.log("Location detected client-side (freeipapi):", data.regionName);
        return data.regionName;
      }
    }
  } catch (e) {
    console.warn("freeipapi.com client-side lookup failed:", e);
  }

  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      if (data && data.region) {
        console.log("Location detected client-side (ipapi):", data.region);
        return data.region;
      }
    }
  } catch (e) {
    console.warn("ipapi.co client-side lookup failed:", e);
  }

  console.log("All geolocation lookups failed, defaulting to Tamil Nadu");
  return "Tamil Nadu";
};

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [otpStep, setOtpStep] = useState(null); // 'otp' | 'mobile' | null
  const [verificationData, setVerificationData] = useState(null);
  const isLoggingInRef = useRef(false);

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
    if (isLoggingInRef.current) return;
    isLoggingInRef.current = true;
    const toastId = toast.loading("Signing in with Google...");
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;

      const locationState = await getGeographicalState();

      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        locationState,
      };

      // Show sending OTP loading state
      toast.loading("Sending OTP to your email...", { id: toastId });

      const response = await axiosInstance.post("/user/login", payload);

      if (response.data.status === "OTP_REQUIRED") {
        setVerificationData(response.data);
        setOtpStep("otp");
        toast.success(`OTP sent to ${firebaseuser.email}`, { id: toastId });
      } else {
        login(response.data.result);
        toast.success("Successfully logged in!", { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to sign in. Please try again.", { id: toastId });
    } finally {
      isLoggingInRef.current = false;
    }
  };

  useEffect(() => {
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        const localUserStr = localStorage.getItem("user");
        if (localUserStr && localUserStr !== "undefined") return;
        if (isLoggingInRef.current) return;
        isLoggingInRef.current = true;
        try {
          const locationState = await getGeographicalState();

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
          } else {
            login(response.data.result);
          }
        } catch (error) {
          console.error(error);
          logout();
        } finally {
          isLoggingInRef.current = false;
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

