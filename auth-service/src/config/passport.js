const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Lấy email chính của Google
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        const usernameFromEmail = email ? email.split("@")[0] : profile.id; // 👉 chỉ lấy phần trước @

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = new User({
            username: usernameFromEmail, // vd: tinphan309z
            googleId: profile.id,
            email: email,               // thêm email vào DB
          });
          await user.save();
        } else if (!user.email && email) {
          // 👉 update nếu user cũ chưa có email
          user.email = email;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
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
