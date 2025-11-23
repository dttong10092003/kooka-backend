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
  const resetUrl = `http://kooka-web.vercel.app/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: '"Kooka Support" <tinphan309z@gmail.com>',
    to: email,
    subject: "Đặt lại mật khẩu - Kooka",
html: `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Kooka Support</h1>
      </div>

      <!-- Body -->
      <div style="padding: 30px;">
        <h2 style="color: #222; font-size: 20px; margin-bottom: 15px;">Yêu cầu đặt lại mật khẩu</h2>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          Xin chào,<br>
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Kooka của bạn.
        </p>
        <p style="font-size: 15px; line-height: 1.6;">
          Nhấp vào nút bên dưới để tạo mật khẩu mới:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #4CAF50; 
                    color: #ffffff; 
                    padding: 12px 28px; 
                    text-decoration: none; 
                    border-radius: 6px;
                    font-weight: 600;
                    display: inline-block;">
            Đặt lại mật khẩu
          </a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px; line-height: 1.5;">
          Liên kết này sẽ hết hạn sau <strong>1 giờ</strong>.<br>
          Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f1f1; padding: 15px 20px; text-align: center; font-size: 12px; color: #888;">
        © ${new Date().getFullYear()} Kooka. Mọi quyền được bảo lưu.<br>
        <a href="https://kooka.site" style="color: #4CAF50; text-decoration: none;">kooka.site</a>
      </div>
    </div>
  </div>
`

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

// Hàm gửi email xác thực tài khoản
async function sendVerificationEmail(email, verificationToken) {
  const verificationUrl = `https://kooka-web.vercel.app/verify-email?token=${verificationToken}`;
  
  const mailOptions = {
    from: '"Kooka Support" <tinphan309z@gmail.com>',
    to: email,
    subject: "Xác thực tài khoản - Kooka",
    html: `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Kooka Support</h1>
      </div>

      <!-- Body -->
      <div style="padding: 30px;">
        <h2 style="color: #222; font-size: 20px; margin-bottom: 15px;">Chào mừng bạn đến với Kooka! 🎉</h2>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          Cảm ơn bạn đã đăng ký tài khoản Kooka.<br>
          Để hoàn tất quá trình đăng ký, vui lòng xác thực địa chỉ email của bạn.
        </p>
        <p style="font-size: 15px; line-height: 1.6;">
          Nhấp vào nút bên dưới để kích hoạt tài khoản:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4CAF50; 
                    color: #ffffff; 
                    padding: 12px 28px; 
                    text-decoration: none; 
                    border-radius: 6px;
                    font-weight: 600;
                    display: inline-block;">
            Xác thực tài khoản
          </a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px; line-height: 1.5;">
          Liên kết này sẽ hết hạn sau <strong>24 giờ</strong>.<br>
          Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f1f1; padding: 15px 20px; text-align: center; font-size: 12px; color: #888;">
        © ${new Date().getFullYear()} Kooka. Mọi quyền được bảo lưu.<br>
        <a href="https://kooka.site" style="color: #4CAF50; text-decoration: none;">kooka.site</a>
      </div>
    </div>
  </div>
`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Verification email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    throw new Error("Không thể gửi email xác thực. Vui lòng thử lại sau.");
  }
}

module.exports = {
  sendResetPasswordEmail,
  sendVerificationEmail,
};
