const $ = (id) => document.getElementById(id);
let token = localStorage.getItem("zanta_token");
let socket;

function showDashboard() {
  $("loginView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  $("adminName").textContent = localStorage.getItem("zanta_user") || "Admin";
  connectSocket();
  loadDashboard();
}
function showLogin() {
  $("dashboardView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
  if (socket) socket.disconnect();
}
async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && url !== "/api/auth/login") {
    logout();
    throw new Error("Your session expired. Please log in again.");
  }
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("loginError").textContent = "";
  const button = event.submitter;
  button.disabled = true;
  button.textContent = "SIGNING IN...";
  try {
    const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username: $("username").value.trim(), password: $("password").value }) });
    token = data.token;
    localStorage.setItem("zanta_token", token);
    localStorage.setItem("zanta_user", data.username);
    showDashboard();
  } catch (error) {
    $("loginError").textContent = error.message;
  } finally {
    button.disabled = false;
    button.innerHTML = 'ACCESS DASHBOARD <b>↗</b>';
  }
});
function logout() {
  token = null;
  localStorage.removeItem("zanta_token");
  localStorage.removeItem("zanta_user");
  showLogin();
}
$("logoutBtn").addEventListener("click", logout);
$("refreshBtn").addEventListener("click", loadDashboard);

function number(value) { return Number(value || 0).toLocaleString(); }
function timeAgo(date) {
  if (!date) return "Never";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
function render(data) {
  $("totalBots").textContent = number(data.totalBots);
  $("onlineBots").textContent = number(data.onlineBots);
  $("offlineBots").textContent = number(data.offlineBots);
  $("totalMessages").textContent = number(data.totalMessages);
  $("totalUsers").textContent = number(data.totalUsers);
  $("botCountLabel").textContent = `${data.totalBots} BOTS`;
  $("lastUpdated").textContent = `Updated ${new Date().toLocaleTimeString()}`;
  const rows = data.bots || [];
  $("botRows").innerHTML = rows.length ? rows.map(bot => `
    <tr>
      <td>${escapeHtml(bot.name)}</td>
      <td>${escapeHtml(bot.platform || "WhatsApp")}</td>
      <td><span class="status ${bot.status === "online" ? "online" : "offline"}">${bot.status}</span></td>
      <td>${number(bot.messages)}</td><td>${number(bot.users)}</td>
      <td>${timeAgo(bot.lastSeen)}</td>
      <td><button class="delete-btn" data-delete="${encodeURIComponent(bot.botId)}">Remove</button></td>
    </tr>`).join("") : '<tr><td colspan="7" class="empty">No bots connected yet. Send a heartbeat from your bot to register it.</td></tr>';
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
async function loadDashboard() {
  try { render(await api("/api/dashboard")); }
  catch (error) { console.error(error); }
}
function connectSocket() {
  if (socket) socket.disconnect();
  socket = io();
  socket.on("dashboard:update", render);
}
$("botRows").addEventListener("click", async event => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  const botId = decodeURIComponent(button.dataset.delete);
  if (!confirm(`Remove bot "${botId}" from the dashboard?`)) return;
  try { await api(`/api/bots/${encodeURIComponent(botId)}`, { method: "DELETE" }); await loadDashboard(); }
  catch (error) { alert(error.message); }
});
$("year").textContent = new Date().getFullYear();
if (token) showDashboard(); else showLogin();
