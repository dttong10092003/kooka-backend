const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: isProduction
        ? "https://api.kooka.site/api/auth/google/callback"
        : "http://localhost:3000/api/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Tìm user theo googleId hoặc email
        let user = await User.findOne({
          $or: [
            { googleId: profile.id },
            { email: profile.emails[0].value }
          ]
        });

        if (user) {
          // User tồn tại - cập nhật googleId nếu chưa có
          if (!user.googleId) {
            user.googleId = profile.id;
            user.profilePicture = profile.photos[0]?.value;
            await user.save();
          }
          return done(null, user);
        } else {
          // Tạo user mới - chỉ lưu thông tin auth
          const newUser = new User({
            googleId: profile.id,
            username: profile.emails[0].value.split('@')[0],
            email: profile.emails[0].value,
          });
          
          const savedUser = await newUser.save();
          
          // Lưu thông tin profile sang user-service (sẽ được xử lý trong authController)
          savedUser.googleProfile = {
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            profilePicture: profile.photos[0]?.value,
          };
          
          return done(null, savedUser);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err, null));
});

module.exports = passport;
