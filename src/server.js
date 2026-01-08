const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { PORT } = require("./config");
const publicRoutes = require("./routes/public");
const adminRoutes = require("./routes/admin");
const { errorHandler } = require("./middleware/error");

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api", publicRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
