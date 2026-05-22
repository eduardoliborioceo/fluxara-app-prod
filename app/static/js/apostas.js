// ============================================================
//  TABS
// ============================================================

const _PANELS  = { recomendacoes: "panelRecomendacoes", jogos: "panelJogos", tabelas: "panelTabelas" };
const _TABBTNS = { recomendacoes: "tabBtnRec", jogos: "tabBtnJogos", tabelas: "tabBtnTab" };

function apostasTab(tab) {
  Object.keys(_PANELS).forEach(t => {
    document.getElementById(_PANELS[t]).style.display  = t === tab ? "block" : "none";
    document.getElementById(_TABBTNS[t]).classList.toggle("apostas-tab--active", t === tab);
  });
  localStorage.setItem("apostas_tab", tab);

  if ((tab === "jogos" || tab === "tabelas") && !window._leaguesLoaded) {
    loadLeagues();
  }
}

// ============================================================
//  INIT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("apostas_tab") || "recomendacoes";
  apostasTab(saved);
  loadTips();
});

function pad(n) { return String(n).padStart(2, "0"); }

// ============================================================
//  LEAGUE SELECTOR (shared between Jogos + Tabelas)
// ============================================================

window._leaguesLoaded  = false;
window._activeLeague   = null;

async function loadLeagues() {
  try {
    const resp = await fetch("/api/apostas/espn/leagues");
    const list = await resp.json();
    renderLeagueChips("jogosLeagueList", list, slug => selectLeague(slug));
    renderLeagueChips("tabelasLeagueList", list, slug => selectLeague(slug));
    window._leaguesLoaded = true;

    const saved = localStorage.getItem("apostas_league") || list[0]?.slug;
    if (saved) selectLeague(saved);
  } catch {
    document.getElementById("jogosLeagueList").innerHTML =
      '<p class="apostas-odds-unavailable">Erro ao carregar campeonatos.</p>';
    document.getElementById("tabelasLeagueList").innerHTML =
      '<p class="apostas-odds-unavailable">Erro ao carregar campeonatos.</p>';
  }
}

function renderLeagueChips(containerId, list, onSelect) {
  const wrap = document.getElementById(containerId);
  const byCategory = {};
  list.forEach(lg => {
    if (!byCategory[lg.category]) byCategory[lg.category] = [];
    byCategory[lg.category].push(lg);
  });

  let html = "";
  Object.entries(byCategory).forEach(([cat, items]) => {
    html += `<div class="tabelas-category">
      <span class="tabelas-category-label">${escHtml(cat)}</span>
      <div class="tabelas-chips">`;
    items.forEach(lg => {
      html += `<button class="tabelas-chip" id="${containerId}-chip-${lg.slug}"
        onclick="selectLeague('${escHtml(lg.slug)}')">${escHtml(lg.name)}</button>`;
    });
    html += `</div></div>`;
  });
  wrap.innerHTML = html;
}

function setActiveChips(slug) {
  document.querySelectorAll(".tabelas-chip").forEach(el => {
    el.classList.toggle("tabelas-chip--active", el.id.endsWith(`-chip-${slug}`));
  });
}

function selectLeague(slug) {
  window._activeLeague = slug;
  localStorage.setItem("apostas_league", slug);
  setActiveChips(slug);

  const currentTab = localStorage.getItem("apostas_tab") || "recomendacoes";
  if (currentTab === "jogos") loadJogos(slug);
  if (currentTab === "tabelas") loadTabela(slug);
}

// ============================================================
//  PRÓXIMOS JOGOS
// ============================================================

window._jogosData = null;

function reloadJogos() {
  if (window._activeLeague) loadJogos(window._activeLeague);
}

function applyJogosFilter() {
  if (!window._jogosData) return;

  const minDiff = parseInt(document.getElementById("jogosDiff")?.value || "0", 10);

  let matches = window._jogosData.matches;
  if (minDiff > 0) {
    matches = matches.filter(m => m.pos_diff != null && m.pos_diff >= minDiff);
  }

  if (matches.length === 0) {
    const total = window._jogosData.matches.length;
    const msg = minDiff > 0
      ? `Nenhum jogo com diferença ≥ ${minDiff} posições (${total} jogos no período sem esse filtro).`
      : "Nenhum jogo agendado para este período.";
    document.getElementById("jogosVazioMsg").textContent = msg;
    setJogosState("vazio");
    return;
  }

  renderJogosMatches(window._jogosData, matches);
  setJogosState("content");
}

