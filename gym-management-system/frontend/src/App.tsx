import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Socios from "./pages/Socios";
import Ejercicios from "./pages/Ejercicios";
import Rutinas from "./pages/Rutinas";
import Clases from "./pages/Clases";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/socios" element={<Socios />} />
          <Route path="/ejercicios" element={<Ejercicios />} />
          <Route path="/rutinas" element={<Rutinas />} />
          <Route path="/clases" element={<Clases />} />
        </Route>
      </Route>
    </Routes>
  );
}
