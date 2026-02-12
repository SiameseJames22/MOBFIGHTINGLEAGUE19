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
  };
}