async function loadJogos(slug) {
  const days = document.getElementById("jogosDays")?.value || 14;
  setJogosState("loading");

  try {
    const resp = await fetch(`/api/apostas/espn/fixtures/${encodeURIComponent(slug)}?days=${days}`);
    const json = await resp.json();
    if (!resp.ok) { setJogosState("erro", json.error); return; }

    window._jogosData = json;
    applyJogosFilter();
  } catch {
    setJogosState("erro", "Não foi possível conectar ao servidor.");
  }
}

function setJogosState(state, msg) {
  document.getElementById("jogosLoading").style.display = state === "loading" ? "flex"  : "none";
  document.getElementById("jogosContent").style.display = state === "content" ? "block" : "none";
  document.getElementById("jogosVazio").style.display   = state === "vazio"   ? "flex"  : "none";
  document.getElementById("jogosErro").style.display    = state === "erro"    ? "flex"  : "none";
  if (state === "erro" && msg) document.getElementById("jogosErroMsg").textContent = msg;
}

function renderJogosMatches(data, matches) {
  const content = document.getElementById("jogosContent");
  content.innerHTML = data.season
    ? `<div class="tabelas-season">${escHtml(data.season)}</div>`
    : "";

  const byDate = {};
  matches.forEach(m => {
    const dayKey = m.date_brt ? m.date_brt.slice(0, 10) : "?";
    if (!byDate[dayKey]) byDate[dayKey] = [];
    byDate[dayKey].push(m);
  });

  Object.entries(byDate).forEach(([day, dayMatches]) => {
    let html = `<div class="jogos-day-group">
      <div class="jogos-day-header">${formatDayLabel(day)}</div>`;
    dayMatches.forEach(m => { html += buildMatchRow(m); });
    html += `</div>`;
    content.innerHTML += html;
  });
}

function buildMatchRow(m) {
  const homePosHtml = m.home_pos ? `<span class="jogos-pos jogos-pos--${posTier(m.home_pos)}">#${m.home_pos}</span>` : "";
  const awayPosHtml = m.away_pos ? `<span class="jogos-pos jogos-pos--${posTier(m.away_pos)}">#${m.away_pos}</span>` : "";
  const diffHtml    = m.pos_diff != null ? buildJogosDiff(m.pos_diff) : "";

  const time  = m.date_brt ? m.date_brt.slice(11, 16) : "";
  const venue = m.venue    ? `<span class="jogos-venue">${escHtml(m.venue)}</span>` : "";

  let scoreHtml = "";
  if (m.state === "in") {
    scoreHtml = `<span class="jogos-score jogos-score--live">${escHtml(m.score_home)} – ${escHtml(m.score_away)}</span>`;
  } else if (m.state === "post") {
    scoreHtml = `<span class="jogos-score jogos-score--final">${escHtml(m.score_home)} – ${escHtml(m.score_away)}</span>`;
  } else {
    scoreHtml = `<span class="jogos-time">${escHtml(time)}</span>`;
  }

  return `
    <div class="jogos-match-row">
      <div class="jogos-team jogos-team--home">
        ${homePosHtml}
        <span class="jogos-team-name">${escHtml(m.home_name)}</span>
      </div>
      <div class="jogos-center">
        ${diffHtml}
        ${scoreHtml}
      </div>
      <div class="jogos-team jogos-team--away">
        <span class="jogos-team-name">${escHtml(m.away_name)}</span>
        ${awayPosHtml}
      </div>
      <div class="jogos-meta">${venue}</div>
    </div>
  `;
}

function buildJogosDiff(diff) {
  if (diff >= 10) return `<span class="jogos-diff jogos-diff--high">Δ${diff}</span>`;
  if (diff >= 5)  return `<span class="jogos-diff jogos-diff--mid">Δ${diff}</span>`;
  if (diff >= 2)  return `<span class="jogos-diff jogos-diff--low">Δ${diff}</span>`;
  return "";
}

function posTier(pos) {
  if (pos <= 4)  return "top";
  if (pos <= 10) return "mid";
  if (pos <= 16) return "low";
  return "rel";
}

