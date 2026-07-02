(function () {
  'use strict';

  var _recCache = [];
  var _cartoes  = [];
  var _contas   = [];
  var _categorias = [];
  var _tipo     = 'credito';

  var INSTITUICOES = {
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

  var BANDEIRAS = {
    visa:       { nome: 'Visa',       cor: '#1A1F71', svg: 'visa.svg' },
    mastercard: { nome: 'Mastercard', cor: '#EB001B', svg: 'mastercard.svg' },
    elo:        { nome: 'Elo',        cor: '#FFD700', corLetra: '#000' },
    amex:       { nome: 'Amex',       cor: '#2E77BC', svg: 'amex.svg' },
    hipercard:  { nome: 'Hipercard',  cor: '#B22222', svg: 'hipercard.svg' },
    outro:      { nome: 'Outro',      cor: '#6c757d' },
  };

  // ── helpers ──────────────────────────────────────────────────
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _fmt(v) {
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function buildLogoHtml(inst, size) {
    size = size || 36;
    if (inst && inst.svg) {
      return '<div class="conta-picker-logo" style="background:#f8fafc;width:' + size + 'px;height:' + size + 'px">'
        + '<img src="/static/images/bank-icons-logos-svg/' + esc(inst.svg) + '" alt="" style="width:65%;height:65%;object-fit:contain"></div>';
    }
    var bg = (inst && inst.cor) || '#64748b';
    var fg = (inst && inst.corLetra) || '#fff';
    var iconSize = Math.round(size * 0.5) + 'px';
    if (inst && inst.icone) {
      return '<div class="conta-picker-logo" style="background:' + bg + ';color:' + fg + ';width:' + size + 'px;height:' + size + 'px">'
        + '<i class="bi ' + inst.icone + '" style="font-size:' + iconSize + '"></i></div>';
    }
    var letra = (inst && inst.letra) || '?';
    return '<div class="conta-picker-logo" style="background:' + bg + ';color:' + fg + ';width:' + size + 'px;height:' + size + 'px">' + letra + '</div>';
  }

  function buildBandeiraLogoHtml(b, size) {
    size = size || 36;
    if (b && b.svg) {
      return '<div class="conta-picker-logo" style="background:#f8fafc;width:' + size + 'px;height:' + size + 'px">'
        + '<img src="/static/images/bank-icons-logos-svg/' + esc(b.svg) + '" alt="" style="width:65%;height:65%;object-fit:contain"></div>';
    }
    var bg = (b && b.cor) || '#6c757d';
    var fg = (b && b.corLetra) || '#fff';
    var nome = (b && b.nome) || 'Cartão';
    return '<div class="conta-picker-logo" style="background:' + bg + ';color:' + fg + ';width:' + size + 'px;height:' + size + 'px;font-size:.6rem;font-weight:700">' + esc(nome) + '</div>';
  }

  function buildCartaoDualLogo(c, size) {
    var b = BANDEIRAS[c.bandeira] || BANDEIRAS.outro;
    var bandeiraHtml = buildBandeiraLogoHtml(b, size);
    var contaInst = c.conta_instituicao ? String(c.conta_instituicao).toLowerCase() : null;
    var inst = contaInst ? INSTITUICOES[contaInst] : null;
    var bancoHtml = inst ? buildLogoHtml(inst, size) : '';
    return '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0">' + bancoHtml + bandeiraHtml + '</div>';
  }

  // ── generic picker builder ───────────────────────────────────
  function buildPicker(pickerId, triggerEl, selectedEl, dropdownEl, hiddenInput, items, renderFn, onSelect) {
    dropdownEl.innerHTML = items.map(function (item) { return renderFn(item, false); }).join('');

    dropdownEl.querySelectorAll('.conta-picker-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = this.dataset.id;
        hiddenInput.value = id;
        var found = items.find(function (x) { return String(x.id) === String(id); });
        if (found) {
          selectedEl.innerHTML = renderFn(found, true);
          if (onSelect) onSelect(found);
        }
        document.getElementById(pickerId).classList.remove('open');
      });
    });

    triggerEl.addEventListener('click', function (e) {
      e.stopPropagation();
      document.querySelectorAll('.conta-picker.open').forEach(function (p) {
        if (p.id !== pickerId) p.classList.remove('open');
      });
      document.getElementById(pickerId).classList.toggle('open');
    });

    document.getElementById(pickerId).addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  document.addEventListener('click', function () {
    document.querySelectorAll('.conta-picker.open').forEach(function (p) { p.classList.remove('open'); });
  });

  // ── render functions for pickers ────────────────────────────
  function renderConta(c, compact) {
    var inst = INSTITUICOES[c.instituicao] || INSTITUICOES.outro;
    var logo = buildLogoHtml(inst, compact ? 32 : 36);
    if (compact) return logo + '<span class="conta-picker-nome">' + esc(c.nome) + '</span>';
    return '<div class="conta-picker-item" data-id="' + c.id + '">'
      + logo + '<span class="conta-picker-nome">' + esc(c.nome) + '</span></div>';
  }

  function renderCartao(c, compact) {
    var logos = buildCartaoDualLogo(c, compact ? 28 : 32);
    if (compact) return logos + '<span class="conta-picker-nome">' + esc(c.nome) + '</span>';
    return '<div class="conta-picker-item" data-id="' + c.id + '">'
      + logos + '<span class="conta-picker-nome">' + esc(c.nome) + '</span></div>';
  }

  function renderCategoria(c, compact) {
    var color = c.cor_fundo || '#64748b';
    var iconHtml = '<div class="conta-picker-logo" style="background:' + color + '20;color:' + color + '">'
      + '<i class="bi ' + esc(c.icone || 'bi-tag') + '"></i></div>';
    if (compact) return iconHtml + '<span class="conta-picker-nome">' + esc(c.nome) + '</span>';
    return '<div class="conta-picker-item" data-id="' + c.id + '">'
      + iconHtml + '<span class="conta-picker-nome">' + esc(c.nome) + '</span></div>';
  }

  // ── subcategoria ─────────────────────────────────────────────
  function onCategoriaSelect(cat) {
    var grp = document.getElementById('recSubcategoriaGroup');
    var sel = document.getElementById('recSubcategoriaId');
    if (!grp || !sel) return;
    if (cat && cat.subcategorias && cat.subcategorias.length) {
      sel.innerHTML = '<option value="">Selecionar subcategoria...</option>'
        + cat.subcategorias.map(function (s) {
            return '<option value="' + s.id + '">' + esc(s.nome) + '</option>';
          }).join('');
      grp.classList.remove('d-none');
    } else {
      sel.innerHTML = '';
      grp.classList.add('d-none');
    }
  }

  // ── carrega dados iniciais ───────────────────────────────────
  async function init() {
    await Promise.all([loadCartoes(), loadContas(), loadCategorias()]);
    await loadRecs();
  }

  async function loadCartoes() {
    try {
      var r = await fetch('/api/cartoes');
      _cartoes = await r.json();
    } catch (_) { _cartoes = []; }
  }

  async function loadContas() {
    try {
      var r = await fetch('/api/contas');
      var data = await r.json();
      _contas = Array.isArray(data) ? data : [];
    } catch (_) { _contas = []; }
  }

  async function loadCategorias() {
    try {
      var r = await fetch('/api/config/categorias?tipo=despesa');
      var cats = await r.json();
      _categorias = Array.isArray(cats) ? cats : [];
    } catch (_) { _categorias = []; }
  }

  async function loadRecs() {
    try {
      var r = await fetch('/api/recorrencias');
      _recCache = await r.json();
    } catch (_) { _recCache = []; }
    render();
  }

  // ── filtro ───────────────────────────────────────────────────
  var _filtroAtivo = 'todos';

  window.setRecFiltro = function (key) {
    _filtroAtivo = key;
    document.querySelectorAll('.rec-filtro-pill').forEach(function (p) {
      p.classList.toggle('rec-filtro-pill--active', p.dataset.filtro === key);
    });
    renderLista();
  };

  function _filtroKey(rec) {
    if (rec.tipo === 'credito') return 'cartao_' + rec.cartao_id;
    return 'conta_' + rec.conta_id;
  }

  function _buildFiltroBar() {
    var bar = document.getElementById('recFiltroBar');
    var scroll = bar ? bar.querySelector('.rec-filtro-scroll') : null;
    if (!scroll) return;

    var contas  = {};
    var cartoes = {};
    _recCache.forEach(function (r) {
      if (r.tipo === 'debito' && r.conta_id && !contas[r.conta_id]) {
        contas[r.conta_id] = { id: r.conta_id, nome: r.conta_nome || 'Conta', inst: (r.conta_instituicao || 'outro').toLowerCase() };
      }
      if (r.tipo === 'credito' && r.cartao_id && !cartoes[r.cartao_id]) {
        cartoes[r.cartao_id] = { id: r.cartao_id, nome: r.cartao_nome || 'Cartão', bandeira: r.cartao_bandeira, inst: (r.cartao_conta_instituicao || '').toLowerCase() };
      }
    });

    var html = '<button class="rec-filtro-pill' + (_filtroAtivo === 'todos' ? ' rec-filtro-pill--active' : '') + '" data-filtro="todos" onclick="setRecFiltro(\'todos\')">Todas</button>';

    Object.values(contas).forEach(function (c) {
      var inst = INSTITUICOES[c.inst] || INSTITUICOES.outro;
      var logo = buildLogoHtml(inst, 20);
      var key  = 'conta_' + c.id;
      html += '<button class="rec-filtro-pill' + (_filtroAtivo === key ? ' rec-filtro-pill--active' : '') + '" data-filtro="' + key + '" onclick="setRecFiltro(\'' + key + '\')">' + logo + '<span>' + esc(c.nome) + '</span></button>';
    });

    Object.values(cartoes).forEach(function (c) {
      var b    = BANDEIRAS[c.bandeira] || BANDEIRAS.outro;
      var inst = c.inst ? (INSTITUICOES[c.inst] || null) : null;
      var logos = inst
        ? '<div style="display:flex;align-items:center;gap:2px;flex-shrink:0">' + buildLogoHtml(inst, 20) + buildBandeiraLogoHtml(b, 20) + '</div>'
        : buildBandeiraLogoHtml(b, 20);
      var key  = 'cartao_' + c.id;
      html += '<button class="rec-filtro-pill' + (_filtroAtivo === key ? ' rec-filtro-pill--active' : '') + '" data-filtro="' + key + '" onclick="setRecFiltro(\'' + key + '\')">' + logos + '<span>' + esc(c.nome) + '</span></button>';
    });

    scroll.innerHTML = html;
    bar.classList.remove('d-none');
  }

  function _filtroTotal() {
    var items = _recCache.filter(function (r) {
      return _filtroAtivo === 'todos' || _filtroKey(r) === _filtroAtivo;
    });
    var credito = items.filter(function (r) { return r.tipo === 'credito'; }).reduce(function (s, r) { return s + Number(r.valor); }, 0);
    var debito  = items.filter(function (r) { return r.tipo === 'debito';  }).reduce(function (s, r) { return s + Number(r.valor); }, 0);
    var el = document.getElementById('recFiltroTotal');
    if (!el) return;
    var parts = [];
    if (credito > 0) parts.push('<span class="rec-filtro-total-credito">Crédito: ' + _fmt(credito) + '</span>');
    if (debito  > 0) parts.push('<span class="rec-filtro-total-debito">Débito: '   + _fmt(debito)  + '</span>');
    el.innerHTML = parts.join('');
  }

  // ── renderização da lista ────────────────────────────────────
  function render() {
    var loading = document.getElementById('recLoading');
    var vazio   = document.getElementById('recVazio');
    var lista   = document.getElementById('recLista');
    if (loading) loading.classList.add('d-none');
    if (!_recCache.length) {
      if (vazio) vazio.classList.remove('d-none');
      if (lista) lista.classList.add('d-none');
      var bar = document.getElementById('recFiltroBar');
      if (bar) bar.classList.add('d-none');
      return;
    }
    if (vazio) vazio.classList.add('d-none');
    _buildFiltroBar();
    renderLista();
  }

  function renderLista() {
    var lista = document.getElementById('recLista');
    if (!lista) return;
    lista.classList.remove('d-none');

    var items = _recCache.filter(function (r) {
      return _filtroAtivo === 'todos' || _filtroKey(r) === _filtroAtivo;
    });

    var credito = items.filter(function (r) { return r.tipo === 'credito'; });
    var debito  = items.filter(function (r) { return r.tipo === 'debito';  });

    var html = '';
    if (credito.length) {
      html += '<div class="rec-group-header"><i class="bi bi-credit-card-fill me-1"></i>Crédito automático</div>';
      html += '<div class="rec-card">' + credito.map(renderRow).join('') + '</div>';
    }
    if (debito.length) {
      html += '<div class="rec-group-header"><i class="bi bi-bank me-1"></i>Débito automático</div>';
      html += '<div class="rec-card">' + debito.map(renderRow).join('') + '</div>';
    }
    if (!html) {
      html = '<div class="rec-vazio-filtro"><i class="bi bi-funnel"></i><p>Nenhum item neste filtro</p></div>';
    }
    lista.innerHTML = html;
    _filtroTotal();
  }

  function _buildLogoColuna(rec) {
    if (rec.tipo === 'credito') {
      var b    = BANDEIRAS[(rec.cartao_bandeira || '').toLowerCase()] || BANDEIRAS.outro;
      var inst = rec.cartao_conta_instituicao ? INSTITUICOES[(rec.cartao_conta_instituicao || '').toLowerCase()] : null;
      if (inst) {
        return '<div class="rec-logo-col">' + buildLogoHtml(inst, 32) + buildBandeiraLogoHtml(b, 32) + '</div>';
      }
      return '<div class="rec-logo-col">' + buildBandeiraLogoHtml(b, 40) + '</div>';
    }
    var instKey = (rec.conta_instituicao || 'outro').toLowerCase();
    var instObj = INSTITUICOES[instKey] || INSTITUICOES.outro;
    return '<div class="rec-logo-col">' + buildLogoHtml(instObj, 40) + '</div>';
  }

  function renderRow(rec) {
    var isAtivo   = rec.ativo;
    var ref       = rec.tipo === 'credito'
      ? (rec.cartao_nome ? esc(rec.cartao_nome) : '—')
      : (rec.conta_nome  ? esc(rec.conta_nome)  : '—');
    var meta = 'Todo dia ' + rec.dia_vencimento + ' · ' + ref;
    if (rec.hora_execucao) meta += ' · às ' + String(rec.hora_execucao).slice(0, 5);
    if (rec.categoria_nome) meta += ' · ' + esc(rec.categoria_nome);

    var toggleClass = isAtivo ? 'rec-toggle--ativo' : 'rec-toggle--pausado';
    var toggleLabel = isAtivo ? 'Ativo' : 'Pausado';
    var rowOpacity  = isAtivo ? '' : ' style="opacity:.55"';

    return '<div class="rec-row"' + rowOpacity + '>' +
      _buildLogoColuna(rec) +
      '<div class="rec-info">' +
        '<div class="rec-nome">' + esc(rec.nome) + '</div>' +
        '<div class="rec-meta">' + meta + '</div>' +
      '</div>' +
      '<div class="rec-right">' +
        '<div class="rec-valor">' + _fmt(rec.valor) + '</div>' +
        '<div class="rec-actions">' +
          '<button class="rec-toggle ' + toggleClass + '" onclick="toggleRec(' + rec.id + ')">' + toggleLabel + '</button>' +
          '<button class="rec-btn-edit" onclick="editarRec(' + rec.id + ')" title="Editar"><i class="bi bi-pencil"></i></button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ── modal ────────────────────────────────────────────────────
  var _pickersBuilt = false;

  function _buildPickers() {
    if (_pickersBuilt) return;
    _pickersBuilt = true;

    buildPicker(
      'recCartaoPicker',
      document.getElementById('recCartaoTrigger'),
      document.getElementById('recCartaoSelected'),
      document.getElementById('recCartaoDropdown'),
      document.getElementById('recCartaoId'),
      _cartoes,
      renderCartao,
      null
    );

    buildPicker(
      'recContaPicker',
      document.getElementById('recContaTrigger'),
      document.getElementById('recContaSelected'),
      document.getElementById('recContaDropdown'),
      document.getElementById('recContaId'),
      _contas,
      renderConta,
      null
    );

    buildPicker(
      'recCategoriaPicker',
      document.getElementById('recCategoriaTrigger'),
      document.getElementById('recCategoriaSelected'),
      document.getElementById('recCategoriaDropdown'),
      document.getElementById('recCategoriaId'),
      _categorias,
      renderCategoria,
      onCategoriaSelect
    );
  }

  function _resetPicker(pickerId, selectedId, hiddenId, placeholder) {
    var sel = document.getElementById(selectedId);
    if (sel) sel.innerHTML = '<span class="text-muted" style="font-size:.85rem">' + placeholder + '</span>';
    var hid = document.getElementById(hiddenId);
    if (hid) hid.value = '';
    var p = document.getElementById(pickerId);
    if (p) p.classList.remove('open');
  }

  function _setTipo(tipo) {
    _tipo = tipo;
    document.querySelectorAll('.rec-tipo-btn').forEach(function (btn) {
      btn.classList.toggle('rec-tipo-btn--active', btn.dataset.tipo === tipo);
    });
    var cartaoGrp = document.getElementById('recCartaoGroup');
    var contaGrp  = document.getElementById('recContaGroup');
    if (cartaoGrp) cartaoGrp.classList.toggle('d-none', tipo !== 'credito');
    if (contaGrp)  contaGrp.classList.toggle('d-none',  tipo !== 'debito');
  }

  function _clearModal() {
    document.getElementById('recEditId').value = '';
    document.getElementById('recNome').value   = '';
    document.getElementById('recValor').value  = '';
    document.getElementById('recDia').value    = '';
    var horaEl = document.getElementById('recHora');
    if (horaEl) horaEl.value = '';
    var errEl = document.getElementById('recError');
    if (errEl) errEl.style.display = 'none';
    document.getElementById('recBtnDeletar').classList.add('d-none');
    document.getElementById('recTipoGroup').style.display = '';

    _resetPicker('recCartaoPicker',   'recCartaoSelected',   'recCartaoId',   'Selecionar cartão...');
    _resetPicker('recContaPicker',    'recContaSelected',    'recContaId',    'Selecionar conta...');
    _resetPicker('recCategoriaPicker','recCategoriaSelected','recCategoriaId','Sem categoria');

    var subGrp = document.getElementById('recSubcategoriaGroup');
    var subSel = document.getElementById('recSubcategoriaId');
    if (subGrp) subGrp.classList.add('d-none');
    if (subSel) subSel.value = '';

    _setTipo('credito');
  }

  function _preselectPickerItem(pickerId, selectedId, hiddenId, items, id, renderFn, onSelect) {
    var found = items.find(function (x) { return String(x.id) === String(id); });
    if (!found) return;
    var hidEl = document.getElementById(hiddenId);
    var selEl = document.getElementById(selectedId);
    if (hidEl) hidEl.value = found.id;
    if (selEl) selEl.innerHTML = renderFn(found, true);
    if (onSelect) onSelect(found);
  }

  function abrirModal() {
    _clearModal();
    _buildPickers();
    document.getElementById('recModalTitulo').textContent = 'Nova Recorrência';
    document.getElementById('recOverlay').style.display = '';
  }

  window.editarRec = function (id) {
    var rec = _recCache.find(function (r) { return r.id === id; });
    if (!rec) return;
    _clearModal();
    _buildPickers();
    document.getElementById('recEditId').value = rec.id;
    document.getElementById('recNome').value   = rec.nome || '';
    document.getElementById('recValor').value  = parseFloat(rec.valor) || '';
    document.getElementById('recDia').value    = rec.dia_vencimento || '';
    var horaEl = document.getElementById('recHora');
    if (horaEl) horaEl.value = rec.hora_execucao ? String(rec.hora_execucao).slice(0, 5) : '';
    _setTipo(rec.tipo);
    document.getElementById('recTipoGroup').style.display = 'none';

    if (rec.tipo === 'credito' && rec.cartao_id) {
      _preselectPickerItem('recCartaoPicker','recCartaoSelected','recCartaoId', _cartoes, rec.cartao_id, renderCartao, null);
    }
    if (rec.tipo === 'debito' && rec.conta_id) {
      _preselectPickerItem('recContaPicker','recContaSelected','recContaId', _contas, rec.conta_id, renderConta, null);
    }
    if (rec.categoria_id) {
      _preselectPickerItem('recCategoriaPicker','recCategoriaSelected','recCategoriaId', _categorias, rec.categoria_id, renderCategoria, function (cat) {
        onCategoriaSelect(cat);
        var subSel = document.getElementById('recSubcategoriaId');
        if (subSel && rec.subcategoria_id) subSel.value = rec.subcategoria_id;
      });
    }

    document.getElementById('recModalTitulo').textContent = 'Editar Recorrência';
    document.getElementById('recBtnDeletar').classList.remove('d-none');
    document.getElementById('recOverlay').style.display = '';
  };

  window.closeRecModal = function (e) {
    if (e && e.target !== document.getElementById('recOverlay')) return;
    document.getElementById('recOverlay').style.display = 'none';
  };

  // ── salvar ───────────────────────────────────────────────────
  window.salvarRec = async function () {
    var errEl = document.getElementById('recError');
    errEl.style.display = 'none';
    var editId = document.getElementById('recEditId').value;
    var subSel = document.getElementById('recSubcategoriaId');
    var payload = {
      nome:             (document.getElementById('recNome').value || '').trim(),
      tipo:             _tipo,
      valor:            parseFloat(document.getElementById('recValor').value) || 0,
      dia_vencimento:   parseInt(document.getElementById('recDia').value) || 0,
      categoria_id:     document.getElementById('recCategoriaId').value || null,
      subcategoria_id:  subSel && subSel.value ? subSel.value : null,
      cartao_id:        _tipo === 'credito' ? (document.getElementById('recCartaoId').value || null) : null,
      conta_id:         _tipo === 'debito'  ? (document.getElementById('recContaId').value  || null) : null,
    };

    var horaEl = document.getElementById('recHora');
    payload.hora_execucao = horaEl && horaEl.value ? horaEl.value : null;

    var btn = document.getElementById('recBtnSalvar');
    btn.disabled = true;
    try {
      var url    = editId ? '/api/recorrencias/' + editId : '/api/recorrencias';
      var method = editId ? 'PUT' : 'POST';
      var resp = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var json = await resp.json();
      if (!resp.ok) {
        errEl.textContent = json.error || 'Erro ao salvar.';
        errEl.style.display = '';
        return;
      }
      document.getElementById('recOverlay').style.display = 'none';
      await loadRecs();
    } catch (_) {
      errEl.textContent = 'Erro de conexão.';
      errEl.style.display = '';
    } finally {
      btn.disabled = false;
    }
  };

  // ── toggle ───────────────────────────────────────────────────
  window.toggleRec = async function (id) {
    try {
      await fetch('/api/recorrencias/' + id + '/toggle', { method: 'POST' });
      await loadRecs();
    } catch (_) {}
  };

  // ── deletar ──────────────────────────────────────────────────
  window.deletarRec = async function () {
    var editId = document.getElementById('recEditId').value;
    if (!editId) return;
    var rec = _recCache.find(function (r) { return r.id === parseInt(editId); });
    var nome = rec ? rec.nome : 'esta recorrência';
    if (!confirm('Excluir "' + nome + '"? Esta ação não pode ser desfeita.')) return;
    try {
      await fetch('/api/recorrencias/' + editId, { method: 'DELETE' });
      document.getElementById('recOverlay').style.display = 'none';
      await loadRecs();
    } catch (_) {}
  };

  // ── usar hora atual ──────────────────────────────────────────
  window.recUsarHoraAtual = function () {
    var horaEl = document.getElementById('recHora');
    if (!horaEl) return;
    var agora = new Date();
    var h = String(agora.getHours()).padStart(2, '0');
    var m = String(agora.getMinutes()).padStart(2, '0');
    horaEl.value = h + ':' + m;
  };

  // ── processar agora (teste) ──────────────────────────────────
  window.processarAgora = async function () {
    var btn = document.getElementById('recBtnProcessar');
    var res = document.getElementById('recProcessarResult');
    if (btn) btn.disabled = true;
    if (res) res.style.display = 'none';
    try {
      var resp = await fetch('/api/recorrencias/processar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forcar: true })
      });
      var json = await resp.json();
      if (res) {
        var count = (json.processados || []).length;
        if (count > 0) {
          var nomes = json.processados.map(function (p) { return esc(p.nome); }).join(', ');
          res.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i>' +
            count + ' recorrência(s) processada(s): ' + nomes;
          res.className = 'rec-processar-result rec-processar-result--ok';
        } else {
          res.innerHTML = '<i class="bi bi-info-circle me-1"></i>Nenhuma recorrência pendente para hoje.';
          res.className = 'rec-processar-result rec-processar-result--info';
        }
        res.style.display = '';
        await loadRecs();
      }
    } catch (_) {
      if (res) {
        res.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Erro ao processar.';
        res.className = 'rec-processar-result rec-processar-result--err';
        res.style.display = '';
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // ── relógio local ─────────────────────────────────────────────
  function _atualizarRelogio() {
    var el = document.getElementById('recHoraLocalDisplay');
    if (!el) return;
    var agora = new Date();
    el.textContent = String(agora.getHours()).padStart(2, '0') + ':' +
                     String(agora.getMinutes()).padStart(2, '0') + ':' +
                     String(agora.getSeconds()).padStart(2, '0');
  }

  // ── eventos ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var fab = document.getElementById('btnNovaRec');
    if (fab) fab.addEventListener('click', abrirModal);

    document.querySelectorAll('.rec-tipo-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { _setTipo(btn.dataset.tipo); });
    });

    _atualizarRelogio();
    setInterval(_atualizarRelogio, 1000);

    init();
  });
})();
