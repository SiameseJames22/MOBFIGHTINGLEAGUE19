import { firebaseConfig, ADMIN_UID } from "./config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc,
  collection, query, orderBy, onSnapshot, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const ADMIN = { uid: ADMIN_UID };

export const $ = (id) => document.getElementById(id);
export const escapeHtml = (str) =>
  String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
export const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,40) || ("team-"+Math.random().toString(16).slice(2));
export const fmtDate = (d) => d.toISOString().slice(0,10);

export function getSeasonInfo(now = new Date()) {
  const year = now.getUTCFullYear();
  const startThisYear = new Date(Date.UTC(year, 1, 11));
  const seasonYear = (now < startThisYear) ? year - 1 : year;
  const start = new Date(Date.UTC(seasonYear, 1, 11));
  const end = new Date(Date.UTC(seasonYear, 6, 17, 23, 59, 59));
  const isOver = now > end;
  return { seasonYear, start, end, isOver };
}

export async function addNotification(text){
  await addDoc(collection(db, "notifications"), { text, createdAt: serverTimestamp() });
}

export async function fetchTeams(){
  const snap = await getDocs(collection(db,"teams"));
  const list = snap.docs.map(d=>({id:d.id, ...d.data()}));
  list.sort((a,b)=>
    (b.points||0)-(a.points||0) ||
    ((b.gd ?? ((b.gf||0)-(b.ga||0))) - (a.gd ?? ((a.gf||0)-(a.ga||0)))) ||
    (b.gf||0)-(a.gf||0) ||
    String(a.name||"").localeCompare(String(b.name||""))
  );
  return list;
}

export async function fetchTeamsMap(){
  const teams = await fetchTeams();
  return new Map(teams.map(t=>[t.id,t]));
}

export async function fetchMatches(statuses){
  const snap = await getDocs(collection(db,"matches"));
  const list = snap.docs.map(d=>({id:d.id, ...d.data()}));
  return list.filter(m=>statuses.includes(m.status))
    .sort((a,b)=> (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
}

export async function applyResultToTable(homeId, awayId, homeScore, awayScore){
  const href = doc(db,"teams",homeId);
  const aref = doc(db,"teams",awayId);
  const [hsnap, asnap] = await Promise.all([getDoc(href), getDoc(aref)]);
  if (!hsnap.exists() || !asnap.exists()) return;

  const h = hsnap.data();
  const a = asnap.data();

  const hPlayed = (h.played||0)+1;
  const aPlayed = (a.played||0)+1;

  let hWon=h.won||0, hDraw=h.drawn||0, hLost=h.lost||0, hPts=h.points||0;
  let aWon=a.won||0, aDraw=a.drawn||0, aLost=a.lost||0, aPts=a.points||0;

  if (homeScore > awayScore) { hWon++; aLost++; hPts += 3; }
  else if (homeScore < awayScore) { aWon++; hLost++; aPts += 3; }
  else { hDraw++; aDraw++; hPts += 1; aPts += 1; }

  const hGf=(h.gf||0)+homeScore, hGa=(h.ga||0)+awayScore;
  const aGf=(a.gf||0)+awayScore, aGa=(a.ga||0)+homeScore;

  await Promise.all([
    updateDoc(href, { played:hPlayed, won:hWon, drawn:hDraw, lost:hLost, gf:hGf, ga:hGa, gd:hGf-hGa, points:hPts }),
    updateDoc(aref, { played:aPlayed, won:aWon, drawn:aDraw, lost:aLost, gf:aGf, ga:aGa, gd:aGf-aGa, points:aPts })
  ]);
}

export const AuthUI = {
  GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword
};

export function start(renderPage, activeKey){
  document.querySelectorAll('nav a[data-route]').forEach(a => {
    a.classList.toggle("active", a.getAttribute("data-route") === activeKey);
  });

  onSnapshot(query(collection(db, "notifications"), orderBy("createdAt","desc")), (snap) => {
    const list = $("notifList");
    if (!list) return;
    list.innerHTML = "";
    snap.docs.slice(0, 20).forEach(d => {
      const n = d.data();
      const div = document.createElement("div");
      div.className = "card";
      div.style.padding = "10px";
      div.innerHTML = `
        <div>${escapeHtml(n.text || "")}</div>
        <div class="muted small">${n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : ""}</div>
      `;
      list.appendChild(div);
    });
  });

  onAuthStateChanged(auth, async (user) => {
    const { seasonYear, start, end, isOver } = getSeasonInfo(new Date());
    if ($("seasonLabel")) $("seasonLabel").textContent =
      `${seasonYear} (${fmtDate(start)} → ${fmtDate(end)})`;
    if ($("leagueOver")) $("leagueOver").style.display = isOver ? "" : "none";

    if (!user) {
      if ($("userLabel")) $("userLabel").textContent = "Not signed in";
      if ($("logoutBtn")) $("logoutBtn").style.display = "none";
      if ($("adminNav")) $("adminNav").style.display = "none";
      await renderPage({ user: null });
      return;
    }

    if ($("userLabel")) $("userLabel").textContent =
      `${user.displayName || "User"} • ${user.email || ""}`;

    if ($("logoutBtn")) {
      $("logoutBtn").style.display = "";
      $("logoutBtn").onclick = async () => {
        await signOut(auth);
        location.href = "./auth.html";
      };
    }

    if ($("adminNav"))
      $("adminNav").style.display =
        (user.uid === ADMIN_UID) ? "" : "none";

    await renderPage({ user });
  });
}
