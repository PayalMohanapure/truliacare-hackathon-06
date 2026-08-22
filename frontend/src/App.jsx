import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./layout/Header";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminQueue from "./pages/AdminQueue";
import AgentChat from "./pages/AgentChat";
import { getEmployees, setCurrentUser as setApiUser } from "./api/client";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    getEmployees().then((list) => {
      setEmployees(list);
      setCurrentUser(list[0] ?? null);
    });
  }, []);

  useEffect(() => {
    if (currentUser?.id) setApiUser(currentUser.id);
  }, [currentUser]);

  function handleUserChange(id) {
    const next = employees.find((e) => e.id === id);
    if (next) setCurrentUser(next);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <Header currentUser={currentUser} employees={employees} onUserChange={handleUserChange} />
      <Routes>
        <Route path="/" element={<EmployeeDashboard currentUser={currentUser} />} />
        <Route path="/admin" element={<AdminQueue employees={employees} />} />
        <Route path="/agent" element={<AgentChat currentUser={currentUser} />} />
      </Routes>
    </div>
  );
}
