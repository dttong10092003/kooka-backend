const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const recipeRoutes = require("./routes/recipeRoutes");
const pythonCookRoutes = require("./routes/pythonCookRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const app = express();
app.use(express.json());

app.use("/api/recipes", recipeRoutes); // Prefix cho recipe-service
app.use("/api/search", pythonCookRoutes); // Prefix cho python_cook-service
app.use("/api/auth", authRoutes);   // thêm auth-service
app.use("/api/users", userRoutes);  // thêm user-service
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API Gateway on ${PORT}`));
