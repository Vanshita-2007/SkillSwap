const narrateBtn = document.getElementById("narrateBtn");
const NARRATION = [
  "Hey, what up. This is SkillSwap. No cash, just credits. Campus barter for skills.",
  "Post a skill you can teach. Earn credits doing it. It lands in the feed live.",
  "Find a skill you want to learn. Hit AI Match and get top picks ranked in seconds.",
  "Book a session, chat in app, upload proof, complete, and rate. Credits move. Cash stays out.",
  "All local for now. No login needed. Just skills swapping. Simple stuff. That's SkillSwap.",
  "No cash. No backend. Just two students swapping value.",
  "You start with fifty credits. Earn more by teaching. Spend them learning.",
  "Your skills are your currency. Someone else's gap is your lesson.",
  "Fast, local, free. That's the whole pitch."
];
let narrating = false;
let narrIdx = 0;

function speakNext() {
  if (narrIdx >= NARRATION.length) { narrating = false; return; }
  const u = new SpeechSynthesisUtterance(NARRATION[narrIdx]);
  const voices = window.speechSynthesis.getVoices();
  const female = voices.find(v => /female|zira|samantha|aria|jenny|rhonda|emma/i.test(v.name));
  if (female) u.voice = female;
  u.onend = () => { narrIdx++; speakNext(); };
  u.onerror = () => { narrIdx++; speakNext(); };
  window.speechSynthesis.speak(u);
}

function startNarration() {
  if (narrating) { window.speechSynthesis.cancel(); narrating = false; return; }
  narrating = true;
  narrIdx = 0;
  speakNext();
}

narrateBtn.addEventListener("click", startNarration);
window.addEventListener("load", startNarration);
const LS_SKILLS = "skillswap_skills_v1";
const LS_USER = "skillswap_user_v1";
const LS_BOOKS = "skillswap_books_v1";
const LS_MSGS = "skillswap_msgs_v1";

const seed = [
  { id: "s1", owner: "Meera", title: "Guitar Basics", rate: 20, bio: "2 years, weekend slots", rating: 4.8, count: 12 },
  { id: "s2", owner: "Kabir", title: "Figma UI Design", rate: 25, bio: "Ships portfolios fast", rating: 4.9, count: 9 },
  { id: "s3", owner: "Ira", title: "DSA in C++", rate: 30, bio: "450+ problems solved", rating: 4.7, count: 15 },
  { id: "s4", owner: "Dev", title: "Video Edit Premiere", rate: 15, bio: "Reels + YouTube cuts", rating: 4.6, count: 7 },
  { id: "s5", owner: "Sara", title: "Spoken English", rate: 10, bio: "Daily 30 min practice", rating: 4.9, count: 20 },
  { id: "s6", owner: "Arjun", title: "Photoshop Posters", rate: 18, bio: "Fest posters expert", rating: 4.5, count: 5 }
];

function load(k, fb) {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fb;
  } catch(e) { return fb; }
}
function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

let skills = load(LS_SKILLS, null);
if (!skills) { skills = seed.map(x => ({ ...x })); save(LS_SKILLS, skills); }
let user = load(LS_USER, { name: "Guest", email: "", credits: 50 });
let bookings = load(LS_BOOKS, []);
let msgs = load(LS_MSGS, {});
let activeBook = null;
let filter = "";

const feed = document.getElementById("feed");
const board = document.getElementById("board");
const bookingsBox = document.getElementById("bookings");
const chatBox = document.getElementById("chatBox");

function paintUser() {
  document.getElementById("userBadge").textContent = user.name;
  document.getElementById("creditBadge").textContent = user.credits + " CR";
}
document.getElementById("loginBtn").addEventListener("click", () => {
  const n = document.getElementById("loginName").value.trim() || "Guest";
  const e = document.getElementById("loginEmail").value.trim();
  user.name = n.slice(0, 20);
  user.email = e;
  if (user.credits < 0) user.credits = 50;
  save(LS_USER, user);
  paintUser();
});

