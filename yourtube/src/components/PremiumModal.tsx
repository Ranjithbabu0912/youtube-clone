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
import { Crown, Check, Sparkles, Loader2, Play } from "lucide-react";

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

type PlanId = "bronze" | "silver" | "gold";

export default function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  const { user, login } = useUser();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("gold");
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      id: "bronze" as PlanId,
      name: "Bronze",
      price: 10,
      limitText: "7 Min Daily Watching",
      colorClass: "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 text-amber-950 dark:text-amber-100 ring-amber-500",
      inactiveColorClass: "border-amber-200 dark:border-amber-900/60 hover:border-amber-300 bg-amber-50/5 text-amber-900 dark:text-amber-300",
      accentColor: "bg-amber-600",
      themeColor: "#D97706",
      features: [
        "7 Mins watch limit",
        "Bronze Crown badge",
        "Ad-free streaming",
        "1 Download per day",
      ],
    },
    {
      id: "silver" as PlanId,
      name: "Silver",
      price: 50,
      limitText: "10 Min Daily Watching",
      colorClass: "border-slate-400 bg-slate-100/50 dark:bg-slate-900/20 text-slate-950 dark:text-slate-100 ring-slate-400",
      inactiveColorClass: "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/5 text-slate-900 dark:text-slate-300",
      accentColor: "bg-slate-600",
      themeColor: "#475569",
      features: [
        "10 Mins watch limit",
        "Silver Crown badge",
        "Ad-free streaming",
        "Unlimited downloads",
      ],
    },
    {
      id: "gold" as PlanId,
      name: "Gold",
      price: 100,
      limitText: "Unlimited Watching",
      colorClass: "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20 text-yellow-950 dark:text-yellow-100 ring-yellow-500 shadow-yellow-100/10 shadow-lg",
      inactiveColorClass: "border-yellow-200 dark:border-yellow-900/60 hover:border-yellow-300 bg-yellow-50/5 text-yellow-900 dark:text-yellow-300",
      accentColor: "bg-yellow-600",
      themeColor: "#CA8A04",
      features: [
        "Unlimited watching",
        "Gold Crown badge",
        "Ad-free streaming",
        "Unlimited downloads",
      ],
    },
  ];

  const currentPlanMeta = plans.find((p) => p.id === selectedPlan)!;

  const handleRazorpayUpgrade = async () => {
    if (!user) {
      toast.error("Please sign in to upgrade");
      return;
    }

    setLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load Razorpay SDK.");
        setLoading(false);
        return;
      }

      // 1. Create order on backend (specifying plan type)
      const orderRes = await axiosInstance.post("/payment/order", {
        userId: user._id,
        plan: selectedPlan,
      });

      const orderData = orderRes.data;

      // 2. Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SuQ6B0jd0J9KHT",
        amount: orderData.amount,
        currency: orderData.currency,
        name: `YourTube ${currentPlanMeta.name}`,
        description: `${currentPlanMeta.name} Membership Upgrade`,
        order_id: orderData.id,
        handler: async (response: any) => {
          setLoading(true);
          try {
            // 3. Verify payment signature on backend with chosen plan
            const verifyRes = await axiosInstance.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id,
              plan: selectedPlan,
            });

            if (verifyRes.data.success) {
              login(verifyRes.data.user);
              toast.success(`Welcome to YourTube ${currentPlanMeta.name}!`);
              onClose();
              setTimeout(() => {
                window.location.reload();
              }, 1500);
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
          color: currentPlanMeta.themeColor,
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
        "Could not initialize checkout."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-6 rounded-2xl border bg-background text-foreground shadow-2xl" aria-describedby={undefined}>
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center mb-2">
            <Crown className="w-6 h-6 text-red-600 animate-pulse" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Upgrade Your Experience
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Choose the plan that fits your viewing needs. Get badge recognition, premium downloads, and ad-free access.
          </DialogDescription>
        </DialogHeader>

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          {plans.map((p) => {
            const isSelected = selectedPlan === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`cursor-pointer rounded-xl border p-4 flex flex-col justify-between transition-all duration-200 relative ${
                  isSelected
                    ? `${p.colorClass} border-2 ring-1`
                    : `${p.inactiveColorClass} border opacity-80 hover:opacity-100`
                }`}
              >
                {p.id === "gold" && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    Best Value
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm flex items-center gap-1">
                      <Crown className={`w-4 h-4 ${
                        p.id === "gold" ? "text-yellow-500 fill-yellow-500" :
                        p.id === "silver" ? "text-slate-400 fill-slate-400" :
                        "text-amber-600 fill-amber-600"
                      }`} />
                      {p.name}
                    </span>
                    {isSelected && (
                      <span className={`rounded-full p-0.5 text-white ${p.accentColor}`}>
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div className="mb-2">
                    <span className="text-2xl font-extrabold">₹{p.price}</span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>

                  <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-3">{p.limitText}</p>

                  <ul className="space-y-1.5">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[10px] text-zinc-600 dark:text-zinc-400">
                        <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Plan Summary Banner */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/60 flex items-center justify-between mt-1">
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-orange-500 fill-orange-500 animate-spin" style={{ animationDuration: '3s' }} />
              Selected: {currentPlanMeta.name} Plan
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{currentPlanMeta.limitText} & Benefits</p>
          </div>
          <p className="text-xl font-bold text-red-700 dark:text-red-300">₹{currentPlanMeta.price}/mo</p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-2.5 mt-4">
          <Button
            onClick={handleRazorpayUpgrade}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-full flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.01]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Upgrade with Razorpay (₹{currentPlanMeta.price})
          </Button>

          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-1 rounded-full"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
