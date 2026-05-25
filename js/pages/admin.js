import { $, escapeHtml, fetchTeams, slug, ADMIN, addNotification, db } from "../app.js";
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc, getDoc, collection, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const DEFAULT_TEAMS = `Chickens
Cows
Creepers
Endermens
Endermites
Feesh
Foxes
Iron Golems
Ocelots
Pillagers
Pigs
Skeletons
Snowmen
Villagers
Wolves
Zombies`;

// Hardcoded Tier 2 + Tier 3 rosters to complement your live Tier 1 teams for the 69-club World Cup
const TIER2_NAMES = ["Elder Guardians", "Evokers", "Vindicators", "Blazes", "Ghasts", "Hoglins", "Zoglins", "Ravagers", "Witches", "Magma Cubes", "Cave Spiders", "Husks", "Strays", "Phantoms", "Shulkers", "Silverfish", "The Creaking", "Piglin Brutes", "Vexes", "Guardians", "Mooshrooms", "Striders", "Allays", "Sniffers"];
const TIER3_NAMES = ["Zombie Villagers", "Glow Squids", "Dolphins", "Sea Turtles", "Frogs", "Punas", "Polar Bears", "Ocelots", "Llamas", "Trader Llamas", "Goats", "Bats", "Parrots", "Donkeys", "Mules", "Camels", "Armadillos", "Breezes", "Bogged Skeletons", "Cats", "Puffers", "Salmon City", "Cod United", "Bees"];

