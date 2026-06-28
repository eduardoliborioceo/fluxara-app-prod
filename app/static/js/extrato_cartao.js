(function () {
  var MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  var INSTITUICOES = {
    nubank:      { cor: '#8A05BE' }, itau:        { cor: '#EC7000' },
    bradesco:    { cor: '#CC092F' }, bb:          { cor: '#F9D600' },
    caixa:       { cor: '#006CA8' }, 'caixa-tem': { cor: '#006CA8' },
    santander:   { cor: '#EC0000' }, inter:       { cor: '#FF7A00' },
    c6:          { cor: '#242424' }, picpay:      { cor: '#11C76F' },
    mercadopago: { cor: '#009EE3' }, xp:          { cor: '#000000' },
    btg:         { cor: '#003399' }, sicoob:      { cor: '#007A3D' },
    sicredi:     { cor: '#006633' }, neon:        { cor: '#00CFFF' },
    next:        { cor: '#00CC99' }, wise:        { cor: '#9FE870' },
    paypal:      { cor: '#003087' }, iti:         { cor: '#FF6600' },
    will:        { cor: '#FFCC00' }, bs2:         { cor: '#0066CC' },
    original:    { cor: '#00A650' }, sofisa:      { cor: '#E2001A' },
    banrisul:    { cor: '#005CA9' }, bv:          { cor: '#004B8D' },
    bmg:         { cor: '#E30613' }, pan:         { cor: '#FFD100' },
    daycoval:    { cor: '#005A9E' }, mercantil:   { cor: '#004A9F' },
    digio:       { cor: '#0077CC' }, stone:       { cor: '#00A868' },
    pagseguro:   { cor: '#FFC72C' }, 'nu-invest': { cor: '#8A05BE' },
    nomad:       { cor: '#1A1A2E' }, zrobank:     { cor: '#0055B8' },
    n26:         { cor: '#000000' }, warren:      { cor: '#4C12A1' },
    toro:        { cor: '#FF6B00' }, clear:       { cor: '#00C4B3' },
    rico:        { cor: '#00B386' }, genial:      { cor: '#FF6600' },
    avenue:      { cor: '#0033A0' }, ame:         { cor: '#FF0064' },
    amazon:      { cor: '#FF9900' }, magalu:      { cor: '#0086FF' },
    samsung:     { cor: '#1428A0' }, infinitepay: { cor: '#00BCD4' },
    ton:         { cor: '#00C853' }, fitbank:     { cor: '#1A237E' },
    cora:        { cor: '#FF4C8B' }, dm:          { cor: '#004B87' },
    flash:       { cor: '#F24E1E' }, caju:        { cor: '#FF6B35' },
    binance:     { cor: '#F3BA2F' }, metamask:    { cor: '#E2761B' },
    bitybank:    { cor: '#0066FF' }, bet365:      { cor: '#116B14' },
    riachuelo:   { cor: '#C41E3A' }, outro:       { cor: '#64748b' },
  };

  var BANDEIRAS = {
    visa:       { nome: 'Visa',       cor: '#1A1F71', svg: 'visa.svg' },
    mastercard: { nome: 'Mastercard', cor: '#EB001B', svg: 'mastercard.svg' },
    elo:        { nome: 'Elo',        cor: '#FFD700', corLetra: '#000' },
    amex:       { nome: 'Amex',       cor: '#2E77BC', svg: 'amex.svg' },
    hipercard:  { nome: 'Hipercard',  cor: '#B22222', svg: 'hipercard.svg' },
    outro:      { nome: 'Outro',      cor: '#6c757d' },
  };

  function _darkenHex(hex, amount) {
    var c = hex.replace('#', '');
    var num = parseInt(c.length === 3 ? c.split('').map(function(x) { return x + x; }).join('') : c, 16);
    var r = Math.max(0, (num >> 16) - amount);
    var g = Math.max(0, ((num >> 8) & 0xff) - amount);
    var b = Math.max(0, (num & 0xff) - amount);
    return '#' + [r, g, b].map(function(x) { return x.toString(16).padStart(2, '0'); }).join('');
  }

  function _cardBackground(contaInstituicao) {
    var instKey = contaInstituicao ? contaInstituicao.toLowerCase() : '';
    if (instKey && INSTITUICOES[instKey]) {
      var base = INSTITUICOES[instKey].cor;
      return 'linear-gradient(135deg, ' + base + ', ' + _darkenHex(base, 28) + ')';
    }
    return 'linear-gradient(135deg, #334155, #0f172a)';
  }

  var cfg = document.getElementById('extratoConfig');
  var cartaoId = parseInt(cfg.dataset.id);
  var cartaoBandeira = cfg.dataset.bandeira || 'outro';
  var faturaAtualTotal = 0;

  var params = new URLSearchParams(window.location.search);
  var now = new Date();
  var month = parseInt(params.get('mes') || (now.getMonth() + 1)) - 1;
  var year  = parseInt(params.get('ano') || now.getFullYear());

  var categoriasData = [];
  var pendingDeleteId = null;
  var pendingGrupoId = null;

  function esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatMoney(v) {
    return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function updateMesLabel() {
    document.getElementById('mesLabel').textContent = MESES[month] + ' ' + year;
  }

  document.getElementById('btnMesAnterior').addEventListener('click', function () {
    month--;
    if (month < 0) { month = 11; year--; }
    updateMesLabel();
    loadCartaoInfo();
    loadExtrato();
  });

  document.getElementById('btnMesPosterior').addEventListener('click', function () {
    month++;
    if (month > 11) { month = 0; year++; }
    updateMesLabel();
    loadCartaoInfo();
    loadExtrato();
  });

  updateMesLabel();


  function buildBandeiraVisual(b) {
    if (b && b.svg) {
      return '<img src="/static/images/bank-icons-logos-svg/' + esc(b.svg)
        + '" style="height:22px;object-fit:contain;filter:brightness(0) invert(1);opacity:.9">';
    }
    return '<span style="font-size:.75rem;font-weight:700;opacity:.85">' + esc((b && b.nome) || 'Cartão') + '</span>';
  }

  async function loadCartaoInfo() {
    try {
      var mes = month + 1;
      var r = await fetch('/api/cartoes?mes=' + mes + '&ano=' + year);
      var data = await r.json();
      var cartao = Array.isArray(data) ? data.find(function (c) { return c.id === cartaoId; }) : null;
      if (!cartao) return;
      var b = BANDEIRAS[cartao.bandeira] || BANDEIRAS.outro;
      var grad = _cardBackground(cartao.conta_instituicao);
      var limDisp = parseFloat(cartao.limite_disponivel != null ? cartao.limite_disponivel : cartao.limite) || 0;

      var visual = document.getElementById('cartaoVisual');
      if (visual) visual.style.background = grad;
      var bandEl = document.getElementById('cartaoVisualBandeira');
      if (bandEl) bandEl.innerHTML = buildBandeiraVisual(b);
      var dispEl = document.getElementById('cartaoInfoDisp');
      if (dispEl) dispEl.textContent = formatMoney(limDisp);
      var vencEl = document.getElementById('cartaoInfoVenc');
      if (vencEl) vencEl.textContent = 'Dia ' + (cartao.dia_vencimento || '—');
      var fechaEl = document.getElementById('cartaoInfoFecha');
      if (fechaEl) fechaEl.textContent = 'Dia ' + (cartao.dia_fechamento || '—');
    } catch (e) {}
  }

  function _updateFaturaDisplay(total) {
    faturaAtualTotal = total;
    var valEl = document.getElementById('cartaoVisualValor');
    if (valEl) valEl.textContent = formatMoney(total);
  }

  async function loadExtrato() {
    var body = document.getElementById('extratoBody');
    body.innerHTML = '<div class="text-center py-4 text-muted small">Carregando...</div>';
    try {
      var mes = month + 1;
      var r = await fetch('/api/cartoes/' + cartaoId + '/lancamentos?mes=' + mes + '&ano=' + year);
      var data = await r.json();
      if (!Array.isArray(data) || !data.length) {
        _updateFaturaDisplay(0);
        body.innerHTML = '<div class="text-center py-4 text-muted small">'
          + '<i class="bi bi-inbox d-block mb-1" style="font-size:1.8rem;opacity:.3"></i>'
          + 'Nenhuma despesa nesta fatura</div>';
        return;
      }
      var faturaTotal = data.reduce(function (acc, tx) {
        var v = parseFloat(tx.valor || 0);
        return acc + (tx.tipo === 'pagamento_fatura' ? -v : v);
      }, 0);
      _updateFaturaDisplay(faturaTotal);
      body.innerHTML = data.map(function (tx) {
        var isPagamento = tx.tipo === 'pagamento_fatura';
        var iconClass = isPagamento ? 'extrato-tx-icon--receita' : 'extrato-tx-icon--despesa-cartao';
        var icon = isPagamento ? 'bi-arrow-down-circle' : 'bi-credit-card';
        var valorClass = isPagamento ? 'extrato-tx-valor--receita' : 'extrato-tx-valor--despesa-cartao';
        var valorLabel = isPagamento ? '+ ' : '− ';
        var meta = isPagamento ? 'Pagamento de fatura' : esc(tx.categoria_nome || '—');
        var clickable = isPagamento ? '' : ' data-id="' + tx.id + '"';
        return '<div class="extrato-tx-item"' + clickable + '>'
          + '<div class="extrato-tx-icon ' + iconClass + '"><i class="bi ' + icon + '"></i></div>'
          + '<div class="extrato-tx-info">'
          +   '<div class="extrato-tx-desc">' + esc(tx.descricao || 'Sem descrição') + '</div>'
          +   '<div class="extrato-tx-meta">' + meta + '</div>'
          + '</div>'
          + '<div class="extrato-tx-valor ' + valorClass + '">' + valorLabel + formatMoney(tx.valor) + '</div>'
          + '</div>';
      }).join('');
      body.querySelectorAll('.extrato-tx-item[data-id]').forEach(function (el) {
        el.addEventListener('click', function () {
          openEditSheet(parseInt(this.dataset.id));
        });
      });
    } catch (e) {
      body.innerHTML = '<div class="text-center py-4 text-muted small">Erro ao carregar despesas.</div>';
    }
  }

  async function loadCategorias() {
    if (categoriasData.length) return;
    try {
      var r = await fetch('/api/config/categorias?tipo=despesa');
      categoriasData = await r.json();
    } catch (e) {}
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

  async function openEditSheet(id) {
    pendingDeleteId = id;
    pendingGrupoId = null;
    document.getElementById('editId').value = id;
    document.getElementById('editDeleteConfirm').classList.remove('open');
    document.getElementById('editDeleteScope').style.display = 'none';
    document.querySelectorAll('input[name="deleteEscopo"]').forEach(function (r) { r.checked = r.value === 'este'; });
    document.getElementById('editDescricao').value = '';
    document.getElementById('editValor').value = '';

    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';

    await loadCategorias();
    populateCategorias(null);

    try {
      var r = await fetch('/api/lancamentos/' + id);
      var tx = await r.json();
      document.getElementById('editDescricao').value = tx.descricao || '';
      document.getElementById('editValor').value = parseFloat(tx.valor) || '';
      pendingGrupoId = tx.grupo_recorrencia_id || null;
      if (pendingGrupoId) {
        document.getElementById('editDeleteScope').style.display = '';
      }
      populateCategorias(tx.categoria_id || null);
      if (tx.categoria_id) {
        var cat = categoriasData.find(function (c) { return c.id === tx.categoria_id; });
        populateSubcategorias(cat, tx.subcategoria_id || null);
      }
    } catch (e) {}
  }

  function closeEditSheet() {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    document.getElementById('editDeleteConfirm').classList.remove('open');
    pendingDeleteId = null;
    pendingGrupoId = null;
  }

  document.getElementById('editSheetClose').addEventListener('click', closeEditSheet);
  backdrop.addEventListener('click', function (e) { if (e.target === this) closeEditSheet(); });

  document.getElementById('editBtnSave').addEventListener('click', async function () {
    var id = parseInt(document.getElementById('editId').value);
    var valor = parseFloat(document.getElementById('editValor').value);
    if (!valor || valor <= 0) return;
    var catId = document.getElementById('editCategoria').value || null;
    var subCatId = document.getElementById('editFieldSubcategoria').style.display !== 'none'
      ? (document.getElementById('editSubcategoria').value || null)
      : null;
    var payload = {
      descricao: document.getElementById('editDescricao').value.trim(),
      valor: valor,
      efetivado: false,
      categoria_id: catId,
      subcategoria_id: subCatId,
    };
    var btn = this;
    btn.disabled = true;
    try {
      var r = await fetch('/api/lancamentos/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) { closeEditSheet(); loadExtrato(); loadCartaoInfo(); }
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
    this.disabled = true;
    try {
      var escopo = 'este';
      if (pendingGrupoId) {
        var checked = document.querySelector('input[name="deleteEscopo"]:checked');
        if (checked) escopo = checked.value;
      }
      await fetch('/api/lancamentos/' + id + '?escopo=' + escopo, { method: 'DELETE' });
      closeEditSheet();
      loadExtrato();
      loadCartaoInfo();
    } catch (e) {}
    finally { this.disabled = false; }
  });

  var pagamentoBackdrop = document.getElementById('pagamentoBackdrop');

  function openPagamentoSheet() {
    var mes = month + 1;
    var hoje = new Date();
    var dataDefault = hoje.toISOString().slice(0, 10);
    document.getElementById('pagamentoFaturaInfo').textContent =
      'Fatura ' + MESES[month] + '/' + year + ' — Total: ' + formatMoney(faturaAtualTotal);
    document.getElementById('pagamentoValor').value = faturaAtualTotal > 0 ? faturaAtualTotal.toFixed(2) : '';
    document.getElementById('pagamentoData').value = dataDefault;
    var hint = document.getElementById('pagamentoHint');
    hint.textContent = faturaAtualTotal > 0 ? 'Total da fatura: ' + formatMoney(faturaAtualTotal) : '';
    pagamentoBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closePagamentoSheet() {
    pagamentoBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.getElementById('btnPagarFatura').addEventListener('click', openPagamentoSheet);
  document.getElementById('pagamentoClose').addEventListener('click', closePagamentoSheet);
  pagamentoBackdrop.addEventListener('click', function (e) { if (e.target === this) closePagamentoSheet(); });

  document.getElementById('pagamentoBtnSalvar').addEventListener('click', async function () {
    var valor = parseFloat(document.getElementById('pagamentoValor').value);
    var dataPg = document.getElementById('pagamentoData').value;
    if (!valor || valor <= 0) { alert('Informe um valor válido.'); return; }
    if (!dataPg) { alert('Informe a data de pagamento.'); return; }
    var btn = this;
    btn.disabled = true;
    try {
      var r = await fetch('/api/cartoes/' + cartaoId + '/gerar-fatura-lancamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes: month + 1, ano: year, valor: valor, data_pagamento: dataPg }),
      });
      var data = await r.json();
      if (!r.ok) { alert(data.error || 'Erro ao criar lançamento.'); return; }
      closePagamentoSheet();
      loadExtrato();
      loadCartaoInfo();
    } catch (e) {
      alert('Erro ao criar lançamento.');
    } finally {
      btn.disabled = false;
    }
  });

  loadCartaoInfo();
  loadExtrato();
})();