document.getElementById("postBtn").addEventListener("click", () => {
  const t = document.getElementById("skillTitle").value.trim();
  const r = parseInt(document.getElementById("skillRate").value || "20", 10);
  const b = document.getElementById("skillBio").value.trim() || "Open slots";
  if (!t) { alert("Add a skill title first."); return; }
  skills.unshift({ id: "u" + Date.now(), owner: user.name, title: t.slice(0, 40), rate: r, bio: b.slice(0, 80), rating: 5.0, count: 0 });
  save(LS_SKILLS, skills);
  document.getElementById("skillTitle").value = "";
  document.getElementById("skillBio").value = "";
  paintFeed();
  paintBoard();
});

function scoreMatch(q, s) {
  q = q.toLowerCase();
  const hay = (s.title + " " + s.bio + " " + s.owner).toLowerCase();
  let sc = 0;
  q.split(" ").forEach(w => { if (w && hay.includes(w)) sc += 2; });
  sc += s.rating * 0.5;
  return sc;
}

function paintFeed() {
  feed.innerHTML = "";
  const list = skills.filter(s => {
    if (!filter) return true;
    return (s.title + " " + s.bio).toLowerCase().includes(filter.toLowerCase());
  });
  if (!list.length) { feed.innerHTML = "<div class='skill'>Empty. Post the first skill.</div>"; return; }
  list.forEach(s => {
    const d = document.createElement("div");
    d.className = "skill";
    const h = document.createElement("h3");
    h.textContent = s.title;
    const m = document.createElement("div");
    m.className = "meta";
    m.textContent = s.owner + " | " + s.rate + " CR | " + s.bio;
    const row = document.createElement("div");
    row.className = "row";
    const pill = document.createElement("div");
    pill.className = "rate-pill";
    pill.textContent = s.rating.toFixed(1) + " (" + s.count + ")";
    const btn = document.createElement("button");
    btn.className = "btn primary";
    btn.textContent = "Book";
    btn.addEventListener("click", () => bookSkill(s));
    row.appendChild(pill);
    row.appendChild(btn);
    d.appendChild(h);
    d.appendChild(m);
    d.appendChild(row);
    feed.appendChild(d);
  });
}

document.getElementById("searchBtn").addEventListener("click", () => {
  filter = document.getElementById("searchInput").value.trim();
  paintFeed();
});

document.getElementById("matchBtn").addEventListener("click", () => {
  const q = document.getElementById("searchInput").value.trim() || "learn design code music";
  const ranked = skills.map(s => ({ s: s, sc: scoreMatch(q, s) })).sort((a, b) => b.sc - a.sc).slice(0, 3);
  const box = document.getElementById("matchBox");
  box.innerHTML = "";
  ranked.forEach(r => {
    const d = document.createElement("div");
    d.className = "match";
    d.textContent = "Top pick: " + r.s.title + " by " + r.s.owner + " - " + r.s.rate + " CR - score " + r.sc.toFixed(1);
    box.appendChild(d);
  });
});

function bookSkill(s) {
  if (user.credits < s.rate) { alert("Low credits. Earn by posting a skill."); return; }
  const bk = { id: "b" + Date.now(), skillId: s.id, title: s.title, tutor: s.owner, rate: s.rate, state: "active", ts: Date.now() };
  bookings.unshift(bk);
  save(LS_BOOKS, bookings);
  activeBook = bk.id;
  paintBookings();
  paintChat();
}

function paintBookings() {
  bookingsBox.innerHTML = bookings.length ? "" : "No bookings yet. Book from feed.";
  bookings.forEach(b => {
    const d = document.createElement("div");
    d.className = "book";
    const sp = document.createElement("span");
    sp.textContent = b.title + " | " + b.tutor + " | " + b.rate + " CR | " + b.state;
    const btn = document.createElement("button");
    btn.className = "btn small";
    btn.textContent = "Open";
    btn.addEventListener("click", () => { activeBook = b.id; paintChat(); });
    d.appendChild(sp);
    d.appendChild(btn);
    bookingsBox.appendChild(d);
  });
}

