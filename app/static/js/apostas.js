// ============================================================
//  TABS
// ============================================================

function apostasTab(tab) {
  const panels = { recomendacoes: "panelRecomendacoes", analisador: "panelAnalisador", tabelas: "panelTabelas" };
  const buttons = { recomendacoes: "tabBtnRec", analisador: "tabBtnAna", tabelas: "tabBtnTab" };

  Object.keys(panels).forEach(t => {
    document.getElementById(panels[t]).style.display = t === tab ? "block" : "none";
    document.getElementById(buttons[t]).classList.toggle("apostas-tab--active", t === tab);
  });

  localStorage.setItem("apostas_tab", tab);

  if (tab === "tabelas" && !window._tabelasLoaded) {
    loadTabelasTournaments();
  }
}

// ============================================================
//  INIT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("apostas_tab") || "recomendacoes";
  apostasTab(saved);

  const dateInput = document.getElementById("apostasDate");
  if (dateInput) dateInput.value = todayISO();

  loadTips();
});

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n) { return String(n).padStart(2, "0"); }

// ============================================================
//  TIPS — load & render
// ============================================================

async function loadTips() {
  showTipsState("loading");
  try {
    const resp = await fetch("/api/apostas/tips");
    const json = await resp.json();
    if (!resp.ok) { showTipsState("erro", json.error); return; }
    renderTipsStats(json.stats);
    if (!json.tips || json.tips.length === 0) { showTipsState("vazio"); return; }
    renderTipsList(json.tips);
    showTipsState("list");
  } catch {
    showTipsState("erro", "Não foi possível conectar ao servidor.");
  }
}

function showTipsState(state, msg) {
  document.getElementById("tipsLoading").style.display  = state === "loading" ? "flex" : "none";
  document.getElementById("tipsList").style.display     = state === "list"    ? "block" : "none";
  document.getElementById("tipsVazio").style.display    = state === "vazio"   ? "flex"  : "none";
  document.getElementById("tipsErro").style.display     = state === "erro"    ? "flex"  : "none";
  if (state === "erro" && msg) {
    document.getElementById("tipsErroMsg").textContent = msg;
  }
}

function renderTipsStats(stats) {
  const taxa = stats.total > 0 ? `${stats.taxa_acerto}%` : "—";
  document.getElementById("statGreen").textContent   = stats.green;
  document.getElementById("statRed").textContent     = stats.red;
  document.getElementById("statTaxa").textContent    = taxa;
  document.getElementById("statPending").textContent = stats.pendente;
}

function renderTipsList(tips) {
  const isAdmin = window.APOSTAS_IS_ADMIN === true;
  document.getElementById("tipsList").innerHTML = tips.map(t => buildTipCard(t, isAdmin)).join("");
}

function buildTipCard(tip, isAdmin) {
  const statusBadge = buildStatusBadge(tip.status);
  const meta = buildTipMeta(tip);
  const adminActions = isAdmin ? buildTipAdminActions(tip) : "";

  return `
    <div class="tips-card" id="tip-${tip.id}" data-status="${escHtml(tip.status)}">
      <div class="tips-card-header">
        ${statusBadge}
        <span class="tips-card-title">${escHtml(tip.titulo)}</span>
      </div>
      ${meta ? `<div class="tips-card-meta">${meta}</div>` : ""}
      ${adminActions}
    </div>
  `;
}

function buildStatusBadge(status) {
  const map = {
    green:    { cls: "tips-badge--green",   icon: "bi-check-circle-fill", label: "Green" },
    red:      { cls: "tips-badge--red",     icon: "bi-x-circle-fill",     label: "Red" },
    pendente: { cls: "tips-badge--pending", icon: "bi-clock-fill",        label: "Pendente" },
    void:     { cls: "tips-badge--void",    icon: "bi-dash-circle",       label: "Void" },
  };
  const s = map[status] || map.pendente;
  return `<span class="tips-badge ${s.cls}"><i class="bi ${s.icon}"></i>${s.label}</span>`;
}

