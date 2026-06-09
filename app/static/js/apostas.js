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

  const bar = document.getElementById("leagueControlBar");
  if (bar) bar.style.display = (tab === "jogos" || tab === "tabelas") ? "block" : "none";

  if ((tab === "jogos" || tab === "tabelas") && !window._leaguesLoaded) {
    loadLeagues();
  } else if (window._leaguesLoaded && window._activeLeague) {
    if (tab === "jogos") loadJogos(window._activeLeague);
    if (tab === "tabelas") loadTabela(window._activeLeague);
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
  const sel = document.getElementById("leagueSelect");
  try {
    const [respEspn, respAfl] = await Promise.all([
      fetch("/api/apostas/espn/leagues"),
      fetch("/api/apostas/apifootball/leagues"),
    ]);

    const espnList = respEspn.ok ? await respEspn.json() : [];
    const aflList  = respAfl.ok  ? await respAfl.json()  : [];

    const byCategory = {};

    espnList.forEach(lg => {
      const cat = lg.category;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ value: lg.slug, name: lg.name });
    });

    aflList.forEach(lg => {
      const cat = lg.category;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ value: `afl:${lg.id}`, name: lg.name });
    });

    sel.innerHTML = "";
    Object.entries(byCategory).forEach(([cat, items]) => {
      const grp = document.createElement("optgroup");
      grp.label = cat;
      items.forEach(lg => {
        const opt = document.createElement("option");
        opt.value = lg.value;
        opt.textContent = lg.name;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    });

    window._leaguesLoaded = true;

    const firstValue = espnList[0]?.slug || (aflList[0] ? `afl:${aflList[0].id}` : null);
    const saved = localStorage.getItem("apostas_league") || firstValue;
    if (saved) {
      sel.value = saved;
      selectLeague(saved);
    }
  } catch {
    sel.innerHTML = '<option disabled selected>Erro ao carregar campeonatos</option>';
  }
}

function onLeagueSelectChange() {
  const sel = document.getElementById("leagueSelect");
  if (sel && sel.value) selectLeague(sel.value);
}

