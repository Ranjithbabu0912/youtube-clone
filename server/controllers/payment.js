import Razorpay from "razorpay";
import crypto from "crypto";
import users from "../Modals/Auth.js";
import { sendInvoiceEmail } from "../utils/email.js";

const PLAN_PRICES = {
  bronze: 10,  // ₹10 = 1000 paise
  silver: 50,  // ₹50 = 5000 paise
  gold: 100,   // ₹100 = 10000 paise
};

const PLAN_METADATA = {
  bronze: {
    name: "Bronze",
    price: 10,
    limitDesc: "7 Minutes Daily",
  },
  silver: {
    name: "Silver",
    price: 50,
    limitDesc: "10 Minutes Daily",
  },
  gold: {
    name: "Gold",
    price: 100,
    limitDesc: "Unlimited Watching",
  },
};

// Helper to instantiate Razorpay instance
const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_mockkeyid123";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "mockkeysecret456";
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export const createOrder = async (req, res) => {
  const { userId, plan, amount: reqAmount, billingCycle } = req.body;

  try {
    let amount = reqAmount || 9900; // default/fallback
    if (plan && PLAN_PRICES[plan] !== undefined) {
      if (billingCycle === "annually") {
        // 20% discount on 12 months
        amount = Math.round(PLAN_PRICES[plan] * 12 * 0.8) * 100;
      } else {
        amount = PLAN_PRICES[plan] * 100; // Convert INR to Paise
      }
    }

    const razorpay = getRazorpayInstance();
    const options = {
      amount, // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `rcpt_${userId.toString().slice(-6)}_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        plan: plan || "premium",
      }
    };

    const order = await razorpay.orders.create(options);
    return res.status(201).json(order);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    // If it fails because of invalid key configuration, return a friendly message
    return res.status(500).json({
      message: "Could not initialize Razorpay payment. Please configure RAZORPAY keys in your .env or use the Simulate Payment option.",
      error: error.message,
    });
  }
};

export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan = "gold" } = req.body;

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "mockkeysecret456";
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (isSignatureValid) {
      // Upgrade user to selected plan and reset watch time for immediate fresh playback
      const updatedUser = await users.findByIdAndUpdate(
        userId,
        { plan: plan, watchTime: 0 },
        { new: true }
      );

      // Trigger asynchronous invoice email notification
      const planMeta = PLAN_METADATA[plan] || { name: "Premium", price: 99, limitDesc: "Unlimited Watching" };
      await sendInvoiceEmail(updatedUser.email, updatedUser.name || "Customer", {
        name: planMeta.name,
        price: planMeta.price,
        limitDesc: planMeta.limitDesc,
        paymentId: razorpay_payment_id,
      });

      return res.status(200).json({
        success: true,
        message: `Payment verified and upgraded to ${planMeta.name} successfully`,
        user: updatedUser,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed: Invalid signature",
      });
    }
  } catch (error) {
    console.error("Error verifying signature:", error);
    return res.status(500).json({ message: "Something went wrong during verification" });
  }
};


