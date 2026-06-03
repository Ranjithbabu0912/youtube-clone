import nodemailer from "nodemailer";
import twilio from "twilio";
import dns from "dns";

const ipv4Lookup = (hostname, options, callback) => {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  return dns.lookup(hostname, { ...options, family: 4 }, callback);
};

export const sendInvoiceEmail = async (userEmail, userName, planDetails) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  let transporter;
  let isTestAccount = false;

  if (emailUser && emailPass) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // port 587 uses STARTTLS
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      lookup: ipv4Lookup,
    });
  } else {
    // Fallback: Create Ethereal test account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
        lookup: ipv4Lookup,
      });
      isTestAccount = true;
      console.log("Created Ethereal test SMTP account for billing email.");
    } catch (err) {
      console.error("Failed to create test SMTP account:", err);
      // Last-resort fallback: print to console
      console.log(`[EMAIL SIMULATION] To: ${userEmail}, Subject: Invoice for ${planDetails.name}`);
      return { success: true, simulated: true };
    }
  }

  const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const dateStr = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f6f6f6; margin: 0; padding: 0; color: #333; }
        .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { text-align: center; border-bottom: 2px solid #f1f1f1; padding-bottom: 20px; }
        .logo { font-size: 28px; font-weight: bold; color: #ff0000; text-decoration: none; }
        .invoice-title { font-size: 20px; font-weight: 600; margin-top: 15px; color: #222; }
        .details-table { width: 100%; margin-top: 20px; border-collapse: collapse; }
        .details-table td { padding: 8px 0; font-size: 14px; }
        .details-table td.label { font-weight: bold; color: #666; width: 35%; }
        .item-table { width: 100%; margin-top: 25px; border-collapse: collapse; }
        .item-table th { background-color: #f9f9f9; padding: 10px; border-bottom: 2px solid #eee; text-align: left; font-size: 14px; }
        .item-table td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 14px; }
        .total-row td { font-weight: bold; font-size: 16px; border-top: 2px solid #eee; padding-top: 15px; }
        .footer { text-align: center; font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        .badge { background-color: #fef2f2; border: 1px solid #fee2e2; color: #b91c1c; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="#" class="logo" style="color: #EF4444;">YourTube</a>
          <div class="invoice-title">Payment Receipt & Invoice</div>
        </div>
        
        <table class="details-table">
          <tr>
            <td class="label">Invoice Number:</td>
            <td>${invoiceNumber}</td>
          </tr>
          <tr>
            <td class="label">Date:</td>
            <td>${dateStr}</td>
          </tr>
          <tr>
            <td class="label">Bill To:</td>
            <td>${userName} (${userEmail})</td>
          </tr>
          <tr>
            <td class="label">Payment ID:</td>
            <td><code>${planDetails.paymentId}</code></td>
          </tr>
        </table>

        <table class="item-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Watching Limit</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div><strong>YourTube ${planDetails.name} Subscription</strong></div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">Access Tier: <span class="badge">${planDetails.name}</span></div>
              </td>
              <td>${planDetails.limitDesc}</td>
              <td style="text-align: right; font-weight: bold;">₹${planDetails.price}.00</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" style="text-align: right;">Total Paid:</td>
              <td style="text-align: right; color: #EF4444; font-size: 18px;">₹${planDetails.price}.00</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>Thank you for upgrading! Enjoy your premium experience on YourTube.</p>
          <p>&copy; 2026 YourTube Inc. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: '"YourTube Billing" <billing@yourtube.com>',
      to: userEmail,
      subject: `YourTube Upgrade Confirmation: ${planDetails.name} Plan`,
      html: htmlContent,
    });

    console.log("Invoice email sent successfully to:", userEmail);
    if (isTestAccount) {
      console.log("-----------------------------------------");
      console.log("Ethereal Email Preview URL:");
      console.log(nodemailer.getTestMessageUrl(info));
      console.log("-----------------------------------------");
    }
    return {
      success: true,
      previewUrl: isTestAccount ? nodemailer.getTestMessageUrl(info) : null,
    };
  } catch (error) {
    console.error("Error sending invoice email (falling back to simulation):", error);
    console.log(`========================================`);
    console.log(`[INVOICE EMAIL SIMULATION] To: ${userEmail}`);
    console.log(`[INVOICE DETAILS] Plan: ${planDetails.name}, Price: ₹${planDetails.price}`);
    console.log(`========================================`);
    return { success: true, simulated: true };
  }
};

export const sendOTPEmail = async (userEmail, otp) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  let transporter;
  let isTestAccount = false;

  if (emailUser && emailPass) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // port 587 uses STARTTLS
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      lookup: ipv4Lookup,
    });
  } else {
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
        lookup: ipv4Lookup,
      });
      isTestAccount = true;
    } catch (err) {
      console.warn("Failed to create Ethereal SMTP account. Falling back to email console log simulation.");
      console.log(`========================================`);
      console.log(`[OTP SENT TO EMAIL] To: ${userEmail}`);
      console.log(`[OTP MESSAGE] Your verification code is: ${otp}`);
      console.log(`========================================`);
      return { success: true, simulated: true };
    }
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #EF4444;">YourTube Security</h2>
      <p>Hello,</p>
      <p>Your one-time password (OTP) for secure login verification is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #EF4444; padding: 15px; background-color: #FEF2F2; text-align: center; border-radius: 6px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This verification code is valid for 5 minutes.</p>
      <p>If you did not request this, please secure your account immediately.</p>
      <p>Thanks,<br/>The YourTube Security Team</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: '"YourTube Security" <security@yourtube.com>',
      to: userEmail,
      subject: `YourTube Secure Verification OTP: ${otp}`,
      html: htmlContent,
    });

    console.log(`[REAL OTP Email Sent] -> To: ${userEmail}, OTP: ${otp}`);
    if (isTestAccount) {
      console.log("-----------------------------------------");
      console.log("OTP Ethereal Email Preview URL:");
      console.log(nodemailer.getTestMessageUrl(info));
      console.log("-----------------------------------------");
    }
    return { success: true };
  } catch (error) {
    console.error("Error sending OTP email (falling back to simulation):", error);
    console.log(`========================================`);
    console.log(`[OTP EMAIL SIMULATION] To: ${userEmail}`);
    console.log(`[OTP MESSAGE] Your verification code is: ${otp}`);
    console.log(`========================================`);
    return { success: true, simulated: true };
  }
};

