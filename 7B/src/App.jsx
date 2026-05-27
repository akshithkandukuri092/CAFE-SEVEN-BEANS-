import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import Home from "./Home";
import Login from "./login";
import Booking from "./Booking";
import Dashboard from "./Dashboard";
import AdminDashboard from "./AdminDashboard";
import ResetPassword from "./ResetPassword";

function App() {
  useEffect(() => {
    AOS.init({
      duration: 800, // Animation duration in ms
      once: true, // Animation happens only once for optimal scroll performance
      disable: 'mobile', // Disable animations on mobile to prevent touch lag and horizontal scrolling gaps!
    });
  }, []);

  return (
    <Routes>
      <Route path="/"        element={<Home />} />
      <Route path="/login"   element={<Login />} />
      <Route path="/signup"  element={<Login defaultSignUp={true} />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin"   element={<AdminDashboard />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
  );
}

export default App;