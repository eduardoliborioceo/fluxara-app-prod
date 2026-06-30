// ============================================================
//  LgSelect — Custom League Dropdown with logos and flags
// ============================================================

const _LGS_COUNTRY = {
  'espn:bra.1':'br','espn:bra.2':'br','espn:bra.3':'br','espn:bra.cup':'br',
  'espn:arg.1':'ar','espn:col.1':'co','espn:chi.1':'cl','espn:uru.1':'uy',
  'espn:CONMEBOL.LIBERTADORES':'','espn:CONMEBOL.SUDAMERICANA':'','espn:CONMEBOL.COPA':'',
  'espn:eng.1':'gb-eng','espn:eng.2':'gb-eng','espn:esp.1':'es',
  'espn:ger.1':'de','espn:ita.1':'it','espn:fra.1':'fr',
  'espn:por.1':'pt','espn:ned.1':'nl','espn:sco.1':'gb-sct',
  'espn:UEFA.CHAMPIONS':'','espn:UEFA.EUROPA':'','espn:UEFA.EUROPA.CONFERENCE':'','espn:UEFA.EURO':'',
  'espn:FIFA.WORLD':'',
  'espn:nba':'us','espn:wnba':'us','espn:nbb':'br',
  'espn:mens-euroleague':'','espn:mens-euro-cup':'','espn:fiba.world':'',
  'espn:mlb':'us','espn:kbo':'kr','espn:npb':'jp',
  'espn:atp':'','espn:wta':'',
  'espn:nhl':'us','espn:ahl':'us','espn:khl':'ru','espn:shl':'se',
  'espn:nfl':'us','espn:college-football':'us','espn:cfl':'ca',
  'espn:volleyball.m.bra':'br','espn:volleyball.w.bra':'br',
  'espn:fivb.m':'','espn:fivb.w':'',
  'espn:ehf.cl':'','espn:bundesliga':'de','espn:asobal':'es','espn:starligue':'fr',
  'football:203':'tr','football:235':'ru','football:144':'be',
  'football:197':'gr','football:106':'pl','football:119':'dk',
  'football:253':'us','football:262':'mx','football:98':'jp','football:307':'sa',
};

const _LGS_CAT_COUNTRY = {
  'Brasil':'br','América do Norte':'us',
};

function _lgsFlag(value, category) {
  return _LGS_COUNTRY[value] ?? _LGS_COUNTRY[`espn:${value}`] ?? _LGS_CAT_COUNTRY[category] ?? '';
}

function _lgsFlagImg(code, size) {
  if (!code) return '';
  return `<img src="https://flagcdn.com/w${size || 20}/${_lgsEsc(code)}.png" alt="" loading="lazy" onerror="this.style.display='none'">`;
}

function _lgsLogo(value) {
  const mFb = value.match(/^football:(\d+)$/);
  if (mFb) return `https://media.api-sports.io/football/leagues/${mFb[1]}.png`;
  const mS = value.match(/^(basketball|baseball|volleyball|handball|hockey|rugby|mma|afl|formula1):(\d+)$/);
  if (mS) return `https://media.api-sports.io/${mS[1]}/leagues/${mS[2]}.png`;
  return '';
}

function _lgsEspnLogo(slug, sport) {
  const s = { soccer:'soccer', basketball:'basketball', baseball:'baseball',
               football:'football', hockey:'hockey', volleyball:'volleyball',
               handball:'handball', tennis:'tennis' }[sport] || sport;
  return `https://a.espncdn.com/i/leagelogos/${s}/500/${slug}.png`;
}

// ============================================================
//  Match importance — per-league relegation & qualification rules
// ============================================================

const _LEAGUE_RULES = {
  'espn:bra.1': { rel:4, zones:[{pos:6,label:'Sul-Americana'},{pos:4,label:'Libertadores'}] },
  'espn:bra.2': { rel:4, zones:[{pos:4,label:'Série A'}] },
  'espn:bra.3': { rel:4, zones:[{pos:4,label:'Série B'}] },
  'espn:bra.cup': { rel:0, zones:[] },
  'espn:eng.1': { rel:3, zones:[{pos:6,label:'Conf. League'},{pos:5,label:'Eur. League'},{pos:4,label:'Champions'}] },
  'espn:eng.2': { rel:3, zones:[{pos:6,label:'Playoff'},{pos:2,label:'Premier League'}] },
  'espn:esp.1': { rel:3, zones:[{pos:7,label:'Conf. League'},{pos:6,label:'Eur. League'},{pos:4,label:'Champions'}] },
  'espn:ger.1': { rel:3, zones:[{pos:7,label:'Conf. League'},{pos:6,label:'Eur. League'},{pos:4,label:'Champions'}] },
  'espn:ita.1': { rel:3, zones:[{pos:7,label:'Conf. League'},{pos:5,label:'Eur. League'},{pos:4,label:'Champions'}] },
  'espn:fra.1': { rel:3, zones:[{pos:6,label:'Eur. League'},{pos:3,label:'Champions'}] },
  'espn:por.1': { rel:3, zones:[{pos:5,label:'Eur. League'},{pos:3,label:'Champions'}] },
  'espn:ned.1': { rel:3, zones:[{pos:6,label:'Conf. League'},{pos:3,label:'Eur. League'},{pos:2,label:'Champions'}] },
  'espn:sco.1': { rel:2, zones:[{pos:3,label:'Eur. League'},{pos:1,label:'Champions'}] },
  'espn:arg.1': { rel:3, zones:[{pos:4,label:'Libertadores'}] },
  'espn:col.1': { rel:2, zones:[{pos:8,label:'Libertadores'}] },
  'espn:chi.1': { rel:3, zones:[{pos:4,label:'Libertadores'}] },
  'espn:uru.1': { rel:2, zones:[{pos:4,label:'Libertadores'}] },
};

function _buildLeagueCtx(data, leagueSlug) {
  const rules = _LEAGUE_RULES[leagueSlug];
  if (!rules || !data.standings?.length || !data.total_rounds) return null;

  const remaining = Math.max(0, data.total_rounds - (data.current_round || 0));
  const ptsByPos  = {};
  const ptsByTeam = {};

  data.standings.forEach(s => {
    ptsByPos[s.position] = s.points;
    ptsByTeam[String(s.team_id)] = { pts: s.points, pos: s.position };
  });

  const n = data.standings.length;
  const safePos    = n - rules.rel;
  const relCutPts  = ptsByPos[safePos]    ?? null;
  const relZonePts = ptsByPos[safePos + 1] ?? null;

  return {
    remaining,
    relCount:  rules.rel,
    relCutPts,
    relZonePts,
    zones:     [...rules.zones].sort((a, b) => a.pos - b.pos),
    ptsByPos,
    ptsByTeam,
    totalTeams:   n,
    totalRounds:  data.total_rounds,
    currentRound: data.current_round || 0,
  };
}

function _teamImportanceHtml(teamId, ctx) {
  if (!ctx || !teamId) return '';
  const s = ctx.ptsByTeam[String(teamId)];
  if (!s) return '';

  const { pts, pos } = s;
  const { remaining, relCount, relCutPts, relZonePts, zones, totalTeams, ptsByPos } = ctx;
  const maxPts = pts + remaining * 3;

  if (relCount > 0) {
    if (relCutPts !== null && maxPts < relCutPts) {
      return '<span class="jogos-imp jogos-imp--rel-confirmed">Rebaixamento confirmado</span>';
    }
    if (pos > totalTeams - relCount) {
      const gap = relCutPts !== null ? relCutPts - pts : 0;
      const gapTxt = gap > 0 ? ` · ${gap} pts p/ fuga` : '';
      return `<span class="jogos-imp jogos-imp--rel">Rebaixado${gapTxt}</span>`;
    }
    if (relZonePts !== null && pts - relZonePts <= Math.min(remaining * 2, 6) && remaining > 0) {
      return '<span class="jogos-imp jogos-imp--danger">Perigo de rebaixamento</span>';
    }
  }

  for (const zone of zones) {
    const zonePts = ptsByPos[zone.pos];
    if (zonePts === undefined) continue;

    if (pos <= zone.pos) {
      const outsiderPts = ptsByPos[zone.pos + 1];
      if (outsiderPts !== undefined && outsiderPts + remaining * 3 < pts) {
        return `<span class="jogos-imp jogos-imp--zone-locked">${zone.label} garantido</span>`;
      }
      return `<span class="jogos-imp jogos-imp--zone">${zone.label}</span>`;
    }

    if (maxPts >= zonePts) {
      const gap = zonePts - pts;
      return `<span class="jogos-imp jogos-imp--zone-chase">${gap > 0 ? gap + ' pts p/ ' : ''}${zone.label}</span>`;
    }
  }

  return '';
}

function _roundInfoHtml(m, ctx) {
  if (!ctx) return '';
  const round = m.round_number || ctx.currentRound;
  if (!round || !ctx.totalRounds) return '';
  const restantes = ctx.totalRounds - round;
  return `<span class="jogos-round">Rodada ${round} · ${restantes > 0 ? restantes + ' restantes' : 'última rodada'}</span>`;
}

class LgSelect {
  constructor(nativeEl) {
    this._n = nativeEl;
    this._groups = [];
    this._value = '';
    this._open = false;
    this._q = '';
    this._wrap = null;
    this._btn = null;
    this._panel = null;
    this._searchInput = null;
    this._optsEl = null;
    this._init();
  }

  _init() {
    this._n.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;overflow:hidden';
    const wrap = document.createElement('div');
    wrap.className = 'lgs';
    this._n.parentNode.insertBefore(wrap, this._n);
    wrap.appendChild(this._n);
    this._wrap = wrap;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lgs-trigger';
    btn.innerHTML = `
      <span class="lgs-sel">
        <img class="lgs-sel-logo" src="" alt="" style="display:none" onerror="this.style.display='none'">
        <span class="lgs-sel-flag-wrap"></span>
        <span class="lgs-sel-name">Selecione um campeonato</span>
      </span>
      <i class="bi bi-chevron-down lgs-arrow"></i>
    `;
    wrap.appendChild(btn);
    this._btn = btn;

    const panel = document.createElement('div');
    panel.className = 'lgs-panel';
    panel.innerHTML = `
      <div class="lgs-search-row">
        <i class="bi bi-search lgs-search-icon"></i>
        <input class="lgs-search-input" type="text" placeholder="Buscar campeonato..." autocomplete="off">
      </div>
      <div class="lgs-opts"></div>
    `;
    wrap.appendChild(panel);
    this._panel = panel;
    this._searchInput = panel.querySelector('.lgs-search-input');
    this._optsEl = panel.querySelector('.lgs-opts');

    btn.addEventListener('click', e => { e.stopPropagation(); this._toggle(); });
    this._searchInput.addEventListener('input', () => { this._q = this._searchInput.value; this._renderOpts(); });
    panel.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', () => this._close());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this._close(); });
    document.addEventListener('scroll', e => {
      if (this._panel?.contains(e.target)) return;
      this._close();
    }, true);
  }

  populate(groups, initValue) {
    this._groups = groups;
    this._q = '';
    if (this._searchInput) this._searchInput.value = '';
    this._renderOpts();
    const val = initValue || groups[0]?.items[0]?.value || '';
    if (val) this._updateDisplay(val);
  }

