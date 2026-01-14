const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { PORT, FRONTEND_ORIGIN } = require("./config");

const publicRoutes = require("./routes/public");
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth.routes");

const { errorHandler } = require("./middleware/error");

const app = express();

app.use(helmet());

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

const allowList = [
  FRONTEND_ORIGIN,          // ej: https://tu-frontend.com
  "http://localhost:5173",  // Vite local
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ preflight (sin "*")
app.options(/.*/, cors());

app.get("/health", (req, res) => res.json({ ok: true }));

// Rutas
app.use("/api/auth", authRoutes);  // ✅ NUEVO: /api/auth/login|refresh|logout|me
app.use("/api", publicRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
