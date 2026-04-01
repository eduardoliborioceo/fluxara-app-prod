(function () {
  var MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  var BANDEIRAS = {
    visa:       { nome: 'Visa',       cor: '#1A1F71', svg: 'visa.svg' },
    mastercard: { nome: 'Mastercard', cor: '#EB001B', svg: 'mastercard.svg' },
    elo:        { nome: 'Elo',        cor: '#FFD700', corLetra: '#000' },
    amex:       { nome: 'Amex',       cor: '#2E77BC', svg: 'amex.svg' },
    hipercard:  { nome: 'Hipercard',  cor: '#B22222', svg: 'hipercard.svg' },
    outro:      { nome: 'Outro',      cor: '#6c757d' },
  };

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
    loadExtrato();
  });

  document.getElementById('btnMesPosterior').addEventListener('click', function () {
    month++;
    if (month > 11) { month = 0; year++; }
    updateMesLabel();
    loadExtrato();
  });

  updateMesLabel();

  var BANDEIRA_GRADIENTS = {
    visa:       'linear-gradient(135deg, #1a1f71 0%, #0d47a1 100%)',
    mastercard: 'linear-gradient(135deg, #eb001b 0%, #f79e1b 100%)',
    elo:        'linear-gradient(135deg, #00a4e0 0%, #0070b3 100%)',
    amex:       'linear-gradient(135deg, #2e77bc 0%, #1a5276 100%)',
    hipercard:  'linear-gradient(135deg, #b22222 0%, #7b0000 100%)',
    outro:      'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
  };

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
      var grad = BANDEIRA_GRADIENTS[cartao.bandeira] || BANDEIRA_GRADIENTS.outro;
      var faturaTotal = parseFloat(cartao.fatura_atual || 0);
      var limDisp = parseFloat(cartao.limite_disponivel != null ? cartao.limite_disponivel : cartao.limite) || 0;
      faturaAtualTotal = faturaTotal;

      var visual = document.getElementById('cartaoVisual');
      if (visual) visual.style.background = grad;
      var valEl = document.getElementById('cartaoVisualValor');
      if (valEl) valEl.textContent = formatMoney(faturaTotal);
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

  async function loadExtrato() {
    var body = document.getElementById('extratoBody');
    body.innerHTML = '<div class="text-center py-4 text-muted small">Carregando...</div>';
    try {
      var mes = month + 1;
      var r = await fetch('/api/cartoes/' + cartaoId + '/lancamentos?mes=' + mes + '&ano=' + year);
      var data = await r.json();
      if (!Array.isArray(data) || !data.length) {
        body.innerHTML = '<div class="text-center py-4 text-muted small">'
          + '<i class="bi bi-inbox d-block mb-1" style="font-size:1.8rem;opacity:.3"></i>'
          + 'Nenhuma despesa nesta fatura</div>';
        return;
      }
      body.innerHTML = data.map(function (tx) {
        var cat = tx.categoria_nome ? '  ·  ' + esc(tx.categoria_nome) : '';
        return '<div class="extrato-tx-item" data-id="' + tx.id + '">'
          + '<div class="extrato-tx-icon extrato-tx-icon--despesa-cartao"><i class="bi bi-credit-card"></i></div>'
          + '<div class="extrato-tx-info">'
          +   '<div class="extrato-tx-desc">' + esc(tx.descricao || 'Sem descrição') + '</div>'
          +   '<div class="extrato-tx-meta">' + esc(tx.categoria_nome || '—') + '</div>'
          + '</div>'
          + '<div class="extrato-tx-valor extrato-tx-valor--despesa-cartao">− ' + formatMoney(tx.valor) + '</div>'
          + '</div>';
      }).join('');
      body.querySelectorAll('.extrato-tx-item').forEach(function (el) {
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
    } catch (e) {
      alert('Erro ao criar lançamento.');
    } finally {
      btn.disabled = false;
    }
  });

  loadCartaoInfo();
  loadExtrato();
})();