export async function renderPage({ user } = {}) {
  const isAdmin = user && user.uid === ADMIN.uid;

  if (!isAdmin) {
    $("page").innerHTML = `
      <h2>Admin</h2>
      <div class="banner"><strong>Access denied.</strong><div class="muted small">Only the admin can edit.</div></div>
      <div class="muted small" style="margin-top:10px;">Your UID: <span class="mono">${escapeHtml(user?.uid || "—")}</span></div>
    `;
    return;
  }

  const teams = await fetchTeams();
  const teamOptions = teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("");

  // Load current mobRoyale settings
  const sref = doc(db, "settings", "mobRoyale");
  const ssnap = await getDoc(sref);
  const sdata = ssnap.exists() ? ssnap.data() : {};
  const wildcards = Array.isArray(sdata.wildcards) ? sdata.wildcards : ["", ""];

  $("page").innerHTML = `
    <h2>Admin Controls & Live Sim Engine</h2>
    <div class="muted small">Signed in as: <span class="mono">${escapeHtml(user.email || user.uid)}</span></div>

    <div class="hr"></div>

    <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:16px; margin-bottom:20px;">
      
      <div class="card">
        <h3>⚡ Mass Simulate League Matches</h3>
        <p class="muted small">Simulates round-robin combinations among all loaded database clubs. Weighted by Star Ratings (upsets can still happen!).</p>
        <div class="row" style="gap:8px; margin-top:12px;">
          <button class="btn primary" id="btnSim1" style="flex:1;">Sim 1 Round</button>
          <button class="btn" id="btnSim10" style="background:#4aa3ff; color:white; flex:1;">Sim 10 Rounds</button>
        </div>
      </div>

      <div class="card">
        <h3>🏆 Cup Tournament Simulator</h3>
        <p class="muted small">Simulates matches across the elite tournaments, tracks bracket stages, and pushes the winner straight to their team node.</p>
        <button class="btn" id="btnSimCups" style="background: linear-gradient(135deg, #ffaa00, #ff5500); color:white; border:none; width:100%; margin-top:12px; font-weight:bold;">Run Tournaments & World Cup</button>
      </div>

      <div class="card">
        <h3>⚠️ Reset & Conclude Season</h3>
        <p class="muted small">Archives final positions, wipes standard points metrics down to 0, updates profiles, and sets up a fresh schedule.</p>
        <button class="btn danger" id="btnEndSeason" style="width:100%; margin-top:12px;">Reset Tables for New Season</button>
      </div>

    </div>

    <div class="card" style="margin-bottom:20px; background:#000; border:1px solid #3dff8b;">
      <h3 style="color:#3dff8b; border-bottom:1px solid rgba(61,255,139,0.15); padding-bottom:6px;">Simulation Feed Engine Log</h3>
      <pre id="adminConsole" style="color:#3dff8b; font-family:monospace; font-size:12px; margin:0; max-height:130px; overflow-y:auto; line-height:1.5;">[System]: Awaiting simulation commands...</pre>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr; gap:16px;">
      <div class="card">
        <h3>Bulk add teams</h3>
        <div class="muted small">One team per line.</div>
        <textarea id="bulkTeams" style="width:100%; margin-top:8px; min-height:110px;"></textarea>
        <div class="row" style="margin-top:10px;">
          <button class="btn primary" id="bulkAddBtn">Add / Update teams</button>
          <span class="muted small" id="bulkMsg"></span>
        </div>
      </div>

      <div class="card">
        <h3>Mob Royale setup</h3>
        <div class="muted small">Top 4 are automatic. Choose 2 playoff picks.</div>
        <div class="grid" style="grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
          <div>
            <label>Playoff Pick #1</label>
            <select id="wc1"><option value="">TBD</option>${teamOptions}</select>
          </div>
          <div>
            <label>Playoff Pick #2</label>
            <select id="wc2"><option value="">TBD</option>${teamOptions}</select>
          </div>
        </div>
        <div class="row" style="margin-top:10px;">
          <button class="btn primary" id="saveRoyaleBtn">Save Mob Royale picks</button>
          <span class="muted small" id="royaleMsg"></span>
        </div>
      </div>
    </div>

    <div style="height:16px"></div>

    <div class="card">
      <h3>Trophies, Stars & Rivals Editor</h3>
      <div class="muted small">Configure dynamic squad performance profiles. Star ratings affect simulation parameters.</div>
      <div class="hr"></div>
      <div id="trophyList" class="stack" style="gap:12px;"></div>
    </div>

    <div style="height:16px"></div>

    <div class="card">
      <h3>Current loaded league roster</h3>
      <div id="teamList" class="stack"></div>
    </div>
  `;

  // Default value initializations
  $("bulkTeams").value = DEFAULT_TEAMS;
  $("wc1").value = wildcards[0] || "";
  $("wc2").value = wildcards[1] || "";

  // Helper local logger output stream 
  function logToConsole(text) {
    const el = document.getElementById("adminConsole");
    if (el) {
      el.innerHTML += `\n[Sim Engine]: ${text}`;
      el.scrollTop = el.scrollHeight;
    }
  }

  // Injector Pipeline for Breaking Fake News Headlines
  function pushFakeNews(type, title, body) {
    let feed = JSON.parse(localStorage.getItem("mob_news_feed") || "[]");
    feed.unshift({ type, title, body, time: "Just In" });
    if (feed.length > 20) feed.pop();
    localStorage.setItem("mob_news_feed", JSON.stringify(feed));
  }

  // Core Star Rating Weighted Match Simulation Logic
  function processMatchCalculation(teamA, teamB) {
    const starsA = Number(teamA.stars || 3);
    const starsB = Number(teamB.stars || 3);

    // Star values act as multipliers; 5-star teams are favored but 1-star teams can still win
    const weightA = Math.random() * starsA * 1.6;
    const weightB = Math.random() * starsB * 1.6;

    let goalsA = Math.floor(Math.random() * (starsA + 1));
    let goalsB = Math.floor(Math.random() * (starsB + 1));

    if (weightA > weightB + 1.2) goalsA += Math.floor(Math.random() * 2) + 1;
    if (weightB > weightA + 1.2) goalsB += Math.floor(Math.random() * 2) + 1;

    return { goalsA, goalsB };
  }

  // ================= SIMULATION EVENT WIRES =================

  // 1. Mass League Game Simulators
  async function runLeagueSimulation(roundsCount) {
    if (teams.length < 2) return alert("Please load more teams before running simulations.");
    logToConsole(`Beginning verification for ${roundsCount} simulation match rounds...`);
    
    // Create operational batch sets to handle bulk fires safely
    const batch = writeBatch(db);
    
    // local copy state adjustments
    let localTeamsMap = new Map(teams.map(t => [t.id, { ...t, stars: (t.stars || 3) }]));

    for (let round = 0; round < roundsCount; round++) {
      let teamIds = Array.from(localTeamsMap.keys()).sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < teamIds.length - 1; i += 2) {
        const idA = teamIds[i];
        const idB = teamIds[i+1];
        const tA = localTeamsMap.get(idA);
        const tB = localTeamsMap.get(idB);

        const { goalsA, goalsB } = processMatchCalculation(tA, tB);

        tA.played = (tA.played || 0) + 1;
        tB.played = (tB.played || 0) + 1;
        tA.gf = (tA.gf || 0) + goalsA; tA.ga = (tA.ga || 0) + goalsB;
        tB.gf = (tB.gf || 0) + goalsB; tB.ga = (tB.ga || 0) + goalsA;
        tA.gd = tA.gf - tA.ga;
        tB.gd = tB.gf - tB.ga;

        if (goalsA > goalsB) {
          tA.won = (tA.won || 0) + 1; tB.lost = (tB.lost || 0) + 1;
          tA.points = (tA.points || 0) + 3;
        } else if (goalsB > goalsA) {
          tB.won = (tB.won || 0) + 1; tA.lost = (tA.lost || 0) + 1;
          tB.points = (tB.points || 0) + 3;
        } else {
          tA.drawn = (tA.drawn || 0) + 1; tB.drawn = (tB.drawn || 0) + 1;
          tA.points = (tA.points || 0) + 1; tB.points = (tB.points || 0) + 1;
        }
      }
    }

    // Commit processed local states back up to Firestore references
    for (const [id, data] of localTeamsMap.entries()) {
      const ref = doc(db, "teams", id);
      batch.update(ref, {
        played: data.played, won: data.won, drawn: data.drawn, lost: data.lost,
        gf: data.gf, ga: data.ga, gd: data.gd, points: data.points
      });
    }

    await batch.commit();

    // Pick a random matchup to trigger fake sports news updates!
    const randomTeams = Array.from(localTeamsMap.values());
    const matchSubject = randomTeams[Math.floor(Math.random() * randomTeams.length)];
    
    // Dynamic Manager Sacking logic condition based on performance
    if (matchSubject.lost > matchSubject.won + 2) {
      pushFakeNews("sack", `🚨 EMERGENCY EXIT: ${matchSubject.name} Manager Sacked!`, `Following poor results during simulation fixtures, the board has officially dismissed the first team coaching staff.`);
    } else {
      pushFakeNews("result", `📝 SCORE ANALYSIS: ${matchSubject.name} Shift League Standing Grid!`, `Reporters confirm their tactical shape heavily altered expected goal variables during today's fixtures.`);
    }

    logToConsole(`Successfully processed and committed ${roundsCount} rounds of matches to Firebase!`);
    await renderPage({ user });
  }

  document.getElementById("btnSim1").onclick = () => runLeagueSimulation(1);
  document.getElementById("btnSim10").onclick = () => runLeagueSimulation(10);

  // 2. Tournament Cups Simulation Execution Block
  document.getElementById("btnSimCups").onclick = async () => {
    logToConsole("Assembling all 69 clubs across tiers for the World Mob Cup simulation standard...");
    
    // Collect all 69 entries
    const combined69Names = [...teams.map(t => t.name), ...TIER2_NAMES, ...TIER3_NAMES];
    const shuffledClubs = combined69Names.sort(() => Math.random() - 0.5);

    // Choose winner based on star configurations
    let cupWinner = shuffledClubs[0];
    let topStarRating = 0;
    
    // Look at a sample pool of 6 teams to award a high-odds or underdog winner
    for (let i = 0; i < Math.min(6, shuffledClubs.length); i++) {
      const currentName = shuffledClubs[i];
      const matchingLiveTeam = teams.find(t => t.name === currentName);
      const teamStars = matchingLiveTeam ? (matchingLiveTeam.stars || 3) : 3;
      if (teamStars + Math.random() * 2 > topStarRating) {
        topStarRating = teamStars;
        cupWinner = currentName;
      }
    }

    // Check if the cup winner exists as a live editable club in Firestore
    const winnerId = slug(cupWinner);
    const winnerLiveMatch = teams.find(t => t.id === winnerId);

    if (winnerLiveMatch) {
      const currentTrophies = Number(winnerLiveMatch.trophies || 0);
      await updateDoc(doc(db, "teams", winnerId), { trophies: currentTrophies + 1 });
      logToConsole(`Firestore match found: Awarded +1 Trophy to ${cupWinner}.`);
    }

    // Save tournament tracking metadata locally for team.html profile views to intercept
    let tournamentStats = JSON.parse(localStorage.getItem("mob_tourney_stats") || "{}");
    tournamentStats[cupWinner] = {
      lastTrophy: "🌎 World Mob Cup Winner (2026)",
      statusZone: "🏆 Global Tournament Winner"
    };
    localStorage.setItem("mob_tourney_stats", JSON.stringify(tournamentStats));

    pushFakeNews("cup", `🏆 WORLD MOB CUP FINALE: ${cupWinner} Crowned World Champions!`, `Against all odds, the absolute final matchday tree concluded with ${cupWinner} lifting the ultimate trophy in front of thousands.`);
    
    // Append a fake transfer signing headline alongside tournament wins
    const randomTradedTeam = shuffledClubs[Math.floor(Math.random() * shuffledClubs.length)];
    pushFakeNews("transfer", `💎 RECORD BLOCKBUSTER: New Superstar Signing for ${randomTradedTeam}!`, `Internal club sources confirm a massive contract deal has been reached ahead of next season's competition schedules.`);

    logToConsole(`Tournament simulation complete! Champion: ${cupWinner}. Profiles updated and News Feed updated.`);
    await renderPage({ user });
  };

  // 3. Reset Season Lifecycles Data Tables
  document.getElementById("btnEndSeason").onclick = async () => {
    if (!confirm("Are you absolutely sure? This clears all points, goals, wins, and losses for all teams in Firestore.")) return;
    
    logToConsole("Archiving active statistics... wiping Firestore points records clean...");
    const batch = writeBatch(db);
    
    teams.forEach(t => {
      const ref = doc(db, "teams", t.id);
      batch.update(ref, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 });
    });

    await batch.commit();
    localStorage.removeItem("mob_news_feed"); // Clean old news feed records for the next season split
    
    logToConsole("All database teams reset back to 0 points. A fresh pre-season is now active!");
    await renderPage({ user });
  };

  // ================= CORE MAPPED EVENT CONTROLS =================

  $("saveRoyaleBtn").onclick = async () => {
    const a = $("wc1").value;
    const b = $("wc2").value;
    if (a && b && a === b) return alert("Pick two different teams (or leave one TBD).");

    await setDoc(doc(db, "settings", "mobRoyale"), { wildcards: [a || "", b || ""] }, { merge: true });
    await addNotification("Mob Royale playoff picks updated.");
    $("royaleMsg").textContent = "Saved.";
  };

  $("bulkAddBtn").onclick = async () => {
    $("bulkMsg").textContent = "Working…";
    const lines = $("bulkTeams").value.split("\n").map(s => s.trim()).filter(Boolean);
    for (const name of lines) {
      const id = slug(name);
      await setDoc(doc(db, "teams", id), {
        name,
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
        trophies: 0,
        stars: 3, // Initialized baseline rating
        rivals: [],
        createdAt: serverTimestamp()
      }, { merge: true });
    }
    await addNotification(`Teams updated (${lines.length}).`);
    $("bulkMsg").textContent = `Added/updated ${lines.length} teams.`;
    await renderPage({ user });
  };

  const renderTeams = () => {
    const list = $("teamList");
    list.innerHTML = "";
    teams.forEach(t => {
      const div = document.createElement("div");
      div.className = "row";
      div.innerHTML = `
        <div style="flex:1"><strong>${escapeHtml(t.name)}</strong></div>
        <span class="tag" style="margin-right:6px; background:#ffaa00; color:#000;">⭐ ${t.stars || 3} Stars</span>
        <span class="tag">Pts ${t.points || 0}</span>
        <button class="btn" data-del="${t.id}" style="border-color:rgba(255,74,74,.35); color:#ffb3b3;">Remove</button>
      `;
      list.appendChild(div);
    });

    list.querySelectorAll("button[data-del]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-del");
        await deleteDoc(doc(db, "teams", id));
        await addNotification("Team removed.");
        await renderPage({ user });
      };
    });
  };
  renderTeams();

  const trophyList = $("trophyList");
  trophyList.innerHTML = "";
  teams
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .forEach(t => {
      const row = document.createElement("div");
      row.className = "card";
      row.style.padding = "12px";
      const rivalsStr = Array.isArray(t.rivals) ? t.rivals.join(", ") : "";
      
      row.innerHTML = `
        <div class="row">
          <strong>${escapeHtml(t.name)}</strong>
          <span class="right tag">ID: ${escapeHtml(t.id)}</span>
        </div>

        <div class="grid" style="grid-template-columns:140px 140px 1fr; gap:10px; margin-top:10px;">
          <div>
            <label>Trophies</label>
            <input type="number" min="0" value="${Number(t.trophies || 0)}" data-trophy="${t.id}" style="width:100%;">
          </div>
          <div>
            <label>Strength Star Rating</label>
            <select data-stars="${t.id}" style="width:100%; padding:4px;">
              <option value="1" ${t.stars === 1 ? 'selected' : ''}>⭐ (1/5 - Poor)</option>
              <option value="2" ${t.stars === 2 ? 'selected' : ''}>⭐⭐ (2/5)</option>
              <option value="3" ${t.stars === 3 || !t.stars ? 'selected' : ''}>⭐⭐⭐ (3/5 - Mid)</option>
              <option value="4" ${t.stars === 4 ? 'selected' : ''}>⭐⭐⭐⭐ (4/5)</option>
              <option value="5" ${t.stars === 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐ (5/5 - Elite)</option>
            </select>
          </div>
          <div>
            <label>Rivals (comma separated)</label>
            <input value="${escapeHtml(rivalsStr)}" data-rivals="${t.id}" style="width:100%;">
          </div>
        </div>

        <div class="row" style="margin-top:10px;">
          <button class="btn primary" data-save="${t.id}">Save Changes</button>
          <span class="muted small" id="msg-${t.id}"></span>
        </div>
      `;
      trophyList.appendChild(row);
    });

  trophyList.querySelectorAll("button[data-save]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-save");
      const trophies = Number(trophyList.querySelector(`input[data-trophy="${id}"]`).value || 0);
      const stars = Number(trophyList.querySelector(`select[data-stars="${id}"]`).value || 3);
      const rivalsRaw = trophyList.querySelector(`input[data-rivals="${id}"]`).value || "";
      const rivals = rivalsRaw.split(",").map(s => s.trim()).filter(Boolean);

      await updateDoc(doc(db, "teams", id), { trophies, stars, rivals });
      await addNotification(`Updated configs for ${teams.find(t => t.id === id)?.name || "team"}.`);
      
      const msg = document.getElementById(`msg-${id}`);
      if (msg) msg.textContent = "Saved.";
      logToConsole(`Committed profile changes for ${id} (Stars: ${stars}).`);
    };
  });
}