function formatDayLabel(dayStr) {
  if (dayStr === "?") return "Data desconhecida";
  try {
    const [y, m, d] = dayStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const months   = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${weekdays[dt.getDay()]}, ${pad(d)} ${months[m - 1]}`;
  } catch {
    return dayStr;
  }
}

// ============================================================
//  TABELAS
// ============================================================

async function loadTabela(slug) {
  document.getElementById("tabelasContent").style.display = "none";
  document.getElementById("tabelasErro").style.display    = "none";
  document.getElementById("tabelasLoading").style.display = "flex";

  try {
    const resp = await fetch(`/api/apostas/espn/standings/${encodeURIComponent(slug)}`);
    const json = await resp.json();
    document.getElementById("tabelasLoading").style.display = "none";

    if (!resp.ok) { showTabelasErro(json.error); return; }
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
  document.getElementById("tabelasErroMsg").textContent = msg || "Erro ao carregar tabela.";
  document.getElementById("tabelasErro").style.display = "flex";
}

function renderStandings(data) {
  const content = document.getElementById("tabelasContent");
  const isMulti = data.groups.length > 1;

  let html = `<div class="tabelas-season">${escHtml(data.season)}</div>`;

  data.groups.forEach(group => {
    if (isMulti && group.name) {
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
              <th class="tabelas-th tabelas-th--num" title="Gols">Gols</th>
              <th class="tabelas-th tabelas-th--num" title="Saldo">SG</th>
              <th class="tabelas-th tabelas-th--pts">Pts</th>
            </tr>
          </thead>
          <tbody>
            ${group.rows.map(r => buildStandingsRow(r, group.rows.length)).join("")}
          </tbody>
        </table>
      </div>
    `;
  });

  content.innerHTML = html;
  content.style.display = "block";
}

function buildStandingsRow(r, total) {
  const posCls = posRowClass(r.position, total);
  const sgSign = r.goal_diff > 0 ? "+" : "";
  return `
    <tr class="tabelas-row ${posCls}">
      <td class="tabelas-td tabelas-td--pos"><span class="tabelas-pos">${r.position}</span></td>
      <td class="tabelas-td tabelas-td--team"><span class="tabelas-team-name">${escHtml(r.team_name)}</span></td>
      <td class="tabelas-td tabelas-td--num">${r.matches}</td>
      <td class="tabelas-td tabelas-td--num">${r.wins}</td>
      <td class="tabelas-td tabelas-td--num">${r.draws}</td>
      <td class="tabelas-td tabelas-td--num">${r.losses}</td>
      <td class="tabelas-td tabelas-td--num">${r.goals_for}:${r.goals_against}</td>
      <td class="tabelas-td tabelas-td--num">${sgSign}${r.goal_diff}</td>
      <td class="tabelas-td tabelas-td--pts"><strong>${r.points}</strong></td>
    </tr>
  `;
}

function posRowClass(pos, total) {
  if (pos <= 4)           return "tabelas-row--champions";
  if (pos <= 6)           return "tabelas-row--europa";
  if (pos > total - 4)    return "tabelas-row--relegation";
  return "";
}

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
  if (state === "erro" && msg) document.getElementById("tipsErroMsg").textContent = msg;
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
      ${tip.status !== "green"    ? `<button class="tips-action-btn tips-action-btn--green"   onclick="setTipStatus(${id},'green')"    title="Green"><i class="bi bi-check-lg"></i></button>` : ""}
      ${tip.status !== "red"      ? `<button class="tips-action-btn tips-action-btn--red"     onclick="setTipStatus(${id},'red')"      title="Red"><i class="bi bi-x-lg"></i></button>` : ""}
      ${tip.status !== "pendente" ? `<button class="tips-action-btn tips-action-btn--pending" onclick="setTipStatus(${id},'pendente')" title="Pendente"><i class="bi bi-clock"></i></button>` : ""}
      ${tip.status !== "void"     ? `<button class="tips-action-btn tips-action-btn--void"    onclick="setTipStatus(${id},'void')"     title="Anular"><i class="bi bi-dash-lg"></i></button>` : ""}
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
  } catch { alert("Erro de conexão"); }
}

async function deleteTip(tipId) {
  if (!confirm("Excluir esta recomendação?")) return;
  try {
    const resp = await fetch(`/api/apostas/tips/${tipId}`, { method: "DELETE" });
    const json = await resp.json();
    if (!resp.ok) { alert(json.error || "Erro ao excluir"); return; }
    await loadTips();
  } catch { alert("Erro de conexão"); }
}

// ============================================================
//  TIPS — modal
// ============================================================

function openTipModal() {
  ["tipTitulo","tipPartida","tipCampeonato","tipOdd","tipStake","tipDataPartida"]
    .forEach(id => { document.getElementById(id).value = ""; });
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
//  HELPERS
// ============================================================

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