function selectLeague(slug) {
  window._activeLeague = slug;
  localStorage.setItem("apostas_league", slug);

  const sel = document.getElementById("leagueSelect");
  if (sel && sel.value !== slug) sel.value = slug;

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
    const url = slug.startsWith("afl:")
      ? `/api/apostas/apifootball/fixtures/${slug.slice(4)}?days=${days}`
      : `/api/apostas/espn/fixtures/${encodeURIComponent(slug)}?days=${days}`;

    const resp = await fetch(url);
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
    const url = slug.startsWith("afl:")
      ? `/api/apostas/apifootball/standings/${slug.slice(4)}`
      : `/api/apostas/espn/standings/${encodeURIComponent(slug)}`;

    const resp = await fetch(url);
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

let _previewMode = false;

function togglePreviewMode() {
  _previewMode = !_previewMode;
  const toolbar  = document.getElementById("tipsAdminToolbar");
  const banner   = document.getElementById("tipsPreviewBanner");
  const icon     = document.getElementById("previewIcon");
  const label    = document.getElementById("previewLabel");
  if (!toolbar) return;

  if (_previewMode) {
    toolbar.style.opacity   = "0.4";
    toolbar.style.pointerEvents = "none";
    if (banner) banner.style.display = "flex";
    if (icon)   icon.className = "bi bi-eye-slash";
    if (label)  label.textContent = "Sair do preview";
  } else {
    toolbar.style.opacity   = "";
    toolbar.style.pointerEvents = "";
    if (banner) banner.style.display = "none";
    if (icon)   icon.className = "bi bi-eye";
    if (label)  label.textContent = "Ver como usuário";
  }

  const tipsList = document.getElementById("tipsList");
  if (tipsList && tipsList.style.display !== "none") {
    const tips = window._cachedTips || [];
    tipsList.innerHTML = tips.map(t => buildTipCard(t, _previewMode ? false : window.APOSTAS_IS_ADMIN === true)).join("");
  }
}

function renderTipsList(tips) {
  window._cachedTips = tips;
  const isAdmin = _previewMode ? false : window.APOSTAS_IS_ADMIN === true;
  document.getElementById("tipsList").innerHTML = tips.map(t => buildTipCard(t, isAdmin)).join("");
}

function buildTipCard(tip, isAdmin) {
  const statusBadge  = buildStatusBadge(tip.status);
  const adminActions = isAdmin ? buildTipAdminActions(tip) : "";
  const hasMultipla  = Array.isArray(tip.jogos) && tip.jogos.length > 0;

  const oddHtml = tip.odd != null
    ? `<span class="tips-odd-display"><i class="bi bi-calculator"></i>Odd total: <strong>${tip.odd.toFixed(2)}</strong></span>`
    : "";

  const idHtml = `<span class="tips-id-display"><i class="bi bi-hash"></i>ID: <strong>#${tip.id}</strong></span>`;

  let linkHtml = "";
  if (tip.link_aposta) {
    linkHtml = `
      <div class="tips-link-group">
        <a href="${escHtml(tip.link_aposta)}" target="_blank" rel="noopener" class="tips-link-btn">
          <i class="bi bi-link-45deg"></i> Link Betano
        </a>
        <button class="tips-copy-btn" data-link="${escHtml(tip.link_aposta)}" onclick="copyTipLink(this)" title="Copiar link">
          <i class="bi bi-clipboard"></i>
        </button>
      </div>`;
  }

  const detailsHtml = hasMultipla ? buildMultiplaDetails(tip) : buildLegacyDetails(tip);
  const jogoCount   = hasMultipla ? tip.jogos.length : 0;
  const detailLabel = jogoCount > 1 ? `${jogoCount} jogos` : "resumo";

  const toggleSection = detailsHtml ? `
    <button class="tips-toggle-btn" onclick="toggleTipDetails(${tip.id})">
      <i class="bi bi-chevron-down tips-toggle-icon"></i> Ver ${detailLabel}
    </button>
    <div class="tips-details" id="tip-details-${tip.id}" style="display:none">
      ${detailsHtml}
    </div>` : "";

  const storyBtn = isAdmin
    ? `<button class="tips-story-btn" onclick="openStoryModal(${tip.id})" title="Baixar imagem para Story"><i class="bi bi-download"></i></button>`
    : "";

  return `
    <div class="tips-card" id="tip-${tip.id}" data-status="${escHtml(tip.status)}">
      <div class="tips-card-header">
        ${statusBadge}
        <span class="tips-card-title">${escHtml(tip.titulo)}</span>
        ${storyBtn}
      </div>
      ${(oddHtml || idHtml || linkHtml) ? `<div class="tips-card-row2">${oddHtml}${idHtml}${linkHtml}</div>` : ""}
      ${toggleSection}
      ${adminActions}
    </div>
  `;
}

function buildMultiplaDetails(tip) {
  return tip.jogos.map((j, idx) => {
    const campHtml = j.campeonato
      ? `<span class="tips-detail-camp">${escHtml(j.campeonato)}</span>` : "";
    const dataHtml = j.data_partida
      ? `<span>${formatDate(j.data_partida)}</span>` : "";
    return `
      <div class="tips-detail-jogo${idx > 0 ? " tips-detail-jogo--sep" : ""}">
        <div class="tips-detail-tipo"><i class="bi bi-tag-fill"></i>${escHtml(j.mercado)}</div>
        <div class="tips-detail-partida">${escHtml(j.partida)}${campHtml}</div>
        <div class="tips-detail-meta">
          ${dataHtml}
          ${j.odd != null ? `<span class="tips-detail-odd">@ ${j.odd.toFixed(2)}</span>` : ""}
        </div>
      </div>`;
  }).join("");
}

function buildLegacyDetails(tip) {
  const rows = [];
  if (tip.partida)      rows.push(`<div class="tips-detail-partida">${escHtml(tip.partida)}</div>`);
  if (tip.campeonato)   rows.push(`<span class="tips-detail-camp">${escHtml(tip.campeonato)}</span>`);
  if (tip.data_partida) rows.push(`<div class="tips-detail-meta"><span>${formatDate(tip.data_partida)}</span></div>`);
  if (tip.stake)        rows.push(`<div class="tips-detail-meta"><span>Stake: ${escHtml(tip.stake)}</span></div>`);
  return rows.length ? `<div class="tips-detail-jogo">${rows.join("")}</div>` : "";
}

function buildStatusBadge(status) {
  const map = {
    green:    { cls: "tips-badge--green",   icon: "bi-check-circle-fill", label: "Green" },
    red:      { cls: "tips-badge--red",     icon: "bi-x-circle-fill",     label: "Red" },
    pendente: { cls: "tips-badge--pending", icon: "bi-clock-fill",        label: "Em Aberto" },
    void:     { cls: "tips-badge--void",    icon: "bi-dash-circle",       label: "Void" },
  };
  const s = map[status] || map.pendente;
  return `<span class="tips-badge ${s.cls}"><i class="bi ${s.icon}"></i>${s.label}</span>`;
}

function toggleTipDetails(tipId) {
  const details = document.getElementById(`tip-details-${tipId}`);
  const btn     = document.querySelector(`#tip-${tipId} .tips-toggle-btn`);
  if (!details) return;
  const isOpen = details.style.display !== "none";
  details.style.display = isOpen ? "none" : "block";
  if (btn) {
    const icon = btn.querySelector(".tips-toggle-icon");
    if (icon) icon.style.transform = isOpen ? "" : "rotate(180deg)";
  }
}

async function copyTipLink(btn) {
  const link = btn.dataset.link;
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    const icon = btn.querySelector("i");
    if (icon) {
      icon.className = "bi bi-clipboard-check";
      setTimeout(() => { icon.className = "bi bi-clipboard"; }, 2000);
    }
  } catch { /* clipboard api indisponível */ }
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
      ${tip.status !== "pendente" ? `<button class="tips-action-btn tips-action-btn--pending" onclick="setTipStatus(${id},'pendente')" title="Em Aberto"><i class="bi bi-clock"></i></button>` : ""}
      ${tip.status !== "void"     ? `<button class="tips-action-btn tips-action-btn--void"    onclick="setTipStatus(${id},'void')"     title="Anular"><i class="bi bi-dash-lg"></i></button>` : ""}
      <button class="tips-action-btn tips-action-btn--edit"   onclick="openEditModal(${id})"  title="Editar"><i class="bi bi-pencil"></i></button>
      <button class="tips-action-btn tips-action-btn--delete" onclick="deleteTip(${id})"   title="Excluir"><i class="bi bi-trash3"></i></button>
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
//  TIPS — modal (múltipla)
// ============================================================

const _MERCADOS = [
  { group: "Resultado Final",   options: ["Vitória Casa (1)", "Empate (X)", "Vitória Visitante (2)"] },
  { group: "Dupla Hipótese",    options: ["1X", "X2", "12"] },
  { group: "Total de Gols",     options: ["Over 0.5", "Over 1.5", "Over 2.5", "Over 3.5", "Over 4.5", "Under 0.5", "Under 1.5", "Under 2.5", "Under 3.5"] },
  { group: "Ambos Marcam",      options: ["Ambos Marcam - Sim", "Ambos Marcam - Não"] },
  { group: "Escanteios",        options: ["Escanteios Over 8.5", "Escanteios Over 9.5", "Escanteios Over 10.5", "Escanteios Under 8.5", "Escanteios Under 9.5"] },
  { group: "Cartões",           options: ["Cartões Over 3.5", "Cartões Over 4.5", "Cartões Over 5.5"] },
  { group: "1º Tempo",          options: ["Vitória Casa 1º Tempo", "Empate 1º Tempo", "Vitória Visitante 1º Tempo", "Over 0.5 no 1º Tempo", "Over 1.5 no 1º Tempo"] },
  { group: "Outro",             options: ["Outro (especificar)"] },
];

let _jogoCounter = 0;

function buildMercadoOptions() {
  return _MERCADOS.map(g => {
    const opts = g.options.map(o => `<option value="${escHtml(o)}">${escHtml(o)}</option>`).join("");
    return `<optgroup label="${escHtml(g.group)}">${opts}</optgroup>`;
  }).join("");
}

function addJogoRow() {
  const idx = _jogoCounter++;
  const mercadoOpts = buildMercadoOptions();
  const container = document.getElementById("tipJogosContainer");

  const row = document.createElement("div");
  row.className = "tips-jogo-row";
  row.id = `jogo-row-${idx}`;
  row.innerHTML = `
    <div class="tips-jogo-row-top">
      <span class="tips-jogo-num">Jogo ${container.children.length + 1}</span>
      <button type="button" class="tips-jogo-remove" onclick="removeJogoRow(${idx})" title="Remover jogo">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div class="tips-form-group">
      <label class="tips-form-label">Partida <span class="tips-required">*</span></label>
      <div class="jogo-partida-wrap">
        <input type="text" id="jogo-partida-${idx}" class="tips-form-input" placeholder="Ex: Flamengo x Palmeiras" maxlength="200">
        <button type="button" class="jogo-pick-btn" onclick="openMatchPicker(${idx})" title="Buscar nos próximos jogos">
          <i class="bi bi-calendar3"></i>
        </button>
      </div>
    </div>
    <div class="tips-form-row">
      <div class="tips-form-group">
        <label class="tips-form-label">Campeonato</label>
        <input type="text" id="jogo-campeonato-${idx}" class="tips-form-input" placeholder="Ex: Brasileirão" maxlength="100">
      </div>
      <div class="tips-form-group">
        <label class="tips-form-label">Data</label>
        <input type="date" id="jogo-data-${idx}" class="tips-form-input">
      </div>
    </div>
    <div class="tips-form-row">
      <div class="tips-form-group tips-form-group--flex2">
        <label class="tips-form-label">Mercado <span class="tips-required">*</span></label>
        <select id="jogo-mercado-${idx}" class="tips-form-input" onchange="onMercadoChange(${idx})">
          <option value="" disabled selected>Selecione...</option>
          ${mercadoOpts}
        </select>
      </div>
      <div class="tips-form-group tips-form-group--flex1">
        <label class="tips-form-label">Odd <span class="tips-required">*</span></label>
        <input type="number" id="jogo-odd-${idx}" class="tips-form-input" step="0.01" min="1.01" placeholder="1.85" oninput="calcOddTotal()">
      </div>
    </div>
    <div class="tips-form-group" id="jogo-outro-group-${idx}" style="display:none">
      <label class="tips-form-label">Especificar mercado <span class="tips-required">*</span></label>
      <input type="text" id="jogo-mercado-outro-${idx}" class="tips-form-input" placeholder="Ex: Handicap Asiático -0.5" maxlength="100">
    </div>
  `;

  container.appendChild(row);
  renumberJogos();
  calcOddTotal();
}

function removeJogoRow(idx) {
  const row = document.getElementById(`jogo-row-${idx}`);
  if (row) row.remove();
  renumberJogos();
  calcOddTotal();
}

function renumberJogos() {
  const rows = document.querySelectorAll("#tipJogosContainer .tips-jogo-row");
  rows.forEach((row, i) => {
    const num = row.querySelector(".tips-jogo-num");
    if (num) num.textContent = `Jogo ${i + 1}`;
  });
}

function onMercadoChange(idx) {
  const sel = document.getElementById(`jogo-mercado-${idx}`);
  const grp = document.getElementById(`jogo-outro-group-${idx}`);
  if (sel && grp) grp.style.display = sel.value === "Outro (especificar)" ? "block" : "none";
}

function calcOddTotal() {
  const rows = document.querySelectorAll("#tipJogosContainer .tips-jogo-row");
  let total = 1;
  let valid = rows.length > 0;

  rows.forEach(row => {
    const id = row.id.replace("jogo-row-", "");
    const val = parseFloat(document.getElementById(`jogo-odd-${id}`)?.value);
    if (!val || val <= 1) { valid = false; }
    else total *= val;
  });

  const el = document.getElementById("tipOddTotal");
  if (el) el.textContent = (valid && rows.length > 0) ? total.toFixed(2) : "—";
}

async function pasteLink() {
  const input = document.getElementById("tipLinkAposta");
  try {
    const text = await navigator.clipboard.readText();
    input.value = text.trim();
    input.focus();
  } catch {
    input.focus();
    document.execCommand("paste");
  }
}

function openTipModal() {
  document.getElementById("tipTitulo").value    = "";
  document.getElementById("tipStake").value     = "";
  document.getElementById("tipLinkAposta").value = "";
  document.getElementById("tipJogosContainer").innerHTML = "";
  document.getElementById("tipOddTotal").textContent = "—";
  _jogoCounter = 0;
  hideTipFormError();
  document.getElementById("tipModalOverlay").style.display = "flex";
  addJogoRow();
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

  const titulo     = document.getElementById("tipTitulo").value.trim();
  const stake      = document.getElementById("tipStake").value.trim();
  const linkAposta = document.getElementById("tipLinkAposta").value.trim();

  if (!titulo) { showTipFormError("Título é obrigatório"); return; }

  const rows = document.querySelectorAll("#tipJogosContainer .tips-jogo-row");
  if (rows.length === 0) { showTipFormError("Adicione pelo menos um jogo"); return; }

  const jogos = [];
  for (const row of rows) {
    const idx       = row.id.replace("jogo-row-", "");
    const partida   = (document.getElementById(`jogo-partida-${idx}`)?.value || "").trim();
    const campeonato = (document.getElementById(`jogo-campeonato-${idx}`)?.value || "").trim();
    const data      = document.getElementById(`jogo-data-${idx}`)?.value || "";
    const selVal    = document.getElementById(`jogo-mercado-${idx}`)?.value || "";
    const mercado   = selVal === "Outro (especificar)"
      ? (document.getElementById(`jogo-mercado-outro-${idx}`)?.value || "").trim()
      : selVal;
    const oddVal    = parseFloat(document.getElementById(`jogo-odd-${idx}`)?.value);

    if (!partida)        { showTipFormError(`Partida obrigatória`); return; }
    if (!mercado)        { showTipFormError(`Mercado obrigatório`); return; }
    if (!oddVal || oddVal <= 1) { showTipFormError(`Odd inválida (deve ser > 1.00)`); return; }

    jogos.push({ partida, campeonato, mercado, odd: oddVal, data_partida: data || null });
  }

  const btn = document.getElementById("tipSubmitBtn");
  btn.disabled = true;

  try {
    const resp = await fetch("/api/apostas/tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, stake, link_aposta: linkAposta, jogos }),
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
//  MATCH PICKER
// ============================================================

let _pickerJogoIdx      = null;
let _pickerLeaguesReady = false;

function openMatchPicker(jogoIdx) {
  _pickerJogoIdx = jogoIdx;
  document.getElementById("matchPickerOverlay").style.display = "flex";
  if (!_pickerLeaguesReady) {
    _loadPickerLeagues();
  } else {
    const sel = document.getElementById("pickerLeagueSelect");
    if (sel.value) _loadPickerMatches(sel.value);
  }
}

function closeMatchPicker() {
  document.getElementById("matchPickerOverlay").style.display = "none";
  _pickerJogoIdx = null;
}

function closeMatchPickerOverlay(e) {
  if (e.target === document.getElementById("matchPickerOverlay")) closeMatchPicker();
}

async function _loadPickerLeagues() {
  const sel = document.getElementById("pickerLeagueSelect");
  try {
    const resp = await fetch("/api/apostas/espn/leagues");
    const list = await resp.json();

    const byCategory = {};
    list.forEach(lg => {
      if (!byCategory[lg.category]) byCategory[lg.category] = [];
      byCategory[lg.category].push(lg);
    });

    sel.innerHTML = "";
    Object.entries(byCategory).forEach(([cat, items]) => {
      const grp = document.createElement("optgroup");
      grp.label = cat;
      items.forEach(lg => {
        const opt = document.createElement("option");
        opt.value = lg.slug;
        opt.textContent = lg.name;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    });

    _pickerLeaguesReady = true;

    const defaultSlug = window._activeLeague || list[0]?.slug;
    if (defaultSlug) {
      sel.value = defaultSlug;
      _loadPickerMatches(defaultSlug);
    }
  } catch {
    sel.innerHTML = '<option disabled>Erro ao carregar campeonatos</option>';
  }
}

function onPickerLeagueChange() {
  const sel = document.getElementById("pickerLeagueSelect");
  if (sel.value) _loadPickerMatches(sel.value);
}

async function _loadPickerMatches(slug) {
  const listEl    = document.getElementById("pickerMatchList");
  const loadingEl = document.getElementById("pickerLoading");
  const emptyEl   = document.getElementById("pickerEmpty");

  listEl.innerHTML = "";
  emptyEl.style.display = "none";
  loadingEl.style.display = "flex";

  try {
    const resp = await fetch(`/api/apostas/espn/fixtures/${encodeURIComponent(slug)}?days=30`);
    const json = await resp.json();
    loadingEl.style.display = "none";

    const upcoming = (json.matches || []).filter(m => m.state === "pre" || m.state === "in");
    if (!resp.ok || upcoming.length === 0) {
      emptyEl.style.display = "flex";
      return;
    }

    const sel    = document.getElementById("pickerLeagueSelect");
    const season = json.season || sel.options[sel.selectedIndex]?.text || "";
    _renderPickerMatches(upcoming, season);
  } catch {
    loadingEl.style.display = "none";
    emptyEl.style.display = "flex";
  }
}

function _renderPickerMatches(matches, season) {
  const listEl = document.getElementById("pickerMatchList");

  const byDate = {};
  matches.forEach(m => {
    const dayKey = m.date_brt ? m.date_brt.slice(0, 10) : "?";
    if (!byDate[dayKey]) byDate[dayKey] = [];
    byDate[dayKey].push(m);
  });

  let html = "";
  Object.entries(byDate).forEach(([day, dayMatches]) => {
    html += `<div class="picker-day-group">
      <div class="picker-day-header">${formatDayLabel(day)}</div>`;
    dayMatches.forEach(m => {
      const time   = m.date_brt ? m.date_brt.slice(11, 16) : "";
      const partida = `${m.home_name} x ${m.away_name}`;
      const date   = m.date_brt ? m.date_brt.slice(0, 10) : "";
      const diff   = m.pos_diff != null && m.pos_diff >= 2 ? buildJogosDiff(m.pos_diff) : "";
      const homePosHtml = m.home_pos ? `<span class="picker-pos picker-pos--${posTier(m.home_pos)}">#${m.home_pos}</span>` : "";
      const awayPosHtml = m.away_pos ? `<span class="picker-pos picker-pos--${posTier(m.away_pos)}">#${m.away_pos}</span>` : "";
      html += `
        <div class="picker-match-row"
             data-partida="${escHtml(partida)}"
             data-season="${escHtml(season)}"
             data-date="${escHtml(date)}"
             onclick="_selectPickerMatch(this)">
          <div class="picker-match-teams">
            ${homePosHtml}
            <span class="picker-team picker-team--home">${escHtml(m.home_name)}</span>
            <span class="picker-vs">×</span>
            <span class="picker-team picker-team--away">${escHtml(m.away_name)}</span>
            ${awayPosHtml}
          </div>
          <div class="picker-match-meta">
            ${time ? `<span class="picker-time"><i class="bi bi-clock"></i>${time}</span>` : ""}
            ${diff}
          </div>
        </div>`;
    });
    html += `</div>`;
  });

  listEl.innerHTML = html;
}

function _selectPickerMatch(el) {
  if (_pickerJogoIdx === null) return;
  const idx     = _pickerJogoIdx;
  const partida = el.dataset.partida;
  const season  = el.dataset.season;
  const date    = el.dataset.date;

  const partidaEl = document.getElementById(`jogo-partida-${idx}`);
  const campEl    = document.getElementById(`jogo-campeonato-${idx}`);
  const dataEl    = document.getElementById(`jogo-data-${idx}`);

  if (partidaEl) partidaEl.value = partida;
  if (campEl)    campEl.value    = season;
  if (dataEl && date) dataEl.value = date;

  closeMatchPicker();
}

// ============================================================
//  AUTO GERAR
// ============================================================

let _autoLeaguesLoaded = false;

async function openAutoModal() {
  document.getElementById("autoFormError").style.display = "none";
  document.getElementById("autoModalOverlay").style.display = "flex";
  if (!_autoLeaguesLoaded) {
    await _loadAutoLeagues();
    _autoLeaguesLoaded = true;
  }
}

function closeAutoModal() {
  document.getElementById("autoModalOverlay").style.display = "none";
}

function closeAutoModalOverlay(e) {
  if (e.target === document.getElementById("autoModalOverlay")) closeAutoModal();
}

async function _loadAutoLeagues() {
  const container = document.getElementById("autoLeagueCheckboxes");
  if (!container) return;
  try {
    const [respAfl, respEspn] = await Promise.all([
      fetch("/api/apostas/apifootball/leagues"),
      fetch("/api/apostas/espn/leagues"),
    ]);
    const aflList  = respAfl.ok  ? await respAfl.json()  : [];
    const espnList = respEspn.ok ? await respEspn.json() : [];

    const byCategory = {};
    espnList.forEach(lg => {
      const cat = lg.category;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ value: `espn:${lg.slug}`, name: lg.name });
    });
    aflList.forEach(lg => {
      const cat = lg.category;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ value: `afl:${lg.id}`, name: lg.name });
    });

    let html = "";
    Object.entries(byCategory).forEach(([cat, items]) => {
      html += `<div class="auto-league-category">${escHtml(cat)}</div>`;
      html += items.map(lg => `
        <label class="auto-league-check">
          <input type="checkbox" value="${escHtml(lg.value)}" class="auto-league-input">
          ${escHtml(lg.name)}
        </label>
      `).join("");
    });
    container.innerHTML = html || '<span style="color:var(--text-muted);font-size:.8rem">Nenhum campeonato disponível</span>';
  } catch {
    container.innerHTML = '<span style="color:var(--text-muted);font-size:.8rem">Erro ao carregar campeonatos</span>';
  }
}

function _showAutoFormError(msg) {
  const el = document.getElementById("autoFormError");
  el.textContent = msg;
  el.style.display = "block";
}

async function submitAutoRecommend() {
  document.getElementById("autoFormError").style.display = "none";

  const minDiff   = parseInt(document.getElementById("autoDiff").value) || 10;
  const targetOdd = parseFloat(document.getElementById("autoTargetOdd").value) || 3.00;
  const daysAhead = parseInt(document.getElementById("autoDays").value) || 14;
  const maxGames  = parseInt(document.getElementById("autoMaxGames").value) || 5;
  const maxRecs   = parseInt(document.getElementById("autoMaxRecs").value) || 1;
  const stake     = document.getElementById("autoStake").value.trim();
  const titulo    = document.getElementById("autoTitulo").value.trim();

  const leagues = Array.from(
    document.querySelectorAll(".auto-league-input:checked")
  ).map(cb => cb.value);

  const btn = document.getElementById("autoSubmitBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Buscando...';

  try {
    const resp = await fetch("/api/apostas/auto-recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        min_diff:            minDiff,
        target_odd:          targetOdd,
        days_ahead:          daysAhead,
        max_games:           maxGames,
        max_recommendations: maxRecs,
        leagues,
        stake,
        titulo,
      }),
    });
    const json = await resp.json();
    if (!resp.ok) { _showAutoFormError(json.error || "Erro ao gerar"); return; }

    closeAutoModal();
    await loadTips();

    const info  = json.info;
    const count = info.recommendations || 1;
    const estNote = info.has_estimates ? " · ★ odds estimadas" : "";
    const label = count === 1 ? "Recomendação criada" : `${count} recomendações criadas`;
    _showAutoToast(`${label}!${estNote}`);
  } catch {
    _showAutoFormError("Erro de conexão");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-stars"></i> Gerar';
  }
}

