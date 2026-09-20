import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import membersRoutes from "./routes/members.routes";
import exercisesRoutes from "./routes/exercises.routes";
import workoutsRoutes from "./routes/workouts.routes";
import classesRoutes from "./routes/classes.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import passwordResetRoutes from "./routes/passwordReset.routes";
import mobileAuthRoutes from "./routes/mobileAuth.routes";
import mobileRoutes from "./routes/mobile.routes";
import membershipsRoutes from "./routes/memberships.routes";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "gymcore-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/auth", passwordResetRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/exercises", exercisesRoutes);
app.use("/api/workouts", workoutsRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/mobile/auth", mobileAuthRoutes);
app.use("/api/mobile", mobileRoutes);
app.use("/api/memberships", membershipsRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

app.listen(PORT, () => {
  console.log(`GymCore backend escuchando en http://localhost:${PORT}`);
});
