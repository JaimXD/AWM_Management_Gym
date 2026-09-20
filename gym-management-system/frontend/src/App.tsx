import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Socios from "./pages/Socios";
import Ejercicios from "./pages/Ejercicios";
import Rutinas from "./pages/Rutinas";
import Clases from "./pages/Clases";
import PasswordRecovery from "./pages/PasswordRecovery";
import RegistrarUsuario from "./pages/RegistrarUsuario";
import Membresias from "./pages/Membresias";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registrar" element={<RegistrarUsuario />} />
      <Route
        path="/recuperar-password"
        element={<PasswordRecovery />}
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/socios" element={<Socios />} />
          <Route path="/ejercicios" element={<Ejercicios />} />
          <Route path="/rutinas" element={<Rutinas />} />
          <Route path="/clases" element={<Clases />} />
          <Route path="/membresias" element={<Membresias />} />
        </Route>
      </Route>
    </Routes>
  );
}