function _showAutoToast(msg) {
  let toast = document.getElementById("autoToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "autoToast";
    toast.className = "auto-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("auto-toast--visible");
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("auto-toast--visible"), 5000);
}

// ============================================================
//  EDITAR RECOMENDAÇÃO
// ============================================================

function openEditModal(tipId) {
  const tips = window._cachedTips || [];
  const tip  = tips.find(t => t.id === tipId);
  if (!tip) { alert("Recomendação não encontrada"); return; }

  document.getElementById("editTipId").value        = tipId;
  document.getElementById("editTitulo").value       = tip.titulo || "";
  document.getElementById("editStake").value        = tip.stake  || "";
  document.getElementById("editLinkAposta").value   = tip.link_aposta || "";
  document.getElementById("editFormError").style.display = "none";
  document.getElementById("editModalOverlay").style.display = "flex";
}

function closeEditModal() {
  document.getElementById("editModalOverlay").style.display = "none";
}

function closeEditModalOverlay(e) {
  if (e.target === document.getElementById("editModalOverlay")) closeEditModal();
}

async function pasteEditLink() {
  const input = document.getElementById("editLinkAposta");
  try {
    const text = await navigator.clipboard.readText();
    input.value = text.trim();
    input.focus();
  } catch {
    input.focus();
    document.execCommand("paste");
  }
}

