const OWNER = "www0906812681-pixel";
const REPO = "PMY";
const FILE = "settings.json";
const API = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + FILE;
const KEYS = ["calc","names","paint","games"];

let token = "";
let sha = "";
let settings = { globalEnabled: true, projects: { calc:true, names:true, paint:true, games:false } };

const $ = (id) => document.getElementById(id);

function msg(t, ok) {
  const m = $("msg");
  if (!t) { m.className = ""; m.textContent = ""; return; }
  m.className = "show";
  m.textContent = t;
  m.style.color = ok ? "#2fbf8f" : "#ff6b6b";
}

function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "صباح الخير";
  if (h >= 12 && h < 17) return "نهارك سعيد";
  return "مساء الخير";
}

function headers() {
  return { "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json" };
}

function render() {
  $("sw_global").classList.toggle("on", settings.globalEnabled);
  KEYS.forEach(function(k) { $("sw_" + k).classList.toggle("on", !!settings.projects[k]); });
  const st = $("stState");
  st.textContent = settings.globalEnabled ? "مفعّل" : "معطّل";
  st.className = "val " + (settings.globalEnabled ? "ok" : "bad");
  const shown = settings.globalEnabled ? KEYS.filter(function(k){ return settings.projects[k]; }).length : 0;
  $("stCount").textContent = shown + " / " + KEYS.length;
}

function decode(b64) {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, function(c) { return c.charCodeAt(0); });
  return new TextDecoder().decode(bytes);
}

function encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach(function(b) { bin += String.fromCharCode(b); });
  return btoa(bin);
}

function fmtDate(iso) {
  const d = new Date(iso);
  const p = function(n) { return String(n).padStart(2, "0"); };
  return p(d.getDate()) + "-" + p(d.getMonth() + 1) + "-" + d.getFullYear();
}

async function loadLastUpdate() {
  try {
    const url = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/commits?path=" + FILE + "&per_page=1";
    const r = await fetch(url, { headers: headers() });
    if (!r.ok) return;
    const list = await r.json();
    if (list && list[0]) $("stDate").textContent = fmtDate(list[0].commit.committer.date);
  } catch (e) {}
}

async function load() {
  const r = await fetch(API + "?t=" + Date.now(), { headers: headers() });
  if (r.status === 401) throw new Error("التوكن غير صحيح");
  if (!r.ok) throw new Error("فشل التحميل (" + r.status + ")");
  const data = await r.json();
  sha = data.sha;
  const parsed = JSON.parse(decode(data.content));
  settings.globalEnabled = parsed.globalEnabled !== false;
  KEYS.forEach(function(k) {
    if (parsed.projects && typeof parsed.projects[k] === "boolean") settings.projects[k] = parsed.projects[k];
  });
  render();
}

async function login() {
  token = $("tok").value.trim();
  if (!token) { msg("اكتب التوكن", false); return; }
  $("loginBtn").disabled = true;
  msg("جاري الدخول...", true);
  try {
    await load();
    try { localStorage.setItem("lab_token", token); } catch (e) {}
    $("greet").textContent = greeting();
    $("loginCard").classList.add("hidden");
    $("panel").classList.remove("hidden");
    msg("", true);
    loadLastUpdate();
  } catch (e) {
    msg(e.message, false);
  }
  $("loginBtn").disabled = false;
}

async function save() {
  $("saveBtn").disabled = true;
  msg("جاري الحفظ...", true);
  try {
    const body = {
      message: "Update settings from admin panel",
      content: encode(JSON.stringify(settings, null, 2) + "\n"),
      sha: sha
    };
    const r = await fetch(API, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
    if (!r.ok) throw new Error("فشل الحفظ (" + r.status + ")");
    const data = await r.json();
    sha = data.content.sha;
    $("stDate").textContent = fmtDate(new Date().toISOString());
    msg("✅ تم الحفظ بنجاح. قد يستغرق الموقع دقيقة ليتحدث.", true);
  } catch (e) {
    msg(e.message, false);
  }
  $("saveBtn").disabled = false;
}

function logout() {
  try { localStorage.removeItem("lab_token"); } catch (e) {}
  token = "";
  $("tok").value = "";
  $("panel").classList.add("hidden");
  $("loginCard").classList.remove("hidden");
  msg("", true);
}

$("sw_global").onclick = function() { settings.globalEnabled = !settings.globalEnabled; render(); };
KEYS.forEach(function(k) {
  $("sw_" + k).onclick = function() { settings.projects[k] = !settings.projects[k]; render(); };
});
$("loginBtn").onclick = login;
$("saveBtn").onclick = save;
$("logoutBtn").onclick = logout;

try {
  const saved = localStorage.getItem("lab_token");
  if (saved) { $("tok").value = saved; login(); }
} catch (e) {}
