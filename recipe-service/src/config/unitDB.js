const mongoose = require("mongoose");

// Connection riêng cho KookaUnit database
const unitDBConnection = mongoose.createConnection(
  "mongodb+srv://phonghung04122003:bj3lhPfgVkzNKp4e@kookaunit.6djgq.mongodb.net/KookaUnit?retryWrites=true&w=majority&appName=KookaUnit",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

unitDBConnection.on("connected", () => {
  console.log(" Connected to KookaUnit database");
});

unitDBConnection.on("error", (err) => {
  console.error(" KookaUnit database connection error:", err);
});

module.exports = unitDBConnection;
