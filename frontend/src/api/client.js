// src/api/client.js
import axios from "axios";
import * as mocks from "./mocks";

// ── EMERGENCY SWITCH ───────────────────────────────────────────
// true  = 100% offline, served from mocks.js. Backend not required.
// false = live FastAPI.
export const USE_MOCKS = false;
// ───────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let CURRENT_USER_ID = 5;
export const setCurrentUser = (id) => { CURRENT_USER_ID = id; };

const http = axios.create({ baseURL: BASE_URL, timeout: 8000 });

http.interceptors.request.use((cfg) => {
  cfg.headers["X-User-Id"] = CURRENT_USER_ID;
  return cfg;
});

http.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(
    new Error(err.response?.data?.error || err.message || "Network error")
  )
);

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));

export async function getEmployees(params = {}) {
  if (USE_MOCKS) { await delay(); return mocks.mockEmployees(params); }
  return (await http.get("/api/employees", { params })).data;
}

export async function createRequest(payload) {
  if (USE_MOCKS) { await delay(); return mocks.mockCreateRequest(payload, CURRENT_USER_ID); }
  return (await http.post("/api/requests", payload)).data;
}

export async function listRequests(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v != null)
  );
  if (USE_MOCKS) { await delay(); return mocks.mockListRequests(clean); }
  return (await http.get("/api/requests", { params: clean })).data;
}

export async function getRequest(id) {
  if (USE_MOCKS) { await delay(); return mocks.mockGetRequest(id); }
  return (await http.get(`/api/requests/${id}`)).data;
}

export async function ageRequest(id, minutes) {
  if (USE_MOCKS) { await delay(); return mocks.mockAgeRequest(id, minutes); }
  return (await http.post(`/api/requests/${id}/age`, null, { params: { minutes } })).data;
}

export async function updateStatus(id, status) {
  if (USE_MOCKS) { await delay(); return mocks.mockUpdateStatus(id, status); }
  return (await http.patch(`/api/requests/${id}/status`, { status })).data;
}

export async function assignRequest(id, assigned_to) {
  if (USE_MOCKS) { await delay(); return mocks.mockAssign(id, assigned_to); }
  return (await http.patch(`/api/requests/${id}/assign`, { assigned_to })).data;
}

export async function listEscalations(params = {}) {
  if (USE_MOCKS) { await delay(); return mocks.mockListEscalations(params); }
  return (await http.get("/api/escalations", { params })).data;
}

export async function getStats() {
  if (USE_MOCKS) { await delay(); return mocks.mockStats(); }
  return (await http.get("/api/stats")).data;
}
