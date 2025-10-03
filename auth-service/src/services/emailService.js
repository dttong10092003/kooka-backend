const nodemailer = require("nodemailer");

// Cấu hình transporter với Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "tinphan309z@gmail.com", // test thử
    pass: "plxbmhiqvijtliqn", // App password từ Gmail
  },
});

// Hàm gửi email reset password
async function sendResetPasswordEmail(email, resetToken) {
  const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: '"Kooka Support" <tinphan309z@gmail.com>',
    to: email,
    subject: "Đặt lại mật khẩu - Kooka",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Yêu cầu đặt lại mật khẩu</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Kooka của mình.</p>
        <p>Vui lòng nhấp vào nút bên dưới để đặt lại mật khẩu:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #4CAF50; 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 5px;
                    display: inline-block;">
            Đặt lại mật khẩu
          </a>
        </div>
        <p>Hoặc copy link sau vào trình duyệt:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px;">
          Link này sẽ hết hạn sau 1 giờ.<br>
          Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Không thể gửi email. Vui lòng thử lại sau.");
  }
}

module.exports = {
  sendResetPasswordEmail,
};