  _renderOpts() {
    const q = this._q.toLowerCase().trim();
    let html = '';
    this._groups.forEach(g => {
      const items = q ? g.items.filter(it => it.name.toLowerCase().includes(q)) : g.items;
      if (!items.length) return;
      html += `<div class="lgs-group">${_lgsEsc(g.label)}</div>`;
      items.forEach(it => {
        const active = it.value === this._value ? ' lgs-opt--on' : '';
        const logoHtml = it.logo
          ? `<img class="lgs-opt-logo" src="${_lgsEsc(it.logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
          : `<span class="lgs-opt-logo-ph"></span>`;
        const flagHtml = it.flag
          ? `<span class="lgs-opt-flag">${_lgsFlagImg(it.flag, 20)}</span>`
          : `<span class="lgs-opt-flag lgs-opt-flag--empty"></span>`;
        html += `<div class="lgs-opt${active}" data-v="${_lgsEsc(it.value)}">
          ${logoHtml}${flagHtml}
          <span class="lgs-opt-name">${_lgsEsc(it.name)}</span>
        </div>`;
      });
    });
    if (!html) html = '<div class="lgs-empty">Nenhum resultado</div>';
    this._optsEl.innerHTML = html;
    this._optsEl.querySelectorAll('.lgs-opt').forEach(el => {
      el.addEventListener('click', () => this._pick(el.dataset.v));
    });
  }

  _pick(value) {
    this._n.value = value;
    this._updateDisplay(value);
    this._close();
    this._n.dispatchEvent(new Event('change', { bubbles: true }));
  }

  _updateDisplay(value) {
    this._value = value;
    const item = this._groups.flatMap(g => g.items).find(it => it.value === value);
    if (!this._btn) return;
    const logo = this._btn.querySelector('.lgs-sel-logo');
    const flag = this._btn.querySelector('.lgs-sel-flag-wrap');
    const name = this._btn.querySelector('.lgs-sel-name');
    if (item) {
      if (logo) { logo.src = item.logo || ''; logo.style.display = item.logo ? '' : 'none'; }
      if (flag) flag.innerHTML = _lgsFlagImg(item.flag, 20);
      if (name) name.textContent = item.name;
    }
    this._renderOpts();
  }

  setValue(value) { this._updateDisplay(value); }

  updateTriggerLogo(logoUrl) {
    const logo = this._btn?.querySelector('.lgs-sel-logo');
    if (logo && logoUrl) { logo.src = logoUrl; logo.style.display = ''; }
  }

  setLoading() {
    const name = this._btn?.querySelector('.lgs-sel-name');
    if (name) name.textContent = 'Carregando...';
    if (this._optsEl) this._optsEl.innerHTML = '<div class="lgs-empty">Carregando...</div>';
  }

  setError() {
    const name = this._btn?.querySelector('.lgs-sel-name');
    if (name) name.textContent = 'Erro ao carregar';
    if (this._optsEl) this._optsEl.innerHTML = '<div class="lgs-empty">Erro ao carregar campeonatos</div>';
  }

  _toggle() { this._open ? this._close() : this._openPanel(); }

  _openPanel() {
    document.querySelectorAll('.lgs.lgs--open').forEach(el => {
      if (el !== this._wrap) el.classList.remove('lgs--open');
    });
    this._open = true;
    this._wrap.classList.add('lgs--open');

    const rect = this._btn.getBoundingClientRect();
    const vp   = window.innerHeight;
    const vw   = window.innerWidth;
    const panelMaxH = 340;
    const spaceBelow = vp - rect.bottom - 8;
    const above = spaceBelow < 180 && rect.top > panelMaxH;

    const minPanelW   = 240;
    const panelWidth  = Math.max(rect.width, minPanelW);
    let   panelLeft   = rect.left;
    if (panelLeft + panelWidth > vw - 4) panelLeft = Math.max(4, vw - panelWidth - 4);
    if (panelLeft < 4) panelLeft = 4;

    this._panel.style.position = 'fixed';
    this._panel.style.left     = panelLeft + 'px';
    this._panel.style.width    = panelWidth + 'px';
    this._panel.style.zIndex   = '2000';
    this._panel.style.right    = 'auto';
    if (above) {
      this._panel.style.bottom = (vp - rect.top + 4) + 'px';
      this._panel.style.top    = 'auto';
    } else {
      this._panel.style.top    = (rect.bottom + 4) + 'px';
      this._panel.style.bottom = 'auto';
    }

    setTimeout(() => this._searchInput?.focus(), 30);
  }

  _close() {
    if (!this._open) return;
    this._open = false;
    this._wrap?.classList.remove('lgs--open');
    if (this._panel) {
      this._panel.style.position = '';
      this._panel.style.left  = '';
      this._panel.style.width = '';
      this._panel.style.top   = '';
      this._panel.style.bottom = '';
      this._panel.style.right = '';
      this._panel.style.zIndex = '';
    }
  }
}

function _lgsEsc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window._lgSelects = {};

// ============================================================
//  TABS
// ============================================================

const _PANELS  = Object.assign(
  { recomendacoes: "panelRecomendacoes", jogos: "panelJogos", tabelas: "panelTabelas", analise: "panelAnalise" },
  window.APOSTAS_IS_ADMIN ? { debug: "panelDebug" } : {}
);
const _TABBTNS = Object.assign(
  { recomendacoes: "tabBtnRec", jogos: "tabBtnJogos", tabelas: "tabBtnTab", analise: "tabBtnAnalise" },
  window.APOSTAS_IS_ADMIN ? { debug: "tabBtnDebug" } : {}
);

function apostasTab(tab) {
  Object.keys(_PANELS).forEach(t => {
    document.getElementById(_PANELS[t]).style.display  = t === tab ? "block" : "none";
    document.getElementById(_TABBTNS[t]).classList.toggle("apostas-tab--active", t === tab);
  });
  localStorage.setItem("apostas_tab", tab);

  const showBars = tab === "jogos" || tab === "tabelas";
  const bar     = document.getElementById("leagueControlBar");
  const sportBar = document.getElementById("sportSelectorBar");
  if (bar)      bar.style.display      = showBars ? "block" : "none";
  if (sportBar) sportBar.style.display = showBars ? "block" : "none";

  if (showBars && !window._leaguesLoaded) {
    loadSportLeagues(window._activeSport || "football");
  } else if (window._leaguesLoaded && window._activeLeague) {
    if (tab === "jogos")   loadJogos(window._activeLeague);
    if (tab === "tabelas") loadTabela(window._activeLeague);
  }

  if (tab === "analise" && !window._analiseLeaguesLoaded) {
    loadAnaliseLeagues();
  }
}

// ============================================================
//  INIT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const nLeague  = document.getElementById("leagueSelect");
  const nAnalise = document.getElementById("analiseLeagueSelect");
  const nPicker  = document.getElementById("pickerLeagueSelect");
  if (nLeague)  window._lgSelects.leagueSelect        = new LgSelect(nLeague);
  if (nAnalise) window._lgSelects.analiseLeagueSelect = new LgSelect(nAnalise);
  if (nPicker)  window._lgSelects.pickerLeagueSelect  = new LgSelect(nPicker);

  const savedSport = localStorage.getItem("apostas_sport") || "football";
  window._activeSport = savedSport;
  _updateSportPills(savedSport);

  _updateJogosDateLabel();

  const savedRaw = localStorage.getItem("apostas_tab") || "recomendacoes";
  const saved = _PANELS[savedRaw] ? savedRaw : "recomendacoes";
  apostasTab(saved);
  loadTips();
});

function pad(n) { return String(n).padStart(2, "0"); }

// ============================================================
//  SPORT + LEAGUE SELECTOR (shared between Jogos + Tabelas)
// ============================================================

window._leaguesLoaded  = false;
window._activeLeague   = null;
window._activeSport    = "football";

function selectSport(sport) {
  window._activeSport = sport;
  window._leaguesLoaded = false;
  window._activeLeague  = null;
  localStorage.setItem("apostas_sport", sport);
  _updateSportPills(sport);
  loadSportLeagues(sport);
}

function _updateSportPills(sport) {
  document.querySelectorAll(".sport-pill").forEach(btn => {
    btn.classList.toggle("sport-pill--active", btn.dataset.sport === sport);
  });
}

async function loadSportLeagues(sport) {
  const sel = document.getElementById("leagueSelect");
  sel.innerHTML = '<option disabled selected>Carregando...</option>';
  window._lgSelects?.leagueSelect?.setLoading();

  try {
    let leagues = [];

    if (sport === "football") {
      const [respEspn, respFb] = await Promise.all([
        fetch("/api/apostas/espn/leagues"),
        fetch("/api/apostas/apifootball/leagues"),
      ]);
      const espnList = respEspn.ok ? await respEspn.json() : [];
      const fbList   = respFb.ok  ? await respFb.json()   : [];
      espnList.forEach(lg => {
        const v = `espn:${lg.slug}`;
        leagues.push({ value: v, name: lg.name, category: lg.category, flag: _lgsFlag(v, lg.category), logo: _lgsEspnLogo(lg.slug, 'soccer') });
      });
      fbList.forEach(lg => {
        const v = `football:${lg.id}`;
        leagues.push({ value: v, name: lg.name, category: lg.category, flag: _lgsFlag(v, lg.category), logo: `https://media.api-sports.io/football/leagues/${lg.id}.png` });
      });
    } else {
      const resp = await fetch(`/api/apostas/sports/${sport}/leagues`);
      if (resp.ok) {
        const list = await resp.json();
        list.forEach(lg => {
          const v = `${sport}:${lg.id}`;
          leagues.push({
            value:    v,
            name:     lg.name,
            category: lg.category || lg.country || "Internacional",
            flag:     _lgsFlag(v, lg.category || lg.country || ''),
            logo:     lg.logo || _lgsLogo(v),
          });
        });
      }
    }

    if (leagues.length === 0) {
      sel.innerHTML = '<option disabled selected>Nenhum campeonato disponível</option>';
      window._lgSelects?.leagueSelect?.setError();
      return;
    }

    const byCategory = {};
    leagues.forEach(lg => {
      if (!byCategory[lg.category]) byCategory[lg.category] = [];
      byCategory[lg.category].push(lg);
    });

    sel.innerHTML = "";
    const groups = Object.entries(byCategory).map(([label, items]) => ({ label, items }));
    groups.forEach(({ label, items }) => {
      const grp = document.createElement("optgroup");
      grp.label = label;
      items.forEach(lg => {
        const opt = document.createElement("option");
        opt.value = lg.value;
        opt.textContent = lg.name;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    });

    window._leaguesLoaded = true;
    const savedKey = `apostas_league_${sport}`;
    const saved    = localStorage.getItem(savedKey) || leagues[0]?.value;

    window._lgSelects?.leagueSelect?.populate(groups, saved || '');

    if (saved) {
      sel.value = saved;
      selectLeague(saved);
    }
  } catch {
    sel.innerHTML = '<option disabled selected>Erro ao carregar campeonatos</option>';
    window._lgSelects?.leagueSelect?.setError();
  }
}

function loadLeagues() {
  loadSportLeagues(window._activeSport || "football");
}

function onLeagueSelectChange() {
  const sel = document.getElementById("leagueSelect");
  if (sel && sel.value) selectLeague(sel.value);
}

function selectLeague(slug) {
  window._activeLeague = slug;
  const sport = window._activeSport || "football";
  localStorage.setItem(`apostas_league_${sport}`, slug);

  const sel = document.getElementById("leagueSelect");
  if (sel && sel.value !== slug) sel.value = slug;
  window._lgSelects?.leagueSelect?.setValue(slug);

  const currentTab = localStorage.getItem("apostas_tab") || "recomendacoes";
  if (currentTab === "jogos")   loadJogos(slug);
  if (currentTab === "tabelas") loadTabela(slug);
}

function _slugToUrl(slug, endpoint, extraParams) {
  if (!slug) return null;
  const params = extraParams ? `?${extraParams}` : "";

  if (slug.startsWith("espn:")) {
    const s = slug.slice(5);
    return `/api/apostas/espn/${endpoint === "games" ? "fixtures" : "standings"}/${encodeURIComponent(s)}${params}`;
  }
  if (slug.startsWith("football:") || slug.startsWith("afl:")) {
    const id = slug.startsWith("football:") ? slug.slice(9) : slug.slice(4);
    return `/api/apostas/apifootball/${endpoint === "games" ? "fixtures" : "standings"}/${id}${params}`;
  }
  const colonIdx = slug.indexOf(":");
  if (colonIdx > 0) {
    const sport   = slug.slice(0, colonIdx);
    const leagueId = slug.slice(colonIdx + 1);
    return `/api/apostas/sports/${sport}/${endpoint}/${leagueId}${params}`;
  }
  return `/api/apostas/espn/${endpoint === "games" ? "fixtures" : "standings"}/${encodeURIComponent(slug)}${params}`;
}

// ============================================================
//  PRÓXIMOS JOGOS
// ============================================================

window._jogosData       = null;
window._jogosDateOffset = 0;

function _jogosFromDate() {
  const d = new Date();
  d.setDate(d.getDate() + (window._jogosDateOffset || 0));
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function _updateJogosDateLabel() {
  const offset = window._jogosDateOffset || 0;
  const start  = new Date();
  start.setDate(start.getDate() + offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const thisYear = new Date().getFullYear();
  const fmt = dt => `${dt.getDate()} ${months[dt.getMonth()]}`;
  const yr  = end.getFullYear() !== thisYear ? ` ${end.getFullYear()}` : "";

  const el = document.getElementById("jogosDateLabel");
  if (el) el.textContent = `${fmt(start)} – ${fmt(end)}${yr}`;

  const reset = document.getElementById("jogosDateReset");
  if (reset) reset.style.display = offset === 0 ? "none" : "inline-flex";
}

function shiftJogosDate(delta) {
  window._jogosDateOffset = (window._jogosDateOffset || 0) + delta;
  _updateJogosDateLabel();
  reloadJogos();
}

function resetJogosDate() {
  window._jogosDateOffset = 0;
  _updateJogosDateLabel();
  reloadJogos();
}

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
    let msg;
    if (minDiff > 0) {
      msg = `Nenhum jogo com diferença ≥ ${minDiff} posições (${total} jogos no período sem esse filtro).`;
    } else {
      const sport = window._activeSport || "soccer";
      const hints = {
        soccer:     "As ligas domésticas costumam parar durante Copa do Mundo. Tente selecionar Copa do Mundo FIFA ou Copa América.",
        basketball: "Pode ser recesso de temporada (a NBA fica inativa de junho a outubro). Tente WNBA ou NBB.",
        baseball:   "Verifique se a temporada do campeonato selecionado está ativa.",
        tennis:     "O calendário de tênis tem lacunas entre Grand Slams. Tente ATP Tour ou WTA Tour.",
        volleyball: "Verifique se a Superliga ou Nations League está em andamento neste período.",
        handball:   "As ligas europeias de handebol geralmente param no verão europeu.",
      };
      const hint = hints[sport];
      msg = hint
        ? `Nenhum jogo agendado para os próximos dias. ${hint}`
        : "Nenhum jogo agendado para este período.";
    }
    document.getElementById("jogosVazioMsg").textContent = msg;
    setJogosState("vazio");
    return;
  }

  renderJogosMatches(window._jogosData, matches);
  setJogosState("content");
}

async function loadJogos(slug) {
  _stopLivePolling();
  _updateJogosDateLabel();
  setJogosState("loading");

  const fromDate = _jogosFromDate();
  const params   = `days=7&from_date=${fromDate}`;

  try {
    const url = _slugToUrl(slug, "games", params);
    if (!url) { setJogosState("erro", "Campeonato inválido."); return; }

    const resp = await fetch(url);
    const json = await resp.json();
    if (!resp.ok) { setJogosState("erro", json.error); return; }

    window._jogosData = json;
    if (json.league_logo) window._lgSelects?.leagueSelect?.updateTriggerLogo(json.league_logo);
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

  const leagueSlug = window._activeLeague || '';
  const ctx = _buildLeagueCtx(data, leagueSlug);

  const byDate = {};
  matches.forEach(m => {
    const dayKey = m.date_brt ? m.date_brt.slice(0, 10) : "?";
    if (!byDate[dayKey]) byDate[dayKey] = [];
    byDate[dayKey].push(m);
  });

  Object.entries(byDate).forEach(([day, dayMatches]) => {
    let html = `<div class="jogos-day-group">
      <div class="jogos-day-header">${formatDayLabel(day)}</div>`;
    dayMatches.forEach(m => { html += buildMatchRow(m, ctx); });
    html += `</div>`;
    content.innerHTML += html;
  });

  const sport = window._activeSport || "football";
  if (sport === "football") {
    const preMatches = matches.filter(m => m.state === "pre" && m.home_id && m.away_id);
    _autoPredictions(preMatches);
  }

  _startLivePolling();
}

async function _autoPredictions(matches) {
  if (!matches.length) return;
  await _loadMatchPrediction(matches[0]);
  for (let i = 1; i < matches.length; i++) {
    setTimeout(() => _loadMatchPrediction(matches[i]), (i - 1) * 80);
  }
}

async function _loadMatchPrediction(m) {
  const predId = `pred-${String(m.home_id)}-${String(m.away_id)}`;
  const container = document.getElementById(predId);
  if (!container) return;

  const league = window._activeLeague || "";
  const hp = m.home_pos ? `&home_pos=${encodeURIComponent(m.home_pos)}` : "";
  const ap = m.away_pos ? `&away_pos=${encodeURIComponent(m.away_pos)}` : "";
  const url = `/api/apostas/analise/match?league=${encodeURIComponent(league)}&home_id=${encodeURIComponent(m.home_id)}&away_id=${encodeURIComponent(m.away_id)}${hp}${ap}`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (!resp.ok) throw new Error();
    container.innerHTML = _renderInlinePrediction(data, m.home_name, m.away_name);
  } catch {
    container.style.display = "none";
  }
}

// ============================================================
//  Live clock auto-refresh (polls every 60 s when live matches exist)
// ============================================================

window._liveInterval = null;

function _stopLivePolling() {
  if (window._liveInterval) {
    clearInterval(window._liveInterval);
    window._liveInterval = null;
  }
  const badge = document.getElementById("jogosLiveBadge");
  if (badge) badge.remove();
}

function _startLivePolling() {
  _stopLivePolling();
  if (!window._jogosData) return;
  const hasLive = window._jogosData.matches.some(m => m.state === "in");
  if (!hasLive) return;

  _showLiveBadge();
  window._liveInterval = setInterval(_livePoll, 60000);
}

function _showLiveBadge() {
  if (document.getElementById("jogosLiveBadge")) return;
  const badge = document.createElement("div");
  badge.id = "jogosLiveBadge";
  badge.className = "jogos-live-badge";
  badge.innerHTML = `<span class="jogos-live-badge-dot"></span>AO VIVO`;
  const content = document.getElementById("jogosContent");
  if (content) content.prepend(badge);
}

async function _livePoll() {
  const slug = window._activeLeague;
  if (!slug) return;

  const fromDate = _jogosFromDate();
  const url      = _slugToUrl(slug, "games", `days=7&from_date=${fromDate}`);
  if (!url) return;

  try {
    const resp = await fetch(url);
    if (!resp.ok) return;
    const json = await resp.json();

    const freshMap = {};
    json.matches.forEach(m => { freshMap[m.event_id] = m; });

    let stillLive = false;
    window._jogosData.matches = window._jogosData.matches.map(old => {
      const fresh = freshMap[old.event_id];
      if (!fresh) return old;

      const el = document.getElementById(`live-score-${old.event_id}`);
      if (el) el.innerHTML = _buildScoreHtml(fresh);

      if (fresh.state === "in") stillLive = true;
      return Object.assign({}, old, fresh);
    });

    if (!stillLive) _stopLivePolling();
  } catch {}
}

function _renderInlinePrediction(data, homeName, awayName) {
  const pred = data.prediction;
  if (!pred || !pred.has_data) return '<div class="jogos-pred-nodata">Sem dados históricos suficientes</div>';

  const p = pred.probabilities;
  const g = pred.goals;

  const probBar = `
    <div class="jogos-pred-prob">
      <div class="jogos-pred-bar">
        <div class="jogos-pred-seg jogos-pred-seg--home" style="width:${p.home_win}%"></div>
        <div class="jogos-pred-seg jogos-pred-seg--draw" style="width:${p.draw}%"></div>
        <div class="jogos-pred-seg jogos-pred-seg--away" style="width:${p.away_win}%"></div>
      </div>
      <div class="jogos-pred-labels">
        <span class="jogos-pred-lbl--home">${escHtml(homeName || '')} ${p.home_win}%</span>
        <span class="jogos-pred-lbl--draw">Empate ${p.draw}%</span>
        <span class="jogos-pred-lbl--away">${p.away_win}% ${escHtml(awayName || '')}</span>
      </div>
    </div>`;

  const chips = [];
  if (g.expected   != null) chips.push(`<span class="jogos-pred-chip">~${g.expected} gols</span>`);
  if (g.over_25_pct != null) chips.push(`<span class="jogos-pred-chip">Over 2.5 ${g.over_25_pct}%</span>`);
  if (g.btts_pct   != null) chips.push(`<span class="jogos-pred-chip">Ambas ${g.btts_pct}%</span>`);
  const chipsHtml = chips.length ? `<div class="jogos-pred-chips">${chips.join("")}</div>` : "";

  const topN = (pred.narratives || []).slice(0, 2);
  const narrativeHtml = topN.length
    ? `<ul class="jogos-pred-narrative-list">${topN.map(n => `<li>${escHtml(n)}</li>`).join("")}</ul>`
    : "";

  return `<div class="jogos-pred-content">${probBar}${chipsHtml}${narrativeHtml}</div>`;
}

function _getLiveClock(m) {
  if (m.state !== "in") return "";
  if (m.elapsed != null) {
    if (m.status_short === "HT") return "Int.";
    return `${m.elapsed}'`;
  }
  if (m.status_detail) {
    if (m.status_detail === "Halftime") return "Int.";
    const minMatch = m.status_detail.match(/(\d+)['′]/);
    if (minMatch) return `${minMatch[1]}'`;
    if (m.status_detail === "Full Time" || m.status_detail === "FT") return "FT";
  }
  if (m.period && m.display_clock) {
    return `${m.period}T ${m.display_clock}`;
  }
  return "AO VIVO";
}

function _buildScoreHtml(m) {
  if (m.state === "in") {
    const clockTxt  = _getLiveClock(m);
    const clockHtml = clockTxt ? `<span class="jogos-live-clock">${escHtml(clockTxt)}</span>` : "";
    return `<div class="jogos-score-live-wrap">${clockHtml}<span class="jogos-score jogos-score--live">${escHtml(m.score_home)} – ${escHtml(m.score_away)}</span></div>`;
  }
  if (m.state === "post") {
    return `<span class="jogos-score jogos-score--final">${escHtml(m.score_home)} – ${escHtml(m.score_away)}</span>`;
  }
  const time = m.date_brt ? m.date_brt.slice(11, 16) : "";
  return `<span class="jogos-time">${escHtml(time)}</span>`;
}

function buildMatchRow(m, ctx) {
  const homePosHtml = m.home_pos ? `<span class="jogos-pos jogos-pos--${posTier(m.home_pos)}">#${m.home_pos}</span>` : "";
  const awayPosHtml = m.away_pos ? `<span class="jogos-pos jogos-pos--${posTier(m.away_pos)}">#${m.away_pos}</span>` : "";
  const diffHtml    = m.pos_diff != null ? buildJogosDiff(m.pos_diff) : "";

  const venue = m.venue ? `<span class="jogos-venue"><img src="/static/images/icons/vecteezy_stadium-icon-vector-in-line-style_35090213.svg" class="jogos-venue-icon" alt=""> ${escHtml(m.venue)}</span>` : "";

  const homeLogoHtml = m.home_logo
    ? `<img src="${escHtml(m.home_logo)}" class="jogos-team-logo" alt="" loading="lazy" onerror="this.style.display='none'">`
    : "";
  const awayLogoHtml = m.away_logo
    ? `<img src="${escHtml(m.away_logo)}" class="jogos-team-logo" alt="" loading="lazy" onerror="this.style.display='none'">`
    : "";

  const scoreHtml = _buildScoreHtml(m);

  const isFootball = !window._activeSport || window._activeSport === "football";
  const analiseBtn = (isFootball && m.home_id && m.away_id)
    ? `<button class="jogos-analise-btn${m.state === "post" ? " jogos-analise-btn--post" : ""}"
         data-hid="${escHtml(String(m.home_id))}"
         data-aid="${escHtml(String(m.away_id))}"
         data-hn="${escHtml(m.home_name)}"
         data-an="${escHtml(m.away_name)}"
         data-hp="${m.home_pos || ""}"
         data-ap="${m.away_pos || ""}"
         data-hl="${escHtml(m.home_logo || '')}"
         data-al="${escHtml(m.away_logo || '')}"
         data-ll="${escHtml((window._jogosData && window._jogosData.league_logo) || m.league_logo || '')}"
         data-eid="${escHtml(String(m.event_id || ''))}"
         data-src="${escHtml(m.source || '')}"
         data-state="${escHtml(m.state || 'pre')}"
         data-sh="${escHtml(String(m.score_home ?? ''))}"
         data-sa="${escHtml(String(m.score_away ?? ''))}"
         onclick="handleMatchAnalise(this)"
         title="${m.state === 'post' ? 'Ver análise e resultado' : 'Ver análise completa'}">
        <i class="bi bi-bar-chart-line"></i>
       </button>`
    : "";

  const predId = `pred-${String(m.home_id)}-${String(m.away_id)}`;
  const predContainer = (isFootball && m.state === "pre" && m.home_id && m.away_id)
    ? `<div class="jogos-prediction" id="${escHtml(predId)}">
         <div class="jogos-pred-loading"><div class="apostas-spinner" style="width:12px;height:12px;border-width:2px"></div></div>
       </div>`
    : "";

  return `
    <div class="jogos-match-row">
      <div class="jogos-team jogos-team--home">
        ${homePosHtml}
        <span class="jogos-team-name">${escHtml(m.home_name)}</span>
        ${homeLogoHtml}
      </div>
      <div class="jogos-center">
        ${diffHtml}
        <div id="live-score-${escHtml(String(m.event_id))}">${scoreHtml}</div>
      </div>
      <div class="jogos-team jogos-team--away">
        ${awayLogoHtml}
        <span class="jogos-team-name">${escHtml(m.away_name)}</span>
        ${awayPosHtml}
      </div>
      <div class="jogos-meta">${venue}${analiseBtn}</div>
      ${(() => {
        const homeImp  = _teamImportanceHtml(m.home_id, ctx);
        const awayImp  = _teamImportanceHtml(m.away_id, ctx);
        const roundHtml = _roundInfoHtml(m, ctx);
        return (homeImp || awayImp || roundHtml)
          ? `<div class="jogos-importance">
               <span class="jogos-imp-side">${homeImp}</span>
               ${roundHtml}
               <span class="jogos-imp-side jogos-imp-side--away">${awayImp}</span>
             </div>`
          : '';
      })()}
      ${predContainer}
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
  const sport = window._activeSport || "soccer";
  document.getElementById("tabelasContent").style.display = "none";
  document.getElementById("tabelasErro").style.display    = "none";
  document.getElementById("tabelasLoading").style.display = "flex";

  try {
    const url = _slugToUrl(slug, "standings", "");
    if (!url) { showTabelasErro("Campeonato inválido."); return; }

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
  const sgSign = Number(r.goal_diff) > 0 ? "+" : "";
  const logoHtml = r.team_logo
    ? `<img src="${escHtml(r.team_logo)}" class="tabelas-team-logo" alt="" loading="lazy" onerror="this.style.display='none'">`
    : "";
  const goalCol = (r.goals_for || r.goals_against)
    ? `${r.goals_for}:${r.goals_against}`
    : `${r.wins}/${r.losses}`;
  return `
    <tr class="tabelas-row ${posCls}">
      <td class="tabelas-td tabelas-td--pos"><span class="tabelas-pos">${r.position}</span></td>
      <td class="tabelas-td tabelas-td--team">
        ${logoHtml}
        <span class="tabelas-team-name">${escHtml(r.team_name)}</span>
      </td>
      <td class="tabelas-td tabelas-td--num">${r.matches}</td>
      <td class="tabelas-td tabelas-td--num">${r.wins}</td>
      <td class="tabelas-td tabelas-td--num">${r.draws}</td>
      <td class="tabelas-td tabelas-td--num">${r.losses}</td>
      <td class="tabelas-td tabelas-td--num">${goalCol}</td>
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
  const tips = window._cachedTips || [];
  if (tips.length > 0) {
    const isAdmin = _previewMode ? false : window.APOSTAS_IS_ADMIN === true;
    const visible = isAdmin ? tips : tips.filter(t => t.aprovada !== false);
    if (visible.length === 0) {
      showTipsState("vazio");
    } else {
      tipsList.innerHTML = visible.map(t => buildTipCard(t, isAdmin)).join("");
      showTipsState("list");
    }
  }
}

function renderTipsList(tips) {
  window._cachedTips = tips;
  const isAdmin = _previewMode ? false : window.APOSTAS_IS_ADMIN === true;
  const visible = isAdmin ? tips : tips.filter(t => t.aprovada !== false);
  if (visible.length === 0) { showTipsState("vazio"); return; }
  document.getElementById("tipsList").innerHTML = visible.map(t => buildTipCard(t, isAdmin)).join("");
}

function buildTipCard(tip, isAdmin) {
  const statusBadge  = buildStatusBadge(tip.status);
  const adminActions = isAdmin ? buildTipAdminActions(tip) : "";
  const hasMultipla  = Array.isArray(tip.jogos) && tip.jogos.length > 0;
  const aprovada     = tip.aprovada !== false;

  const oddHtml = tip.odd != null
    ? `<span class="tips-odd-display"><i class="bi bi-calculator"></i>Odd total: <strong>${tip.odd.toFixed(2)}</strong></span>`
    : "";

  let idHtml = "";
  if (!aprovada && isAdmin) {
    idHtml = `<span class="tips-badge--draft"><i class="bi bi-eye-slash"></i>Não publicada</span>`;
  } else if (tip.numero_publico != null) {
    idHtml = `<span class="tips-id-display">ID: <strong>#${tip.numero_publico}</strong></span>`;
  }

  const storyBtnHtml = isAdmin
    ? `<button class="tips-story-btn" onclick="openStoryModal(${tip.id})" title="Baixar imagem para Story"><i class="bi bi-download"></i></button>`
    : "";

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
        ${storyBtnHtml}
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

  const storyStandalone = (isAdmin && !tip.link_aposta) ? storyBtnHtml : "";

  const registrarBtn = (tip.status === "pendente" && aprovada && tip.odd > 1)
    ? `<div class="tips-registrar-row">
         <button class="tips-btn-registrar"
           data-tid="${tip.id}"
           data-titulo="${escHtml(tip.titulo)}"
           data-odd="${tip.odd}"
           onclick="openRegistrarAposta(this)">
           <i class="bi bi-cash-coin"></i> Registrar Aposta
         </button>
       </div>`
    : "";

  return `
    <div class="tips-card" id="tip-${tip.id}" data-status="${escHtml(tip.status)}" data-aprovada="${aprovada}">
      <div class="tips-card-header">
        ${statusBadge}
        <span class="tips-card-title">${escHtml(tip.titulo)}</span>
        ${storyStandalone}
      </div>
      ${(oddHtml || idHtml || linkHtml) ? `<div class="tips-card-row2">${oddHtml}${idHtml}${linkHtml}</div>` : ""}
      ${toggleSection}
      ${registrarBtn}
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
  const id       = tip.id;
  const aprovada = tip.aprovada !== false;
  const aprovBtn = aprovada
    ? `<button class="tips-action-btn tips-action-btn--desaprovar" onclick="toggleAprovada(${id})" title="Despublicar"><i class="bi bi-eye-slash"></i></button>`
    : `<button class="tips-action-btn tips-action-btn--aprovar"    onclick="toggleAprovada(${id})" title="Publicar"><i class="bi bi-eye"></i></button>`;
  return `
    <div class="tips-admin-actions">
      ${aprovBtn}
      ${tip.status !== "green"    ? `<button class="tips-action-btn tips-action-btn--green"   onclick="setTipStatus(${id},'green')"    title="Green"><i class="bi bi-check-lg"></i></button>` : ""}
      ${tip.status !== "red"      ? `<button class="tips-action-btn tips-action-btn--red"     onclick="setTipStatus(${id},'red')"      title="Red"><i class="bi bi-x-lg"></i></button>` : ""}
      ${tip.status !== "pendente" ? `<button class="tips-action-btn tips-action-btn--pending" onclick="setTipStatus(${id},'pendente')" title="Em Aberto"><i class="bi bi-clock"></i></button>` : ""}
      ${tip.status !== "void"     ? `<button class="tips-action-btn tips-action-btn--void"    onclick="setTipStatus(${id},'void')"     title="Anular"><i class="bi bi-dash-lg"></i></button>` : ""}
      <button class="tips-action-btn tips-action-btn--edit"   onclick="openEditModal(${id})"  title="Editar"><i class="bi bi-pencil"></i></button>
      <button class="tips-action-btn tips-action-btn--delete" onclick="deleteTip(${id})"      title="Excluir"><i class="bi bi-trash3"></i></button>
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

async function toggleAprovada(tipId) {
  try {
    const resp = await fetch(`/api/apostas/tips/${tipId}/aprovada`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    const json = await resp.json();
    if (!resp.ok) { alert(json.error || "Erro ao atualizar publicação"); return; }
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
let _pickerSport        = "soccer";

function openMatchPicker(jogoIdx) {
  _pickerJogoIdx = jogoIdx;
  document.getElementById("matchPickerOverlay").style.display = "flex";

  const sportSel = document.getElementById("pickerSportSelect");
  if (sportSel && sportSel.value !== _pickerSport) {
    _pickerSport = sportSel.value;
    _pickerLeaguesReady = false;
  }

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

function onPickerSportChange() {
  const sel = document.getElementById("pickerSportSelect");
  if (!sel) return;
  _pickerSport = sel.value;
  _pickerLeaguesReady = false;
  const leagueSel = document.getElementById("pickerLeagueSelect");
  if (leagueSel) leagueSel.innerHTML = '<option disabled selected>Carregando...</option>';
  window._lgSelects?.pickerLeagueSelect?.setLoading();
  document.getElementById("pickerMatchList").innerHTML = "";
  document.getElementById("pickerEmpty").style.display = "none";
  _loadPickerLeagues();
}

async function _loadPickerLeagues() {
  const sport = _pickerSport || "soccer";
  const sel   = document.getElementById("pickerLeagueSelect");
  window._lgSelects?.pickerLeagueSelect?.setLoading();
  try {
    const resp = await fetch(`/api/apostas/espn/leagues?sport=${sport}`);
    const list = await resp.json();

    const byCategory = {};
    list.forEach(lg => {
      if (!byCategory[lg.category]) byCategory[lg.category] = [];
      byCategory[lg.category].push(lg);
    });

    sel.innerHTML = "";
    const groups = Object.entries(byCategory).map(([label, rawItems]) => ({
      label,
      items: rawItems.map(lg => ({
        value: lg.slug,
        name:  lg.name,
        flag:  _lgsFlag(`espn:${lg.slug}`, lg.category),
        logo:  _lgsEspnLogo(lg.slug, sport),
      })),
    }));

    groups.forEach(({ label, items }) => {
      const grp = document.createElement("optgroup");
      grp.label = label;
      items.forEach(it => {
        const opt = document.createElement("option");
        opt.value = it.value;
        opt.textContent = it.name;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    });

    window._lgSelects?.pickerLeagueSelect?.populate(groups, '');
    _pickerLeaguesReady = true;

    let defaultSlug = list[0]?.slug;
    if (sport === "soccer" && window._activeLeague && !window._activeLeague.startsWith("afl:") && !window._activeLeague.startsWith("football:")) {
      const activeSlug = window._activeLeague.startsWith("espn:") ? window._activeLeague.slice(5) : window._activeLeague;
      if (list.find(l => l.slug === activeSlug)) defaultSlug = activeSlug;
    }
    if (defaultSlug) {
      sel.value = defaultSlug;
      window._lgSelects?.pickerLeagueSelect?.setValue(defaultSlug);
      _loadPickerMatches(defaultSlug);
    }
  } catch {
    sel.innerHTML = '<option disabled>Erro ao carregar campeonatos</option>';
    window._lgSelects?.pickerLeagueSelect?.setError();
  }
}

function onPickerLeagueChange() {
  const sel = document.getElementById("pickerLeagueSelect");
  if (sel.value) _loadPickerMatches(sel.value);
}

async function _loadPickerMatches(slug) {
  const sport     = _pickerSport || "soccer";
  const listEl    = document.getElementById("pickerMatchList");
  const loadingEl = document.getElementById("pickerLoading");
  const emptyEl   = document.getElementById("pickerEmpty");

  listEl.innerHTML = "";
  emptyEl.style.display = "none";
  loadingEl.style.display = "flex";

  try {
    const resp = await fetch(`/api/apostas/espn/fixtures/${encodeURIComponent(slug)}?days=30&sport=${sport}`);
    const json = await resp.json();
    loadingEl.style.display = "none";

    const upcoming = (json.matches || []).filter(m => m.state === "pre" || m.state === "in");
    if (!resp.ok || upcoming.length === 0) {
      emptyEl.style.display = "flex";
      return;
    }

    const sel        = document.getElementById("pickerLeagueSelect");
    const season     = json.season || sel.options[sel.selectedIndex]?.text || "";
    const leagueLogo = json.league_logo || '';
    const leagueFlag = _lgsFlag(`espn:${slug}`, '');
    _renderPickerMatches(upcoming, season, leagueLogo, leagueFlag);
  } catch {
    loadingEl.style.display = "none";
    emptyEl.style.display = "flex";
  }
}

function _renderPickerMatches(matches, season, leagueLogo, leagueFlag) {
  const listEl = document.getElementById("pickerMatchList");

  const leagueLogoHtml = leagueLogo
    ? `<img class="picker-league-logo" src="${escHtml(leagueLogo)}" alt="" onerror="this.style.visibility='hidden'">`
    : `<span class="picker-league-logo-ph"></span>`;
  const leagueFlagHtml = leagueFlag
    ? `<span class="picker-league-flag">${_lgsFlagImg(leagueFlag, 18)}</span>`
    : '';

  let html = `<div class="picker-league-header">
    ${leagueLogoHtml}
    ${leagueFlagHtml}
    <span class="picker-league-name">${escHtml(season)}</span>
  </div>`;

  const byDate = {};
  matches.forEach(m => {
    const dayKey = m.date_brt ? m.date_brt.slice(0, 10) : "?";
    if (!byDate[dayKey]) byDate[dayKey] = [];
    byDate[dayKey].push(m);
  });

  Object.entries(byDate).forEach(([day, dayMatches]) => {
    html += `<div class="picker-day-group">
      <div class="picker-day-header">${formatDayLabel(day)}</div>`;
    dayMatches.forEach(m => {
      const time    = m.date_brt ? m.date_brt.slice(11, 16) : "";
      const partida = `${m.home_name} x ${m.away_name}`;
      const date    = m.date_brt ? m.date_brt.slice(0, 10) : "";
      const diff    = m.pos_diff != null && m.pos_diff >= 2 ? buildJogosDiff(m.pos_diff) : "";

      const homeLogoHtml = m.home_logo
        ? `<img class="picker-team-logo" src="${escHtml(m.home_logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
        : `<span class="picker-team-logo-ph"></span>`;
      const awayLogoHtml = m.away_logo
        ? `<img class="picker-team-logo" src="${escHtml(m.away_logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
        : `<span class="picker-team-logo-ph"></span>`;

      const homePosHtml = m.home_pos ? `<span class="picker-pos picker-pos--${posTier(m.home_pos)}">#${m.home_pos}</span>` : "";
      const awayPosHtml = m.away_pos ? `<span class="picker-pos picker-pos--${posTier(m.away_pos)}">#${m.away_pos}</span>` : "";

      html += `
        <div class="picker-match-row"
             data-partida="${escHtml(partida)}"
             data-season="${escHtml(season)}"
             data-date="${escHtml(date)}"
             onclick="_selectPickerMatch(this)">
          <div class="picker-match-teams">
            <div class="picker-team-block">
              ${homeLogoHtml}
              ${homePosHtml}
              <span class="picker-team picker-team--home">${escHtml(m.home_name)}</span>
            </div>
            <span class="picker-vs">×</span>
            <div class="picker-team-block picker-team-block--away">
              <span class="picker-team picker-team--away">${escHtml(m.away_name)}</span>
              ${awayPosHtml}
              ${awayLogoHtml}
            </div>
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
let _autoLeagueMode   = "include";

function setAutoLeagueMode(mode) {
  _autoLeagueMode = mode;
  const grid    = document.getElementById("autoLeagueCheckboxes");
  const hint    = document.getElementById("autoLeagueModeHint");
  const btnIncl = document.getElementById("autoModeInclude");
  const btnExcl = document.getElementById("autoModeExclude");

  if (mode === "exclude") {
    grid?.classList.add("mode-exclude");
    if (hint)    hint.textContent    = "(nenhum = todos • marcados serão excluídos)";
    if (btnIncl) btnIncl.classList.remove("auto-mode-btn--active");
    if (btnExcl) btnExcl.classList.add("auto-mode-btn--active");
  } else {
    grid?.classList.remove("mode-exclude");
    if (hint)    hint.textContent    = "(nenhum = todos)";
    if (btnIncl) btnIncl.classList.add("auto-mode-btn--active");
    if (btnExcl) btnExcl.classList.remove("auto-mode-btn--active");
  }
}

function _getAutoSports() {
  const checked = Array.from(document.querySelectorAll(".auto-sport-input:checked")).map(cb => cb.value);
  return checked.length > 0 ? checked : ["soccer"];
}

async function openAutoModal() {
  document.getElementById("autoFormError").style.display = "none";
  document.getElementById("autoModalOverlay").style.display = "flex";
  if (!_autoLeaguesLoaded) {
    await _loadAutoLeagues(_getAutoSports());
    _autoLeaguesLoaded = true;
  }
}

function onAutoSportsChange() {
  _autoLeaguesLoaded = false;
  document.getElementById("autoLeagueCheckboxes").innerHTML = "";
  _loadAutoLeagues(_getAutoSports()).then(() => { _autoLeaguesLoaded = true; });
}

function closeAutoModal() {
  document.getElementById("autoModalOverlay").style.display = "none";
}

function closeAutoModalOverlay(e) {
  if (e.target === document.getElementById("autoModalOverlay")) closeAutoModal();
}

const _SPORT_LABELS = { soccer: "Futebol", basketball: "Basquete", baseball: "Beisebol", tennis: "Tênis", volleyball: "Vôlei", handball: "Handebol", hockey: "Hockey", football: "Fut. Americano" };

async function _loadAutoLeagues(sports = ["soccer"]) {
  const container = document.getElementById("autoLeagueCheckboxes");
  if (!container) return;
  container.innerHTML = '<span style="color:var(--text-muted);font-size:.8rem">Carregando...</span>';
  try {
    const reqs = sports.map(sport =>
      fetch(`/api/apostas/espn/leagues?sport=${sport}`)
        .then(r => r.ok ? r.json() : [])
        .then(list => ({ sport, source: "espn", list }))
    );
    if (sports.includes("soccer")) {
      reqs.push(
        fetch("/api/apostas/apifootball/leagues")
          .then(r => r.ok ? r.json() : [])
          .then(list => ({ sport: "soccer", source: "afl", list }))
      );
    }

    const results   = await Promise.all(reqs);
    const multiSport = sports.length > 1;
    let html = "";

    for (const sport of sports) {
      const sportResults = results.filter(r => r.sport === sport);
      const byCategory = {};

      for (const { source, list } of sportResults) {
        list.forEach(lg => {
          const cat = lg.category || "Outros";
          if (!byCategory[cat]) byCategory[cat] = [];
          const value = source === "afl" ? `afl:${lg.id}` : `espn:${sport}:${lg.slug}`;
          byCategory[cat].push({ value, name: lg.name });
        });
      }

      if (!Object.keys(byCategory).length) continue;

      if (multiSport) {
        html += `<div class="auto-league-sport-header">${escHtml(_SPORT_LABELS[sport] || sport)}</div>`;
      }

      Object.entries(byCategory).forEach(([cat, items]) => {
        html += `<div class="auto-league-category">${escHtml(cat)}</div>`;
        html += items.map(lg => `
          <label class="auto-league-check">
            <input type="checkbox" value="${escHtml(lg.value)}" class="auto-league-input">
            ${escHtml(lg.name)}
          </label>
        `).join("");
      });
    }

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

  const minDiff    = parseInt(document.getElementById("autoDiff").value) || 10;
  const targetOdd  = parseFloat(document.getElementById("autoTargetOdd").value) || 3.00;
  const daysAhead  = parseInt(document.getElementById("autoDays").value) || 14;
  const maxGames   = parseInt(document.getElementById("autoMaxGames").value) || 5;
  const maxRecs    = parseInt(document.getElementById("autoMaxRecs").value) || 1;
  const stake      = document.getElementById("autoStake").value.trim();
  const titulo     = document.getElementById("autoTitulo").value.trim();
  const useAnalise = document.getElementById("autoAnaliseFilter")?.checked ?? true;

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
        min_diff:             minDiff,
        target_odd:           targetOdd,
        days_ahead:           daysAhead,
        max_games:            maxGames,
        max_recommendations:  maxRecs,
        leagues,
        league_mode:          _autoLeagueMode,
        stake,
        titulo,
        sports:               _getAutoSports(),
        use_analise_filter:   useAnalise,
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
  document.getElementById("editOdd").value          = tip.odd != null ? tip.odd : "";
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

  const tipId      = parseInt(document.getElementById("editTipId").value);
  const titulo     = document.getElementById("editTitulo").value.trim();
  const stake      = document.getElementById("editStake").value.trim();
  const oddRaw     = document.getElementById("editOdd").value.trim();
  const linkAposta = document.getElementById("editLinkAposta").value.trim();

  if (!titulo) { _showEditFormError("Título é obrigatório"); return; }

  const odd = oddRaw !== "" ? parseFloat(oddRaw) : null;
  if (odd !== null && (isNaN(odd) || odd <= 0)) {
    _showEditFormError("Odd inválida — deve ser um número maior que zero");
    return;
  }

  const btn = document.getElementById("editSubmitBtn");
  btn.disabled = true;

  try {
    const resp = await fetch(`/api/apostas/tips/${tipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, stake, odd, link_aposta: linkAposta }),
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
    bg:         "#050d1a",
    card:       "rgba(255,255,255,0.07)",
    cardBorder: "rgba(255,255,255,0.11)",
    white:      "#ffffff",
    blue:       "#3b82f6",
    blueBright: "#60a5fa",
    green:      "#22c55e",
    amber:      "#f59e0b",
    red:        "#ef4444",
    gray:       "#64748b",
  };

  const statusMap = {
    green:    { color: C.green, icon: "✅", label: "GREEN" },
    red:      { color: C.red,   icon: "❌", label: "RED" },
    pendente: { color: C.amber, icon: "⏳", label: "EM ABERTO" },
    void:     { color: C.gray,  icon: "⬜", label: "VOID" },
  };
  const sc = statusMap[tip.status] || statusMap.pendente;

  // ── BACKGROUND — deep dark with radial blue glow ──────────
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  const glowCenter = ctx.createRadialGradient(W / 2, H * 0.40, 0, W / 2, H * 0.40, 390);
  glowCenter.addColorStop(0, "rgba(37,99,235,0.22)");
  glowCenter.addColorStop(0.55, "rgba(37,99,235,0.06)");
  glowCenter.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowCenter;
  ctx.fillRect(0, 0, W, H);

  const glowBL = ctx.createRadialGradient(W * 0.10, H * 0.88, 0, W * 0.10, H * 0.88, 220);
  glowBL.addColorStop(0, "rgba(79,70,229,0.18)");
  glowBL.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowBL;
  ctx.fillRect(0, 0, W, H);

  // Top accent line
  const accentG = ctx.createLinearGradient(0, 0, W, 0);
  accentG.addColorStop(0,   "rgba(59,130,246,0)");
  accentG.addColorStop(0.5, "rgba(96,165,250,1)");
  accentG.addColorStop(1,   "rgba(59,130,246,0)");
  ctx.fillStyle = accentG;
  ctx.fillRect(0, 0, W, 3);

  // ── LOGO ─────────────────────────────────────────────────
  const LOGO_SIZE = 52, LOGO_X = PAD, LOGO_Y = 26;
  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    _drawRoundedRect(ctx, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE, 14);
    ctx.clip();
    ctx.drawImage(logoImg, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.5;
    _drawRoundedRect(ctx, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE, 14);
    ctx.stroke();
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    _drawRoundedRect(ctx, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE, 14);
    ctx.fill();
    ctx.font = "900 30px system-ui,-apple-system,sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("F", LOGO_X + LOGO_SIZE / 2, LOGO_Y + LOGO_SIZE / 2);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "900 22px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("FLUXARA", LOGO_X + LOGO_SIZE + 14, LOGO_Y + 8);

  ctx.font = "500 11px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("TIPS & APOSTAS", LOGO_X + LOGO_SIZE + 14, LOGO_Y + 34);

  ctx.font = "400 9.5px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillText("Controle financeiro, apostas e bem-estar.", LOGO_X + LOGO_SIZE + 14, LOGO_Y + 50);

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  ctx.font = "500 10px system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.textAlign = "right";
  ctx.fillText("📅  " + today, W - PAD, LOGO_Y + 20);
  ctx.textAlign = "left";

  // ── STATUS BADGE ─────────────────────────────────────────
  ctx.font = "800 14px system-ui,-apple-system,sans-serif";
  const badgeLabel = sc.icon + "  " + sc.label;
  const badgeW = ctx.measureText(badgeLabel).width + 52;
  const badgeH = 42;
  const badgeX = (W - badgeW) / 2;
  const badgeY = LOGO_Y + LOGO_SIZE + 24;

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  _drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.strokeStyle = sc.color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = sc.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeLabel, W / 2, badgeY + badgeH / 2);

  // ── TITLE — large bold italic with glow ──────────────────
  let curY = badgeY + badgeH + 28;

  const titulo = tip.titulo || "Recomendação";
  const dashIdx = titulo.indexOf(" - ");
  let datePart = "";
  let namePart = titulo;
  if (dashIdx > -1) {
    datePart = titulo.slice(0, dashIdx);
    namePart = titulo.slice(dashIdx + 3);
  }

  if (datePart) {
    ctx.font = "600 22px system-ui,-apple-system,sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.52)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(datePart, W / 2, curY);
    curY += 34;
  }

  // Split namePart: first word on line 1, rest on line 2
  const nameWords = namePart.toUpperCase().split(" ");
  const titleLine1 = nameWords[0] || "";
  const titleLine2 = nameWords.slice(1).join(" ");

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(59,130,246,0.85)";
  ctx.shadowBlur = 38;

  const titleFont = "900 italic 72px system-ui,-apple-system,sans-serif";
  ctx.font = titleFont;

  // Fit line 1
  let fs1 = 72;
  ctx.font = `900 italic ${fs1}px system-ui,-apple-system,sans-serif`;
  while (titleLine1 && ctx.measureText(titleLine1).width > W - PAD * 2 && fs1 > 36) {
    fs1 -= 2;
    ctx.font = `900 italic ${fs1}px system-ui,-apple-system,sans-serif`;
  }
  ctx.fillStyle = "#ffffff";
  if (titleLine1) {
    ctx.fillText(titleLine1, W / 2, curY);
    curY += fs1 + 8;
  }

  // Fit line 2
  if (titleLine2) {
    let fs2 = Math.min(fs1, 60);
    ctx.font = `900 italic ${fs2}px system-ui,-apple-system,sans-serif`;
    while (ctx.measureText(titleLine2).width > W - PAD * 2 && fs2 > 28) {
      fs2 -= 2;
      ctx.font = `900 italic ${fs2}px system-ui,-apple-system,sans-serif`;
    }
    ctx.fillStyle = C.blueBright;
    ctx.fillText(titleLine2, W / 2, curY);
    curY += fs2 + 8;
  }
  ctx.restore();
  curY += 20;

  // ── ODD HERO CARD ─────────────────────────────────────────
  if (tip.odd != null) {
    const oddCardH = 104;
    ctx.fillStyle = C.card;
    _drawRoundedRect(ctx, PAD, curY, W - PAD * 2, oddCardH, 16);
    ctx.fill();
    ctx.strokeStyle = C.cardBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "700 11px system-ui,sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.50)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("ODD TOTAL", W / 2, curY + 14);

    ctx.font = "30px serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText("⚡", PAD + 16, curY + oddCardH / 2 + 6);
    ctx.textAlign = "right";
    ctx.fillText("⚡", W - PAD - 16, curY + oddCardH / 2 + 6);

    ctx.save();
    ctx.shadowColor = "rgba(59,130,246,0.55)";
    ctx.shadowBlur = 24;
    ctx.font = "900 60px system-ui,-apple-system,sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tip.odd.toFixed(2), W / 2, curY + oddCardH / 2 + 8);
    ctx.restore();

    curY += oddCardH + 22;
  }

  // ── GAMES ────────────────────────────────────────────────
  const hasGames = Array.isArray(tip.jogos) && tip.jogos.length > 0;
  if (hasGames) {
    ctx.font = "700 10px system-ui,sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.30)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("⚽  JOGOS DA MÚLTIPLA", PAD, curY);
    curY += 18;

    const maxG = Math.min(tip.jogos.length, 5);
    for (let i = 0; i < maxG; i++) {
      const j = tip.jogos[i];
      const ROW_H = 76, rx = PAD, ry = curY, rw = W - PAD * 2;

      ctx.fillStyle = C.card;
      _drawRoundedRect(ctx, rx, ry, rw, ROW_H, 12);
      ctx.fill();
      ctx.strokeStyle = C.cardBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Blue left accent
      ctx.fillStyle = C.blue;
      _drawRoundedRect(ctx, rx, ry, 4, ROW_H, 2);
      ctx.fill();

      // Number badge
      ctx.fillStyle = "rgba(59,130,246,0.20)";
      _drawRoundedRect(ctx, rx + 12, ry + ROW_H / 2 - 14, 28, 28, 8);
      ctx.fill();
      ctx.font = "bold 13px system-ui,sans-serif";
      ctx.fillStyle = C.blueBright;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), rx + 26, ry + ROW_H / 2);

      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const textX = rx + 50;

      const p = (j.partida || "").length > 27 ? (j.partida || "").slice(0, 25) + "…" : (j.partida || "");
      ctx.font = "bold 14px system-ui,-apple-system,sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(p, textX, ry + 11);

      const m = (j.mercado || "").length > 25 ? (j.mercado || "").slice(0, 23) + "…" : (j.mercado || "");
      ctx.font = "500 12px system-ui,sans-serif";
      ctx.fillStyle = C.blueBright;
      ctx.fillText(m, textX, ry + 31);

      if (j.campeonato) {
        const c = j.campeonato.length > 27 ? j.campeonato.slice(0, 25) + "…" : j.campeonato;
        ctx.font = "400 11px system-ui,sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.35)";
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
    ctx.fillStyle = C.card;
    _drawRoundedRect(ctx, PAD, curY, W - PAD * 2, ROW_H, 12);
    ctx.fill();
    ctx.strokeStyle = C.cardBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    if (tip.campeonato) {
      ctx.font = "400 11px system-ui,sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillText(tip.campeonato, PAD + 16, curY + 12);
    }
    ctx.font = "bold 15px system-ui,sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      tip.partida.length > 34 ? tip.partida.slice(0, 32) + "…" : tip.partida,
      PAD + 16, curY + 34
    );
    curY += ROW_H + 8;
  }

  // Stake
  if (tip.stake) {
    curY += 8;
    ctx.font = "500 13px system-ui,sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.52)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("💰  Stake: " + tip.stake, W / 2, curY);
  }

  // ── FOOTER ───────────────────────────────────────────────
  const footerY = H - 82;
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, footerY);
  ctx.lineTo(W - PAD, footerY);
  ctx.stroke();

  ctx.font = "700 10.5px system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.40)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("🛡️  APOSTE COM RESPONSABILIDADE", W / 2, footerY + 10);

  ctx.font = "400 9.5px system-ui,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillText("Proibido para menores de 18 anos", W / 2, footerY + 26);

  ctx.save();
  ctx.shadowColor = "rgba(59,130,246,0.50)";
  ctx.shadowBlur = 14;
  ctx.font = "800 22px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("fluxara.app", W / 2, footerY + 48);
  ctx.restore();

  // Bottom accent line
  ctx.fillStyle = accentG;
  ctx.fillRect(0, H - 3, W, 3);

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
    image.src = "/static/images/logos/Icon-mobile-logo-vector.png";
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

// ============================================================
//  ANÁLISE POR JOGO
// ============================================================

function handleMatchAnalise(btn) {
  openMatchAnalise({
    homeId:     btn.dataset.hid,
    awayId:     btn.dataset.aid,
    homeName:   btn.dataset.hn,
    awayName:   btn.dataset.an,
    homePos:    btn.dataset.hp || "",
    awayPos:    btn.dataset.ap || "",
    homeLogo:   btn.dataset.hl || "",
    awayLogo:   btn.dataset.al || "",
    leagueLogo: btn.dataset.ll || "",
    eventId:    btn.dataset.eid || "",
    source:     btn.dataset.src || "",
    matchState: btn.dataset.state || "pre",
    scoreHome:  btn.dataset.sh ?? "",
    scoreAway:  btn.dataset.sa ?? "",
  });
}

async function openMatchAnalise({ homeId, awayId, homeName, awayName, homePos, awayPos, homeLogo, awayLogo, leagueLogo, eventId, source, matchState, scoreHome, scoreAway }) {
  const overlay = document.getElementById("matchAnaliseOverlay");
  const title   = document.getElementById("matchAnaliseTitle");
  const body    = document.getElementById("matchAnaliseBody");
  if (!overlay) return;

  const homeLgHtml = homeLogo
    ? `<img src="${escHtml(homeLogo)}" class="match-analise-header-logo" alt="" onerror="this.style.display='none'">`
    : "";
  const awayLgHtml = awayLogo
    ? `<img src="${escHtml(awayLogo)}" class="match-analise-header-logo" alt="" onerror="this.style.display='none'">`
    : "";
  const leagueLgHtml = leagueLogo
    ? `<img src="${escHtml(leagueLogo)}" class="match-analise-league-logo" alt="" onerror="this.style.display='none'">`
    : "";

  title.innerHTML = `${leagueLgHtml}${homeLgHtml}<span>${escHtml(homeName)}</span> <span class="match-analise-vs">×</span> <span>${escHtml(awayName)}</span>${awayLgHtml}`;
  body.innerHTML = `<div class="apostas-loading" style="display:flex"><div class="apostas-spinner"></div><span>Analisando histórico...</span></div>`;
  overlay.style.display = "flex";

  const league = window._activeLeague || "";
  const hp  = homePos ? `&home_pos=${encodeURIComponent(homePos)}` : "";
  const ap  = awayPos ? `&away_pos=${encodeURIComponent(awayPos)}` : "";
  const fid = (source === "apifootball" && eventId) ? `&fixture_id=${encodeURIComponent(eventId)}` : "";
  const url = `/api/apostas/analise/match?league=${encodeURIComponent(league)}&home_id=${encodeURIComponent(homeId)}&away_id=${encodeURIComponent(awayId)}${hp}${ap}${fid}`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Erro");
    body.innerHTML = renderMatchAnalise(data, homeName, awayName, homeLogo, awayLogo, matchState, scoreHome, scoreAway);
    _loadMatchCards(homeId, awayId, homeName, awayName, league, body);
    _loadMatchLineup(eventId, source, homeName, awayName, body);
  } catch (e) {
    body.innerHTML = `<div class="apostas-erro" style="display:flex"><i class="bi bi-exclamation-triangle"></i><p>${e.message}</p></div>`;
  }
}

async function _loadMatchCards(homeId, awayId, homeName, awayName, league, body) {
  const m = (league || "").match(/^football:(\d+)$/);
  if (!m) return;
  const leagueId = m[1];

  const placeholder = document.createElement("div");
  placeholder.className = "match-cards-loading";
  placeholder.innerHTML = `<div class="apostas-spinner" style="width:14px;height:14px;border-width:2px"></div>`;
  body.appendChild(placeholder);

  try {
    const url = `/api/apostas/analise/cards?league_id=${leagueId}&home_id=${encodeURIComponent(homeId)}&away_id=${encodeURIComponent(awayId)}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.available) {
      placeholder.remove();
      return;
    }

    const section = document.createElement("div");
    if (!data.home.length && !data.away.length) {
      section.innerHTML = `<div class="match-analise-section">
        <div class="match-analise-section-title">
          <i class="bi bi-square-fill" style="color:#f59e0b;font-size:.82rem;vertical-align:middle"></i>
          Cartões em Alerta
        </div>
        <div class="cards-no-alert"><i class="bi bi-check-circle"></i> Nenhum jogador com risco de suspensão por cartões</div>
      </div>`;
    } else {
      section.innerHTML = _renderCardsSection(data, homeName, awayName);
    }
    placeholder.replaceWith(section.firstElementChild);
  } catch {
    placeholder.remove();
  }
}

function _renderCardsSection(data, homeName, awayName) {
  function playerRow(p) {
    const photo = p.photo
      ? `<img src="${escHtml(p.photo)}" class="cards-player-photo" alt="" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="cards-player-photo cards-player-photo--placeholder"><i class="bi bi-person-fill"></i></div>`;

    const isDanger = p.level === "danger";
    const badgeText = isDanger
      ? `${p.yellow_red}x amarelo-vermelho`
      : `${p.yellow} amarelos — próximo = suspensão`;
    const iconColor = isDanger ? "#dc2626" : "#f59e0b";

    return `<div class="cards-player cards-alert--${p.level}">
      ${photo}
      <div class="cards-player-info">
        <span class="cards-player-name">${escHtml(p.name)}</span>
        <span class="cards-player-badge">
          <i class="bi bi-square-fill" style="color:${iconColor};font-size:.72rem"></i>
          ${escHtml(badgeText)}
        </span>
      </div>
    </div>`;
  }

  function teamSection(players, name, side) {
    if (!players.length) return "";
    return `<div class="cards-team-section">
      <div class="cards-team-label">
        ${escHtml(name)}
        <span class="cards-team-badge cards-team-badge--${side}">${side === "home" ? "Casa" : "Fora"}</span>
      </div>
      ${players.map(playerRow).join("")}
    </div>`;
  }

  return `<div class="match-analise-section">
    <div class="match-analise-section-title">
      <i class="bi bi-square-fill" style="color:#f59e0b;font-size:.82rem;vertical-align:middle"></i>
      Cartões em Alerta
    </div>
    ${teamSection(data.home, homeName, "home")}
    ${teamSection(data.away, awayName, "away")}
  </div>`;
}

async function _loadMatchLineup(eventId, source, homeName, awayName, body) {
  if (source !== "apifootball" || !eventId) return;

  const placeholder = document.createElement("div");
  placeholder.className = "lineup-loading";
  placeholder.innerHTML = `<div class="apostas-spinner" style="width:14px;height:14px;border-width:2px"></div>`;
  body.appendChild(placeholder);

  try {
    const resp = await fetch(`/api/apostas/analise/lineup?fixture_id=${encodeURIComponent(eventId)}`);
    const data = await resp.json();

    if (!data.available) {
      placeholder.remove();
      return;
    }

    const section = document.createElement("div");
    if (!data.announced) {
      section.innerHTML = `<div class="match-analise-section">
        <div class="match-analise-section-title"><i class="bi bi-person-lines-fill"></i> Escalação</div>
        <div class="lineup-not-announced"><i class="bi bi-clock"></i> Escalação ainda não divulgada</div>
      </div>`;
    } else {
      section.innerHTML = _renderLineupSection(data, homeName, awayName);
    }
    placeholder.replaceWith(section.firstElementChild);
  } catch {
    placeholder.remove();
  }
}

function _renderLineupSection(data, homeName, awayName) {
  function playerCircle(p, isSub) {
    const lastName = (p.name || "").split(" ").pop();
    const photo = p.photo
      ? `<img src="${escHtml(p.photo)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : `<i class="bi bi-person-fill" style="font-size:1rem;color:var(--text-muted)"></i>`;
    const num = p.number != null
      ? `<span class="lineup-player-num">${p.number}</span>`
      : "";
    return `<div class="lineup-player${isSub ? " lineup-player--sub" : ""}">
      <div class="lineup-player-circle">${photo}${num}</div>
      <span class="lineup-player-name">${escHtml(lastName)}</span>
    </div>`;
  }

  function pitchGrid(team) {
    if (!team || !team.starters.length) {
      return `<div class="lineup-not-announced"><i class="bi bi-question-circle"></i> Sem dados</div>`;
    }
    const rows = {};
    team.starters.forEach(p => {
      const r = p.row || 0;
      if (!rows[r]) rows[r] = [];
      rows[r].push(p);
    });
    const sortedRows = Object.keys(rows).map(Number).sort((a, b) => b - a);
    const rowsHtml = sortedRows.map(rowNum => {
      const players = rows[rowNum].slice().sort((a, b) => (a.col || 0) - (b.col || 0));
      return `<div class="lineup-row">${players.map(p => playerCircle(p, false)).join("")}</div>`;
    }).join("");
    return `<div class="lineup-pitch">${rowsHtml}</div>`;
  }

  function teamBlock(team, name) {
    const logo = team && team.logo
      ? `<img src="${escHtml(team.logo)}" class="lineup-team-logo" alt="" onerror="this.style.display='none'">`
      : "";
    const formation = team && team.formation
      ? `<span class="lineup-formation-badge">${escHtml(team.formation)}</span>`
      : "";
    const subs = (team && team.substitutes || []);
    const subsHtml = subs.length
      ? `<div class="lineup-subs">
          <div class="lineup-subs-label">Reservas</div>
          <div class="lineup-subs-list">${subs.map(p => playerCircle(p, true)).join("")}</div>
        </div>`
      : "";
    return `<div class="lineup-team">
      <div class="lineup-team-header">${logo}<span class="lineup-team-name">${escHtml(name)}</span>${formation}</div>
      ${pitchGrid(team)}
      ${subsHtml}
    </div>`;
  }

  return `<div class="match-analise-section match-lineup-section">
    <div class="match-analise-section-title"><i class="bi bi-person-lines-fill"></i> Escalação</div>
    <div class="lineup-teams">
      ${teamBlock(data.home, homeName)}
      ${teamBlock(data.away, awayName)}
    </div>
  </div>`;
}

function closeMatchAnalise() {
  const overlay = document.getElementById("matchAnaliseOverlay");
  if (overlay) overlay.style.display = "none";
}

function closeMatchAnaliseOverlay(e) {
  if (e.target === document.getElementById("matchAnaliseOverlay")) closeMatchAnalise();
}

function renderMatchAnalise(d, homeName, awayName, homeLogo, awayLogo, matchState, scoreHome, scoreAway) {
  const noData = `<span class="match-analise-nodata">Sem dados suficientes</span>`;

  function teamBlock(team, label, logoUrl) {
    const logoHtml = logoUrl
      ? `<img src="${escHtml(logoUrl)}" class="match-analise-team-logo" alt="" onerror="this.style.display='none'">`
      : "";
    if (!team.found || !team.stats) {
      return `<div class="match-analise-team-block">
        <div class="match-analise-team-title">${logoHtml}${escHtml(label)}</div>
        ${noData}
      </div>`;
    }
    const s = team.stats;
    const sideLabel = team.side === "home" ? "Casa" : "Fora";
    const recentHtml = s.recent.map(r =>
      `<span class="match-form-badge match-form-badge--${r.result.toLowerCase()}" title="${r.score} (${r.date})">${r.result}</span>`
    ).join("");

    return `<div class="match-analise-team-block">
      <div class="match-analise-team-title">
        ${logoHtml}
        ${escHtml(team.name || label)}
        <span class="match-analise-side-badge">${sideLabel}</span>
      </div>
      <div class="match-form-row">${recentHtml || noData}</div>
      <div class="match-analise-grid">
        <div class="match-analise-stat">
          <span class="match-analise-val">${s.win_pct}%</span>
          <span class="match-analise-lbl">Vitórias</span>
        </div>
        <div class="match-analise-stat">
          <span class="match-analise-val">${s.goals_for_avg}</span>
          <span class="match-analise-lbl">Gols/jogo</span>
        </div>
        <div class="match-analise-stat">
          <span class="match-analise-val">${s.goals_ag_avg}</span>
          <span class="match-analise-lbl">Sofridos/jogo</span>
        </div>
        <div class="match-analise-stat">
          <span class="match-analise-val">${s.btts_pct}%</span>
          <span class="match-analise-lbl">Ambas marcam</span>
        </div>
        <div class="match-analise-stat">
          <span class="match-analise-val">${s.over25_pct}%</span>
          <span class="match-analise-lbl">Over 2.5</span>
        </div>
        <div class="match-analise-stat">
          <span class="match-analise-val">${s.cs_pct}%</span>
          <span class="match-analise-lbl">Clean sheet</span>
        </div>
      </div>
      <div class="match-analise-sub">${s.matches} jogos analisados</div>
    </div>`;
  }

  function h2hBlock(h2h) {
    if (!h2h.total) {
      return `<div class="match-analise-section">
        <div class="match-analise-section-title">Confrontos Diretos</div>
        ${noData}
      </div>`;
    }
    const rowsHtml = h2h.matches.map(m =>
      `<div class="h2h-row">
        <span class="h2h-date">${m.date}</span>
        <span class="h2h-home">${escHtml(m.home_name)}</span>
        <span class="h2h-score">${m.score}</span>
        <span class="h2h-away">${escHtml(m.away_name)}</span>
      </div>`
    ).join("");

    return `<div class="match-analise-section">
      <div class="match-analise-section-title">Confrontos Diretos (${h2h.total} encontrados)</div>
      <div class="h2h-summary">
        <span class="h2h-summary-item h2h-home-col">${escHtml(homeName)} <strong>${h2h.home_wins}</strong></span>
        <span class="h2h-summary-item">Empates <strong>${h2h.draws}</strong></span>
        <span class="h2h-summary-item h2h-away-col"><strong>${h2h.away_wins}</strong> ${escHtml(awayName)}</span>
      </div>
      <div class="h2h-list">${rowsHtml}</div>
    </div>`;
  }

  const sourceBadge = d.source === "espn"
    ? `<span class="analise-source-badge analise-source-badge--espn"><i class="bi bi-clock-history"></i> 90 dias</span>`
    : d.source === "apifootball"
    ? `<span class="analise-source-badge analise-source-badge--full"><i class="bi bi-check-circle-fill"></i> Temporada</span>`
    : "";

  function predBlock(pred) {
    if (!pred || !pred.has_data) return "";
    const p = pred.probabilities;
    const g = pred.goals;

    const bar = `
      <div class="match-pred-bar">
        <div class="match-pred-seg match-pred-seg--home" style="width:${p.home_win}%" title="${escHtml(homeName)}: ${p.home_win}%"></div>
        <div class="match-pred-seg match-pred-seg--draw"  style="width:${p.draw}%"      title="Empate: ${p.draw}%"></div>
        <div class="match-pred-seg match-pred-seg--away" style="width:${p.away_win}%" title="${escHtml(awayName)}: ${p.away_win}%"></div>
      </div>
      <div class="match-pred-labels">
        <span class="match-pred-lbl match-pred-lbl--home"><i class="bi bi-house-fill"></i> ${escHtml(homeName)} <strong>${p.home_win}%</strong></span>
        <span class="match-pred-lbl match-pred-lbl--draw">Empate <strong>${p.draw}%</strong></span>
        <span class="match-pred-lbl match-pred-lbl--away"><strong>${p.away_win}%</strong> ${escHtml(awayName)} <i class="bi bi-airplane-fill"></i></span>
      </div>`;

    const _chipCls = pct => pct >= 55 ? " match-pred-chip--high" : pct < 45 ? " match-pred-chip--low" : "";

    const goalChips = [];
    if (g.expected != null) {
      goalChips.push(`<div class="match-pred-chip"><span class="match-pred-chip-val">${g.expected}</span><span class="match-pred-chip-lbl">Gols esperados</span></div>`);
    }
    if (g.over_25_pct != null) {
      goalChips.push(`<div class="match-pred-chip${_chipCls(g.over_25_pct)}"><span class="match-pred-chip-val">${g.over_25_pct}%</span><span class="match-pred-chip-lbl">Over 2.5</span></div>`);
    }
    if (g.over_15_pct != null) {
      goalChips.push(`<div class="match-pred-chip${_chipCls(g.over_15_pct)}"><span class="match-pred-chip-val">${g.over_15_pct}%</span><span class="match-pred-chip-lbl">Over 1.5</span></div>`);
    }
    if (g.btts_pct != null) {
      const bttsSim    = g.btts_pct >= 50;
      const bttsDisplay = bttsSim ? g.btts_pct : +(100 - g.btts_pct).toFixed(1);
      // Só destaca como palpite quando predição é "sim" com ≥55% — "não" tem acurácia negativa
      const bttsChipCls = (bttsSim && g.btts_pct >= 55) ? " match-pred-chip--high"
                        : (!bttsSim) ? " match-pred-chip--low"
                        : "";
      goalChips.push(`<div class="match-pred-chip${bttsChipCls}"><span class="match-pred-chip-val">${bttsDisplay}%</span><span class="match-pred-chip-lbl">Ambas marcam: ${bttsSim ? "sim" : "não"}</span></div>`);
    }

    const narrativesHtml = (pred.narratives || []).length
      ? `<ul class="match-pred-narratives">${pred.narratives.map(n => `<li><i class="bi bi-arrow-right-short"></i>${escHtml(n)}</li>`).join("")}</ul>`
      : "";

    const oddsTag = pred.odds_available
      ? `<span class="pred-odds-tag pred-odds-tag--live"><i class="bi bi-lightning-charge-fill"></i> Com odds reais</span>`
      : `<span class="pred-odds-tag pred-odds-tag--stats"><i class="bi bi-bar-chart-fill"></i> Modelo estatístico</span>`;

    return `
      <div class="match-pred-block">
        <div class="match-pred-title"><i class="bi bi-graph-up-arrow"></i> Cenário Provável ${oddsTag}</div>
        ${bar}
        ${goalChips.length ? `<div class="match-pred-goals">${goalChips.join("")}</div>` : ""}
        ${narrativesHtml}
      </div>`;
  }

  const verificationBlock = (matchState === "post" && scoreHome !== "" && scoreAway !== "")
    ? _buildResultVerification(d, homeName, awayName, parseInt(scoreHome, 10), parseInt(scoreAway, 10))
    : "";

  return `
    ${verificationBlock}
    <div class="match-analise-source-row">${sourceBadge}</div>
    ${predBlock(d.prediction)}
    <div class="match-analise-teams">
      ${teamBlock(d.home, homeName, homeLogo)}
      ${teamBlock(d.away, awayName, awayLogo)}
    </div>
    ${h2hBlock(d.h2h)}
  `;
}

function _buildResultVerification(d, homeName, awayName, homeGoals, awayGoals) {
  if (isNaN(homeGoals) || isNaN(awayGoals)) return "";

  const scoreLabel = `${homeGoals} – ${awayGoals}`;
  const pred       = d.prediction;

  if (!pred || !pred.has_data || !pred.probabilities) {
    return `
      <div class="analise-verify-block">
        <div class="analise-verify-header">
          <i class="bi bi-clipboard-check-fill"></i>
          Verificação &nbsp;<span class="analise-verify-score">${scoreLabel}</span>
        </div>
        <div class="analise-verify-empty">Sem previsão disponível para este jogo</div>
      </div>`;
  }

  const totalGoals    = homeGoals + awayGoals;
  const btts          = homeGoals > 0 && awayGoals > 0;
  const actualOutcome = homeGoals > awayGoals ? "home"
    : awayGoals > homeGoals ? "away"
    : "draw";

  const checks = [];
  const p      = pred.probabilities;
  const g      = pred.goals;

  // Resultado — always verify; use the highest-probability outcome from the bar
  const predictedOutcome = (p.home_win >= p.draw && p.home_win >= p.away_win) ? "home"
    : (p.away_win >= p.draw && p.away_win >= p.home_win) ? "away"
    : "draw";
  const outcomeLabels = {
    home: `${escHtml(homeName)} vence`,
    away: `${escHtml(awayName)} vence`,
    draw: "Empate",
  };
  const resultPct = Math.round({ home: p.home_win, away: p.away_win, draw: p.draw }[predictedOutcome] ?? 0);
  checks.push({
    label:  `Resultado: ${outcomeLabels[predictedOutcome]}`,
    pct:    resultPct,
    hit:    predictedOutcome === actualOutcome,
    detail: `${homeGoals}–${awayGoals}`,
  });

  // Only verify goal markets that were highlighted as palpites in the chips (≥55% confidence)
  const goalsDetail = `${totalGoals} gol${totalGoals !== 1 ? "s" : ""} no total`;

  // Over 2.5 (3+ goals) — only a palpite when chip was highlighted, never show "Over 2.5: não"
  if (g && g.over_25_pct != null && g.over_25_pct >= 55) {
    checks.push({
      label:  "Over 2.5 gols: sim",
      pct:    g.over_25_pct,
      hit:    totalGoals > 2,
      detail: goalsDetail,
    });
  }

  // Over 1.5 (2+ goals) — only when chip was highlighted
  if (g && g.over_15_pct != null && g.over_15_pct >= 55) {
    checks.push({
      label:  "Over 1.5 gols: sim",
      pct:    g.over_15_pct,
      hit:    totalGoals > 1,
      detail: goalsDetail,
    });
  }

  // Ambas marcam: só verifica quando palpite é "sim" (≥55%) — "não" tem acurácia negativa
  if (g && g.btts_pct != null && g.btts_pct >= 55) {
    checks.push({
      label:  "Ambas marcam: sim",
      pct:    g.btts_pct,
      hit:    btts,
      detail: btts ? "Ambas marcaram" : "Ao menos um time não marcou",
    });
  }

  const rows = checks.map(c => `
    <div class="analise-verify-row">
      <span class="analise-verify-icon ${c.hit ? 'analise-verify-icon--hit' : 'analise-verify-icon--miss'}">
        <i class="bi ${c.hit ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}"></i>
      </span>
      <div class="analise-verify-content">
        <span class="analise-verify-label">${c.label} <span class="analise-verify-pct">${c.pct}%</span></span>
        <span class="analise-verify-detail">${c.detail}</span>
      </div>
    </div>`).join("");

  const hits = checks.filter(c => c.hit).length;

  return `
    <div class="analise-verify-block">
      <div class="analise-verify-header">
        <i class="bi bi-clipboard-check-fill"></i>
        Verificação &nbsp;<span class="analise-verify-score">${scoreLabel}</span>
        <span class="analise-verify-summary">${hits}/${checks.length} corretos</span>
      </div>
      ${rows}
    </div>`;
}

// ============================================================
//  ANÁLISE HISTÓRICA (por liga)
// ============================================================

window._analiseLeaguesLoaded = false;
window._activeAnaliseLeague  = null;

async function loadAnaliseLeagues() {
  const sel = document.getElementById("analiseLeagueSelect");
  window._lgSelects?.analiseLeagueSelect?.setLoading();
  try {
    const resp = await fetch("/api/apostas/analise/leagues");
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const list = await resp.json();

    const byCategory = {};
    list.forEach(lg => {
      if (!byCategory[lg.category]) byCategory[lg.category] = [];
      byCategory[lg.category].push(lg);
    });

    sel.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = "Selecione um campeonato";
    sel.appendChild(placeholder);

    const groups = Object.entries(byCategory).map(([label, rawItems]) => ({
      label,
      items: rawItems.map(lg => ({
        value: String(lg.id),
        name:  lg.name,
        flag:  _lgsFlag(`football:${lg.id}`, lg.category),
        logo:  `https://media.api-sports.io/football/leagues/${lg.id}.png`,
      })),
    }));

    groups.forEach(({ label, items }) => {
      const grp = document.createElement("optgroup");
      grp.label = label;
      items.forEach(it => {
        const opt = document.createElement("option");
        opt.value = it.value;
        opt.textContent = it.name;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    });

    window._lgSelects?.analiseLeagueSelect?.populate(groups, '');
    window._analiseLeaguesLoaded = true;
  } catch (e) {
    sel.innerHTML = '<option value="" disabled selected>Erro ao carregar</option>';
    window._lgSelects?.analiseLeagueSelect?.setError();
  }
}

function onAnaliseLeagueChange() {
  const sel = document.getElementById("analiseLeagueSelect");
  const id = parseInt(sel.value, 10);
  if (!id) return;
  window._activeAnaliseLeague = id;
  loadAnalise(id);
}

async function loadAnalise(leagueId) {
  const loading = document.getElementById("analiseLoading");
  const content = document.getElementById("analiseContent");
  const vazio   = document.getElementById("analiseVazio");
  const erro    = document.getElementById("analiseErro");

  loading.style.display = "flex";
  content.style.display = "none";
  vazio.style.display   = "none";
  erro.style.display    = "none";

  try {
    const resp = await fetch(`/api/apostas/analise/${leagueId}`);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const data = await resp.json();

    loading.style.display = "none";

    if (!data.total) {
      vazio.style.display = "flex";
      return;
    }

    content.innerHTML = renderAnalise(data);
    content.style.display = "block";
  } catch (e) {
    loading.style.display = "none";
    document.getElementById("analiseErroMsg").textContent = "Erro ao carregar análise.";
    erro.style.display = "flex";
  }
}

function _computeBestBets(d) {
  const candidates = [];
  const o15 = d.over['1.5']?.pct ?? 0;
  const o25 = d.over['2.5']?.pct ?? 0;
  const o35 = d.over['3.5']?.pct ?? 0;

  if (d.home_wins.pct >= 50)
    candidates.push({ tip: 'Vitória do mandante', pct: d.home_wins.pct, icon: 'bi-house-fill', market: 'Resultado' });
  if (d.away_wins.pct >= 45)
    candidates.push({ tip: 'Vitória do visitante', pct: d.away_wins.pct, icon: 'bi-airplane-fill', market: 'Resultado' });
  if (d.draws.pct >= 32)
    candidates.push({ tip: 'Empate provável', pct: d.draws.pct, icon: 'bi-dash-circle-fill', market: 'Resultado' });

  if (d.btts.pct >= 55)
    candidates.push({ tip: 'Ambas as equipes marcam', pct: d.btts.pct, icon: 'bi-crosshair2', market: 'Ambas Marcam' });
  if (d.btts.pct <= 38)
    candidates.push({ tip: 'Ao menos um time não marca', pct: 100 - d.btts.pct, icon: 'bi-shield-check', market: 'Ambas Marcam' });

  if (o15 >= 82)
    candidates.push({ tip: 'Over 1.5 gols (muito seguro)', pct: o15, icon: 'bi-check-circle-fill', market: 'Gols' });
  if (o25 >= 62)
    candidates.push({ tip: 'Over 2.5 gols', pct: o25, icon: 'bi-lightning-fill', market: 'Gols' });
  if (o25 <= 38)
    candidates.push({ tip: 'Under 2.5 gols', pct: 100 - o25, icon: 'bi-lock-fill', market: 'Gols' });
  if (o35 >= 48)
    candidates.push({ tip: 'Over 3.5 gols (jogo aberto)', pct: o35, icon: 'bi-fire', market: 'Gols' });

  if (d.cs_home.pct >= 42 && d.home_wins.pct >= 48)
    candidates.push({ tip: 'Mandante vence sem sofrer gol', pct: Math.round((d.cs_home.pct + d.home_wins.pct) / 2), icon: 'bi-house-door-fill', market: 'Resultado' });
  if (d.cs_away.pct >= 38 && d.away_wins.pct >= 42)
    candidates.push({ tip: 'Visitante vence sem sofrer gol', pct: Math.round((d.cs_away.pct + d.away_wins.pct) / 2), icon: 'bi-shield-shaded', market: 'Resultado' });

  candidates.sort((a, b) => b.pct - a.pct);
  const seen = new Set();
  return candidates.filter(c => {
    if (seen.has(c.market)) return false;
    seen.add(c.market);
    return true;
  }).slice(0, 3);
}

function _renderPalpites(d) {
  const bets = _computeBestBets(d);
  if (!bets.length) return '';

  const cards = bets.map(b => {
    const tier = b.pct >= 68 ? 'high' : b.pct >= 54 ? 'mid' : 'low';
    const label = b.pct >= 68 ? 'Alta confiança' : b.pct >= 54 ? 'Média confiança' : 'Confiança moderada';
    return `
      <div class="analise-palpite analise-palpite--${tier}">
        <div class="analise-palpite-icon"><i class="bi ${b.icon}"></i></div>
        <div class="analise-palpite-body">
          <span class="analise-palpite-tip">${escHtml(b.tip)}</span>
          <span class="analise-palpite-market">${escHtml(b.market)}</span>
        </div>
        <div class="analise-palpite-right">
          <span class="analise-palpite-pct">${b.pct}%</span>
          <span class="analise-palpite-conf">${label}</span>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="analise-palpites-block">
      <div class="analise-palpites-header">
        <i class="bi bi-stars"></i> Palpites de Maior Assertividade
      </div>
      ${cards}
      <p class="analise-palpites-note">Baseado no histórico da temporada. Não é garantia de resultado.</p>
    </div>`;
}

function renderAnalise(d) {
  const resultBar = `
    <div class="analise-result-bar">
      <div class="analise-result-seg analise-result-home" style="width:${d.home_wins.pct}%" title="Casa ${d.home_wins.pct}%"></div>
      <div class="analise-result-seg analise-result-draw" style="width:${d.draws.pct}%"     title="Empate ${d.draws.pct}%"></div>
      <div class="analise-result-seg analise-result-away" style="width:${d.away_wins.pct}%" title="Fora ${d.away_wins.pct}%"></div>
    </div>
    <div class="analise-result-labels">
      <span class="analise-result-label analise-result-label--home">
        <i class="bi bi-house-fill"></i> Casa <strong>${d.home_wins.pct}%</strong>
      </span>
      <span class="analise-result-label analise-result-label--draw">
        X Empate <strong>${d.draws.pct}%</strong>
      </span>
      <span class="analise-result-label analise-result-label--away">
        <i class="bi bi-airplane-fill"></i> Fora <strong>${d.away_wins.pct}%</strong>
      </span>
    </div>`;

  const overRows = ["0.5","1.5","2.5","3.5","4.5"].map(t => {
    const o = d.over[t];
    const color = o.pct >= 70 ? "var(--success-color)" : o.pct >= 50 ? "var(--primary)" : "var(--text-muted)";
    return `
      <div class="analise-over-row">
        <span class="analise-over-label">Over ${t}</span>
        <div class="analise-over-bar-wrap">
          <div class="analise-over-bar" style="width:${o.pct}%;background:${color}"></div>
        </div>
        <span class="analise-over-pct" style="color:${color}">${o.pct}%</span>
        <span class="analise-over-count">${o.count}/${d.total}</span>
      </div>`;
  }).join("");

  const sourceBadge = d.source === "espn"
    ? `<span class="analise-source-badge analise-source-badge--espn" title="Dados dos últimos 90 dias via ESPN"><i class="bi bi-clock-history"></i> Recente</span>`
    : `<span class="analise-source-badge analise-source-badge--full" title="Temporada completa via API-Football"><i class="bi bi-check-circle-fill"></i> Temporada</span>`;

  return `
    <div class="analise-header">
      <span class="analise-league-name">${d.league_name}</span>
      <span class="analise-season-badge">${d.season}</span>
      <span class="analise-total-badge">${d.total} jogos</span>
      ${sourceBadge}
    </div>

    ${_renderPalpites(d)}

    <div class="analise-section">
      <div class="analise-section-title">Resultado Final</div>
      ${resultBar}
    </div>

    <div class="analise-stats-grid">
      <div class="analise-stat-card">
        <span class="analise-stat-value">${d.avg_goals}</span>
        <span class="analise-stat-label">Média de gols</span>
      </div>
      <div class="analise-stat-card">
        <span class="analise-stat-value analise-stat--green">${d.btts.pct}%</span>
        <span class="analise-stat-label">Ambas marcam</span>
      </div>
      <div class="analise-stat-card">
        <span class="analise-stat-value">${d.cs_home.pct}%</span>
        <span class="analise-stat-label">CS Casa</span>
      </div>
      <div class="analise-stat-card">
        <span class="analise-stat-value">${d.cs_away.pct}%</span>
        <span class="analise-stat-label">CS Fora</span>
      </div>
    </div>

    <div class="analise-section">
      <div class="analise-section-title">Over / Under (total de gols)</div>
      <div class="analise-over-list">${overRows}</div>
    </div>`;
}

// ============================================================
// Registrar Aposta modal
// ============================================================

let _registrarContas      = null;
let _registrarCatsDespesa = null;
let _registrarCatsReceita = null;

const _INST_MAP = {
  nubank:      { cor: "#8A05BE", letra: "N", svg: "nubank.svg" },
  itau:        { cor: "#EC7000", letra: "I", svg: "itau.svg" },
  bradesco:    { cor: "#CC092F", letra: "B", svg: "bradesco.svg" },
  bb:          { cor: "#F9D600", letra: "B", corLetra: "#000", svg: "banco-do-brasil.svg" },
  caixa:       { cor: "#006CA8", letra: "C", svg: "caixa.svg" },
  "caixa-tem": { cor: "#006CA8", letra: "C", svg: "caixa-tem.svg" },
  santander:   { cor: "#EC0000", letra: "S", svg: "santander.svg" },
  inter:       { cor: "#FF7A00", letra: "I", svg: "inter.svg" },
  c6:          { cor: "#242424", letra: "C", svg: "c6.svg" },
  picpay:      { cor: "#11C76F", letra: "P", svg: "picpay.svg" },
  mercadopago: { cor: "#009EE3", letra: "M", svg: "mercado-pago.svg" },
  xp:          { cor: "#000000", letra: "X", svg: "xp.svg" },
  btg:         { cor: "#003399", letra: "B", svg: "btg-pactual.svg" },
  sicoob:      { cor: "#007A3D", letra: "S" },
  sicredi:     { cor: "#006633", letra: "S", svg: "sicredi.svg" },
  neon:        { cor: "#00CFFF", letra: "N", corLetra: "#000", svg: "neon.svg" },
  next:        { cor: "#00CC99", letra: "N", corLetra: "#000", svg: "next.svg" },
  wise:        { cor: "#9FE870", letra: "W", corLetra: "#000" },
  paypal:      { cor: "#003087", letra: "P", svg: "paypal.svg" },
  iti:         { cor: "#FF6600", letra: "i", svg: "iti.svg" },
  will:        { cor: "#FFCC00", letra: "W", corLetra: "#000", svg: "will-bank.svg" },
  bs2:         { cor: "#0066CC", letra: "B" },
  original:    { cor: "#00A650", letra: "O", svg: "original.svg" },
  sofisa:      { cor: "#E2001A", letra: "S", svg: "sofisa.svg" },
  banrisul:    { cor: "#005CA9", letra: "B", svg: "banrisul.svg" },
  bv:          { cor: "#004B8D", letra: "B", svg: "bv.svg" },
  bmg:         { cor: "#E30613", letra: "B", svg: "bmg.svg" },
  pan:         { cor: "#FFD100", letra: "P", corLetra: "#000", svg: "pan.svg" },
  daycoval:    { cor: "#005A9E", letra: "D", svg: "daycoval.svg" },
  mercantil:   { cor: "#004A9F", letra: "M", svg: "mercantil.svg" },
  digio:       { cor: "#0077CC", letra: "D", svg: "digio.svg" },
  stone:       { cor: "#00A868", letra: "S", svg: "stone.svg" },
  pagseguro:   { cor: "#FFC72C", letra: "P", corLetra: "#000", svg: "pagseguro.svg" },
  "nu-invest": { cor: "#8A05BE", letra: "N", svg: "nu-invest.svg" },
  nomad:       { cor: "#1A1A2E", letra: "N", svg: "nomad.svg" },
  zrobank:     { cor: "#0055B8", letra: "Z", svg: "zrobank.svg" },
  n26:         { cor: "#000000", letra: "N", svg: "n26.svg" },
  warren:      { cor: "#4C12A1", letra: "W", svg: "warren.svg" },
  toro:        { cor: "#FF6B00", letra: "T", svg: "toro.svg" },
  clear:       { cor: "#00C4B3", letra: "C", svg: "clear.svg" },
  rico:        { cor: "#00B386", letra: "R", svg: "rico.svg" },
  genial:      { cor: "#FF6600", letra: "G", svg: "genial-investimentos.svg" },
  avenue:      { cor: "#0033A0", letra: "A", svg: "avenue.svg" },
  ame:         { cor: "#FF0064", letra: "A", svg: "ame.svg" },
  amazon:      { cor: "#FF9900", letra: "A", corLetra: "#000", svg: "amazon.svg" },
  magalu:      { cor: "#0086FF", letra: "M", svg: "magalu.svg" },
  samsung:     { cor: "#1428A0", letra: "S", svg: "samsung.svg" },
  infinitepay: { cor: "#00BCD4", letra: "I", svg: "infinitepay.svg" },
  ton:         { cor: "#00C853", letra: "T", svg: "ton.svg" },
  fitbank:     { cor: "#1A237E", letra: "F", svg: "fitbank.svg" },
  cora:        { cor: "#FF4C8B", letra: "C", svg: "cora.svg" },
  dm:          { cor: "#004B87", letra: "D", svg: "dm.svg" },
  flash:       { cor: "#F24E1E", letra: "F", svg: "flash.svg" },
  caju:        { cor: "#FF6B35", letra: "C", svg: "caju.svg" },
  binance:     { cor: "#F3BA2F", letra: "B", corLetra: "#000", svg: "binance.svg" },
  metamask:    { cor: "#E2761B", letra: "M", svg: "metamask.svg" },
  bitybank:    { cor: "#0066FF", letra: "B", svg: "bitybank.svg" },
  outro:       { cor: "#64748b", icone: "bi-wallet2", corLetra: "#fff" },
};

function _buildContaLogoHtml(inst, size) {
  size = size || 28;
  const base = `width:${size}px;height:${size}px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;`;
  if (inst && inst.svg) {
    return `<div style="background:#f8fafc;${base}"><img src="/static/images/bank-icons-logos-svg/${inst.svg}" alt="" style="width:65%;height:65%;object-fit:contain"></div>`;
  }
  const bg  = (inst && inst.cor)     || "#64748b";
  const fg  = (inst && inst.corLetra) || "#fff";
  const fsz = Math.round(size * 0.52) + "px";
  if (inst && inst.icone) {
    return `<div style="background:${bg};color:${fg};${base}"><i class="bi ${inst.icone}" style="font-size:${fsz}"></i></div>`;
  }
  return `<div style="background:${bg};color:${fg};${base};font-size:${fsz};font-weight:700;">${(inst && inst.letra) || "?"}</div>`;
}

function openRegistrarAposta(btn) {
  const tipId  = btn.dataset.tid;
  const titulo = btn.dataset.titulo;
  const odd    = parseFloat(btn.dataset.odd) || 0;

  document.getElementById("registrarTipId").value  = tipId;
  document.getElementById("registrarOdd").value    = odd;
  document.getElementById("registrarValor").value  = "";
  document.getElementById("registrarRetorno").textContent = "—";
  document.getElementById("registrarApostaError").style.display = "none";
  document.getElementById("registrarContaId").value = "";
  document.getElementById("registrarContaSelected").innerHTML =
    `<span class="registrar-conta-placeholder">Selecione a conta...</span>`;
  _closeRegistrarContaDropdown();

  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, "0");
  const dd    = String(today.getDate()).padStart(2, "0");
  document.getElementById("registrarData").value = `${yyyy}-${mm}-${dd}`;

  document.getElementById("registrarTipInfo").innerHTML =
    `<div class="registrar-tip-title">${titulo}</div>` +
    `<div class="registrar-tip-odd">Odd total: <strong>${odd.toFixed(2)}</strong></div>`;

  document.getElementById("registrarApostaOverlay").style.display = "flex";
  document.addEventListener("click", _handleRegistrarContaOutsideClick);

  Promise.all([_loadRegistrarContas(), _loadRegistrarCats()]);
}

function closeRegistrarAposta() {
  document.getElementById("registrarApostaOverlay").style.display = "none";
  _closeRegistrarContaDropdown();
  document.removeEventListener("click", _handleRegistrarContaOutsideClick);
}

function closeRegistrarApostaOverlay(e) {
  if (e.target === document.getElementById("registrarApostaOverlay")) closeRegistrarAposta();
}

function toggleRegistrarContaDropdown(e) {
  e && e.stopPropagation();
  const dd      = document.getElementById("registrarContaDropdown");
  const chevron = document.getElementById("registrarContaChevron");
  const open    = dd.style.display !== "none" && dd.style.display !== "";
  if (open) {
    dd.style.display = "none";
    if (chevron) chevron.style.transform = "";
  } else {
    dd.style.display = "block";
    if (chevron) chevron.style.transform = "rotate(180deg)";
  }
}

function _closeRegistrarContaDropdown() {
  const dd      = document.getElementById("registrarContaDropdown");
  const chevron = document.getElementById("registrarContaChevron");
  if (dd) dd.style.display = "none";
  if (chevron) chevron.style.transform = "";
}

function _handleRegistrarContaOutsideClick(e) {
  const picker = document.getElementById("registrarContaPicker");
  if (picker && !picker.contains(e.target)) {
    _closeRegistrarContaDropdown();
  }
}

function _selectRegistrarConta(id, nome, inst) {
  document.getElementById("registrarContaId").value = id;
  const logo = _buildContaLogoHtml(inst, 24);
  document.getElementById("registrarContaSelected").innerHTML =
    `<div style="display:flex;align-items:center;gap:8px;">${logo}<span>${escHtml(nome)}</span></div>`;
  _closeRegistrarContaDropdown();
}

function calcRegistrarRetorno() {
  const valor   = parseFloat(document.getElementById("registrarValor").value) || 0;
  const odd     = parseFloat(document.getElementById("registrarOdd").value) || 0;
  const retorno = odd > 0 ? valor * odd : 0;
  const el      = document.getElementById("registrarRetorno");
  el.textContent = retorno > 0
    ? `R$ ${retorno.toFixed(2).replace(".", ",")}`
    : "—";
}

async function _loadRegistrarContas() {
  if (_registrarContas) { _populateRegistrarContas(_registrarContas); return; }
  try {
    const resp = await fetch("/api/contas");
    if (!resp.ok) return;
    _registrarContas = await resp.json();
    _populateRegistrarContas(_registrarContas);
  } catch {}
}

function _populateRegistrarContas(contas) {
  const dropdown = document.getElementById("registrarContaDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = "";
  (contas || []).forEach(c => {
    const inst = _INST_MAP[c.instituicao] || _INST_MAP.outro;
    const logo = _buildContaLogoHtml(inst, 28);
    const item = document.createElement("div");
    item.className = "registrar-conta-item";
    item.innerHTML = logo + `<span class="registrar-conta-nome">${escHtml(c.nome)}</span>`;
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      _selectRegistrarConta(c.id, c.nome, inst);
    });
    dropdown.appendChild(item);
  });
}

async function _loadRegistrarCats() {
  if (!_registrarCatsDespesa || !_registrarCatsReceita) {
    const [rD, rR] = await Promise.all([
      fetch("/api/config/categorias?tipo=despesa"),
      fetch("/api/config/categorias?tipo=receita"),
    ]);
    if (rD.ok) _registrarCatsDespesa = await rD.json();
    if (rR.ok) _registrarCatsReceita = await rR.json();
  }
  _populateRegistrarCatSelect("registrarCategoriaDespesa", "registrarSubcategoriaDespesa", _registrarCatsDespesa || []);
  _autoSelectRegistrarCat("registrarCategoriaDespesa", "registrarSubcategoriaDespesa", "apostas", "stake");

  _populateRegistrarCatSelect("registrarCategoriaReceita", "registrarSubcategoriaReceita", _registrarCatsReceita || []);
  _autoSelectRegistrarCat("registrarCategoriaReceita", "registrarSubcategoriaReceita", "apostas esportivas", "aposta ganhadora");
}

function _populateRegistrarCatSelect(catSelId, subSelId, cats) {
  const catSel = document.getElementById(catSelId);
  catSel.innerHTML = '<option value="">Sem categoria</option>';
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.nome;
    opt.dataset.subs = JSON.stringify(c.subcategorias || []);
    catSel.appendChild(opt);
  });
  _updateRegistrarSubs(catSelId, subSelId);
}

function _autoSelectRegistrarCat(catSelId, subSelId, catName, subName) {
  const catSel = document.getElementById(catSelId);
  if (!catSel) return;
  const catOpt = Array.from(catSel.options).find(
    o => o.textContent.trim().toLowerCase() === catName.toLowerCase()
  );
  if (!catOpt) return;
  catSel.value = catOpt.value;
  _updateRegistrarSubs(catSelId, subSelId);
  if (!subName) return;
  const subSel = document.getElementById(subSelId);
  if (!subSel) return;
  const subOpt = Array.from(subSel.options).find(
    o => o.textContent.trim().toLowerCase() === subName.toLowerCase()
  );
  if (subOpt) subSel.value = subOpt.value;
}

function _updateRegistrarSubs(catSelId, subSelId) {
  const catSel   = document.getElementById(catSelId);
  const subSel   = document.getElementById(subSelId);
  const selected = catSel.options[catSel.selectedIndex];
  subSel.innerHTML = '<option value="">—</option>';
  if (!selected || !selected.value) return;
  const subs = JSON.parse(selected.dataset.subs || "[]");
  subs.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.nome;
    subSel.appendChild(opt);
  });
}

function onRegistrarCategoriaDespesaChange() {
  _updateRegistrarSubs("registrarCategoriaDespesa", "registrarSubcategoriaDespesa");
}

function onRegistrarCategoriaReceitaChange() {
  _updateRegistrarSubs("registrarCategoriaReceita", "registrarSubcategoriaReceita");
}

async function submitRegistrarAposta() {
  const tipId    = document.getElementById("registrarTipId").value;
  const contaId  = document.getElementById("registrarContaId").value;
  const valor    = parseFloat(document.getElementById("registrarValor").value) || 0;
  const catD     = document.getElementById("registrarCategoriaDespesa").value || null;
  const subD     = document.getElementById("registrarSubcategoriaDespesa").value || null;
  const catR     = document.getElementById("registrarCategoriaReceita").value || null;
  const subR     = document.getElementById("registrarSubcategoriaReceita").value || null;
  const data     = document.getElementById("registrarData").value;

  const errEl = document.getElementById("registrarApostaError");
  errEl.style.display = "none";

  if (!contaId) { errEl.textContent = "Selecione a conta"; errEl.style.display = "block"; return; }
  if (!valor || valor <= 0) { errEl.textContent = "Informe o valor apostado"; errEl.style.display = "block"; return; }

  const btn = document.getElementById("registrarSubmitBtn");
  btn.disabled = true;

  try {
    const resp = await fetch("/api/apostas/registrar-aposta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tip_id:                  parseInt(tipId),
        conta_id:                parseInt(contaId),
        valor_apostado:          valor,
        categoria_despesa_id:    catD ? parseInt(catD) : null,
        subcategoria_despesa_id: subD ? parseInt(subD) : null,
        categoria_receita_id:    catR ? parseInt(catR) : null,
        subcategoria_receita_id: subR ? parseInt(subR) : null,
        data_vencimento:         data || null,
      }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      errEl.textContent = json.error || "Erro ao registrar";
      errEl.style.display = "block";
      return;
    }
    closeRegistrarAposta();
    _showRegistrarSuccessToast(json);
  } catch {
    errEl.textContent = "Erro de conexão";
    errEl.style.display = "block";
  } finally {
    btn.disabled = false;
  }
}

function _showRegistrarSuccessToast(data) {
  const valor   = (data.valor_apostado   || 0).toFixed(2).replace(".", ",");
  const retorno = (data.retorno_potencial || 0).toFixed(2).replace(".", ",");
  const toast   = document.createElement("div");
  toast.className = "registrar-success-toast";
  toast.innerHTML =
    `<i class="bi bi-check-circle-fill"></i>` +
    `<div><strong>Aposta registrada!</strong>` +
    `<span>Despesa R$ ${valor} · Retorno pendente R$ ${retorno}</span></div>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("registrar-success-toast--show"));
  setTimeout(() => {
    toast.classList.remove("registrar-success-toast--show");
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

// ============================================================
//  DEBUG ASSERTIVIDADE (admin only)
// ============================================================

async function runDebugAssertividade() {
  if (!window.APOSTAS_IS_ADMIN) return;
  const btn    = document.getElementById("debugRunBtn");
  const result = document.getElementById("debugAssertividadeResult");
  if (!btn || !result) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="debug-spinner"></span> Calculando...';
  result.innerHTML = "";

  try {
    const resp = await fetch("/api/apostas/debug/assertividade");
    const data = await resp.json();
    if (!resp.ok) {
      result.innerHTML = `<div class="debug-error"><i class="bi bi-exclamation-triangle-fill"></i> ${escHtml(data.error || "Erro desconhecido")}</div>`;
      return;
    }
    result.innerHTML = _renderDebugAssertividade(data);
  } catch {
    result.innerHTML = `<div class="debug-error"><i class="bi bi-exclamation-triangle-fill"></i> Erro de conexão</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Reanalisar';
  }
}

function _renderDebugAssertividade(d) {
  if (!d.available) {
    return `<div class="debug-not-available"><i class="bi bi-info-circle"></i> ${escHtml(d.message || "Sem dados disponíveis")}</div>`;
  }

  function _taxaClass(taxa) {
    if (taxa >= 55) return "debug-taxa--green";
    if (taxa >= 40) return "debug-taxa--yellow";
    return "debug-taxa--red";
  }

  function _taxaColor(taxa) {
    return taxa >= 55 ? "#198754" : taxa >= 40 ? "#fd7e14" : "#dc3545";
  }

  function _metricBlock(label, corretos, total, taxa) {
    return `
      <div class="debug-stat-block">
        <div class="debug-stat-label">${escHtml(label)}</div>
        <div class="debug-stat-nums">
          <span class="debug-stat-total">${corretos}/${total} jogos</span>
          <span class="debug-taxa ${_taxaClass(taxa)}">${taxa}%</span>
        </div>
        <div class="debug-taxa-bar"><div class="debug-taxa-fill" style="width:${Math.min(taxa,100)}%;background:${_taxaColor(taxa)}"></div></div>
      </div>`;
  }

  const oc = d.outcome || {};
  const o2 = d.over25  || {};
  const bt = d.btts    || {};
  const pt = d.por_tipo || {};

  const geralRow = `
    <div class="debug-section">
      <div class="debug-section-title">Resumo geral — ${d.total_jogos} jogos · ${d.ligas_analisadas} liga${d.ligas_analisadas !== 1 ? "s" : ""}</div>
      <div class="debug-geral-grid debug-geral-grid--3">
        <div class="debug-geral-item">
          <span class="debug-geral-val ${_taxaClass(oc.taxa)}">${oc.taxa}%</span>
          <span class="debug-geral-lbl">Resultado</span>
          <span class="debug-geral-sub">${oc.corretos}/${oc.total}</span>
        </div>
        <div class="debug-geral-item">
          <span class="debug-geral-val ${_taxaClass(o2.taxa)}">${o2.taxa}%</span>
          <span class="debug-geral-lbl">Over/Under 2.5</span>
          <span class="debug-geral-sub">${o2.corretos}/${o2.total}</span>
        </div>
        <div class="debug-geral-item">
          <span class="debug-geral-val ${_taxaClass(bt.taxa)}">${bt.taxa}%</span>
          <span class="debug-geral-lbl">BTTS</span>
          <span class="debug-geral-sub">${bt.corretos}/${bt.total}</span>
        </div>
      </div>
    </div>`;

  const ph = pt.home   || {};
  const pd = pt.empate || {};
  const pa = pt.away   || {};
  const tipoRow = `
    <div class="debug-section">
      <div class="debug-section-title">Precisão por tipo de resultado previsto</div>
      ${_metricBlock(`Casa (previsão casa — ${ph.previsto} jogos)`,  ph.correto||0, ph.previsto||0, ph.taxa||0)}
      ${_metricBlock(`Empate (previsão empate — ${pd.previsto} jogos)`, pd.correto||0, pd.previsto||0, pd.taxa||0)}
      ${_metricBlock(`Fora (previsão fora — ${pa.previsto} jogos)`,  pa.correto||0, pa.previsto||0, pa.taxa||0)}
    </div>`;

  const calRow = `
    <div class="debug-section">
      <div class="debug-section-title">Calibração — acerto por confiança do modelo</div>
      ${(d.calibration||[]).map(c => _metricBlock(`Confiança ${c.label}`, c.correct, c.total, c.taxa)).join("") || '<div class="debug-empty">Sem dados</div>'}
    </div>`;

  const ligaRows = (d.por_liga || []).map(lg => `
    <div class="debug-stat-block">
      <div class="debug-stat-label">${escHtml(lg.league_name)} <span class="debug-source-badge">${escHtml(lg.source)}</span></div>
      <div class="debug-stat-nums">
        <span class="debug-stat-total">${lg.jogos} jogos</span>
        <span class="debug-taxa ${_taxaClass(lg.outcome_taxa)}">${lg.outcome_taxa}% resultado</span>
        <span class="debug-taxa--muted">O2.5 ${lg.over25_taxa}%</span>
        <span class="debug-taxa--muted">BTTS ${lg.btts_taxa}%</span>
      </div>
      <div class="debug-taxa-bar"><div class="debug-taxa-fill" style="width:${Math.min(lg.outcome_taxa,100)}%;background:${_taxaColor(lg.outcome_taxa)}"></div></div>
    </div>`).join("") || '<div class="debug-empty">Sem ligas</div>';

  const ligaSection = `
    <div class="debug-section">
      <div class="debug-section-title">Por liga (ordenado por acerto de resultado)</div>
      ${ligaRows}
    </div>`;

  const nota = `<div class="debug-nota"><i class="bi bi-info-circle"></i> Análise sobre dados atuais do cache (ESPN + API-Football como fallback). Dados do cache incluem o próprio jogo — serve para calibração, não para validação out-of-sample.</div>`;

  return `<div class="debug-assertividade-body">${nota}${geralRow}${tipoRow}${calRow}${ligaSection}</div>`;
}
