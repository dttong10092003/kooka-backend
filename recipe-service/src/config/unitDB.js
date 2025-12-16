const mongoose = require("mongoose");

// Connection riêng cho KookaUnit database
const unitDBConnection = mongoose.createConnection(
  process.env.UNIT_MONGODB_URI,
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
