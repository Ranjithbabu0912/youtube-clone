import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Mail, Phone } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";

interface OtpVerificationModalProps {
  step: "otp" | "mobile";
  setStep: (step: "otp" | "mobile" | null) => void;
  verificationData: {
    userId: string;
    method?: "email" | "mobile";
    destination?: string;
  } | null;
  setVerificationData: (data: any) => void;
  login: (userData: any) => void;
}

export default function OtpVerificationModal({
  step,
  setStep,
  verificationData,
  setVerificationData,
  login,
}: OtpVerificationModalProps) {
  const [mobileNumber, setMobileNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (step === "otp" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, countdown]);

  const handleSendMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber.trim()) {
      toast.error("Please enter a valid mobile number");
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post("/user/verify-mobile", {
        userId: verificationData?.userId,
        mobile: mobileNumber.trim(),
      });

      if (response.data.status === "OTP_REQUIRED") {
        setVerificationData(response.data);
        setStep("otp");
        setCountdown(60);
        toast.success(`Verification code sent to ${mobileNumber}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error("Please enter a 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post("/user/verify-otp", {
        userId: verificationData?.userId,
        otp: otpCode.trim(),
      });

      if (response.data.status === "SUCCESS") {
        toast.success("Security verification successful!");
        login(response.data.result);
        setStep(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Invalid or expired verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      if (verificationData?.method === "email") {
        // Re-login to trigger email OTP again
        const localUserStr = localStorage.getItem("user");
        const email = verificationData.destination;
        
        const response = await axiosInstance.post("/user/login", {
          email,
          locationState: "Tamil Nadu", // Ensure southern state logic
        });
        
        if (response.data.status === "OTP_REQUIRED") {
          setVerificationData(response.data);
          setCountdown(60);
          toast.success("New OTP code sent to your email!");
        }
      } else {
        // Mobile resend
        const response = await axiosInstance.post("/user/verify-mobile", {
          userId: verificationData?.userId,
          mobile: verificationData?.destination,
        });

        if (response.data.status === "OTP_REQUIRED") {
          setVerificationData(response.data);
          setCountdown(60);
          toast.success("New OTP code sent to your mobile!");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to resend verification code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[400px] p-6 rounded-2xl border bg-background text-foreground shadow-2xl" aria-describedby={undefined}>
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Security Verification
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {step === "mobile"
              ? "We need a registered mobile number to verify your account credentials."
              : `Enter the 6-digit verification code sent to your registered ${
                  verificationData?.method === "email" ? "email" : "mobile number"
                }.`}
          </DialogDescription>
        </DialogHeader>

        {step === "mobile" ? (
          <form onSubmit={handleSendMobileOtp} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Mobile Number
              </label>
              <Input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="bg-transparent border-input text-sm h-10 px-3 w-full"
                required
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Send Verification Code"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                {verificationData?.method === "email" ? (
                  <Mail className="w-3.5 h-3.5" />
                ) : (
                  <Phone className="w-3.5 h-3.5" />
                )}
                Verification Destination: <span className="font-bold text-foreground">{verificationData?.destination}</span>
              </label>
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="bg-transparent border-input text-center text-lg tracking-widest font-extrabold h-11"
                required
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Verify & Sign In"
              )}
            </Button>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-muted-foreground">
                {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive code?"}
              </span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={countdown > 0 || loading}
                className={`font-semibold hover:underline bg-transparent border-0 cursor-pointer ${
                  countdown > 0
                    ? "text-gray-400 dark:text-zinc-600"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
