import { $, escapeHtml, db, storage, ADMIN } from "../app.js";
import { StorageAPI } from "../app.js";
import {
  collection, addDoc, serverTimestamp, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const TEAMS = [
  "Axolotls","Chickens","Cows","Creepers","Endermens","Endermites","Feesh","Foxes",
  "Iron Golems","Ocelots","Pigs","Piglins","Pillagers","Skeletons","Snowmen",
  "Spiders","The Warden","Villagers","Wither Skeletons","Wolves","Zombies"
].sort((a,b)=>a.localeCompare(b));

export async function renderPage({ user } = {}) {
  const isAdmin = !!user && user.uid === ADMIN.uid;

  $("page").innerHTML = `
    <div class="row">
      <h2 style="margin-right:auto;">Clips</h2>
      <div class="muted small">Watch match clips by team.</div>
    </div>

    ${isAdmin ? `
      <div class="card" style="margin-top:12px;">
        <h3>Upload clip (Admin)</h3>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label>Title</label>
            <input id="clipTitle" placeholder="e.g. Cows clutch 1v3 vs Ocelots">
          </div>
          <div>
            <label>Team</label>
            <select id="clipTeam">
              ${TEAMS.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div style="margin-top:10px;">
          <label>Description</label>
          <textarea id="clipDesc" placeholder="What happened?"></textarea>
        </div>
        <div style="margin-top:10px;">
          <label>Video file (.mp4 recommended)</label>
          <input id="clipFile" type="file" accept="video/*">
        </div>
        <div class="row" style="margin-top:10px;">
          <button class="btn primary" id="uploadBtn">Upload</button>
          <span class="muted small" id="uploadMsg"></span>
        </div>
      </div>
    ` : `
      <div class="muted small" style="margin-top:8px;">Sign in to comment/like. Only admin can upload.</div>
    `}

    <div class="card" style="margin-top:12px;">
      <div class="row">
        <h3 style="margin-right:auto;">All clips</h3>
        <select id="teamFilter" style="max-width:260px;">
          <option value="">All teams</option>
          ${TEAMS.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")}
        </select>
      </div>
      <div id="clipList" class="grid" style="margin-top:10px;"></div>
    </div>
  `;

  // Upload handler
  if (isAdmin) {
    $("uploadBtn").onclick = async () => {
      const title = $("clipTitle").value.trim();
      const team = $("clipTeam").value;
      const desc = $("clipDesc").value.trim();
      const file = $("clipFile").files?.[0];

      if (!title || !team || !file) return alert("Title, Team, and Video file are required.");

      $("uploadMsg").textContent = "Uploading…";

      // 1) Create Firestore doc first, get clipId
      const clipRef = await addDoc(collection(db, "clips"), {
        title, team, desc,
        createdAt: serverTimestamp(),
        uploaderUid: user.uid
      });

      const clipId = clipRef.id;

      // 2) Upload to Storage: clips/{clipId}/{filename}
      const path = `clips/${clipId}/${file.name}`;
      const sref = StorageAPI.ref(storage, path);
      await StorageAPI.uploadBytes(sref, file);

      // 3) Get download URL and update doc
      const url = await StorageAPI.getDownloadURL(sref);
      await addDoc(collection(db, "clips", clipId, "comments"), {
        uid: "system",
        text: "First!",
        createdAt: serverTimestamp(),
        displayName: "System"
      }).catch(()=>{});

      await (await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"))
        .then(({ updateDoc, doc }) => updateDoc(doc(db,"clips",clipId), { url, storagePath: path }));

      $("uploadMsg").textContent = `Uploaded! Opening clip…`;
      location.href = `./clip.html?id=${clipId}`;
    };
  }

  // Live list
  const q = query(collection(db,"clips"), orderBy("createdAt","desc"));
  onSnapshot(q, (snap) => {
    const filter = $("teamFilter").value;
    const list = $("clipList");
    list.innerHTML = "";

    const docs = snap.docs
      .map(d=>({ id:d.id, ...d.data() }))
      .filter(c => !filter || c.team === filter);

    if (!docs.length) {
      list.innerHTML = `<div class="muted">No clips yet.</div>`;
      return;
    }

    docs.forEach(c => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.padding = "12px";
      card.innerHTML = `
        <div class="row">
          <strong>${escapeHtml(c.title||"Untitled")}</strong>
          <span class="right tag">${escapeHtml(c.team||"")}</span>
        </div>
        <div class="muted small" style="margin-top:6px;">${escapeHtml(c.desc||"")}</div>
        <div class="row" style="margin-top:10px;">
          <a class="btn" href="./clip.html?id=${c.id}">Watch</a>
        </div>
      `;
      list.appendChild(card);
    });
  });

  $("teamFilter").onchange = () => {
    // triggers snapshot redraw naturally next tick
    // but we can manually trigger by doing nothing; list rerenders on next snapshot.
    // simplest: just refresh current snapshot UI by dispatching a change event is enough
    import { $, escapeHtml, db, ADMIN } from "../app.js";
import {
  doc, getDoc, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, setDoc, deleteDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

function clipIdFromUrl(){
  const u = new URL(location.href);
  return u.searchParams.get("id");
}

export async function renderPage({ user } = {}) {
  const clipId = clipIdFromUrl();
  if (!clipId) {
    $("page").innerHTML = `<h2>Clip</h2><div class="muted">Missing clip id.</div>`;
    return;
  }

  const cref = doc(db, "clips", clipId);
  const snap = await getDoc(cref);
  if (!snap.exists()) {
    $("page").innerHTML = `<h2>Clip</h2><div class="muted">Clip not found.</div>`;
    return;
  }

  const c = snap.data();
  document.title = c.title ? `Clip — ${c.title}` : "Clip";

  $("page").innerHTML = `
    <div class="row">
      <h2 style="margin-right:auto;">${escapeHtml(c.title||"Untitled")}</h2>
      <span class="tag">${escapeHtml(c.team||"")}</span>
    </div>

    <div class="muted small" style="margin-top:6px;">${escapeHtml(c.desc||"")}</div>

    <div class="card" style="margin-top:12px;padding:12px;">
      ${c.url ? `
        <video id="vid" controls playsinline style="width:100%;border-radius:14px;background:#000" preload="metadata"></video>
      ` : `<div class="muted">Video still processing / missing URL.</div>`}
    </div>

    <div class="row" style="margin-top:12px;gap:8px;">
      <button class="btn" id="likeBtn">👍 Like <span id="likeCount" class="muted">0</span></button>
      <button class="btn" id="dislikeBtn">👎 Dislike <span id="dislikeCount" class="muted">0</span></button>
      <button class="btn primary right" id="subBtn">Subscribe to ${escapeHtml(c.team||"team")}</button>
    </div>

    <div class="card" style="margin-top:12px;">
      <h3>Comments</h3>
      ${user ? `
        <div class="row" style="margin-top:8px;">
          <input id="commentText" placeholder="Write a comment…" style="flex:1;">
          <button class="btn primary" id="commentBtn">Post</button>
        </div>
      ` : `<div class="muted small">Sign in to comment.</div>`}
      <div id="commentList" class="grid" style="margin-top:10px;"></div>
    </div>
  `;

  if (c.url) {
    const v = document.getElementById("vid");
    v.src = c.url;
  }

  // --- Reactions (likes/dislikes) ---
  const reactionsRef = collection(db, "clips", clipId, "reactions");
  const rQ = query(reactionsRef);
  onSnapshot(rQ, (rsnap) => {
    let likes = 0, dislikes = 0;
    rsnap.docs.forEach(d=>{
      const val = d.data()?.value;
      if (val === 1) likes++;
      if (val === -1) dislikes++;
    });
    $("likeCount").textContent = likes;
    $("dislikeCount").textContent = dislikes;
  });

  async function setReaction(value){
    if (!user) return alert("Sign in to like/dislike.");
    const myRef = doc(db, "clips", clipId, "reactions", user.uid);
    // toggle: if same value exists => remove
    const cur = await getDoc(myRef);
    if (cur.exists() && cur.data()?.value === value) {
      await deleteDoc(myRef);
      return;
    }
    await setDoc(myRef, { value, uid:user.uid, updatedAt: serverTimestamp() }, { merge:true });
  }

  $("likeBtn").onclick = () => setReaction(1);
  $("dislikeBtn").onclick = () => setReaction(-1);

  // --- Subscribe to team ---
  async function refreshSub(){
    if (!user) { $("subBtn").textContent = `Subscribe to ${c.team||"team"}`; return; }
    const subRef = doc(db, "users", user.uid, "subs", String(c.team||"team"));
    const s = await getDoc(subRef);
    $("subBtn").textContent = s.exists() ? `Subscribed ✅ (${c.team})` : `Subscribe to ${c.team}`;
  }

  $("subBtn").onclick = async () => {
    if (!user) return alert("Sign in to subscribe.");
    const subRef = doc(db, "users", user.uid, "subs", String(c.team||"team"));
    const s = await getDoc(subRef);
    if (s.exists()) await deleteDoc(subRef);
    else await setDoc(subRef, { team: c.team, createdAt: serverTimestamp() });
    await refreshSub();
  };

  await refreshSub();

  // --- Comments ---
  const cRef = collection(db, "clips", clipId, "comments");
  const cQ = query(cRef, orderBy("createdAt","desc"));

  onSnapshot(cQ, (csnap) => {
    const list = $("commentList");
    list.innerHTML = "";
    csnap.docs.forEach(d=>{
      const x = d.data();
      const div = document.createElement("div");
      div.className = "card";
      div.style.padding = "10px";
      div.innerHTML = `
        <div class="row">
          <strong>${escapeHtml(x.displayName || "User")}</strong>
          <span class="right muted small">${x.createdAt?.toDate ? x.createdAt.toDate().toLocaleString() : ""}</span>
        </div>
        <div style="margin-top:6px;">${escapeHtml(x.text || "")}</div>
      `;
      list.appendChild(div);
    });
    if (!csnap.docs.length) list.innerHTML = `<div class="muted">No comments yet.</div>`;
  });

  if (user) {
    $("commentBtn").onclick = async () => {
      const text = $("commentText").value.trim();
      if (!text) return;
      await addDoc(cRef, {
        uid: user.uid,
        displayName: user.displayName || user.email || "User",
        text,
        createdAt: serverTimestamp()
      });
      $("commentText").value = "";
    };
  }
}

  };
}