export const sendOTPSMS = async (mobileNumber, otp) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioNumber) {
    console.warn("Twilio credentials not fully configured in env. Falling back to SMS console log simulation.");
    console.log(`========================================`);
    console.log(`[OTP SENT TO MOBILE] To: ${mobileNumber}`);
    console.log(`[OTP MESSAGE] Your verification code is: ${otp}`);
    console.log(`========================================`);
    return { success: true, simulated: true };
  }

  // Auto-format 10-digit numbers to E.164 format (+91 for India) if prefix is missing
  let formattedNumber = mobileNumber.trim();
  const digitsOnly = formattedNumber.replace(/\D/g, "");
  if (digitsOnly.length === 10 && !formattedNumber.startsWith("+")) {
    formattedNumber = `+91${digitsOnly}`;
  }

  // Prevent Twilio crash when 'To' and 'From' are the same
  const cleanNumber = (num) => (num ? num.toString().replace(/\D/g, "") : "");
  const cleanTo = cleanNumber(formattedNumber);
  const cleanFrom = cleanNumber(twilioNumber);
  const isSameNumber =
    cleanTo === cleanFrom ||
    (cleanTo.length >= 10 &&
      cleanFrom.length >= 10 &&
      (cleanTo.endsWith(cleanFrom) || cleanFrom.endsWith(cleanTo)));

  if (isSameNumber) {
    console.warn("Twilio 'To' and 'From' numbers are identical or matching. Falling back to simulated log.");
    console.log(`========================================`);
    console.log(`[OTP SENT TO MOBILE (SIMULATED due to identical To/From)] To: ${formattedNumber}`);
    console.log(`[OTP MESSAGE] Your verification code is: ${otp}`);
    console.log(`========================================`);
    return { success: true, simulated: true };
  }

  const client = twilio(accountSid, authToken);
  try {
    const message = await client.messages.create({
      body: `Your verification code is: ${otp}. Valid for 5 minutes.`,
      from: twilioNumber,
      to: formattedNumber,
    });
    console.log(`[REAL OTP SMS Sent via Twilio] -> To: ${formattedNumber}, Message SID: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error("Error sending SMS via Twilio (falling back to simulation):", error);
    console.log(`========================================`);
    console.log(`[OTP SENT TO MOBILE (FALLBACK SIMULATION)] To: ${formattedNumber}`);
    console.log(`[OTP MESSAGE] Your verification code is: ${otp}`);
    console.log(`========================================`);
    return { success: true, simulated: true, error: error.message };
  }
};