function buildTipMeta(tip) {
  const parts = [];
  if (tip.partida)      parts.push(`<span><i class="bi bi-shield-fill"></i>${escHtml(tip.partida)}</span>`);
  if (tip.campeonato)   parts.push(`<span><i class="bi bi-trophy-fill"></i>${escHtml(tip.campeonato)}</span>`);
  if (tip.odd != null)  parts.push(`<span><i class="bi bi-tag-fill"></i>Odd ${tip.odd.toFixed(2)}</span>`);
  if (tip.stake)        parts.push(`<span><i class="bi bi-coin"></i>${escHtml(tip.stake)}</span>`);
  if (tip.data_partida) parts.push(`<span><i class="bi bi-calendar3"></i>${formatDate(tip.data_partida)}</span>`);
  return parts.join("");
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function buildTipAdminActions(tip) {
  const id = tip.id;
  return `
    <div class="tips-admin-actions">
      ${tip.status !== "green"   ? `<button class="tips-action-btn tips-action-btn--green"   onclick="setTipStatus(${id},'green')"   title="Marcar green"><i class="bi bi-check-lg"></i></button>` : ""}
      ${tip.status !== "red"     ? `<button class="tips-action-btn tips-action-btn--red"     onclick="setTipStatus(${id},'red')"     title="Marcar red"><i class="bi bi-x-lg"></i></button>` : ""}
      ${tip.status !== "pendente"? `<button class="tips-action-btn tips-action-btn--pending" onclick="setTipStatus(${id},'pendente')" title="Marcar pendente"><i class="bi bi-clock"></i></button>` : ""}
      ${tip.status !== "void"    ? `<button class="tips-action-btn tips-action-btn--void"    onclick="setTipStatus(${id},'void')"    title="Anular"><i class="bi bi-dash-lg"></i></button>` : ""}
      <button class="tips-action-btn tips-action-btn--delete" onclick="deleteTip(${id})" title="Excluir"><i class="bi bi-trash3"></i></button>
    </div>
  `;
}

// ============================================================
//  TIPS — admin actions
// ============================================================

async function setTipStatus(tipId, status) {
  try {
    const resp = await fetch(`/api/apostas/tips/${tipId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await resp.json();
    if (!resp.ok) { alert(json.error || "Erro ao atualizar status"); return; }
    await loadTips();
  } catch {
    alert("Erro de conexão");
  }
}

async function deleteTip(tipId) {
  if (!confirm("Excluir esta recomendação?")) return;
  try {
    const resp = await fetch(`/api/apostas/tips/${tipId}`, { method: "DELETE" });
    const json = await resp.json();
    if (!resp.ok) { alert(json.error || "Erro ao excluir"); return; }
    await loadTips();
  } catch {
    alert("Erro de conexão");
  }
}

// ============================================================
//  TIPS — modal
// ============================================================

function openTipModal() {
  document.getElementById("tipTitulo").value       = "";
  document.getElementById("tipPartida").value      = "";
  document.getElementById("tipCampeonato").value   = "";
  document.getElementById("tipOdd").value          = "";
  document.getElementById("tipStake").value        = "";
  document.getElementById("tipDataPartida").value  = "";
  hideTipFormError();
  document.getElementById("tipModalOverlay").style.display = "flex";
}

function closeTipModal() {
  document.getElementById("tipModalOverlay").style.display = "none";
}

function closeTipModalOverlay(e) {
  if (e.target === document.getElementById("tipModalOverlay")) closeTipModal();
}

function showTipFormError(msg) {
  const el = document.getElementById("tipFormError");
  el.textContent = msg;
  el.style.display = "block";
}

function hideTipFormError() {
  document.getElementById("tipFormError").style.display = "none";
}

async function submitTipForm() {
  hideTipFormError();
  const titulo      = document.getElementById("tipTitulo").value.trim();
  const partida     = document.getElementById("tipPartida").value.trim();
  const campeonato  = document.getElementById("tipCampeonato").value.trim();
  const oddRaw      = document.getElementById("tipOdd").value.trim();
  const stake       = document.getElementById("tipStake").value.trim();
  const dataPartida = document.getElementById("tipDataPartida").value || null;

  if (!titulo) { showTipFormError("Título é obrigatório"); return; }

  const odd = oddRaw !== "" ? parseFloat(oddRaw) : null;
  if (oddRaw !== "" && (isNaN(odd) || odd <= 1)) {
    showTipFormError("Odd deve ser maior que 1.00");
    return;
  }

  const btn = document.getElementById("tipSubmitBtn");
  btn.disabled = true;

  try {
    const resp = await fetch("/api/apostas/tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, partida, campeonato, odd, stake, data_partida: dataPartida }),
    });
    const json = await resp.json();
    if (!resp.ok) { showTipFormError(json.error || "Erro ao criar recomendação"); return; }
    closeTipModal();
    await loadTips();
  } catch {
    showTipFormError("Erro de conexão");
  } finally {
    btn.disabled = false;
  }
}

// ============================================================
//  ANALISADOR — existing logic
// ============================================================

async function apostasBuscar() {
  const date = document.getElementById("apostasDate")?.value || todayISO();
  const minDiff = document.getElementById("apostasMinDiff")?.value || "5";

  setLoadingState(true);
  hideAllAnalisador();
  document.getElementById("apostasLoading").style.display = "flex";

  try {
    const resp = await fetch(`/api/apostas/partidas?date=${encodeURIComponent(date)}&min_diff=${minDiff}`);
    const json = await resp.json();

    setLoadingState(false);
    document.getElementById("apostasLoading").style.display = "none";

    if (!resp.ok) { showAnalisadorError(json.error || "Erro ao buscar partidas."); return; }
    if (!json.matches || json.matches.length === 0) { showAnalisadorVazio(minDiff, json.with_standings || 0); return; }
    renderMatches(json.matches, json.total);
  } catch {
    setLoadingState(false);
    document.getElementById("apostasLoading").style.display = "none";
    showAnalisadorError("Não foi possível conectar ao servidor.");
  }
}

function setLoadingState(loading) {
  const btn   = document.getElementById("apostasBtnBuscar");
  const icon  = document.getElementById("apostasBuscarIcon");
  const label = document.getElementById("apostasBuscarLabel");
  if (!btn) return;
  btn.disabled = loading;
  icon.className  = loading ? "bi bi-hourglass-split" : "bi bi-search";
  label.textContent = loading ? "Buscando..." : "Buscar partidas";
}

function hideAllAnalisador() {
  ["apostasLoading", "apostasVazio", "apostasErro", "apostasResultado"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

function showAnalisadorVazio(minDiff, withStandings) {
  const el  = document.getElementById("apostasVazio");
  const msg = document.getElementById("apostasVazioMsg");
  if (withStandings === 0) {
    msg.textContent = "Nenhuma partida com tabela de classificação disponível para este dia. Tente outra data ou veja as tabelas na aba Tabelas.";
  } else if (minDiff === "1" || minDiff === 1) {
    msg.textContent = `${withStandings} partida${withStandings !== 1 ? "s" : ""} encontrada${withStandings !== 1 ? "s" : ""} com tabela disponível, mas nenhuma passou pelo filtro. Tente reduzir a diferença mínima.`;
  } else {
    msg.textContent = `Nenhuma partida com diferença de ≥ ${minDiff} posições (${withStandings} tinham tabela disponível). Tente reduzir o filtro.`;
  }
  el.style.display = "flex";
}

function showAnalisadorError(msg) {
  const el    = document.getElementById("apostasErro");
  const msgEl = document.getElementById("apostasErroMsg");
  if (msgEl) msgEl.textContent = msg;
  if (el) el.style.display = "flex";
}

function renderMatches(matches, total) {
  const resultado = document.getElementById("apostasResultado");
  const totalEl   = document.getElementById("apostasTotal");
  const lista     = document.getElementById("apostasLista");
  totalEl.textContent = `${total} partida${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}`;
  lista.innerHTML = matches.map(buildMatchCard).join("");
  resultado.style.display = "block";
}

function buildMatchCard(m) {
  const footer = buildFooter(m);
  const oddsId = `odds-${m.event_id}`;
  return `
    <div class="apostas-match-card">
      <div class="apostas-match-competition">
        <div class="apostas-competition-name">
          ${m.country ? `<span>${escHtml(m.country)}</span><span style="opacity:.4">·</span>` : ""}
          <span>${escHtml(m.tournament)}</span>
        </div>
        ${m.round ? `<span class="apostas-round-badge">R.${m.round}</span>` : ""}
      </div>
      <div class="apostas-match-body">
        <div class="apostas-match-row">
          <div class="apostas-team">
            ${buildPosBadge(m.home_pos)}
            <span class="apostas-team-name">${escHtml(m.home_team)}</span>
          </div>
          <div class="apostas-diff-center">
            ${buildDiffBadge(m.pos_diff)}
            <span class="apostas-diff-label">posições</span>
          </div>
          <div class="apostas-team apostas-team--away">
            ${buildPosBadge(m.away_pos)}
            <span class="apostas-team-name">${escHtml(m.away_team)}</span>
          </div>
        </div>
      </div>
      ${footer}
      <div class="apostas-odds-toggle">
        <button class="apostas-odds-btn" onclick="toggleOdds(${m.event_id}, '${oddsId}', this)">
          <i class="bi bi-graph-up"></i> Ver odds
        </button>
      </div>
      <div class="apostas-odds-panel" id="${oddsId}" style="display:none;"></div>
    </div>
  `;
}

async function toggleOdds(eventId, panelId, btn) {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  if (panel.style.display !== "none") {
    panel.style.display = "none";
    btn.innerHTML = '<i class="bi bi-graph-up"></i> Ver odds';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Carregando...';

  try {
    const resp = await fetch(`/api/apostas/odds/${eventId}`);
    const json = await resp.json();

    if (!resp.ok || (!json.fulltime && !json.asian)) {
      panel.innerHTML = '<p class="apostas-odds-unavailable">Odds não disponíveis para este evento.</p>';
    } else {
      panel.innerHTML = buildOddsPanel(json);
    }

    panel.style.display = "block";
    btn.innerHTML = '<i class="bi bi-chevron-up"></i> Fechar odds';
  } catch {
    panel.innerHTML = '<p class="apostas-odds-unavailable">Erro ao carregar odds.</p>';
    panel.style.display = "block";
    btn.innerHTML = '<i class="bi bi-graph-up"></i> Ver odds';
  } finally {
    btn.disabled = false;
  }
}

function buildOddsPanel(odds) {
  const parts = [];

  if (odds.fulltime) {
    const ft = odds.fulltime;
    parts.push(`
      <div class="apostas-odds-group">
        <span class="apostas-odds-label">1X2</span>
        <div class="apostas-odds-row">
          ${ft["1"] != null ? `<div class="apostas-odd-chip apostas-odd-chip--home"><span class="apostas-odd-name">Casa</span><span class="apostas-odd-val">${ft["1"].toFixed(2)}</span></div>` : ""}
          ${ft["X"] != null ? `<div class="apostas-odd-chip apostas-odd-chip--draw"><span class="apostas-odd-name">Empate</span><span class="apostas-odd-val">${ft["X"].toFixed(2)}</span></div>` : ""}
          ${ft["2"] != null ? `<div class="apostas-odd-chip apostas-odd-chip--away"><span class="apostas-odd-name">Fora</span><span class="apostas-odd-val">${ft["2"].toFixed(2)}</span></div>` : ""}
        </div>
      </div>
    `);
  }

  if (odds.asian && odds.asian.length > 0) {
    const chips = odds.asian.map(a =>
      `<div class="apostas-odd-chip apostas-odd-chip--asian"><span class="apostas-odd-name">${escHtml(a.name)}</span><span class="apostas-odd-val">${a.odd.toFixed(2)}</span></div>`
    ).join("");
    parts.push(`
      <div class="apostas-odds-group">
        <span class="apostas-odds-label">Asian Handicap</span>
        <div class="apostas-odds-row">${chips}</div>
      </div>
    `);
  }

  return `<div class="apostas-odds-content">${parts.join("")}</div>`;
}

function buildPosBadge(pos) {
  return `<span class="apostas-pos-badge ${posBadgeClass(pos)}" title="Posição na tabela">#${pos}</span>`;
}

function posBadgeClass(pos) {
  if (pos === 1)  return "apostas-pos-badge--1";
  if (pos <= 4)   return "apostas-pos-badge--top";
  if (pos <= 8)   return "apostas-pos-badge--mid";
  if (pos <= 14)  return "apostas-pos-badge--low";
  return "apostas-pos-badge--rel";
}

function buildDiffBadge(diff) {
  let cls;
  if (diff >= 15)      cls = "apostas-diff-badge--high";
  else if (diff >= 10) cls = "apostas-diff-badge--medium";
  else if (diff >= 5)  cls = "apostas-diff-badge--low";
  else                 cls = "apostas-diff-badge--min";
  return `<span class="apostas-diff-badge ${cls}">Δ ${diff}</span>`;
}

function buildFooter(m) {
  const parts = [];
  if (m.start_timestamp) {
    const dt = new Date(m.start_timestamp * 1000);
    parts.push(`<span class="apostas-time">${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>`);
  }
  if (m.status_type === "inprogress") {
    parts.push(`<span class="apostas-status-badge apostas-status-badge--live">Ao vivo</span>`);
  } else if (m.status_type === "finished") {
    parts.push(`<span class="apostas-status-badge apostas-status-badge--ended">Encerrado</span>`);
  }
  return parts.length ? `<div class="apostas-match-footer">${parts.join("")}</div>` : "";
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================
//  TABELAS — tournament standings
// ============================================================

window._tabelasLoaded = false;
window._activeTournamentId = null;

async function loadTabelasTournaments() {
  try {
    const resp = await fetch("/api/apostas/tournaments");
    const list = await resp.json();
    renderTournamentChips(list);
    window._tabelasLoaded = true;

    const saved = localStorage.getItem("apostas_tournament_id");
    const first = list[0];
    const target = saved ? list.find(t => String(t.id) === saved) : null;
    if (target || first) loadStandings((target || first).id);
  } catch {
    document.getElementById("tabelasTournamentList").innerHTML =
      '<p class="apostas-odds-unavailable">Erro ao carregar campeonatos.</p>';
  }
}

function renderTournamentChips(list) {
  const wrap = document.getElementById("tabelasTournamentList");
  const byCategory = {};
  list.forEach(t => {
    if (!byCategory[t.category]) byCategory[t.category] = [];
    byCategory[t.category].push(t);
  });

  let html = "";
  Object.entries(byCategory).forEach(([cat, items]) => {
    html += `<div class="tabelas-category">
      <span class="tabelas-category-label">${escHtml(cat)}</span>
      <div class="tabelas-chips">`;
    items.forEach(t => {
      html += `<button class="tabelas-chip" id="chip-${t.id}" onclick="loadStandings(${t.id})">${escHtml(t.name)}</button>`;
    });
    html += `</div></div>`;
  });
  wrap.innerHTML = html;
}

function setActiveChip(tournamentId) {
  document.querySelectorAll(".tabelas-chip").forEach(el => {
    el.classList.toggle("tabelas-chip--active", el.id === `chip-${tournamentId}`);
  });
}

async function loadStandings(tournamentId) {
  window._activeTournamentId = tournamentId;
  localStorage.setItem("apostas_tournament_id", String(tournamentId));
  setActiveChip(tournamentId);

  document.getElementById("tabelasContent").style.display = "none";
  document.getElementById("tabelasErro").style.display = "none";
  document.getElementById("tabelasLoading").style.display = "flex";

  try {
    const resp = await fetch(`/api/apostas/standings/${tournamentId}`);
    const json = await resp.json();
    document.getElementById("tabelasLoading").style.display = "none";

    if (!resp.ok) {
      showTabelasErro(json.error || "Erro ao carregar tabela.");
      return;
    }
    if (!json.groups || json.groups.length === 0) {
      showTabelasErro("Tabela não disponível para este campeonato no momento.");
      return;
    }
    renderStandings(json);
  } catch {
    document.getElementById("tabelasLoading").style.display = "none";
    showTabelasErro("Erro de conexão.");
  }
}

function showTabelasErro(msg) {
  document.getElementById("tabelasErroMsg").textContent = msg;
  document.getElementById("tabelasErro").style.display = "flex";
}

function renderStandings(data) {
  const content = document.getElementById("tabelasContent");
  const isMultiGroup = data.groups.length > 1;

  let html = `<div class="tabelas-season">${escHtml(data.season)}</div>`;

  data.groups.forEach(group => {
    if (isMultiGroup && group.name) {
      html += `<div class="tabelas-group-name">${escHtml(group.name)}</div>`;
    }
    html += `
      <div class="tabelas-table-wrap">
        <table class="tabelas-table">
          <thead>
            <tr>
              <th class="tabelas-th tabelas-th--pos">#</th>
              <th class="tabelas-th tabelas-th--team">Time</th>
              <th class="tabelas-th tabelas-th--num" title="Jogos">J</th>
              <th class="tabelas-th tabelas-th--num" title="Vitórias">V</th>
              <th class="tabelas-th tabelas-th--num" title="Empates">E</th>
              <th class="tabelas-th tabelas-th--num" title="Derrotas">D</th>
              <th class="tabelas-th tabelas-th--num" title="Gols marcados/sofridos">Gols</th>
              <th class="tabelas-th tabelas-th--num" title="Saldo de gols">SG</th>
              <th class="tabelas-th tabelas-th--pts">Pts</th>
            </tr>
          </thead>
          <tbody>
            ${group.rows.map(r => buildStandingsRow(r)).join("")}
          </tbody>
        </table>
      </div>
    `;
  });

  content.innerHTML = html;
  content.style.display = "block";
}

function buildStandingsRow(r) {
  const posCls = posRowClass(r.position);
  return `
    <tr class="tabelas-row ${posCls}">
      <td class="tabelas-td tabelas-td--pos"><span class="tabelas-pos">${r.position}</span></td>
      <td class="tabelas-td tabelas-td--team">
        <span class="tabelas-team-name">${escHtml(r.team_name)}</span>
      </td>
      <td class="tabelas-td tabelas-td--num">${r.matches}</td>
      <td class="tabelas-td tabelas-td--num">${r.wins}</td>
      <td class="tabelas-td tabelas-td--num">${r.draws}</td>
      <td class="tabelas-td tabelas-td--num">${r.losses}</td>
      <td class="tabelas-td tabelas-td--num">${r.goals_for}:${r.goals_against}</td>
      <td class="tabelas-td tabelas-td--num">${r.goal_diff}</td>
      <td class="tabelas-td tabelas-td--pts"><strong>${r.points}</strong></td>
    </tr>
  `;
}

function posRowClass(pos) {
  if (pos <= 4)  return "tabelas-row--champions";
  if (pos <= 6)  return "tabelas-row--europa";
  if (pos >= 18) return "tabelas-row--relegation";
  return "";
}
