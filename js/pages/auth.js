import { $, AuthUI, auth, escapeHtml } from "../app.js";
import { GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

export async function renderPage({ user } = {}){
  $("page").innerHTML = `
    <h2>Login / Sign up</h2>
    <div class="muted">Google or Email/Password.</div>
    <div class="hr"></div>

    <div class="grid" style="grid-template-columns:1fr;gap:12px;">
      <div class="card">
        <h3>Google</h3>
        <button class="btn primary" id="googleBtn">Continue with Google</button>
        <div class="muted small" id="googleMsg" style="margin-top:8px;"></div>
      </div>

      <div class="card">
        <h3>Email / Password</h3>
        <div class="stack">
          <div>
            <label>Email</label>
            <input id="emailInput" placeholder="you@example.com" autocomplete="email">
          </div>
          <div>
            <label>Password</label>
            <input id="passInput" type="password" placeholder="••••••••" autocomplete="current-password">
          </div>
          <div class="row">
            <button class="btn" id="emailLoginBtn">Sign in</button>
            <button class="btn primary" id="emailSignupBtn">Create account</button>
            <span class="right muted small" id="emailMsg"></span>
          </div>
        </div>
      </div>

      <div class="card ${user ? "okbanner" : ""}">
        <h3>Status</h3>
        <div class="muted small">Signed in as:</div>
        <div><strong>${user ? escapeHtml(user.email || "User") : "Nobody"}</strong></div>
        <div class="muted small" style="margin-top:8px;">After signing in, go to <a class="link" href="./index.html">Table</a>.</div>
      </div>
    </div>
  `;

  const provider = new GoogleAuthProvider();

  $("googleBtn").onclick = async () => {
    $("googleMsg").textContent = "";
    try {
      await AuthUI.signInWithPopup(auth, provider);
      location.href = "./index.html";
    } catch (e) { $("googleMsg").textContent = e.message || String(e); }
  };

  $("emailLoginBtn").onclick = async () => {
    $("emailMsg").textContent = "";
    try {
      await AuthUI.signInWithEmailAndPassword(auth, $("emailInput").value.trim(), $("passInput").value);
      location.href = "./index.html";
    } catch (e) { $("emailMsg").textContent = e.message || String(e); }
  };

  $("emailSignupBtn").onclick = async () => {
    $("emailMsg").textContent = "";
    try {
      await AuthUI.createUserWithEmailAndPassword(auth, $("emailInput").value.trim(), $("passInput").value);
      location.href = "./index.html";
    } catch (e) { $("emailMsg").textContent = e.message || String(e); }
  };
}