function _showEditFormError(msg) {
  const el = document.getElementById("editFormError");
  el.textContent = msg;
  el.style.display = "block";
}

async function submitEditTip() {
  document.getElementById("editFormError").style.display = "none";

  const tipId    = parseInt(document.getElementById("editTipId").value);
  const titulo   = document.getElementById("editTitulo").value.trim();
  const stake    = document.getElementById("editStake").value.trim();
  const linkAposta = document.getElementById("editLinkAposta").value.trim();

  if (!titulo) { _showEditFormError("Título é obrigatório"); return; }

  const btn = document.getElementById("editSubmitBtn");
  btn.disabled = true;

  try {
    const resp = await fetch(`/api/apostas/tips/${tipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, stake, link_aposta: linkAposta }),
    });
    const json = await resp.json();
    if (!resp.ok) { _showEditFormError(json.error || "Erro ao salvar"); return; }
    closeEditModal();
    await loadTips();
  } catch {
    _showEditFormError("Erro de conexão");
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

// ============================================================
//  STORY IMAGE GENERATION
// ============================================================

function _drawRoundedRect(ctx, x, y, w, h, r) {
  const rc = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rc, y);
  ctx.lineTo(x + w - rc, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rc);
  ctx.lineTo(x + w, y + h - rc);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rc, y + h);
  ctx.lineTo(x + rc, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rc);
  ctx.lineTo(x, y + rc);
  ctx.quadraticCurveTo(x, y, x + rc, y);
  ctx.closePath();
}

function _shadow(ctx, color, blur, oy) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = oy;
}

function _clearShadow(ctx) {
  ctx.shadowColor = "rgba(0,0,0,0)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) { ctx.fillText(line, x, curY); curY += lineHeight; }
  return curY;
}

function generateTipStoryCanvas(tip, logoImg) {
  const W = 540, H = 960, PAD = 32;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // ── PALETTE ──────────────────────────────────────────────
  const C = {
    bg:          "#f1f5f9",
    headerFrom:  "#1e3a8a",
    headerTo:    "#2563eb",
    white:       "#ffffff",
    textDark:    "#0f172a",
    textMid:     "#334155",
    textMuted:   "#64748b",
    border:      "#e2e8f0",
    blue:        "#2563eb",
    blueLight:   "#eff6ff",
    green:       "#16a34a",
    greenBg:     "#dcfce7",
    greenBorder: "#86efac",
    red:         "#dc2626",
    redBg:       "#fee2e2",
    redBorder:   "#fca5a5",
    amber:       "#b45309",
    amberBg:     "#fef9c3",
    amberBorder: "#fde68a",
    gray:        "#475569",
    grayBg:      "#f1f5f9",
    grayBorder:  "#cbd5e1",
  };

  const statusMap = {
    green:    { bg: C.greenBg,  border: C.greenBorder,  color: C.green, icon: "✅", label: "GREEN" },
    red:      { bg: C.redBg,    border: C.redBorder,    color: C.red,   icon: "❌", label: "RED" },
    pendente: { bg: C.amberBg,  border: C.amberBorder,  color: C.amber, icon: "⏳", label: "EM ABERTO" },
    void:     { bg: C.grayBg,   border: C.grayBorder,   color: C.gray,  icon: "⬜", label: "VOID" },
  };
  const sc = statusMap[tip.status] || statusMap.pendente;

  // ── BACKGROUND ───────────────────────────────────────────
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // ── HEADER (0 → 192px) ───────────────────────────────────
  const hGrad = ctx.createLinearGradient(0, 0, W, 192);
  hGrad.addColorStop(0, C.headerFrom);
  hGrad.addColorStop(1, C.headerTo);
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, W, 192);

  // Decorative circles in header
  ctx.fillStyle = "rgba(255,255,255,0.055)";
  ctx.beginPath(); ctx.arc(490, -35, 155, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(-15, 200, 115, 0, Math.PI * 2); ctx.fill();

  // Top accent stripe
  const accentG = ctx.createLinearGradient(0, 0, W, 0);
  accentG.addColorStop(0, "#93c5fd");
  accentG.addColorStop(0.5, "#bfdbfe");
  accentG.addColorStop(1, "#93c5fd");
  ctx.fillStyle = accentG;
  ctx.fillRect(0, 0, W, 5);

  // ── LOGO ─────────────────────────────────────────────────
  const LOGO_SIZE = 52, LOGO_X = PAD, LOGO_Y = 26;
  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    _drawRoundedRect(ctx, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE, 14);
    ctx.clip();
    ctx.drawImage(logoImg, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
    ctx.restore();
    // Subtle border over logo
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.5;
    _drawRoundedRect(ctx, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE, 14);
    ctx.stroke();
  } else {
    // Fallback drawn logo
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    _drawRoundedRect(ctx, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE, 14);
    ctx.fill();
    ctx.font = "900 30px system-ui,-apple-system,sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("F", LOGO_X + LOGO_SIZE / 2, LOGO_Y + LOGO_SIZE / 2);
  }

  // Brand text
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "900 22px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("FLUXARA", LOGO_X + LOGO_SIZE + 14, LOGO_Y + 8);

  ctx.font = "500 11px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.60)";
  ctx.fillText("TIPS & APOSTAS", LOGO_X + LOGO_SIZE + 14, LOGO_Y + 35);

  // Date (top-right)
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  ctx.font = "500 10px system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.50)";
  ctx.textAlign = "right";
  ctx.fillText(today, W - PAD, LOGO_Y + 20);
  ctx.textAlign = "left";

  // ── CONTENT AREA (drawn before badge so badge renders on top) ─
  const CARD_TOP = 192;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, CARD_TOP, W, H - CARD_TOP - 82);

  // ── STATUS BADGE (floats over header/content boundary) ────
  ctx.font = "800 14px system-ui,-apple-system,sans-serif";
  const badgeLabel = sc.icon + "  " + sc.label;
  const badgeW = ctx.measureText(badgeLabel).width + 52;
  const badgeH = 44;
  const badgeX = (W - badgeW) / 2;
  const badgeY = 168;

  _shadow(ctx, "rgba(15,23,42,0.22)", 20, 6);
  ctx.fillStyle = sc.bg;
  _drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  _clearShadow(ctx);

  ctx.strokeStyle = sc.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = sc.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeLabel, W / 2, badgeY + badgeH / 2);

  // ── TITLE ────────────────────────────────────────────────
  let curY = badgeY + badgeH + 22;

  ctx.font = "bold 27px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = C.textDark;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  curY = _wrapText(ctx, tip.titulo || "Recomendação", W / 2, curY, W - PAD * 2 - 16, 35);
  curY += 18;

  // ── ODD HERO CARD ─────────────────────────────────────────
  if (tip.odd != null) {
    const oddCardH = 94;
    _shadow(ctx, "rgba(15,23,42,0.08)", 20, 5);
    ctx.fillStyle = C.white;
    _drawRoundedRect(ctx, PAD, curY, W - PAD * 2, oddCardH, 16);
    ctx.fill();
    _clearShadow(ctx);

    // Blue left accent bar
    ctx.fillStyle = C.blue;
    _drawRoundedRect(ctx, PAD, curY, 5, oddCardH, 3);
    ctx.fill();

    // Lightning icon
    ctx.font = "26px serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("⚡", PAD + 16, curY + oddCardH / 2);

    // Label
    ctx.font = "600 10.5px system-ui,sans-serif";
    ctx.fillStyle = C.textMuted;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("ODD TOTAL", W / 2 + 18, curY + 16);

    // Odd value
    const oddGrad = ctx.createLinearGradient(0, curY + 32, 0, curY + 84);
    oddGrad.addColorStop(0, "#1d4ed8");
    oddGrad.addColorStop(1, "#2563eb");
    ctx.font = "900 54px system-ui,-apple-system,sans-serif";
    ctx.fillStyle = oddGrad;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(tip.odd.toFixed(2), W / 2 + 18, curY + 30);

    curY += oddCardH + 18;
  }

  // ── GAMES ────────────────────────────────────────────────
  const hasGames = Array.isArray(tip.jogos) && tip.jogos.length > 0;
  if (hasGames) {
    ctx.font = "700 10px system-ui,sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("⚽  JOGOS DA MÚLTIPLA", PAD, curY);
    curY += 20;

    const maxG = Math.min(tip.jogos.length, 5);
    for (let i = 0; i < maxG; i++) {
      const j = tip.jogos[i];
      const ROW_H = 76, rx = PAD, ry = curY, rw = W - PAD * 2;

      _shadow(ctx, "rgba(15,23,42,0.07)", 12, 3);
      ctx.fillStyle = C.white;
      _drawRoundedRect(ctx, rx, ry, rw, ROW_H, 12);
      ctx.fill();
      _clearShadow(ctx);

      ctx.strokeStyle = C.border;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Blue left accent on each card
      ctx.fillStyle = C.blue + "33";
      _drawRoundedRect(ctx, rx, ry, 4, ROW_H, 2);
      ctx.fill();

      // Number badge
      ctx.fillStyle = C.blueLight;
      _drawRoundedRect(ctx, rx + 12, ry + ROW_H / 2 - 14, 28, 28, 8);
      ctx.fill();
      ctx.font = "bold 13px system-ui,sans-serif";
      ctx.fillStyle = C.blue;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), rx + 26, ry + ROW_H / 2);

      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      const textX = rx + 50;
      const p = (j.partida || "").length > 27 ? (j.partida || "").slice(0, 25) + "…" : (j.partida || "");
      ctx.font = "bold 14px system-ui,-apple-system,sans-serif";
      ctx.fillStyle = C.textDark;
      ctx.fillText(p, textX, ry + 11);

      const m = (j.mercado || "").length > 25 ? (j.mercado || "").slice(0, 23) + "…" : (j.mercado || "");
      ctx.font = "500 12px system-ui,sans-serif";
      ctx.fillStyle = C.blue;
      ctx.fillText(m, textX, ry + 31);

      if (j.campeonato) {
        const c = j.campeonato.length > 27 ? j.campeonato.slice(0, 25) + "…" : j.campeonato;
        ctx.font = "400 11px system-ui,sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(c, textX, ry + 51);
      }

      if (j.odd != null) {
        ctx.font = "bold 16px system-ui,-apple-system,sans-serif";
        ctx.fillStyle = C.green;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText("@ " + j.odd.toFixed(2), rx + rw - 14, ry + ROW_H / 2);
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
      }

      curY += ROW_H + 8;
    }
  } else if (tip.partida) {
    const ROW_H = 76;
    _shadow(ctx, "rgba(15,23,42,0.07)", 12, 3);
    ctx.fillStyle = C.white;
    _drawRoundedRect(ctx, PAD, curY, W - PAD * 2, ROW_H, 12);
    ctx.fill();
    _clearShadow(ctx);
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    if (tip.campeonato) {
      ctx.font = "400 11px system-ui,sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(tip.campeonato, PAD + 16, curY + 12);
    }
    ctx.font = "bold 15px system-ui,sans-serif";
    ctx.fillStyle = C.textDark;
    ctx.fillText(
      tip.partida.length > 34 ? tip.partida.slice(0, 32) + "…" : tip.partida,
      PAD + 16, curY + 34
    );
    curY += ROW_H + 8;
  }

  // Stake
  if (tip.stake) {
    curY += 4;
    ctx.font = "500 12px system-ui,sans-serif";
    ctx.fillStyle = C.textMuted;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("💰  Stake: " + tip.stake, W / 2, curY);
  }

  // ── FOOTER BAND ───────────────────────────────────────────
  const footerY = H - 82;
  const fGrad = ctx.createLinearGradient(0, footerY, W, H);
  fGrad.addColorStop(0, C.headerFrom);
  fGrad.addColorStop(1, C.headerTo);
  ctx.fillStyle = fGrad;
  ctx.fillRect(0, footerY, W, 82);

  ctx.font = "400 10px system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("⚠️  Aposte com responsabilidade · +18", W / 2, footerY + 10);

  ctx.font = "800 22px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("fluxara.app", W / 2, footerY + 32);

  // Bottom accent stripe
  ctx.fillStyle = accentG;
  ctx.fillRect(0, H - 4, W, 4);

  return canvas;
}

async function openStoryModal(tipId) {
  const tips = window._cachedTips || [];
  const tip = tips.find(t => t.id === tipId);
  if (!tip) return;

  const overlay = document.getElementById("storyModalOverlay");
  if (!overlay) return;

  const img    = document.getElementById("storyPreviewImg");
  const dlBtn  = document.getElementById("storyDownloadBtn");

  img.src = "";
  overlay.style.display = "flex";
  if (dlBtn) { dlBtn.style.opacity = "0.4"; dlBtn.style.pointerEvents = "none"; }

  const logoImg = await new Promise((resolve) => {
    const image = new Image();
    image.onload  = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/static/images/logos/pwa-192.png";
  });

  const canvas  = generateTipStoryCanvas(tip, logoImg);
  const dataUrl = canvas.toDataURL("image/png");

  img.src = dataUrl;
  if (dlBtn) {
    dlBtn.href     = dataUrl;
    dlBtn.download = "fluxara-tip-" + tipId + ".png";
    dlBtn.style.opacity      = "";
    dlBtn.style.pointerEvents = "";
  }
}

function closeStoryModal() {
  const overlay = document.getElementById("storyModalOverlay");
  if (overlay) overlay.style.display = "none";
}

function closeStoryModalOverlay(e) {
  if (e.target === document.getElementById("storyModalOverlay")) closeStoryModal();
}
