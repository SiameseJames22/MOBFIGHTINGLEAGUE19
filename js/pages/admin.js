import { $, escapeHtml, fetchTeams, slug, ADMIN, addNotification, db } from "../app.js";
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

const TIER2_NAMES = ["Elder Guardians", "Evokers", "Vindicators", "Blazes", "Ghasts", "Hoglins", "Zoglins", "Ravagers", "Witches", "Magma Cubes", "Cave Spiders", "Husks", "Strays", "Phantoms", "Shulkers", "Silverfish", "The Creaking", "Piglin Brutes", "Vexes", "Guardians", "Mooshrooms", "Striders", "Allays", "Sniffers"];
const TIER3_NAMES = ["Zombie Villagers", "Glow Squids", "Dolphins", "Sea Turtles", "Frogs", "Punas", "Polar Bears", "Ocelots", "Llamas", "Trader Llamas", "Goats", "Bats", "Parrots", "Donkeys", "Mules", "Camels", "Armadillos", "Breezes", "Bogged Skeletons", "Cats", "Puffers", "Salmon City", "Cod United", "Bees"];

export async function renderPage({ user } = {}) {
  const isAdmin = user && user.uid === ADMIN.uid;

  if (!isAdmin) {
    $("page").innerHTML = `
      <h2>Admin</h2>
      <div class="banner"><strong>Access denied.</strong><div class="muted small">Only the admin can edit.</div></div>
    `;
    return;
  }

  const teams = await fetchTeams();
  const teamOptions = teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("");

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
        <p class="muted small">Simulates fixtures among database clubs. Dynamically builds 5-match form history tracker strings.</p>
        
        <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 12px; font-weight: bold; color: #ffaa00;">Number of rounds to execute:</label>
          <input type="number" id="inputSimRounds" min="1" max="100" value="1" style="width: 100%; padding: 6px; font-size: 14px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px;">
        </div>

        <div class="row" style="gap:8px; margin-top:12px;">
          <button class="btn primary" id="btnCustomSim" style="flex:1;">Simulate Specified Rounds</button>
        </div>
      </div>

      <div class="card">
        <h3>🏆 Cup Tournament Simulator</h3>
        <p class="muted small">Simulates matches across elite tournaments, tracks bracket stages, and pushes the winner straight to their team node.</p>
        <button class="btn" id="btnSimCups" style="background: linear-gradient(135deg, #ffaa00, #ff5500); color:white; border:none; width:100%; margin-top:12px; font-weight:bold;">Run Tournaments & World Cup</button>
      </div>

      <div class="card">
        <h3>🔄 Conclude Season (With Promotion & Relegation)</h3>
        <p class="muted small">Calculates league boundaries. Automatically promotes top tier performers and drops bottom squads down divisions.</p>
        <button class="btn danger" id="btnEndSeason" style="width:100%; margin-top:12px; background: #e65100;">Process Relegation & Reset Tables</button>
      </div>

    </div>

    <div class="card" style="margin-bottom:20px; background:#000; border:1px solid #3dff8b;">
      <h3 style="color:#3dff8b; border-bottom:1px solid rgba(61,255,139,0.15); padding-bottom:6px;">Simulation Feed Engine Log</h3>
      <pre id="adminConsole" style="color:#3dff8b; font-family:monospace; font-size:12px; margin:0; max-height:130px; overflow-y:auto; line-height:1.5;">[System]: Awaiting simulation commands...</pre>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr; gap:16px;">
      <div class="card">
        <h3>Bulk add teams</h3>
        <div class="muted small">One team per line. Defaults assign to Tier 1 ("Mob League").</div>
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
      <h3>Trophies, Tier Assignments & Rivals Editor</h3>
      <div class="muted small">Manually override tiers, trophies, strength ratings, or modify rival configurations.</div>
      <div class="hr"></div>
      <div id="trophyList" class="stack" style="gap:12px;"></div>
    </div>

    <div style="height:16px"></div>

    <div class="card">
      <h3>Current Loaded League Roster</h3>
      <div id="teamList" class="stack"></div>
    </div>

    <div style="height:16px"></div>

    <div class="card" style="background: rgba(74, 163, 255, 0.05); border: 1px solid rgba(74, 163, 255, 0.25);">
      <h3>📋 Export League Tables to Clipboard</h3>
      <div class="muted small" style="margin-bottom: 12px;">Click a division to generate and copy a clean text table layout.</div>
      <div class="row" style="gap:10px;">
        <button class="btn" id="copyT1" style="background:#4aa3ff; color:white; font-weight:bold;">📋 Copy Mob League (Tier 1)</button>
        <button class="btn" id="copyT2" style="background:#4aa3ff; color:white; font-weight:bold;">📋 Copy Mob Championship (Tier 2)</button>
        <button class="btn" id="copyT3" style="background:#4aa3ff; color:white; font-weight:bold;">📋 Copy Mob League One (Tier 3)</button>
      </div>
    </div>
  `;

  $("bulkTeams").value = DEFAULT_TEAMS;
  $("wc1").value = wildcards[0] || "";
  $("wc2").value = wildcards[1] || "";

  function logToConsole(text) {
    const el = document.getElementById("adminConsole");
    if (el) {
      el.innerHTML += `\n[Sim Engine]: ${text}`;
      el.scrollTop = el.scrollHeight;
    }
  }

  function pushFakeNews(type, title, body) {
    let feed = JSON.parse(localStorage.getItem("mob_news_feed") || "[]");
    feed.unshift({ type, title, body, time: "Just In" });
    if (feed.length > 20) feed.pop();
    localStorage.setItem("mob_news_feed", JSON.stringify(feed));
  }

  function renderFormCircles(formArray) {
    if (!Array.isArray(formArray) || formArray.length === 0) {
      return `<span style="color:rgba(255,255,255,0.2); font-size:12px;">No matches played</span>`;
    }
    return `<div style="display:inline-flex; gap:4px; vertical-align:middle; align-items:center;">
      ${formArray.slice(-5).map(result => {
        let bg = "#757575";
        let symbol = "–";
        if (result === "W") { bg = "#2e7d32"; symbol = "✓"; }
        if (result === "L") { bg = "#c62828"; symbol = "✕"; }
        if (result === "D") { bg = "#ef6c00"; symbol = "●"; }
        return `<span title="${result}" style="display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:50%; background:${bg}; color:#fff; font-size:10px; font-weight:bold; font-family:sans-serif;">${symbol}</span>`;
      }).join("")}
    </div>`;
  }

  function processMatchCalculation(teamA, teamB) {
    const starsA = Number(teamA.stars || 3);
    const starsB = Number(teamB.stars || 3);

    const weightA = Math.random() * starsA * 1.6;
    const weightB = Math.random() * starsB * 1.6;

    let goalsA = Math.floor(Math.random() * (starsA + 1));
    let goalsB = Math.floor(Math.random() * (starsB + 1));

    if (weightA > weightB + 1.2) goalsA += Math.floor(Math.random() * 2) + 1;
    if (weightB > weightA + 1.2) goalsB += Math.floor(Math.random() * 2) + 1;

    return { goalsA, goalsB };
  }

  function updateFormHistory(teamData, newResult) {
    if (!Array.isArray(teamData.form)) {
      teamData.form = [];
    }
    teamData.form.push(newResult);
    if (teamData.form.length > 5) {
      teamData.form.shift();
    }
  }

  // ================= EXPORT & CLIPBOARD GENERATOR ENGINE =================
  function copyTableToClipboard(tierName) {
    // Filter out and sort the matching division items
    const filtered = teams
      .filter(t => (tierName === "Mob League" ? (t.tier === "Mob League" || !t.tier) : t.tier === tierName))
      .sort((a,b) => (b.points || 0) - (a.points || 0) || (b.gd || 0) - (a.gd || 0));

    if (filtered.length === 0) {
      alert(`There are currently no clubs assigned to ${tierName}.`);
      return;
    }

    // Header formatting grid line layout
    let textOutput = `== ${tierName.toUpperCase()} TABLE ==\n`;
    textOutput += `#  Team                     P   W   D   L   GF  GA  GD  Pts\n`;
    textOutput += `-----------------------------------------------------------\n`;

    filtered.forEach((t, i) => {
      const pos = String(i + 1).padEnd(3, ' ');
      const name = String(t.name).padEnd(24, ' ');
      const p = String(t.played || 0).padEnd(4, ' ');
      const w = String(t.won || 0).padEnd(4, ' ');
      const d = String(t.drawn || 0).padEnd(4, ' ');
      const l = String(t.lost || 0).padEnd(4, ' ');
      const gf = String(t.gf || 0).padEnd(4, ' ');
      const ga = String(t.ga || 0).padEnd(4, ' ');
      const gd = String(t.gd || 0).padEnd(4, ' ');
      const pts = String(t.points || 0);

      textOutput += `${pos}${name}${p}${w}${d}${l}${gf}${ga}${gd}${pts}\n`;
    });

    // Write straight to native device navigator clipboard API
    navigator.clipboard.writeText(textOutput)
      .then(() => {
        addNotification(`Copied ${tierName} standings to clipboard!`);
        logToConsole(`Table string successfully bundled and exported for: ${tierName}.`);
      })
      .catch(err => {
        console.error("Clipboard failed", err);
        alert("Failed to copy table. Please verify browser window focus context permissions.");
      });
  }

  // Bind export buttons to trigger events
  document.getElementById("copyT1").onclick = () => copyTableToClipboard("Mob League");
  document.getElementById("copyT2").onclick = () => copyTableToClipboard("Mob Championship");
  document.getElementById("copyT3").onclick = () => copyTableToClipboard("Mob League One");

  // ================= SIMULATION EVENT WIRES =================

  async function runLeagueSimulation(roundsCount) {
    if (teams.length < 2) return alert("Please load more teams before running simulations.");
    if (isNaN(roundsCount) || roundsCount < 1) return alert("Please specify a valid round number of 1 or more.");
    
    logToConsole(`Beginning verification for ${roundsCount} simulation match rounds...`);
    const batch = writeBatch(db);
    let localTeamsMap = new Map(teams.map(t => [t.id, { ...t, stars: (t.stars || 3), form: Array.isArray(t.form) ? t.form : [] }]));

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
          updateFormHistory(tA, "W"); updateFormHistory(tB, "L");
        } else if (goalsB > goalsA) {
          tB.won = (tB.won || 0) + 1; tA.lost = (tA.lost || 0) + 1;
          tB.points = (tB.points || 0) + 3;
          updateFormHistory(tA, "L"); updateFormHistory(tB, "W");
        } else {
          tA.drawn = (tA.drawn || 0) + 1; tB.drawn = (tB.drawn || 0) + 1;
          tA.points = (tA.points || 0) + 1; tB.points = (tB.points || 0) + 1;
          updateFormHistory(tA, "D"); updateFormHistory(tB, "D");
        }
      }
    }

    for (const [id, data] of localTeamsMap.entries()) {
      const ref = doc(db, "teams", id);
      batch.update(ref, {
        played: data.played, won: data.won, drawn: data.drawn, lost: data.lost,
        gf: data.gf, ga: data.ga, gd: data.gd, points: data.points,
        form: data.form
      });
    }

    await batch.commit();

    const randomTeams = Array.from(localTeamsMap.values());
    const matchSubject = randomTeams[Math.floor(Math.random() * randomTeams.length)];
    
    if (matchSubject.lost > matchSubject.won + 2) {
      pushFakeNews("sack", `🚨 EMERGENCY EXIT: ${matchSubject.name} Manager Sacked!`, `Following poor results during simulation fixtures, the board has officially dismissed the first team coaching staff.`);
    } else {
      pushFakeNews("result", `📝 SCORE ANALYSIS: ${matchSubject.name} Shift League Standing Grid!`, `Reporters confirm their tactical shape heavily altered expected goal variables during today's fixtures.`);
    }

    logToConsole(`Successfully processed and committed ${roundsCount} rounds of matches to Firebase!`);
    await renderPage({ user });
  }

  document.getElementById("btnCustomSim").onclick = () => {
    const roundsValue = parseInt(document.getElementById("inputSimRounds").value, 10);
    runLeagueSimulation(roundsValue);
  };

  document.getElementById("btnEndSeason").onclick = async () => {
    if (!confirm("Are you ready to conclude the season? This will automatically promote/relegate cross-division edge cases and reset points down to 0!")) return;
    
    logToConsole("Processing season termination data tables... Sorting positions inside division clusters...");

    let tier1 = teams.filter(t => (t.tier === "Mob League" || !t.tier)).sort((a,b) => (b.points || 0) - (a.points || 0) || (b.gd || 0) - (a.gd || 0));
    let tier2 = teams.filter(t => t.tier === "Mob Championship").sort((a,b) => (b.points || 0) - (a.points || 0) || (b.gd || 0) - (a.gd || 0));
    let tier3 = teams.filter(t => t.tier === "Mob League One").sort((a,b) => (b.points || 0) - (a.points || 0) || (b.gd || 0) - (a.gd || 0));

    logToConsole(`Initial state: Tier 1 (${tier1.length} teams), Tier 2 (${tier2.length} teams), Tier 3 (${tier3.length} teams).`);

    const batch = writeBatch(db);
    let logsUpdates = [];

    if (tier1.length > 3 && tier2.length > 0) {
      const relegatedFromT1 = tier1.slice(-3); 
      const promotedFromT2 = tier2.slice(0, 3);

      relegatedFromT1.forEach(team => {
        batch.update(doc(db, "teams", team.id), { tier: "Mob Championship" });
        logsUpdates.push(`⬇️ Relegated: ${team.name} dropped down to Mob Championship.`);
      });

      promotedFromT2.forEach(team => {
        batch.update(doc(db, "teams", team.id), { tier: "Mob League" });
        logsUpdates.push(`⬆️ Promoted: ${team.name} climbed up to Mob League!`);
      });
    }

    if (tier2.length > 3 && tier3.length > 0) {
      const relegatedFromT2 = tier2.slice(-3);
      const promotedFromT3 = tier3.slice(0, 3);

      relegatedFromT2.forEach(team => {
        batch.update(doc(db, "teams", team.id), { tier: "Mob League One" });
        logsUpdates.push(`⬇️ Relegated: ${team.name} dropped down to Mob League One.`);
      });

      promotedFromT3.forEach(team => {
        batch.update(doc(db, "teams", team.id), { tier: "Mob Championship" });
        logsUpdates.push(`⬆️ Promoted: ${team.name} climbed up to Mob Championship!`);
      });
    }

    teams.forEach(t => {
      batch.update(doc(db, "teams", t.id), {
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
        form: []
      });
    });

    await batch.commit();

    logsUpdates.forEach(m => logToConsole(m));
    pushFakeNews("cup", "🔄 DIVISION RESET: Promotion & Relegation Settled!", "The league board has authorized seasonal tier changes.");
    
    logToConsole("All database points initialized back to zero. Fresh season calendars generated!");
    await renderPage({ user });
  };

  document.getElementById("btnSimCups").onclick = async () => {
    logToConsole("Assembling all 69 clubs across tiers for the World Mob Cup simulation standard...");
    const combined69Names = [...teams.map(t => t.name), ...TIER2_NAMES, ...TIER3_NAMES];
    const shuffledClubs = combined69Names.sort(() => Math.random() - 0.5);

    let cupWinner = shuffledClubs[0];
    let topStarRating = 0;
    
    for (let i = 0; i < Math.min(6, shuffledClubs.length); i++) {
      const currentName = shuffledClubs[i];
      const matchingLiveTeam = teams.find(t => t.name === currentName);
      const teamStars = matchingLiveTeam ? (matchingLiveTeam.stars || 3) : 3;
      if (teamStars + Math.random() * 2 > topStarRating) {
        topStarRating = teamStars;
        cupWinner = currentName;
      }
    }

    const winnerId = slug(cupWinner);
    const winnerLiveMatch = teams.find(t => t.id === winnerId);

    if (winnerLiveMatch) {
      const currentTrophies = Number(winnerLiveMatch.trophies || 0);
      await updateDoc(doc(db, "teams", winnerId), { trophies: currentTrophies + 1 });
      logToConsole(`Firestore match found: Awarded +1 Trophy to ${cupWinner}.`);
    }

    let tournamentStats = JSON.parse(localStorage.getItem("mob_tourney_stats") || "{}");
    tournamentStats[cupWinner] = {
      lastTrophy: "🌎 World Mob Cup Winner (2026)",
      statusZone: "🏆 Global Tournament Winner"
    };
    localStorage.setItem("mob_tourney_stats", JSON.stringify(tournamentStats));

    pushFakeNews("cup", `🏆 WORLD MOB CUP FINALE: ${cupWinner} Crowned World Champions!`, `The final match tree concluded with ${cupWinner} lifting the trophy.`);
    await renderPage({ user });
  };

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
        stars: 3,
        tier: "Mob League",
        rivals: [],
        form: [],
        createdAt: serverTimestamp()
      }, { merge: true });
    }
    await addNotification(`Teams updated (${lines.length}).`);
    await renderPage({ user });
  };

  const renderTeams = () => {
    const list = $("teamList");
    list.innerHTML = "";
    
    teams
      .slice()
      .sort((a,b) => (b.points || 0) - (a.points || 0) || (b.gd || 0) - (a.gd || 0))
      .forEach(t => {
        const div = document.createElement("div");
        div.className = "row";
        div.style.padding = "8px 0";
        div.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
        
        div.innerHTML = `
          <div style="flex:1; display:flex; align-items:center; gap:12px;">
            <strong>${escapeHtml(t.name)}</strong>
            <span style="font-size:11px; opacity:0.5; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:3px;">${escapeHtml(t.tier || "Mob League")}</span>
          </div>
          <div style="margin-right:16px;">
            ${renderFormCircles(t.form)}
          </div>
          <span class="tag" style="margin-right:6px; background:#ffaa00; color:#000;">⭐ ${t.stars || 3} Stars</span>
          <span class="tag" style="min-width:55px; text-align:center;">Pts ${t.points || 0}</span>
          <button class="btn" data-del="${t.id}" style="border-color:rgba(255,74,74,.35); color:#ffb3b3; padding:2px 8px; font-size:12px;">Remove</button>
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
      const currentTier = t.tier || "Mob League";
      
      row.innerHTML = `
        <div class="row">
          <strong>${escapeHtml(t.name)}</strong>
          <span class="right tag">ID: ${escapeHtml(t.id)}</span>
        </div>

        <div class="grid" style="grid-template-columns:130px 140px 150px 1fr; gap:10px; margin-top:10px;">
          <div>
            <label>Trophies</label>
            <input type="number" min="0" value="${Number(t.trophies || 0)}" data-trophy="${t.id}" style="width:100%;">
          </div>
          <div>
            <label>League Division Tier</label>
            <select data-tier="${t.id}" style="width:100%; padding:4px;">
              <option value="Mob League" ${currentTier === "Mob League" ? 'selected' : ''}>Mob League (Tier 1)</option>
              <option value="Mob Championship" ${currentTier === "Mob Championship" ? 'selected' : ''}>Mob Championship (Tier 2)</option>
              <option value="Mob League One" ${currentTier === "Mob League One" ? 'selected' : ''}>Mob League One (Tier 3)</option>
            </select>
          </div>
          <div>
            <label>Strength Star Rating</label>
            <select data-stars="${t.id}" style="width:100%; padding:4px;">
              <option value="1" ${t.stars === 1 ? 'selected' : ''}>⭐ (1/5)</option>
              <option value="2" ${t.stars === 2 ? 'selected' : ''}>⭐⭐ (2/5)</option>
              <option value="3" ${t.stars === 3 || !t.stars ? 'selected' : ''}>⭐⭐⭐ (3/5)</option>
              <option value="4" ${t.stars === 4 ? 'selected' : ''}>⭐⭐⭐⭐ (4/5)</option>
              <option value="5" ${t.stars === 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐ (5/5)</option>
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
      const tier = trophyList.querySelector(`select[data-tier="${id}"]`).value;
      const rivalsRaw = trophyList.querySelector(`input[data-rivals="${id}"]`).value || "";
      const rivals = rivalsRaw.split(",").map(s => s.trim()).filter(Boolean);

      await updateDoc(doc(db, "teams", id), { trophies, stars, tier, rivals });
      await addNotification(`Updated configs for ${teams.find(t => t.id === id)?.name || "team"}.`);
      
      const msg = document.getElementById(`msg-${id}`);
      if (msg) msg.textContent = "Saved.";
      logToConsole(`Committed changes for ${id} (Tier: ${tier}).`);
    };
  });
}
