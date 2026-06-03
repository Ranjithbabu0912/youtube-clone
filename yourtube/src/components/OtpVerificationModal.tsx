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
import { Loader2, ShieldCheck, Mail } from "lucide-react";
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
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Always start countdown when modal opens
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
    if (countdown > 0 || loading) return;
    setLoading(true);
    try {
      // Always resend via email
      const response = await axiosInstance.post("/user/login", {
        email: verificationData?.destination,
      });

      if (response.data.status === "OTP_REQUIRED") {
        setVerificationData(response.data);
        setCountdown(60);
        setOtpCode("");
        toast.success("New OTP code sent to your email!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to resend verification code");
    } finally {
      setLoading(false);
    }
  };

  /* ── Mobile OTP template (kept for future use, never rendered) ──────────
  const handleSendMobileOtp = async (e: React.FormEvent) => { ... }
  ───────────────────────────────────────────────────────────────────────── */

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[400px] p-6 rounded-2xl border bg-background text-foreground shadow-2xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Security Verification
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Enter the 6-digit code sent to your email address.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerifyOtp} className="space-y-4 pt-4">
          {/* Destination badge */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm">
            <Mail className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-muted-foreground truncate">
              {verificationData?.destination ?? "your registered email"}
            </span>
          </div>

          {/* OTP input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Verification Code
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="• • • • • •"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              className="bg-transparent border-input text-center text-2xl tracking-[0.5em] font-extrabold h-12"
              required
              autoFocus
            />
          </div>

          <Button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
            ) : (
              "Verify & Sign In"
            )}
          </Button>

          {/* Resend row */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-muted-foreground">
              {countdown > 0 ? `Resend available in ${countdown}s` : "Didn't receive code?"}
            </span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={countdown > 0 || loading}
              className={`font-semibold hover:underline bg-transparent border-0 cursor-pointer transition-colors ${
                countdown > 0
                  ? "text-gray-400 dark:text-zinc-600 cursor-not-allowed"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              Resend OTP
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

