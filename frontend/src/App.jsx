import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { getEmployees, setCurrentUser as setApiUser } from "./api/client";

import Welcome from "./pages/Welcome";
import EmployeeLayout from "./layout/EmployeeLayout";
import OpsLayout from "./layout/OpsLayout";

import EmployeeOverview from "./pages/employee/EmployeeOverview";
import RaiseRequest from "./pages/employee/RaiseRequest";
import RequestSuccess from "./pages/employee/RequestSuccess";
import MyRequests from "./pages/employee/MyRequests";
import HelpCenter from "./pages/HelpCenter";

import TicketDetail from "./pages/TicketDetail";
import OpsOverview from "./pages/ops/OpsOverview";
import OpsQueue from "./pages/ops/OpsQueue";
import DispatchBoard from "./pages/ops/DispatchBoard";
import Technicians from "./pages/ops/Technicians";
import EscalationCenter from "./pages/ops/EscalationCenter";
import Analytics from "./pages/ops/Analytics";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    getEmployees().then((list) => setEmployees(list));
  }, []);

  useEffect(() => {
    if (currentUser?.id) setApiUser(currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser && employees.length > 0) setCurrentUser(employees[0]);
  }, [currentUser, employees]);

  function handleUserChange(id) {
    const next = employees.find((e) => e.id === id);
    if (next) setCurrentUser(next);
  }

  function handleSelectPortal(portal) {
    const preferredRole = portal === "employee" ? "employee" : "admin";
    const next = employees.find((e) => e.role === preferredRole) ?? employees[0];
    if (next) setCurrentUser(next);
  }

  return (
    <Routes>
      <Route path="/" element={<Welcome onSelectPortal={handleSelectPortal} />} />

      <Route
        path="/employee"
        element={<EmployeeLayout currentUser={currentUser} employees={employees} onUserChange={handleUserChange} />}
      >
        <Route index element={<EmployeeOverview />} />
        <Route path="new" element={<RaiseRequest />} />
        <Route path="success" element={<RequestSuccess />} />
        <Route path="requests" element={<MyRequests />} />
        <Route path="requests/:id" element={<TicketDetail mode="employee" />} />
        <Route path="help" element={<HelpCenter portal="employee" />} />
      </Route>

      <Route
        path="/ops"
        element={<OpsLayout currentUser={currentUser} employees={employees} onUserChange={handleUserChange} />}
      >
        <Route index element={<OpsOverview />} />
        <Route path="queue" element={<OpsQueue />} />
        <Route path="queue/:id" element={<TicketDetail mode="ops" />} />
        <Route path="dispatch" element={<DispatchBoard />} />
        <Route path="technicians" element={<Technicians />} />
        <Route path="escalations" element={<EscalationCenter />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="help" element={<HelpCenter portal="ops" />} />
      </Route>
    </Routes>
  );
}
