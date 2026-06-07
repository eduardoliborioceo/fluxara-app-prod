(function () {
  const INSTITUICOES = {
    nubank:      { cor: '#8A05BE', letra: 'N', svg: 'nubank.svg' },
    itau:        { cor: '#EC7000', letra: 'I', svg: 'itau.svg' },
    bradesco:    { cor: '#CC092F', letra: 'B', svg: 'bradesco.svg' },
    bb:          { cor: '#F9D600', letra: 'B', corLetra: '#000', svg: 'banco-do-brasil.svg' },
    caixa:       { cor: '#006CA8', letra: 'C', svg: 'caixa.svg' },
    'caixa-tem': { cor: '#006CA8', letra: 'C', svg: 'caixa-tem.svg' },
    santander:   { cor: '#EC0000', letra: 'S', svg: 'santander.svg' },
    inter:       { cor: '#FF7A00', letra: 'I', svg: 'inter.svg' },
    c6:          { cor: '#242424', letra: 'C', svg: 'c6.svg' },
    picpay:      { cor: '#11C76F', letra: 'P', svg: 'picpay.svg' },
    mercadopago: { cor: '#009EE3', letra: 'M', svg: 'mercado-pago.svg' },
    xp:          { cor: '#000000', letra: 'X', svg: 'xp.svg' },
    btg:         { cor: '#003399', letra: 'B', svg: 'btg-pactual.svg' },
    sicoob:      { cor: '#007A3D', letra: 'S' },
    sicredi:     { cor: '#006633', letra: 'S', svg: 'sicredi.svg' },
    neon:        { cor: '#00CFFF', letra: 'N', corLetra: '#000', svg: 'neon.svg' },
    next:        { cor: '#00CC99', letra: 'N', corLetra: '#000', svg: 'next.svg' },
    wise:        { cor: '#9FE870', letra: 'W', corLetra: '#000' },
    paypal:      { cor: '#003087', letra: 'P', svg: 'paypal.svg' },
    iti:         { cor: '#FF6600', letra: 'i', svg: 'iti.svg' },
    will:        { cor: '#FFCC00', letra: 'W', corLetra: '#000', svg: 'will-bank.svg' },
    bs2:         { cor: '#0066CC', letra: 'B' },
    original:    { cor: '#00A650', letra: 'O', svg: 'original.svg' },
    sofisa:      { cor: '#E2001A', letra: 'S', svg: 'sofisa.svg' },
    banrisul:    { cor: '#005CA9', letra: 'B', svg: 'banrisul.svg' },
    bv:          { cor: '#004B8D', letra: 'B', svg: 'bv.svg' },
    bmg:         { cor: '#E30613', letra: 'B', svg: 'bmg.svg' },
    pan:         { cor: '#FFD100', letra: 'P', corLetra: '#000', svg: 'pan.svg' },
    daycoval:    { cor: '#005A9E', letra: 'D', svg: 'daycoval.svg' },
    mercantil:   { cor: '#004A9F', letra: 'M', svg: 'mercantil.svg' },
    digio:       { cor: '#0077CC', letra: 'D', svg: 'digio.svg' },
    stone:       { cor: '#00A868', letra: 'S', svg: 'stone.svg' },
    pagseguro:   { cor: '#FFC72C', letra: 'P', corLetra: '#000', svg: 'pagseguro.svg' },
    'nu-invest': { cor: '#8A05BE', letra: 'N', svg: 'nu-invest.svg' },
    nomad:       { cor: '#1A1A2E', letra: 'N', svg: 'nomad.svg' },
    zrobank:     { cor: '#0055B8', letra: 'Z', svg: 'zrobank.svg' },
    n26:         { cor: '#000000', letra: 'N', svg: 'n26.svg' },
    warren:      { cor: '#4C12A1', letra: 'W', svg: 'warren.svg' },
    toro:        { cor: '#FF6B00', letra: 'T', svg: 'toro.svg' },
    clear:       { cor: '#00C4B3', letra: 'C', svg: 'clear.svg' },
    rico:        { cor: '#00B386', letra: 'R', svg: 'rico.svg' },
    genial:      { cor: '#FF6600', letra: 'G', svg: 'genial-investimentos.svg' },
    avenue:      { cor: '#0033A0', letra: 'A', svg: 'avenue.svg' },
    ame:         { cor: '#FF0064', letra: 'A', svg: 'ame.svg' },
    amazon:      { cor: '#FF9900', letra: 'A', corLetra: '#000', svg: 'amazon.svg' },
    magalu:      { cor: '#0086FF', letra: 'M', svg: 'magalu.svg' },
    samsung:     { cor: '#1428A0', letra: 'S', svg: 'samsung.svg' },
    infinitepay: { cor: '#00BCD4', letra: 'I', svg: 'infinitepay.svg' },
    ton:         { cor: '#00C853', letra: 'T', svg: 'ton.svg' },
    fitbank:     { cor: '#1A237E', letra: 'F', svg: 'fitbank.svg' },
    cora:        { cor: '#FF4C8B', letra: 'C', svg: 'cora.svg' },
    dm:          { cor: '#004B87', letra: 'D', svg: 'dm.svg' },
    flash:       { cor: '#F24E1E', letra: 'F', svg: 'flash.svg' },
    caju:        { cor: '#FF6B35', letra: 'C', svg: 'caju.svg' },
    binance:     { cor: '#F3BA2F', letra: 'B', corLetra: '#000', svg: 'binance.svg' },
    metamask:    { cor: '#E2761B', letra: 'M', svg: 'metamask.svg' },
    bitybank:    { cor: '#0066FF', letra: 'B', svg: 'bitybank.svg' },
    outro:       { cor: '#64748b', icone: 'bi-wallet2', corLetra: '#fff' },
  };

  function buildLogoHtml(inst, size) {
    size = size || 28;
    if (inst && inst.svg) {
      return '<div style="background:#f8fafc;width:' + size + 'px;height:' + size + 'px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
        + '<img src="/static/images/bank-icons-logos-svg/' + esc(inst.svg) + '" alt="" style="width:65%;height:65%;object-fit:contain"></div>';
    }
    var bg = (inst && inst.cor) || '#64748b';
    var fg = (inst && inst.corLetra) || '#fff';
    var iconSize = Math.round(size * 0.55) + 'px';
    if (inst && inst.icone) {
      return '<div style="background:' + bg + ';color:' + fg + ';width:' + size + 'px;height:' + size + 'px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
        + '<i class="bi ' + inst.icone + '" style="font-size:' + iconSize + '"></i></div>';
    }
    var letra = (inst && inst.letra) || '?';
    return '<div style="background:' + bg + ';color:' + fg + ';width:' + size + 'px;height:' + size + 'px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.75rem;flex-shrink:0;">' + esc(letra) + '</div>';
  }

  const ICONES = [
    'bi-tag','bi-tag-fill','bi-star','bi-star-fill','bi-heart','bi-heart-fill',
    'bi-house','bi-house-fill','bi-house-heart','bi-building','bi-buildings',
    'bi-car-front','bi-car-front-fill','bi-bicycle','bi-bus-front','bi-train-front',
    'bi-airplane','bi-airplane-fill','bi-scooter','bi-fuel-pump','bi-truck',
    'bi-bag','bi-bag-fill','bi-bag-heart','bi-bag-check','bi-cart','bi-cart-fill',
    'bi-basket','bi-basket-fill','bi-box','bi-box-fill','bi-boxes',
    'bi-briefcase','bi-briefcase-fill','bi-laptop','bi-pc-display','bi-phone',
    'bi-phone-fill','bi-tablet','bi-headphones','bi-camera','bi-camera-fill',
    'bi-heart-pulse','bi-heart-pulse-fill','bi-hospital','bi-capsule','bi-bandaid',
    'bi-activity','bi-lungs','bi-eye','bi-eye-fill','bi-thermometer',
    'bi-book','bi-book-fill','bi-journal','bi-journal-text','bi-pencil',
    'bi-mortarboard','bi-mortarboard-fill','bi-award','bi-award-fill','bi-trophy',
    'bi-controller','bi-joystick','bi-music-note','bi-music-note-beamed','bi-film',
    'bi-camera-video','bi-tv','bi-tv-fill','bi-ticket','bi-ticket-fill',
    'bi-credit-card','bi-credit-card-fill','bi-wallet','bi-wallet2','bi-wallet-fill',
    'bi-cash','bi-cash-coin','bi-cash-stack','bi-piggy-bank','bi-piggy-bank-fill',
    'bi-bank','bi-bank2','bi-safe','bi-safe-fill','bi-graph-up',
    'bi-graph-up-arrow','bi-bar-chart','bi-bar-chart-fill','bi-pie-chart','bi-pie-chart-fill',
    'bi-cup-hot','bi-cup-hot-fill','bi-cup-straw','bi-egg-fried','bi-fork-knife',
    'bi-fire','bi-snow','bi-droplet','bi-droplet-fill','bi-lightning',
    'bi-lightning-fill','bi-wifi','bi-plug','bi-plug-fill','bi-gear',
    'bi-gear-fill','bi-tools','bi-wrench','bi-hammer','bi-scissors',
    'bi-shield','bi-shield-fill','bi-shield-check','bi-lock','bi-lock-fill',
    'bi-person','bi-person-fill','bi-person-hearts','bi-people','bi-people-fill',
    'bi-gift','bi-gift-fill','bi-balloon-heart','bi-emoji-smile','bi-emoji-heart-eyes',
    'bi-file-text','bi-file-earmark-text','bi-receipt','bi-receipt-cutoff','bi-three-dots',
    'bi-plus-circle','bi-plus-circle-fill','bi-arrow-repeat','bi-recycle','bi-globe',
    'bi-globe2','bi-map','bi-map-fill','bi-geo-alt','bi-geo-alt-fill',
    'bi-sun','bi-moon','bi-cloud','bi-cloud-fill','bi-flower1',
    'bi-tree','bi-tree-fill','bi-pet','bi-paw','bi-scissors',
  ];

  const CAT_CORES = [
    '#ef4444','#f97316','#f59e0b','#84cc16','#22c55e',
    '#10b981','#06b6d4','#3b82f6','#6366f1','#8b5cf6',
    '#a855f7','#ec4899','#14b8a6','#0ea5e9','#64748b',
  ];

  let tipoAtivo = 'despesa';
  let catSelecionadaIcone = 'bi-tag';
  let catCorFundoSelecionada = '';
  const modalCat = new bootstrap.Modal(document.getElementById('modalCat'));
  const modalSub = new bootstrap.Modal(document.getElementById('modalSub'));

  // ── NAVEGAÇÃO DE PAINÉIS ──────────────────────────────
  function showPanel(id) {
    document.getElementById('viewMenu').classList.add('d-none');
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.add('d-none'));
    document.getElementById(id).classList.remove('d-none');
    const titles = {
      viewTema: 'Tema do Sistema',
      viewCategorias: 'Categorias',
      viewCartoes: 'Cartões de Crédito',
      viewGastosDev: 'Gastos Developer',
      viewUsuario: 'Área do Usuário',
      viewAdmin: 'Área do Administrador',
      viewNotificacoes: 'Notificações',
      viewResetDados: 'Resetar Dados',
      viewImportExport: 'Importar / Exportar',
      viewSobre: 'Sobre',
      viewTermos: 'Termos de Uso',
      viewConvite: 'Convide seus amigos',
      viewSobreApp: 'Sobre o Fluxara',
    };
    const h = document.getElementById('pageHeaderTitle');
    if (h) h.textContent = titles[id] || 'Configurações';
  }

  function showMenu() {
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.add('d-none'));
    document.getElementById('viewMenu').classList.remove('d-none');
    const h = document.getElementById('pageHeaderTitle');
    if (h) h.textContent = 'Configurações';
  }

  document.querySelectorAll('.settings-item').forEach(item => {
    item.addEventListener('click', () => {
      const panel = item.dataset.panel;
      if (!panel) return;
      if (panel === 'categorias') loadCategorias();
      if (panel === 'cartoes') loadCartoes();
      if (panel === 'gastosDev') loadGastosDev();
      if (panel === 'notificacoes') initNotifPanel();
      showPanel('view' + panel.charAt(0).toUpperCase() + panel.slice(1));
    });
  });

  document.getElementById('btnBackTema')?.addEventListener('click', showMenu);
  document.getElementById('btnBackCat')?.addEventListener('click', showMenu);
  document.getElementById('btnBackCartoes')?.addEventListener('click', showMenu);
  document.getElementById('btnBackGastosDev')?.addEventListener('click', showMenu);
  document.getElementById('btnBackUsuario')?.addEventListener('click', showMenu);
  document.getElementById('btnBackAdmin')?.addEventListener('click', showMenu);
  document.getElementById('btnBackNotificacoes')?.addEventListener('click', showMenu);
  document.getElementById('btnBackResetDados')?.addEventListener('click', showMenu);
  document.getElementById('btnBackImportExport')?.addEventListener('click', showMenu);
  document.getElementById('btnBackSobre')?.addEventListener('click', showMenu);
  document.getElementById('btnBackTermos')?.addEventListener('click', () => showPanel('viewSobre'));
  document.getElementById('btnBackConvite')?.addEventListener('click', () => showPanel('viewSobre'));
  document.getElementById('btnBackSobreApp')?.addEventListener('click', () => showPanel('viewSobre'));

  document.querySelectorAll('.settings-item[data-subpanel]').forEach(item => {
    item.addEventListener('click', () => {
      const sub = item.dataset.subpanel;
      showPanel('view' + sub.charAt(0).toUpperCase() + sub.slice(1));
    });
  });

  const urlPanel = new URLSearchParams(window.location.search).get('panel');
  if (urlPanel) {
    if (urlPanel === 'categorias') loadCategorias();
    if (urlPanel === 'cartoes') loadCartoes();
    if (urlPanel === 'gastosDev') loadGastosDev();
    const panelId = 'view' + urlPanel.charAt(0).toUpperCase() + urlPanel.slice(1);
    if (document.getElementById(panelId)) showPanel(panelId);
  }

  // ── TEMA ─────────────────────────────────────────────
  function applyTema(tema) {
    const root = document.getElementById('htmlRoot');
    if (root) root.setAttribute('data-theme', tema);
    document.querySelectorAll('.tema-btn').forEach(b => b.classList.toggle('active', b.dataset.tema === tema));
    const label = document.getElementById('temaAtualLabel');
    if (label) label.textContent = tema === 'escuro' ? 'Escuro' : 'Claro';
  }

  document.querySelectorAll('.tema-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      applyTema(btn.dataset.tema);
      await fetch('/api/config/tema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema: btn.dataset.tema }),
      });
    });
  });

  // ── CATEGORIAS — TABS ────────────────────────────────
  document.querySelectorAll('.cat-tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-tipo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tipoAtivo = btn.dataset.tipo;
      loadCategorias();
    });
  });

  // ── CATEGORIAS — LOAD ────────────────────────────────
  async function loadCategorias() {
    document.getElementById('catList').innerHTML =
      '<div class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Carregando...</div>';
    try {
      const r = await fetch('/api/config/categorias?tipo=' + tipoAtivo);
      const data = await r.json();
      if (!Array.isArray(data)) {
        document.getElementById('catList').innerHTML =
          '<div class="alert alert-danger m-0"><strong>Erro:</strong> ' + (data.error || 'Resposta inesperada') +
          '<br><small>Se a mensagem mencionar a coluna "icone", execute no Railway psql:<br>' +
          '<code>ALTER TABLE categorias ADD COLUMN icone VARCHAR(50) DEFAULT \'bi-tag\';</code></small></div>';
        return;
      }
      renderCategorias(data);
    } catch (e) {
      document.getElementById('catList').innerHTML =
        '<div class="alert alert-danger m-0">Erro de comunicação com o servidor.</div>';
    }
  }

  // ── CATEGORIAS — RENDER ──────────────────────────────
  function renderCategorias(cats) {
    const el = document.getElementById('catList');
    if (!cats.length) {
      el.innerHTML = '<p class="text-muted text-center py-3 mb-0">Nenhuma categoria ainda.</p>';
      return;
    }
    el.innerHTML = cats.map(cat => {
      const icone = cat.icone || 'bi-tag';
      const cor = cat.cor_fundo || '';
      const iconStyle = cor ? 'background:' + cor + ';color:#fff;' : '';
      const corEncoded = esc(cor);
      return '<div class="cat-item" id="cat-' + cat.id + '">' +
        '<div class="cat-header" onclick="toggleCat(' + cat.id + ')">' +
          '<span class="cat-icon" style="' + iconStyle + '"><i class="bi ' + icone + '"></i></span>' +
          '<span class="cat-nome">' + esc(cat.nome) + '</span>' +
          '<div class="cat-actions" onclick="event.stopPropagation()">' +
            '<button class="btn btn-sm btn-outline-secondary py-0 px-1" ' +
                    'onclick="openEditCat(' + cat.id + ',\'' + esc(cat.nome) + '\',\'' + icone + '\',\'' + corEncoded + '\')">' +
              '<i class="bi bi-pencil"></i></button>' +
            '<button class="btn btn-sm btn-outline-danger py-0 px-1" onclick="deleteCat(' + cat.id + ')">' +
              '<i class="bi bi-trash"></i></button>' +
          '</div>' +
          '<i class="bi bi-chevron-down cat-toggle" id="toggle-' + cat.id + '"></i>' +
        '</div>' +
        '<div class="cat-body" id="body-' + cat.id + '">' +
          renderSubs(cat.subcategorias, cat.id) +
          '<button class="btn btn-sm btn-outline-primary mt-2" onclick="openAddSub(' + cat.id + ')">' +
            '<i class="bi bi-plus-lg me-1"></i>Adicionar subcategoria</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderSubs(subs) {
    if (!subs || !subs.length) return '<p class="text-muted small mb-2">Nenhuma subcategoria.</p>';
    return subs.map(s =>
      '<div class="sub-item" id="sub-' + s.id + '">' +
        '<span class="sub-nome">' + esc(s.nome) + '</span>' +
        '<div class="sub-actions">' +
          '<button class="btn btn-sm btn-outline-secondary py-0 px-1" onclick="editSub(' + s.id + ',\'' + esc(s.nome) + '\')">' +
            '<i class="bi bi-pencil"></i></button>' +
          '<button class="btn btn-sm btn-outline-danger py-0 px-1" onclick="deleteSub(' + s.id + ')">' +
            '<i class="bi bi-trash"></i></button>' +
        '</div>' +
      '</div>'
    ).join('');
  }

  window.toggleCat = function (id) {
    document.getElementById('body-' + id).classList.toggle('open');
    document.getElementById('toggle-' + id).classList.toggle('open');
  };

  // ── COR PICKER ───────────────────────────────────────
  (function initCorPicker() {
    const swatches = document.getElementById('catCorSwatches');
    if (!swatches) return;

    swatches.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-cor-swatch');
      if (!btn) return;
      swatches.querySelectorAll('.cat-cor-swatch').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      catCorFundoSelecionada = btn.dataset.cor;
      document.getElementById('catCorFundo').value = catCorFundoSelecionada;
      const ci = document.getElementById('catCorCustomInput');
      if (ci) ci.value = catCorFundoSelecionada;
      updateIconePreviewCor();
    });

    const customInput = document.getElementById('catCorCustomInput');
    if (customInput) {
      customInput.addEventListener('input', () => {
        swatches.querySelectorAll('.cat-cor-swatch').forEach(b => b.classList.remove('selected'));
        catCorFundoSelecionada = customInput.value;
        document.getElementById('catCorFundo').value = catCorFundoSelecionada;
        updateIconePreviewCor();
      });
    }

    document.getElementById('btnClearCor')?.addEventListener('click', () => {
      swatches.querySelectorAll('.cat-cor-swatch').forEach(b => b.classList.remove('selected'));
      catCorFundoSelecionada = '';
      document.getElementById('catCorFundo').value = '';
      updateIconePreviewCor();
    });
  })();

  function buildCorPicker(selected) {
    catCorFundoSelecionada = selected || '';
    const swatches = document.getElementById('catCorSwatches');
    if (!swatches) return;
    swatches.innerHTML = CAT_CORES.map(c =>
      '<button type="button" class="cat-cor-swatch' + (c === selected ? ' selected' : '') + '" ' +
        'data-cor="' + c + '" style="background:' + c + '" title="' + c + '"></button>'
    ).join('');
    const ci = document.getElementById('catCorCustomInput');
    if (ci) ci.value = selected || '#3b82f6';
    document.getElementById('catCorFundo').value = selected || '';
    updateIconePreviewCor();
  }

  function updateIconePreviewCor() {
    const wrap = document.getElementById('catIconePreviewWrap');
    if (!wrap) return;
    if (catCorFundoSelecionada) {
      wrap.style.background = catCorFundoSelecionada;
      wrap.style.color = '#fff';
    } else {
      wrap.style.background = '';
      wrap.style.color = '';
    }
  }

  // ── ÍCONE PICKER ─────────────────────────────────────
  function buildIconePicker(selected) {
    const picker = document.getElementById('iconePicker');
    picker.innerHTML = ICONES.map(ic =>
      '<div class="icone-opt ' + (ic === selected ? 'selected' : '') + '" data-icone="' + ic + '">' +
        '<i class="bi ' + ic + '"></i></div>'
    ).join('');
    picker.querySelectorAll('.icone-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        picker.querySelectorAll('.icone-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        catSelecionadaIcone = opt.dataset.icone;
        document.getElementById('catIconePreview').className = 'bi ' + catSelecionadaIcone + ' fs-4';
        document.getElementById('catIconeNome').textContent = catSelecionadaIcone;
      });
    });
  }

  // ── MODAL CATEGORIA ──────────────────────────────────
  document.getElementById('btnAddCat')?.addEventListener('click', () => {
    document.getElementById('catEditId').value = '';
    document.getElementById('catNome').value = '';
    document.getElementById('modalCatTitle').textContent = 'Nova Categoria';
    catSelecionadaIcone = 'bi-tag';
    document.getElementById('catIconePreview').className = 'bi bi-tag fs-4';
    document.getElementById('catIconeNome').textContent = 'bi-tag';
    buildCorPicker('');
    buildIconePicker('bi-tag');
    modalCat.show();
  });

  window.openEditCat = function (id, nome, icone, corFundo) {
    document.getElementById('catEditId').value = id;
    document.getElementById('catNome').value = nome;
    document.getElementById('modalCatTitle').textContent = 'Editar Categoria';
    catSelecionadaIcone = icone;
    document.getElementById('catIconePreview').className = 'bi ' + icone + ' fs-4';
    document.getElementById('catIconeNome').textContent = icone;
    buildCorPicker(corFundo || '');
    buildIconePicker(icone);
    modalCat.show();
  };

  document.getElementById('btnSaveCat').addEventListener('click', async () => {
    const id   = document.getElementById('catEditId').value;
    const nome = document.getElementById('catNome').value.trim();
    if (!nome) return;
    const cor  = document.getElementById('catCorFundo').value || null;
    const url    = id ? '/api/config/categorias/' + id : '/api/config/categorias';
    const method = id ? 'PUT' : 'POST';
    const body   = id
      ? { nome, icone: catSelecionadaIcone, cor_fundo: cor }
      : { tipo: tipoAtivo, nome, icone: catSelecionadaIcone, cor_fundo: cor };
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    modalCat.hide();
    loadCategorias();
  });

  window.deleteCat = async function (id) {
    if (!confirm('Excluir esta categoria e todas as subcategorias?')) return;
    await fetch('/api/config/categorias/' + id, { method: 'DELETE' });
    loadCategorias();
  };

  // ── MODAL SUBCATEGORIA ───────────────────────────────
  window.openAddSub = function (catId) {
    document.getElementById('subCatId').value = catId;
    document.getElementById('subNome').value = '';
    modalSub.show();
  };

  document.getElementById('btnSaveSub').addEventListener('click', async () => {
    const catId = document.getElementById('subCatId').value;
    const nome  = document.getElementById('subNome').value.trim();
    if (!nome) return;
    await fetch('/api/config/subcategorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoria_id: catId, nome }),
    });
    modalSub.hide();
    loadCategorias();
  });

  window.editSub = async function (id, nomeAtual) {
    const novo = prompt('Editar subcategoria:', nomeAtual);
    if (!novo || !novo.trim() || novo.trim() === nomeAtual) return;
    await fetch('/api/config/subcategorias/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novo.trim() }),
    });
    loadCategorias();
  };

  window.deleteSub = async function (id) {
    if (!confirm('Excluir esta subcategoria?')) return;
    await fetch('/api/config/subcategorias/' + id, { method: 'DELETE' });
    loadCategorias();
  };

  function esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ── CARTÕES ──────────────────────────────────────────
  const BANDEIRAS = {
    visa:       { nome: 'Visa',             svg: 'visa.svg' },
    mastercard: { nome: 'Mastercard',       svg: 'mastercard.svg' },
    elo:        { nome: 'Elo' },
    amex:       { nome: 'Amex',             svg: 'amex.svg' },
    hipercard:  { nome: 'Hipercard',        svg: 'hipercard.svg' },
    outro:      { nome: 'Outro' },
  };

  const TIPOS_LABEL = {
    credito:        'Crédito',
    debito:         'Débito',
    credito_debito: 'Crédito e Débito',
  };

  function buildBandeiraLogo(bandeira) {
    const b = BANDEIRAS[bandeira] || BANDEIRAS.outro;
    if (b.svg) {
      return '<div style="background:rgba(255,255,255,0.92);width:46px;height:30px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
        + '<img src="/static/images/bank-icons-logos-svg/' + esc(b.svg) + '" alt="' + esc(b.nome) + '" style="max-width:80%;max-height:80%;object-fit:contain;"></div>';
    }
    return '<span style="font-size:0.72rem;font-weight:700;opacity:0.85;">' + esc(b.nome) + '</span>';
  }

  function buildContaLogoCard(inst, size) {
    size = size || 32;
    return buildLogoHtml(inst, size);
  }

  function cardBackground(contaInstituicao) {
    if (contaInstituicao && INSTITUICOES[contaInstituicao]) {
      const inst = INSTITUICOES[contaInstituicao];
      const base = inst.cor;
      return 'linear-gradient(135deg, ' + base + ', ' + darkenHex(base, 28) + ')';
    }
    return 'linear-gradient(135deg, #334155, #0f172a)';
  }

  function cardTextColor(contaInstituicao) {
    if (contaInstituicao && INSTITUICOES[contaInstituicao]) {
      return INSTITUICOES[contaInstituicao].corLetra || '#fff';
    }
    return '#fff';
  }

  function darkenHex(hex, amount) {
    const c = hex.replace('#', '');
    const num = parseInt(c.length === 3
      ? c.split('').map(x => x + x).join('')
      : c, 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  const modalCartaoEl = document.getElementById('modalCartao');
  const modalCartao = modalCartaoEl ? new bootstrap.Modal(modalCartaoEl) : null;

  async function loadCartoes() {
    document.getElementById('cartoesList').innerHTML =
      '<div class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Carregando...</div>';
    try {
      const r = await fetch('/api/cartoes');
      const data = await r.json();
      renderCartoes(Array.isArray(data) ? data : []);
    } catch {
      document.getElementById('cartoesList').innerHTML =
        '<div class="alert alert-danger m-0">Erro ao carregar cartões.</div>';
    }
  }

  let _cartoesCache = [];

  function renderCartoes(cartoes) {
    _cartoesCache = cartoes;
    const el = document.getElementById('cartoesList');
    if (!cartoes.length) {
      el.innerHTML = '<p class="text-muted text-center py-3 mb-0">Nenhum cartão cadastrado.</p>';
      return;
    }
    el.innerHTML = cartoes.map(c => {
      const instKey = c.conta_instituicao || '';
      const inst = instKey ? (INSTITUICOES[instKey] || null) : null;
      const grad = cardBackground(instKey);
      const textColor = cardTextColor(instKey);
      const isDark = textColor === '#fff';
      const contaLogo = buildContaLogoCard(inst, 32);
      const bandeiraLogo = buildBandeiraLogo(c.bandeira);
      const tipoLabel = TIPOS_LABEL[c.tipo] || 'Crédito';
      const badgeBg = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)';
      const limit = parseFloat(c.limite || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      return `<div class="px-3 pb-2">
        <div class="cartao-visual" style="background:${grad};color:${textColor}">
          <div class="cartao-visual-top">
            <div class="cartao-visual-top-left">
              <div class="cartao-visual-conta-logo">${contaLogo}</div>
              <div class="cartao-visual-header-text">
                <div class="cartao-visual-nome">${esc(c.nome)}</div>
                <span class="cartao-visual-tipo-badge" style="background:${badgeBg};">${esc(tipoLabel)}</span>
              </div>
            </div>
            <div class="cartao-visual-bandeira-logo">${bandeiraLogo}</div>
          </div>
          <div class="cartao-visual-bottom">
            <div class="cartao-visual-limite">
              Limite disponível
              <strong>R$ ${limit}</strong>
            </div>
            <div class="cartao-visual-datas">
              <span>Fecha dia ${c.dia_fechamento}</span><br>
              <span>Vence dia ${c.dia_vencimento}</span>
              ${c.conta_nome ? '<br><span>' + esc(c.conta_nome) + '</span>' : ''}
            </div>
          </div>
        </div>
        <div class="cartao-visual-actions mb-2">
          <button class="btn btn-outline-secondary btn-sm"
            onclick="abrirEditarCartao(${c.id})">
            <i class="bi bi-pencil me-1"></i>Editar
          </button>
          <button class="btn btn-outline-primary btn-sm"
            onclick="abrirTransferirLimite(${c.id})">
            <i class="bi bi-arrow-left-right me-1"></i>Transferir
          </button>
          <button class="btn btn-outline-danger btn-sm"
            onclick="deletarCartaoConfig(${c.id})">
            <i class="bi bi-trash me-1"></i>Excluir
          </button>
        </div>
      </div>`;
    }).join('');
  }

  function renderContaOption(id, nome, inst, selected) {
    const logo = buildLogoHtml(inst, 28);
    const selStyle = selected
      ? 'background:#eff6ff;'
      : '';
    return '<div class="cartao-conta-option" data-id="' + esc(String(id)) + '" data-nome="' + esc(nome) + '"'
      + ' style="display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;border-radius:6px;' + selStyle + '">'
      + logo
      + '<span style="font-size:.875rem;">' + esc(nome) + '</span>'
      + '</div>';
  }

  function setContaPickerValue(id, nome, inst) {
    const hidden = document.getElementById('cartaoConta');
    const display = document.getElementById('cartaoContaDisplay');
    if (!hidden || !display) return;
    hidden.value = id || '';
    if (!id) {
      display.innerHTML = '<span style="color:#64748b;font-size:.875rem;">Nenhuma</span>';
    } else {
      const logo = buildLogoHtml(inst, 24);
      display.innerHTML = logo + '<span style="font-size:.875rem;">' + esc(nome) + '</span>';
    }
  }

  async function carregarContasSelect(selecionadoId) {
    const dropdown = document.getElementById('cartaoContaDropdown');
    const btn = document.getElementById('cartaoContaBtn');
    if (!dropdown || !btn) return;

    setContaPickerValue('', 'Nenhuma', null);

    let contas = [];
    try {
      const r = await fetch('/api/contas');
      const data = await r.json();
      contas = Array.isArray(data) ? data : [];
    } catch { /* sem contas */ }

    let html = renderContaOption('', 'Nenhuma', null, !selecionadoId);
    contas.forEach(c => {
      const inst = INSTITUICOES[c.instituicao] || INSTITUICOES.outro;
      const sel = String(c.id) === String(selecionadoId);
      html += renderContaOption(c.id, c.nome, inst, sel);
      if (sel) setContaPickerValue(c.id, c.nome, inst);
    });
    dropdown.innerHTML = html;

    dropdown.querySelectorAll('.cartao-conta-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const id = opt.dataset.id;
        const nome = opt.dataset.nome;
        const conta = contas.find(c => String(c.id) === id);
        const inst = conta ? (INSTITUICOES[conta.instituicao] || INSTITUICOES.outro) : null;
        setContaPickerValue(id, nome, inst);
        dropdown.classList.add('d-none');
      });
    });

    btn.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('d-none');
    };
    document.addEventListener('click', () => dropdown.classList.add('d-none'), { once: false });
  }

  document.getElementById('btnAddCartao')?.addEventListener('click', () => {
    document.getElementById('cartaoEditId').value = '';
    document.getElementById('cartaoNome').value = '';
    document.getElementById('cartaoLimite').value = '';
    document.getElementById('cartaoBandeira').value = 'visa';
    document.getElementById('cartaoTipo').value = 'credito';
    document.getElementById('cartaoDiaFechamento').value = '';
    document.getElementById('cartaoDiaVencimento').value = '';
    document.getElementById('modalCartaoTitle').textContent = 'Novo Cartão';
    document.getElementById('btnDeletarCartao').classList.add('d-none');
    carregarContasSelect(null);
    modalCartao.show();
  });

  window.abrirEditarCartao = function (id) {
    fetch('/api/cartoes').then(r => r.json()).then(cartoes => {
      const c = cartoes.find(x => x.id === id);
      if (!c) return;
      document.getElementById('cartaoEditId').value = c.id;
      document.getElementById('cartaoNome').value = c.nome;
      document.getElementById('cartaoLimite').value = parseFloat(c.limite||0).toLocaleString('pt-BR',{minimumFractionDigits:2});
      document.getElementById('cartaoBandeira').value = c.bandeira || 'outro';
      document.getElementById('cartaoTipo').value = c.tipo || 'credito';
      document.getElementById('cartaoDiaFechamento').value = c.dia_fechamento;
      document.getElementById('cartaoDiaVencimento').value = c.dia_vencimento;
      document.getElementById('modalCartaoTitle').textContent = 'Editar Cartão';
      document.getElementById('btnDeletarCartao').classList.remove('d-none');
      carregarContasSelect(c.conta_id);
      modalCartao.show();
    });
  };

  document.getElementById('btnSalvarCartao')?.addEventListener('click', async () => {
    const id = document.getElementById('cartaoEditId').value;
    const nome = document.getElementById('cartaoNome').value.trim();
    if (!nome) { document.getElementById('cartaoNome').focus(); return; }
    const url = id ? `/api/cartoes/${id}` : '/api/cartoes';
    const method = id ? 'PUT' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        limite: document.getElementById('cartaoLimite').value,
        bandeira: document.getElementById('cartaoBandeira').value,
        tipo: document.getElementById('cartaoTipo').value,
        conta_id: document.getElementById('cartaoConta').value || null,
        dia_fechamento: parseInt(document.getElementById('cartaoDiaFechamento').value) || 1,
        dia_vencimento: parseInt(document.getElementById('cartaoDiaVencimento').value) || 10,
      }),
    });
    if (r.ok) { modalCartao.hide(); loadCartoes(); }
  });

  document.getElementById('btnDeletarCartao')?.addEventListener('click', async () => {
    const id = document.getElementById('cartaoEditId').value;
    if (!id || !confirm('Excluir este cartão?')) return;
    await fetch(`/api/cartoes/${id}`, { method: 'DELETE' });
    modalCartao.hide();
    loadCartoes();
  });

  window.deletarCartaoConfig = async function (id) {
    if (!confirm('Excluir este cartão?')) return;
    await fetch(`/api/cartoes/${id}`, { method: 'DELETE' });
    loadCartoes();
  };

  // ── TRANSFERIR LIMITE ─────────────────────────────
  const modalTransfEl = document.getElementById('modalTransferirLimite');
  const modalTransf = modalTransfEl ? new bootstrap.Modal(modalTransfEl) : null;

  function formatLimite(v) {
    return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  }

  function populateTransfSelects(origemId) {
    const origem = document.getElementById('transfOrigem');
    const destino = document.getElementById('transfDestino');
    origem.innerHTML = _cartoesCache.map(c =>
      `<option value="${c.id}" ${c.id === origemId ? 'selected' : ''}>${esc(c.nome)}</option>`
    ).join('');
    destino.innerHTML = _cartoesCache
      .filter(c => c.id !== origemId)
      .map(c => `<option value="${c.id}">${esc(c.nome)}</option>`)
      .join('');
    updateTransfLimiteLabels();
  }

  function updateTransfLimiteLabels() {
    const origemId = parseInt(document.getElementById('transfOrigem').value);
    const destinoId = parseInt(document.getElementById('transfDestino').value);
    const co = _cartoesCache.find(c => c.id === origemId);
    const cd = _cartoesCache.find(c => c.id === destinoId);
    const elO = document.getElementById('transfOrigemLimite');
    const elD = document.getElementById('transfDestinoLimite');
    if (elO) elO.textContent = co ? 'Limite atual: ' + formatLimite(co.limite) : '';
    if (elD) elD.textContent = cd ? 'Limite atual: ' + formatLimite(cd.limite) : '';
  }

  function syncDestinoOptions() {
    const origemId = parseInt(document.getElementById('transfOrigem').value);
    const destino = document.getElementById('transfDestino');
    const prevVal = parseInt(destino.value);
    destino.innerHTML = _cartoesCache
      .filter(c => c.id !== origemId)
      .map(c => `<option value="${c.id}" ${c.id === prevVal ? 'selected' : ''}>${esc(c.nome)}</option>`)
      .join('');
    updateTransfLimiteLabels();
  }

  window.abrirTransferirLimite = function (id) {
    if (_cartoesCache.length < 2) {
      alert('É necessário ter pelo menos dois cartões para transferir limite.');
      return;
    }
    document.getElementById('transfValor').value = '';
    document.getElementById('transfErro').classList.add('d-none');
    populateTransfSelects(id);
    document.getElementById('transfOrigem').addEventListener('change', syncDestinoOptions);
    document.getElementById('transfDestino').addEventListener('change', updateTransfLimiteLabels);
    modalTransf.show();
  };

  document.getElementById('btnConfirmarTransferir')?.addEventListener('click', async () => {
    const origemId = parseInt(document.getElementById('transfOrigem').value);
    const destinoId = parseInt(document.getElementById('transfDestino').value);
    const valorRaw = document.getElementById('transfValor').value.replace(',', '.');
    const valor = parseFloat(valorRaw);
    const erroEl = document.getElementById('transfErro');

    erroEl.classList.add('d-none');

    if (!valor || valor <= 0) {
      erroEl.textContent = 'Informe um valor válido.';
      erroEl.classList.remove('d-none');
      return;
    }
    if (origemId === destinoId) {
      erroEl.textContent = 'Origem e destino não podem ser o mesmo cartão.';
      erroEl.classList.remove('d-none');
      return;
    }

    const r = await fetch('/api/cartoes/transferir-limite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartao_origem_id: origemId, cartao_destino_id: destinoId, valor }),
    });
    const data = await r.json();
    if (!r.ok) {
      erroEl.textContent = data.error || 'Erro ao transferir.';
      erroEl.classList.remove('d-none');
      return;
    }
    modalTransf.hide();
    loadCartoes();
  });

  // ── GASTOS DEVELOPER ─────────────────────────────────
  const GDEV_GROUPS = [
    { tipo: 'cloud',       label: 'Infraestrutura / Cloud',
      builtins: ['Railway', 'AWS', 'Google Cloud', 'Vercel', 'DigitalOcean', 'Heroku'] },
    { tipo: 'dominio',     label: 'Domínio',
      builtins: ['Hostinger', 'GoDaddy', 'Namecheap', 'Registro.br'] },
    { tipo: 'cdn',         label: 'CDN / Mídia',
      builtins: ['Cloudinary', 'AWS S3', 'Cloudflare'] },
    { tipo: 'email',       label: 'E-mail',
      builtins: ['SendGrid', 'Mailgun', 'Amazon SES'] },
    { tipo: 'store',       label: 'Lojas de Aplicativos',
      builtins: ['Google Play Store', 'Apple App Store'] },
    { tipo: 'api_service', label: 'Serviços / APIs',
      builtins: ['Stripe', 'Twilio', 'Firebase', 'Supabase', 'PlanetScale'] },
    { tipo: 'monitoring',  label: 'Monitoramento',
      builtins: ['Sentry', 'Datadog', 'New Relic', 'LogRocket'] },
    { tipo: 'ci_cd',       label: 'CI/CD',
      builtins: ['GitHub Actions', 'GitLab CI', 'CircleCI'] },
    { tipo: 'storage',     label: 'Armazenamento',
      builtins: ['AWS S3', 'Google Cloud Storage', 'Backblaze B2'] },
    { tipo: 'outro',       label: 'Outros', builtins: [] },
  ];

  async function loadGastosDev() {
    const el = document.getElementById('gastosDevGroups');
    if (!el) return;
    el.innerHTML = '<div class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Carregando...</div>';
    try {
      const r = await fetch('/dev/api/tipos');
      const data = await r.json();
      renderGastosDev(Array.isArray(data) ? data : []);
    } catch {
      el.innerHTML = '<div class="alert alert-danger m-0">Erro ao carregar tipos.</div>';
    }
  }

  const GDEV_ICONS = {
    cloud:       'bi-hdd-network',
    dominio:     'bi-globe2',
    cdn:         'bi-broadcast',
    email:       'bi-envelope',
    store:       'bi-shop-window',
    api_service: 'bi-code-slash',
    monitoring:  'bi-activity',
    ci_cd:       'bi-arrow-repeat',
    storage:     'bi-database',
    outro:       'bi-three-dots',
  };

  function renderGastosDev(customTypes) {
    const el = document.getElementById('gastosDevGroups');
    if (!el) return;

    const byTipo = {};
    customTypes.forEach(t => {
      const k = t.tipo || 'outro';
      if (!byTipo[k]) byTipo[k] = [];
      byTipo[k].push(t);
    });

    el.innerHTML = GDEV_GROUPS.map(group => {
      const customs = byTipo[group.tipo] || [];
      const icon = GDEV_ICONS[group.tipo] || 'bi-tag';

      const builtinItems = group.builtins.map(b =>
        '<div class="sub-item">' +
          '<span class="sub-nome">' + esc(b) + '</span>' +
        '</div>'
      ).join('');

      const customItems = customs.map(t =>
        '<div class="sub-item">' +
          '<span class="sub-nome">' + esc(t.nome) + '</span>' +
          '<div class="sub-actions">' +
            '<button class="btn btn-sm btn-outline-danger py-0 px-1" onclick="deleteGastosDev(' + t.id + ')">' +
              '<i class="bi bi-trash"></i>' +
            '</button>' +
          '</div>' +
        '</div>'
      ).join('');

      const addForm =
        '<div class="d-none mt-2" id="gdevForm_' + group.tipo + '">' +
          '<div class="d-flex gap-2 align-items-center">' +
            '<input class="form-control form-control-sm" id="gdevInput_' + group.tipo + '" maxlength="100" placeholder="Nome do serviço">' +
            '<button class="btn btn-sm btn-success py-0 px-2" onclick="gdevSave(\'' + group.tipo + '\')">' +
              '<i class="bi bi-check-lg"></i>' +
            '</button>' +
            '<button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="gdevHideInput(\'' + group.tipo + '\')">' +
              '<i class="bi bi-x-lg"></i>' +
            '</button>' +
          '</div>' +
        '</div>';

      return '<div class="cat-item" id="gdev-group-' + group.tipo + '">' +
        '<div class="cat-header" onclick="toggleGdev(\'' + group.tipo + '\')">' +
          '<span class="cat-icon"><i class="bi ' + icon + '"></i></span>' +
          '<span class="cat-nome">' + esc(group.label) + '</span>' +
          '<div class="cat-actions" onclick="event.stopPropagation()">' +
            '<button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="gdevShowInput(\'' + group.tipo + '\')">' +
              '<i class="bi bi-plus-lg me-1"></i>Adicionar' +
            '</button>' +
          '</div>' +
          '<i class="bi bi-chevron-down cat-toggle" id="gdevToggle_' + group.tipo + '"></i>' +
        '</div>' +
        '<div class="cat-body" id="gdevBody_' + group.tipo + '">' +
          builtinItems + customItems + addForm +
        '</div>' +
      '</div>';
    }).join('');
  }

  window.toggleGdev = function (tipo) {
    document.getElementById('gdevBody_' + tipo)?.classList.toggle('open');
    document.getElementById('gdevToggle_' + tipo)?.classList.toggle('open');
  };

  window.gdevShowInput = function (tipo) {
    const body = document.getElementById('gdevBody_' + tipo);
    if (body && !body.classList.contains('open')) {
      body.classList.add('open');
      document.getElementById('gdevToggle_' + tipo)?.classList.add('open');
    }
    const form = document.getElementById('gdevForm_' + tipo);
    if (form) form.classList.remove('d-none');
    document.getElementById('gdevInput_' + tipo)?.focus();
  };

  window.gdevHideInput = function (tipo) {
    const form = document.getElementById('gdevForm_' + tipo);
    const input = document.getElementById('gdevInput_' + tipo);
    if (form) form.classList.add('d-none');
    if (input) input.value = '';
  };

  window.gdevSave = async function (tipo) {
    const input = document.getElementById('gdevInput_' + tipo);
    const nome = (input?.value || '').trim();
    if (!nome) { input?.focus(); return; }
    const r = await fetch('/dev/api/tipos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, tipo }),
    });
    if (r.ok) loadGastosDev();
  };

  window.deleteGastosDev = async function (id) {
    if (!confirm('Remover este serviço personalizado?')) return;
    await fetch('/dev/api/tipos/' + id, { method: 'DELETE' });
    loadGastosDev();
  };

  document.getElementById('gastosDevGroups')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const input = e.target;
    if (!input.id.startsWith('gdevInput_')) return;
    e.preventDefault();
    const tipo = input.id.replace('gdevInput_', '');
    window.gdevSave(tipo);
  });

  // ── NOTIFICAÇÕES PUSH ─────────────────────────────────
  let _vapidKey = null;
  let _swReg    = null;
  let _notifInitialized = false;

  function setNotifLabel(text) {
    const el = document.getElementById('notifStatusLabel');
    if (el) el.textContent = text;
  }

  function setNotifUI(subscribed) {
    const icon  = document.getElementById('notifStatusIcon');
    const title = document.getElementById('notifStatusTitle');
    const desc  = document.getElementById('notifStatusDesc');
    const btn   = document.getElementById('btnToggleNotif');
    const test  = document.getElementById('notifTestWrap');

    if (subscribed) {
      if (icon)  { icon.innerHTML = '<i class="bi bi-bell-fill" style="color:#16a34a"></i>'; icon.style.background = '#f0fdf4'; }
      if (title) title.textContent = 'Notificações ativas';
      if (desc)  desc.textContent  = 'Você está recebendo alertas deste dispositivo.';
      if (btn)   btn.dataset.state = 'on';
      if (test)  test.classList.remove('d-none');
      setNotifLabel('Ativas');
    } else {
      if (icon)  { icon.innerHTML = '<i class="bi bi-bell-slash" style="color:#64748b"></i>'; icon.style.background = '#f1f5f9'; }
      if (title) title.textContent = 'Notificações desativadas';
      if (desc)  desc.textContent  = 'Ative para receber alertas sobre vencimentos e faturas.';
      if (btn)   btn.dataset.state = 'off';
      if (test)  test.classList.add('d-none');
      setNotifLabel('Desativadas');
    }
  }

  async function initNotifPanel() {
    if (_notifInitialized) return;
    _notifInitialized = true;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      document.getElementById('notifUnsupported')?.classList.remove('d-none');
      document.getElementById('notifSupported')?.classList.add('d-none');
      setNotifLabel('Não suportado');
      return;
    }

    const permDenied = document.getElementById('notifPermDenied');
    if (Notification.permission === 'denied') {
      permDenied && (permDenied.style.display = '');
      setNotifLabel('Bloqueadas');
      return;
    }

    try {
      const keyResp = await fetch('/api/push/vapid-key');
      const keyData = await keyResp.json();
      _vapidKey = keyData.key;

      _swReg = await navigator.serviceWorker.ready;
      const existing = await _swReg.pushManager.getSubscription();
      setNotifUI(!!existing);
    } catch (e) {
      setNotifLabel('Erro');
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const b64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  document.getElementById('btnToggleNotif')?.addEventListener('click', async () => {
    const btn   = document.getElementById('btnToggleNotif');
    const state = btn.dataset.state;
    btn.disabled = true;

    try {
      if (state === 'on') {
        const sub = await _swReg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        setNotifUI(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          document.getElementById('notifPermDenied').style.display = '';
          btn.disabled = false;
          return;
        }
        const sub = await _swReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(_vapidKey),
        });
        const json = sub.toJSON();
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        });
        setNotifUI(true);
      }
    } catch (err) {
      console.error('Push toggle error:', err);
    }
    btn.disabled = false;
  });

  document.getElementById('btnTestNotif')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnTestNotif');
    const msg = document.getElementById('notifTestMsg');
    btn.disabled = true;
    const r = await fetch('/api/push/test', { method: 'POST' });
    const data = await r.json();
    btn.disabled = false;
    if (msg) {
      msg.className = '';
      msg.style.color = data.ok ? '#16a34a' : '#dc2626';
      msg.textContent = data.ok ? 'Notificação enviada! Verifique seu dispositivo.' : 'Erro ao enviar. Tente novamente.';
      msg.classList.remove('d-none');
    }
  });

  fetch('/api/push/status').then(r => r.json()).then(data => {
    if (data.subscriptions_saved > 0) setNotifLabel('Ativas');
    else setNotifLabel('Desativadas');
  }).catch(() => setNotifLabel('—'));

  // ── RESETAR DADOS ─────────────────────────────────────
  const resetInput = document.getElementById('resetConfirmInput');
  const resetBtn   = document.getElementById('btnResetarDados');
  const resetMsg   = document.getElementById('resetMsg');

  resetInput?.addEventListener('input', () => {
    resetBtn.disabled = resetInput.value.trim() !== 'RESETAR';
  });

  resetBtn?.addEventListener('click', async () => {
    if (resetInput.value.trim() !== 'RESETAR') return;
    resetBtn.disabled = true;
    resetBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Resetando...';
    resetMsg.className = 'cfg-danger-msg d-none';

    const r = await fetch('/api/config/reset-dados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmar: 'RESETAR' }),
    });
    const data = await r.json();

    resetBtn.innerHTML = '<i class="bi bi-trash3-fill"></i> Resetar dados financeiros';
    if (data.ok) {
      resetInput.value = '';
      resetMsg.className = 'cfg-danger-msg cfg-danger-msg--ok';
      const res = data.resultado;
      resetMsg.textContent = `Dados removidos: ${res.lancamentos} lançamentos, ${res.cartoes} cartões, ${res.contas} contas, ${res.orcamentos} orçamentos.`;
    } else {
      resetMsg.className = 'cfg-danger-msg cfg-danger-msg--err';
      resetMsg.textContent = data.error || 'Erro ao resetar dados.';
      resetBtn.disabled = false;
    }
  });

  // ── IMPORTAR / EXPORTAR ───────────────────────────────
  let exportFormato = 'csv';

  document.querySelectorAll('.cfg-format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cfg-format-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      exportFormato = btn.dataset.fmt;
    });
  });

  document.getElementById('btnExportar')?.addEventListener('click', () => {
    const tipo   = document.getElementById('exportTipo')?.value || 'lancamentos';
    const url    = `/api/config/exportar?tipo=${encodeURIComponent(tipo)}&formato=${encodeURIComponent(exportFormato)}`;
    const anchor = document.createElement('a');
    anchor.href  = url;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  });

  // ── CONVITE ───────────────────────────────────────────
  const conviteLink = document.getElementById('conviteLink');
  const whatsappBtn = document.getElementById('btnShareWhatsapp');
  if (conviteLink && whatsappBtn) {
    const url = conviteLink.value;
    const msg = encodeURIComponent('Ei! Estou usando o Fluxara para organizar minhas finanças. Experimente: ' + url);
    whatsappBtn.href = 'https://wa.me/?text=' + msg;
  }

  document.getElementById('btnCopiarConvite')?.addEventListener('click', () => {
    const input = document.getElementById('conviteLink');
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
      const msg = document.getElementById('conviteCopyMsg');
      if (msg) { msg.classList.remove('d-none'); setTimeout(() => msg.classList.add('d-none'), 3000); }
    });
  });
})();
