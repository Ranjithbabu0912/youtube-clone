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
import { Crown, Check, Sparkles, Loader2, ChevronDown } from "lucide-react";

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

type PlanId = "free" | "bronze" | "silver" | "gold";

export default function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  const { user, login } = useUser();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("gold");
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentPlan = (user?.plan || "free").toLowerCase() as PlanId;

  const plans = [
    {
      id: "free" as PlanId,
      name: "Free",
      price: 0,
      limitText: "5 Min Daily Watching Limit",
      colorClass: "border-zinc-300 dark:border-zinc-800 bg-zinc-150/10 text-foreground dark:text-zinc-100 ring-zinc-300",
      inactiveColorClass: "border-zinc-200 dark:border-zinc-900/60 bg-zinc-50/5 text-zinc-900 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-800",
      features: [
        "5 Mins watch limit",
        "Ad-supported streaming",
        "No crown badge",
        "No downloads",
      ],
    },
    {
      id: "bronze" as PlanId,
      name: "Bronze",
      price: 10,
      limitText: "7 Min Daily Watching Limit",
      colorClass: "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 text-amber-950 dark:text-amber-100 ring-amber-500",
      inactiveColorClass: "border-amber-200 dark:border-amber-900/60 bg-amber-50/5 text-zinc-900 dark:text-zinc-300 hover:border-amber-300 dark:hover:border-amber-800",
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
      limitText: "10 Min Daily Watching Limit",
      colorClass: "border-slate-400 bg-slate-100/50 dark:bg-slate-900/20 text-slate-950 dark:text-slate-100 ring-slate-400",
      inactiveColorClass: "border-slate-200 dark:border-slate-800 bg-slate-50/5 text-zinc-900 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-slate-750",
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
      limitText: "Unlimited Watching Limit",
      colorClass: "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20 text-yellow-950 dark:text-yellow-100 ring-yellow-500 shadow-yellow-100/5 shadow-lg",
      inactiveColorClass: "border-yellow-200 dark:border-yellow-900/60 bg-yellow-50/5 text-zinc-900 dark:text-zinc-300 hover:border-yellow-300 dark:hover:border-yellow-800",
      features: [
        "Unlimited watching",
        "Gold Crown badge",
        "Ad-free streaming",
        "Unlimited downloads",
      ],
    },
  ];

  const currentPlanMeta = plans.find((p) => p.id === selectedPlan)!;
  const isCurrentPlanActive = selectedPlan === currentPlan;

  const handleRazorpayUpgrade = async () => {
    if (!user) {
      toast.error("Please sign in to upgrade");
      return;
    }

    if (selectedPlan === "free") {
      toast.error("You cannot upgrade to the Free tier.");
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

      // Calculate localized price based on Billing Cycle
      const finalPrice = isAnnual 
        ? Math.round(currentPlanMeta.price * 12 * 0.8) 
        : currentPlanMeta.price;

      // 1. Create order on backend (specifying plan type and billing cycle)
      const orderRes = await axiosInstance.post("/payment/order", {
        userId: user._id,
        plan: selectedPlan,
        billingCycle: isAnnual ? "annually" : "monthly",
      });

      const orderData = orderRes.data;

      // 2. Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SuQ6B0jd0J9KHT",
        amount: orderData.amount,
        currency: orderData.currency,
        name: `YourTube ${currentPlanMeta.name}`,
        description: `${currentPlanMeta.name} Upgrade (${isAnnual ? "Annual" : "Monthly"})`,
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
          color: selectedPlan === "gold" ? "#CA8A04" : selectedPlan === "silver" ? "#475569" : "#D97706",
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
      <DialogContent className="w-[95%] max-w-[480px] max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-3xl border bg-background text-foreground shadow-2xl no-scrollbar" aria-describedby={undefined}>
        <DialogHeader className="text-center space-y-1">
          <DialogTitle className="text-2xl font-extrabold tracking-tight">
            Upgrade Plan
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Unlock ad-free video access, downloads, and special creator recognition badges.
          </DialogDescription>
        </DialogHeader>

        {/* Toggle Switcher matching the screenshot */}
        <div className="mt-4 text-center">
          <div className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-full flex items-center relative w-full max-w-[280px] mx-auto border border-zinc-200 dark:border-zinc-700/40">
            <button
              onClick={() => setIsAnnual(false)}
              className={`flex-1 py-1.5 text-center rounded-full text-xs font-bold transition-all relative z-10 ${
                !isAnnual ? "text-zinc-950 dark:text-white" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`flex-1 py-1.5 text-center rounded-full text-xs font-bold transition-all relative z-10 ${
                isAnnual ? "text-zinc-950 dark:text-white font-extrabold" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              Annually
              <span className="block text-[8px] text-teal-500 font-normal">Save up to 20%</span>
            </button>
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-background shadow rounded-full transition-all duration-300 ${
                isAnnual ? "left-[50%]" : "left-1"
              }`}
            />
          </div>
          <span className="block text-[9px] text-muted-foreground/80 mt-2 font-medium">
            * prices based on INR
          </span>
        </div>

        {/* plan list stacked vertically (mobile responsive rows matching the screenshot) */}
        <div className="space-y-3 my-4">
          {plans.map((p) => {
            const isSelected = selectedPlan === p.id;
            const isPlanActive = currentPlan === p.id;
            
            return (
              <div
                key={p.id}
                onClick={() => {
                  if (p.id !== "free") {
                    setSelectedPlan(p.id);
                  }
                }}
                className={`border rounded-2xl p-3.5 transition-all duration-200 relative ${
                  p.id === "free" ? "cursor-default opacity-85" : "cursor-pointer"
                } ${
                  isSelected
                    ? "border-teal-500/80 bg-teal-500/5 dark:bg-teal-500/5 ring-1 ring-teal-500/40"
                    : isPlanActive
                    ? "border-zinc-300 dark:border-zinc-800 bg-zinc-150/10"
                    : "border-zinc-200 dark:border-zinc-800/85 hover:border-zinc-300 dark:hover:border-zinc-700 bg-background"
                }`}
              >
                {p.id === "gold" && (
                  <span className="absolute -top-2 right-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                    Best Value
                  </span>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Circle Logo matching screenshot styling */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border shadow-sm ${
                      p.id === "gold"
                        ? "bg-yellow-500 border-yellow-400 text-white"
                        : p.id === "silver"
                        ? "bg-slate-400 border-slate-300 text-white"
                        : p.id === "bronze"
                        ? "bg-amber-600 border-amber-500 text-white"
                        : "bg-zinc-200 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300"
                    }`}>
                      <Crown className={`w-4 h-4 ${p.id === "free" ? "text-zinc-400" : "fill-current"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs sm:text-sm uppercase tracking-wide">
                          {p.name}
                        </span>
                        {isPlanActive && (
                          <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-border/20">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="block text-[9px] text-muted-foreground font-medium">
                        {p.limitText}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {isAnnual && p.price > 0 && (
                        <span className="text-[10px] text-red-500 line-through mr-1 font-semibold">
                          ₹{p.price}
                        </span>
                      )}
                      <span className="font-extrabold text-sm sm:text-base text-foreground">
                        ₹{isAnnual && p.price > 0 ? Math.round(p.price * 0.8) : p.price}
                      </span>
                      <span className="text-[9px] text-muted-foreground">/mo.</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                      isSelected ? "rotate-180 text-teal-500" : ""
                    }`} />
                  </div>
                </div>

                {/* Collapsible Features Checklist */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800/80 animate-in fade-in slide-in-from-top-1 duration-200">
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {p.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground">
                          <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Plan Summary Banner */}
        {selectedPlan !== "free" && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/10 dark:to-orange-950/10 p-3.5 rounded-2xl border border-red-100 dark:border-red-950/50 flex items-center justify-between mt-1">
            <div>
              <p className="text-xs font-semibold text-red-800 dark:text-red-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-orange-500 fill-orange-500 animate-pulse" />
                Selected: {currentPlanMeta.name} Plan
              </p>
              <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                Billed {isAnnual ? "Annually" : "Monthly"}
              </p>
            </div>
            <p className="text-base font-extrabold text-red-700 dark:text-red-300">
              ₹{isAnnual ? Math.round(currentPlanMeta.price * 12 * 0.8) : currentPlanMeta.price}
              <span className="text-[9px] font-normal text-muted-foreground">/{isAnnual ? "yr" : "mo"}</span>
            </p>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col gap-2.5 mt-4">
          <Button
            onClick={handleRazorpayUpgrade}
            disabled={loading || isCurrentPlanActive || selectedPlan === "free"}
            className={`w-full font-bold py-2.5 rounded-full flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.01] ${
              isCurrentPlanActive 
                ? "bg-zinc-200 text-zinc-500 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-400"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isCurrentPlanActive 
              ? "Active Plan" 
              : selectedPlan === "free"
              ? "Select a Premium Plan"
              : `Upgrade with Razorpay`
            }
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
