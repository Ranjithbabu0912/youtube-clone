import nodemailer from "nodemailer";

export const sendInvoiceEmail = async (userEmail, userName, planDetails) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  let transporter;
  let isTestAccount = false;

  if (emailUser && emailPass) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
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
    console.error("Error sending invoice email:", error);
    return { success: false, error: error.message };
  }
};
