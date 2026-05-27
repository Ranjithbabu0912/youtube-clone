import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { Crown, Check, Sparkles, Loader2 } from "lucide-react";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.hasOwnProperty("Razorpay")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  const { user, login } = useUser();
  const [loading, setLoading] = useState(false);
  const [mockLoading, setMockLoading] = useState(false);

  const handleRazorpayUpgrade = async () => {
    if (!user) {
      toast.error("Please sign in to upgrade");
      return;
    }

    setLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load Razorpay SDK. Try the Simulated Upgrade.");
        setLoading(false);
        return;
      }

      // 1. Create order on the backend
      const orderRes = await axiosInstance.post("/payment/order", {
        userId: user._id,
        amount: 9900, // ₹99.00 = 9900 paise
      });

      const orderData = orderRes.data;

      // 2. Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SuQ6B0jd0J9KHT",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "YourTube Premium",
        description: "Monthly Premium Subscription Plan",
        order_id: orderData.id,
        handler: async (response: any) => {
          setLoading(true);
          try {
            // 3. Verify payment signature on backend
            const verifyRes = await axiosInstance.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id,
            });

            if (verifyRes.data.success) {
              login(verifyRes.data.user);
              toast.success("Welcome to YourTube Premium!");
              onClose();
            } else {
              toast.error("Verification failed: " + verifyRes.data.message);
            }
          } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || "Payment verification failed");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user.name || "",
          email: user.email || "",
        },
        theme: {
          color: "#EF4444", // Red to match YouTube
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        toast.error("Payment Failed: " + response.error.description);
      });
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
        "Could not initialize checkout. Use Simulated Upgrade instead."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedUpgrade = async () => {
    if (!user) {
      toast.error("Please sign in to upgrade");
      return;
    }

    setMockLoading(true);
    try {
      const res = await axiosInstance.post("/payment/mock-upgrade", {
        userId: user._id,
      });

      if (res.data.success) {
        login(res.data.user);
        toast.success("Successfully upgraded to Premium (Simulated)!");
        onClose();
      } else {
        toast.error("Upgrade failed");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Upgrade failed");
    } finally {
      setMockLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-6 rounded-2xl border bg-white text-black shadow-2xl" aria-describedby={undefined}>
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
            <Crown className="w-6 h-6 text-red-600 animate-pulse" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-sm">
            Unlock exclusive features and improve your downloading experience.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border border-red-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-800 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-orange-500 fill-orange-500" />
                Premium Plan
              </p>
              <p className="text-xs text-red-600 mt-0.5">Recurring billing monthly</p>
            </div>
            <p className="text-xl font-bold text-red-700">₹99/mo</p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-start gap-3 text-sm">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-gray-700">
                <span className="font-semibold text-black">Unlimited Downloads</span> - Download as many videos as you want.
              </p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-gray-700">
                <span className="font-semibold text-black">Premium Badge</span> - Display a shiny crown next to your channel.
              </p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-gray-700">
                <span className="font-semibold text-black">Ad-Free Experience</span> - Enjoy clean streaming without disruptions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 mt-2">
          <Button
            onClick={handleRazorpayUpgrade}
            disabled={loading || mockLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Upgrade with Razorpay
          </Button>

          <Button
            variant="outline"
            onClick={handleSimulatedUpgrade}
            disabled={loading || mockLoading}
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2.5 rounded-full flex items-center justify-center gap-2"
          >
            {mockLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Simulate Payment (Dev Mode)"
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full text-xs text-gray-500 hover:text-black py-1.5 rounded-full"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