function paintChat() {
  const arr = msgs[activeBook] || [];
  chatBox.innerHTML = arr.length ? "" : "Chat open. Say hi. Confirm slot.";
  arr.forEach(m => {
    const d = document.createElement("div");
    d.className = "msg" + (m.me ? " me" : "");
    d.textContent = m.text;
    chatBox.appendChild(d);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById("chatSend").addEventListener("click", () => {
  if (!activeBook) { alert("Open a booking first."); return; }
  const v = document.getElementById("chatInput").value.trim();
  if (!v) return;
  if (!msgs[activeBook]) msgs[activeBook] = [];
  msgs[activeBook].push({ text: user.name + ": " + v.slice(0, 200), me: true, ts: Date.now() });
  save(LS_MSGS, msgs);
  document.getElementById("chatInput").value = "";
  paintChat();
  const bid = activeBook;
  setTimeout(() => {
    if (!bid) return;
    if (!msgs[bid]) msgs[bid] = [];
    msgs[bid].push({ text: "Tutor: locked. See you at 6 PM. Bring notebook.", me: false, ts: Date.now() });
    save(LS_MSGS, msgs);
    paintChat();
  }, 700);
});

document.getElementById("proofBtn").addEventListener("click", () => {
  if (!activeBook) { alert("Open a booking first."); return; }
  if (!msgs[activeBook]) msgs[activeBook] = [];
  msgs[activeBook].push({ text: "Proof attached: session_clip.mp4 (12 MB)", me: true, ts: Date.now() });
  save(LS_MSGS, msgs);
  paintChat();
});

document.getElementById("rateBtn").addEventListener("click", () => {
  if (!activeBook) { alert("Open a booking first."); return; }
  const bk = bookings.find(x => x.id === activeBook);
  if (!bk || bk.state !== "active") return;
  const rv = parseInt(document.getElementById("rateSel").value, 10);
  bk.state = "done";
  user.credits = Math.max(0, user.credits - bk.rate);
  const sk = skills.find(x => x.id === bk.skillId);
  if (sk) {
    const totalPts = sk.rating * sk.count + rv;
    sk.count += 1;
    sk.rating = Math.round((totalPts / sk.count) * 10) / 10;
  }
  save(LS_BOOKS, bookings);
  save(LS_USER, user);
  save(LS_SKILLS, skills);
  if (!msgs[activeBook]) msgs[activeBook] = [];
  msgs[activeBook].push({ text: "Rated " + rv + "/5. Credits moved: " + bk.rate + " CR.", me: true, ts: Date.now() });
  save(LS_MSGS, msgs);
  paintUser();
  paintFeed();
  paintBookings();
  paintChat();
  paintBoard();
});

function paintBoard() {
  const map = {};
  skills.forEach(s => { map[s.owner] = (map[s.owner] || 0) + s.count; });
  const rows = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  board.innerHTML = "";
  rows.forEach(r => {
    const d = document.createElement("div");
    d.className = "lb";
    const a = document.createElement("span");
    a.textContent = r[0];
    const b2 = document.createElement("span");
    b2.textContent = r[1] + " sessions";
    d.appendChild(a);
    d.appendChild(b2);
    board.appendChild(d);
  });
}

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset demo data?")) return;
  localStorage.removeItem(LS_SKILLS);
  localStorage.removeItem(LS_BOOKS);
  localStorage.removeItem(LS_MSGS);
  skills = seed.map(x => ({ ...x }));
  bookings = [];
  msgs = {};
  activeBook = null;
  filter = "";
  document.getElementById("searchInput").value = "";
  document.getElementById("matchBox").innerHTML = "";
  document.getElementById("chatInput").value = "";
  user.credits = 50;
  save(LS_SKILLS, skills);
  save(LS_BOOKS, bookings);
  save(LS_MSGS, msgs);
  save(LS_USER, user);
  paintUser();
  paintFeed();
  paintBookings();
  paintChat();
  paintBoard();
});

paintUser();
paintFeed();
paintBookings();
paintChat();
paintBoard();
