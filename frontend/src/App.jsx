import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import TestRunner from "./pages/TestRunner.jsx";
import Results from "./pages/Results.jsx";

export default function App() {
  const location = useLocation();
  // Hide the footer during an active test — a live exam screen shouldn't
  // invite navigating away through footer links.
  const isLiveTest = location.pathname.startsWith("/test/");

  return (
    <>
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/:attemptId"
            element={
              <ProtectedRoute>
                <TestRunner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results/:attemptId"
            element={
              <ProtectedRoute>
                <Results />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      {!isLiveTest && <Footer />}
    </>
  );
}
