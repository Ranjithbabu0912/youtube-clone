import Razorpay from "razorpay";
import crypto from "crypto";
import users from "../Modals/Auth.js";

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
  const { userId, amount = 9900 } = req.body; // Default: 9900 paise = 99 INR

  try {
    const razorpay = getRazorpayInstance();
    const options = {
      amount, // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `rcpt_${userId.toString().slice(-6)}_${Date.now()}`,
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
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "mockkeysecret456";
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (isSignatureValid) {
      // Upgrade user to premium
      const updatedUser = await users.findByIdAndUpdate(
        userId,
        { plan: "premium" },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Payment verified and upgraded to Premium successfully",
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

export const mockUpgrade = async (req, res) => {
  const { userId } = req.body;

  try {
    const updatedUser = await users.findByIdAndUpdate(
      userId,
      { plan: "premium" },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Upgraded to Premium (Simulated)",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in mock upgrade:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
