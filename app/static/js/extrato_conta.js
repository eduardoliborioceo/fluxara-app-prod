(function () {
  var MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

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
    outro:       { cor: '#6c757d', icone: 'bi-wallet2' },
  };

  var cfg = document.getElementById('extratoConfig');
  var contaId = parseInt(cfg.dataset.id);
  var contaInstituicao = cfg.dataset.instituicao || 'outro';

  var params = new URLSearchParams(window.location.search);
  var now = new Date();
  var month = parseInt(params.get('mes') || (now.getMonth() + 1)) - 1;
  var year  = parseInt(params.get('ano') || now.getFullYear());

  var categoriasData = [];
  var categoriasMapa = {};
  var editEfetivado = true;
  var pendingDeleteId = null;
  var pendingDeleteType = null;
  var pendingGrupoId = null;

  var allTransactions = [];
  var activeStatusFilter = 'todas';
  var filterDataDe = '';
  var filterDataAte = '';

  var selectMode = false;
  var selectedIds = new Set();

  var allUserTags = [];
  var lancamentoTagsMapa = {};
  var activeTagFilter = null;
  var editCurrentTags = [];
  var editSelectedColor = '#6366f1';

  var TAG_COLORS = [
    '#6366f1', '#0d6efd', '#198754', '#dc3545', '#fd7e14',
    '#f59e0b', '#0891b2', '#7c3aed', '#db2777', '#64748b',
  ];

  function esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function hexToAlpha(hex, alpha) {
    var r = parseInt(hex.slice(1,3), 16);
    var g = parseInt(hex.slice(3,5), 16);
    var b = parseInt(hex.slice(5,7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function formatMoney(v) {
    return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function parseDate(raw) {
    if (!raw) return null;
    var s = String(raw).substring(0, 10);
    var d = new Date(s + 'T12:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(raw) {
    var d = parseDate(raw);
    return d ? d.toLocaleDateString('pt-BR') : '—';
  }

  function updateMesLabel() {
    document.getElementById('mesLabel').textContent = MESES[month] + ' ' + year;
  }

  document.getElementById('btnMesAnterior').addEventListener('click', function () {
    month--;
    if (month < 0) { month = 11; year--; }
    updateMesLabel();
    loadExtrato();
  });

  document.getElementById('btnMesPosterior').addEventListener('click', function () {
    month++;
    if (month > 11) { month = 0; year++; }
    updateMesLabel();
    loadExtrato();
  });

  updateMesLabel();

  function buildLogoHtml(inst, size) {
    size = size || 38;
    if (inst && inst.svg) {
      return '<div class="extrato-header-logo" style="background:#f8fafc;width:' + size + 'px;height:' + size + 'px">'
        + '<img src="/static/images/bank-icons-logos-svg/' + esc(inst.svg) + '" style="width:65%;height:65%;object-fit:contain"></div>';
    }
    var bg = (inst && inst.cor) || '#6c757d';
    if (inst && inst.icone) {
      return '<div class="extrato-header-logo" style="background:' + bg + ';width:' + size + 'px;height:' + size + 'px">'
        + '<i class="bi ' + inst.icone + '" style="font-size:' + Math.round(size * 0.45) + 'px;color:#fff"></i></div>';
    }
    var fg = (inst && inst.corLetra) || '#fff';
    var letra = (inst && inst.letra) || '';
    return '<div class="extrato-header-logo" style="background:' + bg + ';color:' + fg + ';width:' + size + 'px;height:' + size + 'px">' + letra + '</div>';
  }

  async function loadContaInfo() {
    try {
      var r = await fetch('/api/contas');
      var data = await r.json();
      var conta = Array.isArray(data) ? data.find(function (c) { return c.id === contaId; }) : null;
      if (!conta) return;
      var inst = INSTITUICOES[conta.instituicao] || INSTITUICOES.outro;
      document.getElementById('extratoLogo').outerHTML = buildLogoHtml(inst, 38);
      var saldoAtual = parseFloat(conta.saldo_atual != null ? conta.saldo_atual : conta.saldo_inicial) || 0;
      var saldoPrevisto = parseFloat(conta.saldo_previsto != null ? conta.saldo_previsto : saldoAtual);
      var txt = 'Saldo: ' + formatMoney(saldoAtual);
      if (Math.abs(saldoPrevisto - saldoAtual) > 0.01) txt += '  ·  Previsto: ' + formatMoney(saldoPrevisto);
      document.getElementById('extratoSaldoInfo').textContent = txt;
    } catch (e) {}
  }

  async function loadUserTags() {
    try {
      var r = await fetch('/api/tags');
      var data = await r.json();
      allUserTags = Array.isArray(data) ? data : [];
    } catch (e) { allUserTags = []; }
    renderTagsBar();
  }

  function renderTagsBar() {
    var bar = document.getElementById('extratoTagsBar');
    if (!allUserTags.length) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    bar.innerHTML = allUserTags.map(function (t) {
      var isActive = activeTagFilter === t.id;
      var bg = isActive ? t.cor : hexToAlpha(t.cor, 0.1);
      var color = isActive ? '#fff' : t.cor;
      return '<button class="extrato-tag-filter-pill' + (isActive ? ' active' : '') + '" data-tag-id="' + t.id + '"'
        + ' style="background:' + bg + ';color:' + color + ';border-color:' + t.cor + '">'
        + '<i class="bi bi-tag-fill" style="font-size:.65rem;margin-right:2px"></i>'
        + '<span class="extrato-tag-pill-nome">' + esc(t.nome) + '</span>'
        + '<span class="extrato-tag-pill-del" data-tag-id="' + t.id + '" title="Excluir tag">×</span>'
        + '</button>';
    }).join('');

    bar.querySelectorAll('.extrato-tag-filter-pill').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        if (e.target.closest('.extrato-tag-pill-del')) return;
        var id = parseInt(this.dataset.tagId);
        activeTagFilter = (activeTagFilter === id) ? null : id;
        renderTagsBar();
        applyFilters();
      });
    });

    bar.querySelectorAll('.extrato-tag-pill-del').forEach(function (del) {
      del.addEventListener('click', async function (e) {
        e.stopPropagation();
        var tagId = parseInt(this.dataset.tagId);
        var tag = allUserTags.find(function (t) { return t.id === tagId; });
        if (!tag) return;
        if (!confirm('Excluir a tag "' + tag.nome + '"?\nEla será removida de todas as transações.')) return;
        try {
          var r = await fetch('/api/tags/' + tagId, { method: 'DELETE' });
          if (r.ok) {
            allUserTags = allUserTags.filter(function (t) { return t.id !== tagId; });
            Object.keys(lancamentoTagsMapa).forEach(function (lid) {
              lancamentoTagsMapa[lid] = lancamentoTagsMapa[lid].filter(function (t) { return t.id !== tagId; });
            });
            if (activeTagFilter === tagId) activeTagFilter = null;
            renderTagsBar();
            applyFilters();
          }
        } catch (err) {}
      });
    });
  }

  async function loadAllLancamentoTags(transactions) {
    var ids = transactions.filter(function (tx) { return !tx.is_fatura_aberta && typeof tx.id === 'number'; }).map(function (tx) { return tx.id; });
    if (!ids.length) return;
    try {
      var r = await fetch('/api/lancamentos/tags/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ids }),
      });
      var data = r.ok ? await r.json() : {};
      ids.forEach(function (id) { lancamentoTagsMapa[id] = data[id] || []; });
    } catch (e) {}
  }

  var tipoMap = {
    receita:               { icon: 'bi-arrow-down-circle',  cls: 'extrato-tx-icon--receita',        valCls: 'extrato-tx-valor--receita',        prefix: '+', label: 'Receita' },
    despesa:               { icon: 'bi-arrow-up-circle',    cls: 'extrato-tx-icon--despesa',         valCls: 'extrato-tx-valor--despesa',         prefix: '−', label: 'Despesa' },
    transferencia_saida:   { icon: 'bi-arrow-right-circle', cls: 'extrato-tx-icon--transferencia',   valCls: 'extrato-tx-valor--transferencia',   prefix: '−', label: 'Transferência' },
    transferencia_entrada: { icon: 'bi-arrow-left-circle',  cls: 'extrato-tx-icon--transferencia',   valCls: 'extrato-tx-valor--transferencia',   prefix: '+', label: 'Transferência' },
  };

  function renderTx(tx) {
    if (tx.is_fatura_aberta) {
      var dateStr = formatDate(tx.data_vencimento);
      return '<div class="extrato-tx-item extrato-tx-item--fatura" data-id="' + esc(tx.id) + '" data-tipo="despesa" data-valor="' + parseFloat(tx.valor || 0) + '" data-prefix="−">'
        + '<div class="extrato-tx-icon extrato-tx-icon--despesa"><i class="bi bi-credit-card-2-front"></i></div>'
        + '<div class="extrato-tx-info">'
        +   '<div class="extrato-tx-desc">' + esc(tx.descricao || 'Fatura em aberto') + '</div>'
        +   '<div class="extrato-tx-meta">Venc. ' + dateStr + ' · <span style="color:#fd7e14;font-weight:700">Fatura em aberto</span></div>'
        + '</div>'
        + '<div class="extrato-tx-right">'
        +   '<div class="extrato-tx-valor extrato-tx-valor--despesa">− ' + formatMoney(tx.valor) + '</div>'
        +   '<div class="extrato-tx-status extrato-tx-status--pendente"><i class="bi bi-clock-fill"></i></div>'
        + '</div>'
        + '</div>';
    }

    var m = tipoMap[tx.tipo] || tipoMap.despesa;
    var dateStr = formatDate(tx.data_vencimento);
    var isFuture = tx.data_vencimento && parseDate(tx.data_vencimento) > now;

    var catIcon = m.icon;
    if (tx.categoria_id && categoriasMapa[tx.categoria_id]) {
      var cat = categoriasMapa[tx.categoria_id];
      if (cat.icone) catIcon = cat.icone.replace(/^bi-/, '');
    }

    var isSelected = selectedIds.has(tx.id);
    var selectedCls = isSelected ? ' extrato-tx-item--selected' : '';
    var checkHtml = selectMode
      ? '<div class="extrato-tx-check ' + (isSelected ? 'extrato-tx-check--on' : '') + '">'
        + '<i class="bi ' + (isSelected ? 'bi-check-circle-fill' : 'bi-circle') + '"></i></div>'
      : '';

    var statusCls = tx.efetivado ? 'extrato-tx-status--efetivado' : 'extrato-tx-status--pendente';
    var statusIcon = tx.efetivado ? 'bi-check' : 'bi-clock-fill';

    var metaParts = [dateStr];
    if (tx.conta_parceira_nome) {
      metaParts.push('→ ' + esc(tx.conta_parceira_nome));
    } else {
      if (tx.categoria_nome) metaParts.push(esc(tx.categoria_nome));
    }
    if (isFuture) metaParts.push('<span class="extrato-badge extrato-badge--futuro">Futuro</span>');

    var txTags = lancamentoTagsMapa[tx.id] || [];
    var tagsInlineParts = txTags.map(function (t) {
      return '<span class="extrato-tx-tag-inline" style="background:' + hexToAlpha(t.cor, 0.14) + ';color:' + t.cor + '">' + esc(t.nome) + '</span>';
    });

    var metaHtml = metaParts.join(' · ');
    if (tagsInlineParts.length) {
      metaHtml += ' ' + tagsInlineParts.join(' ');
    }

    return '<div class="extrato-tx-item' + selectedCls + '" data-id="' + tx.id + '" data-tipo="' + esc(tx.tipo) + '" data-valor="' + parseFloat(tx.valor || 0) + '" data-prefix="' + m.prefix + '">'
      + checkHtml
      + '<div class="extrato-tx-icon ' + m.cls + '"><i class="bi bi-' + catIcon + '"></i></div>'
      + '<div class="extrato-tx-info">'
      +   '<div class="extrato-tx-desc">' + esc(tx.descricao || 'Sem descrição') + '</div>'
      +   '<div class="extrato-tx-meta">' + metaHtml + '</div>'
      + '</div>'
      + '<div class="extrato-tx-right">'
      +   '<div class="extrato-tx-valor ' + m.valCls + '">' + m.prefix + ' ' + formatMoney(tx.valor) + '</div>'
      +   '<div class="extrato-tx-status ' + statusCls + '"><i class="bi ' + statusIcon + '"></i></div>'
      + '</div>'
      + '</div>';
  }

  function formatDateGroupHeader(dateKey) {
    var d = parseDate(dateKey);
    if (!d) return 'Sem data';
    var dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    var meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return dias[d.getDay()] + ', ' + d.getDate() + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear();
  }

  function updateTagTotal(filtered) {
    var el = document.getElementById('extratoTagTotal');
    if (!el) return;
    if (activeTagFilter === null) { el.style.display = 'none'; return; }
    var total = 0;
    var count = 0;
    filtered.forEach(function (tx) {
      if (tx.is_fatura_aberta) { total -= parseFloat(tx.valor || 0); count++; return; }
      var m = tipoMap[tx.tipo] || tipoMap.despesa;
      total += (m.prefix === '+' ? 1 : -1) * parseFloat(tx.valor || 0);
      count++;
    });
    var tag = allUserTags.find(function (t) { return t.id === activeTagFilter; });
    var tagNome = tag ? tag.nome : '';
    var tagCor  = tag ? tag.cor  : '#6366f1';
    var prefix  = total >= 0 ? '+' : '−';
    var valCls  = total >= 0 ? 'extrato-tag-total-value--pos' : 'extrato-tag-total-value--neg';
    el.style.display = 'flex';
    el.innerHTML = '<span class="extrato-tag-total-chip" style="background:' + hexToAlpha(tagCor, 0.12) + ';color:' + tagCor + '">'
      + '<i class="bi bi-tag-fill" style="font-size:.65rem"></i>'
      + esc(tagNome) + '</span>'
      + '<span class="extrato-tag-total-info">'
      +   '<span class="extrato-tag-total-count">' + count + (count === 1 ? ' transação' : ' transações') + '</span>'
      +   '<span class="extrato-tag-total-sep">·</span>'
      +   '<span class="extrato-tag-total-value ' + valCls + '">' + prefix + ' ' + formatMoney(Math.abs(total)) + '</span>'
      + '</span>';
  }

  function applyFilters() {
    var body = document.getElementById('extratoBody');
    var filtered = allTransactions.filter(function (tx) {
      if (activeStatusFilter === 'efetivadas' && !tx.efetivado) return false;
      if (activeStatusFilter === 'pendentes' && tx.efetivado) return false;
      if (filterDataDe) {
        var d = parseDate(tx.data_vencimento);
        if (!d || d < new Date(filterDataDe + 'T00:00:00')) return false;
      }
      if (filterDataAte) {
        var d = parseDate(tx.data_vencimento);
        if (!d || d > new Date(filterDataAte + 'T23:59:59')) return false;
      }
      if (activeTagFilter !== null) {
        var txTags = lancamentoTagsMapa[tx.id] || [];
        if (!txTags.some(function (t) { return t.id === activeTagFilter; })) return false;
      }
      return true;
    });
    updateTagTotal(filtered);
    if (!filtered.length) {
      body.innerHTML = '<div class="text-center py-4 text-muted small">'
        + '<i class="bi bi-funnel d-block mb-1" style="font-size:1.8rem;opacity:.3"></i>'
        + 'Nenhuma transação encontrada</div>';
      return;
    }

    var byDate = {};
    var dateOrder = [];
    filtered.forEach(function (tx) {
      var key = tx.data_vencimento ? String(tx.data_vencimento).substring(0, 10) : '__sem_data__';
      if (!byDate[key]) { byDate[key] = []; dateOrder.push(key); }
      byDate[key].push(tx);
    });
    dateOrder.sort(function (a, b) {
      if (a === '__sem_data__') return 1;
      if (b === '__sem_data__') return -1;
      return a < b ? -1 : a > b ? 1 : 0;
    });

    var html = '';
    dateOrder.forEach(function (key) {
      var isSemData = key === '__sem_data__';
      var label = isSemData ? 'Sem data' : formatDateGroupHeader(key);
      var txs = byDate[key];
      var groupCls = isSemData ? ' extrato-date-group--sem-data' : '';
      var groupTotal = 0;
      txs.forEach(function (tx) {
        if (tx.is_fatura_aberta) { groupTotal -= parseFloat(tx.valor || 0); return; }
        var m = tipoMap[tx.tipo] || tipoMap.despesa;
        groupTotal += (m.prefix === '+' ? 1 : -1) * parseFloat(tx.valor || 0);
      });
      var totalCls = groupTotal >= 0 ? 'extrato-group-total--pos' : 'extrato-group-total--neg';
      var totalStr = (groupTotal >= 0 ? '+' : '−') + ' ' + formatMoney(Math.abs(groupTotal));
      html += '<div class="extrato-date-group' + groupCls + '">';
      html += '<div class="extrato-date-header"><span class="extrato-date-label">' + esc(label) + '</span>'
            + '<span class="extrato-group-total ' + totalCls + '">' + totalStr + '</span></div>';
      html += '<div class="extrato-tx-list">';
      txs.forEach(function (tx) { html += renderTx(tx); });
      html += '</div>';
      html += '</div>';
    });

    body.innerHTML = html;
    body.querySelectorAll('.extrato-tx-item').forEach(function (el) {
      el.addEventListener('click', function () {
        if (this.classList.contains('extrato-tx-item--fatura')) return;
        var id = parseInt(this.dataset.id);
        if (selectMode) {
          if (selectedIds.has(id)) {
            selectedIds.delete(id);
          } else {
            selectedIds.add(id);
          }
          applyFilters();
          updateSumBar();
        } else {
          openEditSheet(id, this.dataset.tipo);
        }
      });
    });
  }

  function updateSumBar() {
    var bar = document.getElementById('extratoSumBar');
    var countEl = document.getElementById('extratoSumCount');
    var totalEl = document.getElementById('extratoSumTotal');
    if (!selectedIds.size) {
      bar.style.display = 'none';
      return;
    }
    var sum = 0;
    document.querySelectorAll('.extrato-tx-item').forEach(function (el) {
      var id = parseInt(el.dataset.id);
      if (selectedIds.has(id)) {
        var val = parseFloat(el.dataset.valor || 0);
        var prefix = el.dataset.prefix;
        sum += (prefix === '+' ? 1 : -1) * val;
      }
    });
    var n = selectedIds.size;
    countEl.textContent = n + (n === 1 ? ' selecionada' : ' selecionadas');
    var prefix = sum >= 0 ? '+' : '−';
    totalEl.textContent = prefix + ' ' + formatMoney(Math.abs(sum));
    totalEl.className = 'extrato-sum-total ' + (sum >= 0 ? 'extrato-sum-total--pos' : 'extrato-sum-total--neg');
    bar.style.display = 'flex';
  }

  async function loadExtrato() {
    var body = document.getElementById('extratoBody');
    body.innerHTML = '<div class="text-center py-4 text-muted small">Carregando...</div>';
    selectedIds.clear();
    document.getElementById('extratoSumBar').style.display = 'none';
    try {
      var mes = month + 1;
      var results = await Promise.all([
        fetch('/api/contas/' + contaId + '/lancamentos?mes=' + mes + '&ano=' + year).then(function (r) { return r.json(); }),
        fetch('/api/contas/' + contaId + '/fatura-aberta?mes=' + mes + '&ano=' + year).then(function (r) { return r.json(); }).catch(function () { return []; }),
      ]);
      allTransactions = Array.isArray(results[0]) ? results[0] : [];
      var faturas = Array.isArray(results[1]) ? results[1] : [];
      faturas.forEach(function (f) {
        allTransactions.push({
          id: 'fatura_' + f.cartao_id,
          tipo: 'despesa',
          descricao: 'Fatura em aberto \u2014 ' + f.cartao_nome,
          valor: f.fatura_total,
          data_vencimento: f.data_vencimento,
          efetivado: false,
          is_fatura_aberta: true,
        });
      });
      if (!allTransactions.length) {
        body.innerHTML = '<div class="text-center py-4 text-muted small">'
          + '<i class="bi bi-inbox d-block mb-1" style="font-size:1.8rem;opacity:.3"></i>'
          + 'Nenhuma transação neste mês</div>';
        return;
      }
      await loadAllLancamentoTags(allTransactions);
      applyFilters();
    } catch (e) {
      body.innerHTML = '<div class="text-center py-4 text-muted small">Erro ao carregar transações.</div>';
    }
  }

  document.querySelectorAll('.extrato-status-pill').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.extrato-status-pill').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      activeStatusFilter = this.dataset.status;
      applyFilters();
    });
  });

  document.getElementById('filtroDataDe').addEventListener('change', function () {
    filterDataDe = this.value;
    applyFilters();
  });

  document.getElementById('filtroDataAte').addEventListener('change', function () {
    filterDataAte = this.value;
    applyFilters();
  });

  document.getElementById('btnLimparFiltro').addEventListener('click', function () {
    filterDataDe = '';
    filterDataAte = '';
    document.getElementById('filtroDataDe').value = '';
    document.getElementById('filtroDataAte').value = '';
    applyFilters();
  });

  async function loadCategoriasAll() {
    try {
      var [rRec, rDesp] = await Promise.all([
        fetch('/api/config/categorias?tipo=receita'),
        fetch('/api/config/categorias?tipo=despesa'),
      ]);
      var rec = await rRec.json();
      var desp = await rDesp.json();
      var all = (Array.isArray(rec) ? rec : []).concat(Array.isArray(desp) ? desp : []);
      all.forEach(function (c) { categoriasMapa[c.id] = c; });
    } catch (e) {}
  }

  async function loadCategorias(tipoCat) {
    if (categoriasData.length) return;
    try {
      var r = await fetch('/api/config/categorias?tipo=' + tipoCat);
      categoriasData = await r.json();
    } catch (e) {}
  }

  var btnSelect = document.getElementById('btnSelectMode');
  if (btnSelect) {
    btnSelect.addEventListener('click', function () {
      selectMode = !selectMode;
      selectedIds.clear();
      if (selectMode) {
        this.classList.add('active');
        this.innerHTML = '<i class="bi bi-x-square me-1"></i>Cancelar';
      } else {
        this.classList.remove('active');
        this.innerHTML = '<i class="bi bi-check2-square me-1"></i>Selecionar';
      }
      document.getElementById('extratoSumBar').style.display = 'none';
      applyFilters();
    });
  }

  var sumClear = document.getElementById('extratoSumClear');
  if (sumClear) {
    sumClear.addEventListener('click', function () {
      selectedIds.clear();
      document.getElementById('extratoSumBar').style.display = 'none';
      applyFilters();
    });
  }

  function populateCategorias(selectedId) {
    var sel = document.getElementById('editCategoria');
    sel.innerHTML = '<option value="">Sem categoria</option>'
      + categoriasData.map(function (c) {
          return '<option value="' + c.id + '"' + (c.id === selectedId ? ' selected' : '') + '>' + esc(c.nome) + '</option>';
        }).join('');
    var cat = categoriasData.find(function (c) { return c.id === selectedId; });
    populateSubcategorias(cat, null);
    sel.onchange = function () {
      var id = parseInt(this.value) || null;
      var found = id ? categoriasData.find(function (c) { return c.id === id; }) : null;
      populateSubcategorias(found, null);
    };
  }

  function populateSubcategorias(cat, selectedSubId) {
    var sec = document.getElementById('editFieldSubcategoria');
    var sel = document.getElementById('editSubcategoria');
    if (cat && cat.subcategorias && cat.subcategorias.length) {
      sel.innerHTML = '<option value="">Sem subcategoria</option>'
        + cat.subcategorias.map(function (s) {
            return '<option value="' + s.id + '"' + (s.id === selectedSubId ? ' selected' : '') + '>' + esc(s.nome) + '</option>';
          }).join('');
      sec.style.display = '';
    } else {
      sec.style.display = 'none';
    }
  }

  var backdrop = document.getElementById('editBackdrop');

  function renderEditTags(lancamentoId) {
    var wrap = document.getElementById('editTagsWrap');
    var addSection = document.getElementById('editTagsAdd');
    if (!wrap) return;

    wrap.innerHTML = editCurrentTags.length
      ? editCurrentTags.map(function (t) {
          return '<button type="button" class="edit-tag-pill edit-tag-pill--remove" data-tag-id="' + t.id + '"'
            + ' style="background:' + hexToAlpha(t.cor, 0.14) + ';color:' + t.cor + '">'
            + esc(t.nome) + '</button>';
        }).join('')
      : '<span style="font-size:.78rem;color:#94a3b8">Nenhuma tag</span>';

    wrap.querySelectorAll('.edit-tag-pill--remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(this.dataset.tagId);
        editCurrentTags = editCurrentTags.filter(function (t) { return t.id !== id; });
        renderEditTags(lancamentoId);
        saveEditTags(lancamentoId);
      });
    });

    var existingInAdd = addSection.querySelector('.edit-tag-existing-list');
    var labelEl = addSection.querySelector('.edit-tag-existing-label');
    if (existingInAdd) existingInAdd.remove();
    if (labelEl) labelEl.remove();

    var available = allUserTags.filter(function (t) {
      return !editCurrentTags.some(function (ct) { return ct.id === t.id; });
    });

    if (available.length) {
      var lbl = document.createElement('div');
      lbl.className = 'edit-tag-existing-label';
      lbl.textContent = 'Adicionar tag existente';
      var list = document.createElement('div');
      list.className = 'edit-tag-existing-list';
      list.innerHTML = available.map(function (t) {
        return '<button type="button" class="edit-tag-pill" data-tag-id="' + t.id + '" data-tag-nome="' + esc(t.nome) + '" data-tag-cor="' + esc(t.cor) + '"'
          + ' style="background:' + hexToAlpha(t.cor, 0.14) + ';color:' + t.cor + '">'
          + esc(t.nome) + '</button>';
      }).join('');
      list.querySelectorAll('.edit-tag-pill').forEach(function (btn) {
        btn.addEventListener('click', function () {
          editCurrentTags.push({ id: parseInt(this.dataset.tagId), nome: this.dataset.tagNome, cor: this.dataset.tagCor });
          renderEditTags(lancamentoId);
          saveEditTags(lancamentoId);
        });
      });
      addSection.appendChild(lbl);
      addSection.appendChild(list);
    }
  }

  function buildColorPicker() {
    var container = document.getElementById('editTagColors');
    if (!container || container.children.length) return;
    TAG_COLORS.forEach(function (c) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'edit-tag-color-dot' + (c === editSelectedColor ? ' selected' : '');
      dot.style.background = c;
      dot.dataset.color = c;
      dot.addEventListener('click', function () {
        editSelectedColor = c;
        container.querySelectorAll('.edit-tag-color-dot').forEach(function (d) { d.classList.remove('selected'); });
        this.classList.add('selected');
      });
      container.appendChild(dot);
    });
  }

  function showTagToast(msg, isError) {
    var old = document.getElementById('editTagToast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.id = 'editTagToast';
    t.className = 'edit-tag-toast' + (isError ? ' edit-tag-toast--error' : ' edit-tag-toast--ok');
    t.textContent = msg;
    var body = document.getElementById('editSheetBody');
    if (body) body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 2000);
  }

  async function saveEditTags(lancamentoId) {
    try {
      var r = await fetch('/api/lancamentos/' + lancamentoId + '/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_ids: editCurrentTags.map(function (t) { return t.id; }) }),
      });
      if (r.ok) {
        lancamentoTagsMapa[lancamentoId] = editCurrentTags.slice();
        applyFilters();
        renderTagsBar();
      } else {
        showTagToast('Erro ao salvar tag', true);
      }
    } catch (e) {
      showTagToast('Erro ao salvar tag', true);
    }
  }

  async function processTagInput(lancamentoId) {
    var input = document.getElementById('editTagInput');
    if (!input) return;
    var nome = input.value.trim();
    if (!nome) return;
    var existing = allUserTags.find(function (t) { return t.nome.toLowerCase() === nome.toLowerCase(); });
    if (existing) {
      if (!editCurrentTags.some(function (ct) { return ct.id === existing.id; })) {
        editCurrentTags.push(existing);
        renderEditTags(lancamentoId);
        await saveEditTags(lancamentoId);
      }
      input.value = '';
      return;
    }
    try {
      var r = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome, cor: editSelectedColor }),
      });
      if (!r.ok) {
        showTagToast('Erro ao criar tag', true);
        return;
      }
      var tag = await r.json();
      allUserTags.push(tag);
      editCurrentTags.push(tag);
      input.value = '';
      renderEditTags(lancamentoId);
      await saveEditTags(lancamentoId);
      renderTagsBar();
    } catch (err) {
      showTagToast('Erro ao criar tag', true);
    }
  }

  async function initTagInput(lancamentoId) {
    var input = document.getElementById('editTagInput');
    var addBtn = document.getElementById('editTagAddBtn');
    if (!input) return;
    buildColorPicker();

    var existingHandler = input._tagHandler;
    if (existingHandler) input.removeEventListener('keydown', existingHandler);
    input._tagHandler = async function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      await processTagInput(lancamentoId);
    };
    input.addEventListener('keydown', input._tagHandler);

    if (addBtn) {
      var existingAddHandler = addBtn._addHandler;
      if (existingAddHandler) addBtn.removeEventListener('click', existingAddHandler);
      addBtn._addHandler = async function () {
        await processTagInput(lancamentoId);
        input.focus();
      };
      addBtn.addEventListener('click', addBtn._addHandler);
    }
  }

  function setEditStatus(val) {
    editEfetivado = val;
    document.getElementById('editEfetivado').value = String(val);
    document.getElementById('editBtnEfetivado').className = 'edit-status-btn' + (val ? ' edit-status-btn--active-efetivado' : '');
    document.getElementById('editBtnPendente').className  = 'edit-status-btn' + (!val ? ' edit-status-btn--active-pendente' : '');
  }

  document.getElementById('editBtnEfetivado').addEventListener('click', function () { setEditStatus(true); });
  document.getElementById('editBtnPendente').addEventListener('click', function () { setEditStatus(false); });
  document.getElementById('editSheetClose').addEventListener('click', closeEditSheet);
  backdrop.addEventListener('click', function (e) { if (e.target === this) closeEditSheet(); });

  async function openEditSheet(id, tipo) {
    var isTransf = tipo === 'transferencia_saida' || tipo === 'transferencia_entrada';
    var isReceita = tipo === 'receita';

    document.getElementById('editId').value = id;
    document.getElementById('editTipo').value = tipo;
    document.getElementById('editDeleteConfirm').classList.remove('open');
    document.getElementById('editDeleteScope').style.display = 'none';
    document.querySelectorAll('input[name="deleteEscopo"]').forEach(function (r) { r.checked = r.value === 'este'; });
    pendingDeleteId = id;
    pendingDeleteType = tipo;
    pendingGrupoId = null;

    var iconEl = document.getElementById('editTypeIcon');
    var iconI  = document.getElementById('editTypeIconI');
    var titles = { receita: 'Editar Receita', despesa: 'Editar Despesa', transferencia_saida: 'Editar Transferência', transferencia_entrada: 'Editar Transferência' };
    document.getElementById('editSheetTitle').textContent = titles[tipo] || 'Editar';

    if (isReceita) {
      iconEl.className = 'edit-sheet-type-icon edit-sheet-type-icon--receita';
      iconI.className  = 'bi bi-arrow-down-circle-fill';
    } else if (tipo === 'despesa') {
      iconEl.className = 'edit-sheet-type-icon edit-sheet-type-icon--despesa';
      iconI.className  = 'bi bi-arrow-up-circle-fill';
    } else {
      iconEl.className = 'edit-sheet-type-icon edit-sheet-type-icon--transferencia';
      iconI.className  = 'bi bi-arrow-left-right';
    }

    document.getElementById('editFieldCategoria').style.display  = isTransf ? 'none' : '';
    document.getElementById('editFieldSubcategoria').style.display = 'none';
    document.getElementById('editFieldTransfInfo').style.display  = isTransf ? '' : 'none';
    document.getElementById('editFieldStatus').style.display      = '';
    document.getElementById('editFieldValor').style.display       = isTransf ? 'none' : '';
    document.getElementById('editBtnSave').style.display          = isTransf ? 'none' : '';
    document.getElementById('editFieldTags').style.display        = isTransf ? 'none' : '';
    editCurrentTags = [];
    var tagsWrap = document.getElementById('editTagsWrap');
    if (tagsWrap) tagsWrap.innerHTML = '<span style="font-size:.78rem;color:#94a3b8">Carregando...</span>';
    var tagsAddEl = document.getElementById('editTagsAdd');
    if (tagsAddEl) { tagsAddEl.querySelector('.edit-tag-existing-label') && tagsAddEl.querySelector('.edit-tag-existing-label').remove(); tagsAddEl.querySelector('.edit-tag-existing-list') && tagsAddEl.querySelector('.edit-tag-existing-list').remove(); }
    var tagInput = document.getElementById('editTagInput');
    if (tagInput) tagInput.value = '';

    document.getElementById('editDescricao').value = '';
    document.getElementById('editValor').value = '';
    document.getElementById('editData').value = '';
    setEditStatus(true);

    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (!isTransf) {
      var tipoCat = isReceita ? 'receita' : 'despesa';
      await loadCategorias(tipoCat);
      populateCategorias(null);
    }

    try {
      if (isTransf) {
        var r = await fetch('/api/contas/' + contaId + '/lancamentos?mes=' + (month + 1) + '&ano=' + year);
        var all = await r.json();
        var tx = Array.isArray(all) ? all.find(function (t) { return t.id === id && t.tipo === tipo; }) : null;
        if (tx) {
          document.getElementById('editDescricao').value = tx.descricao || '';
          document.getElementById('editData').value = tx.data_vencimento ? String(tx.data_vencimento).substring(0, 10) : '';
          setEditStatus(!!tx.efetivado);
          var partner = tx.conta_parceira_nome || '';
          var dir = tipo === 'transferencia_saida' ? ('→ ' + partner) : ('← ' + partner);
          document.getElementById('editTransfInfo').textContent = dir + '  ·  ' + formatMoney(tx.valor);
        }
      } else {
        var resp = await fetch('/api/lancamentos/' + id);
        var tx = await resp.json();
        document.getElementById('editDescricao').value = tx.descricao || '';
        document.getElementById('editValor').value = parseFloat(tx.valor) || '';
        document.getElementById('editData').value = tx.data_vencimento ? String(tx.data_vencimento).substring(0, 10) : '';
        setEditStatus(!!tx.efetivado);
        pendingGrupoId = tx.grupo_recorrencia_id || null;
        var saveScopeEl = document.getElementById('editSaveScope');
        if (pendingGrupoId) {
          document.getElementById('editDeleteScope').style.display = '';
          if (saveScopeEl) {
            saveScopeEl.style.display = '';
            saveScopeEl.querySelectorAll('input[name="saveEscopo"]').forEach(function (r) { r.checked = r.value === 'este'; });
          }
        } else {
          if (saveScopeEl) saveScopeEl.style.display = 'none';
        }
        if (!isTransf) {
          populateCategorias(tx.categoria_id || null);
          if (tx.categoria_id) {
            var cat = categoriasData.find(function (c) { return c.id === tx.categoria_id; });
            populateSubcategorias(cat, tx.subcategoria_id || null);
          }
          var tagResp = await fetch('/api/lancamentos/' + id + '/tags');
          editCurrentTags = tagResp.ok ? (await tagResp.json() || []) : [];
          renderEditTags(id);
          initTagInput(id);
        }
      }
    } catch (e) {}
  }

  function closeEditSheet() {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    document.getElementById('editDeleteConfirm').classList.remove('open');
    pendingDeleteId = null;
    pendingDeleteType = null;
    pendingGrupoId = null;
  }

  document.getElementById('editBtnSave').addEventListener('click', async function () {
    var id = parseInt(document.getElementById('editId').value);
    await processTagInput(id);
    var valor = parseFloat(document.getElementById('editValor').value);
    if (!valor || valor <= 0) return;
    var catId = document.getElementById('editCategoria').value || null;
    var subCatId = document.getElementById('editSubcategoria') && document.getElementById('editFieldSubcategoria').style.display !== 'none'
      ? (document.getElementById('editSubcategoria').value || null)
      : null;
    var saveEscopo = 'este';
    if (pendingGrupoId) {
      var checkedSave = document.querySelector('input[name="saveEscopo"]:checked');
      if (checkedSave) saveEscopo = checkedSave.value;
    }
    var payload = {
      descricao: document.getElementById('editDescricao').value.trim(),
      valor: valor,
      data_vencimento: document.getElementById('editData').value || null,
      efetivado: editEfetivado,
      categoria_id: catId,
      subcategoria_id: subCatId,
      escopo: saveEscopo,
    };
    var btn = this;
    btn.disabled = true;
    try {
      var r = await fetch('/api/lancamentos/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        if (pendingGrupoId && saveEscopo !== 'este') {
          await fetch('/api/lancamentos/' + id + '/tags', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tag_ids: editCurrentTags.map(function (t) { return t.id; }),
              escopo: saveEscopo,
              grupo_id: pendingGrupoId,
            }),
          }).catch(function () {});
        }
        closeEditSheet();
        loadExtrato();
        loadContaInfo();
      }
    } catch (e) {}
    finally { btn.disabled = false; }
  });

  document.getElementById('editBtnDelete').addEventListener('click', function () {
    document.getElementById('editDeleteConfirm').classList.add('open');
  });

  document.getElementById('editBtnCancelDelete').addEventListener('click', function () {
    document.getElementById('editDeleteConfirm').classList.remove('open');
  });

  document.getElementById('editBtnConfirmDelete').addEventListener('click', async function () {
    if (!pendingDeleteId) return;
    var id = pendingDeleteId;
    var tipo = pendingDeleteType;
    this.disabled = true;
    try {
      var isTransf = tipo === 'transferencia_saida' || tipo === 'transferencia_entrada';
      if (isTransf) {
        await fetch('/api/transferencias/' + id, { method: 'DELETE' });
      } else {
        var escopo = 'este';
        if (pendingGrupoId) {
          var checked = document.querySelector('input[name="deleteEscopo"]:checked');
          if (checked) escopo = checked.value;
        }
        await fetch('/api/lancamentos/' + id + '?escopo=' + escopo, { method: 'DELETE' });
      }
      closeEditSheet();
      loadExtrato();
      loadContaInfo();
    } catch (e) {}
    finally { this.disabled = false; }
  });

  var fabBtn  = document.getElementById('fabBtn');
  var fabMenu = document.getElementById('fabMenu');
  if (fabBtn && fabMenu) {
    fabBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = fabMenu.classList.contains('open');
      fabMenu.classList.toggle('open', !isOpen);
      fabBtn.classList.toggle('open', !isOpen);
    });
    document.addEventListener('click', function () {
      fabMenu.classList.remove('open');
      fabBtn.classList.remove('open');
    });
    fabMenu.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  loadContaInfo();
  loadUserTags();
  loadCategoriasAll().then(loadExtrato);
})();
