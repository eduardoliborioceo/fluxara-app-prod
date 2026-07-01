(function () {
  'use strict';

  var _recCache = [];
  var _cartoes  = [];
  var _contas   = [];
  var _tipo     = 'credito';

  // ── formatadores ────────────────────────────────────────────
  function _fmt(v) {
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
      var r = await fetch('/api/config/categorias');
      var cats = await r.json();
      var sel = document.getElementById('recCategoriaId');
      if (!sel) return;
      var html = '<option value="">Sem categoria</option>';
      (Array.isArray(cats) ? cats : []).forEach(function (c) {
        html += '<option value="' + c.id + '">' + esc(c.nome) + '</option>';
      });
      sel.innerHTML = html;
    } catch (_) {}
  }

  async function loadRecs() {
    try {
      var r = await fetch('/api/recorrencias');
      _recCache = await r.json();
    } catch (_) { _recCache = []; }
    render();
  }

  // ── renderização ─────────────────────────────────────────────
  function render() {
    var loading = document.getElementById('recLoading');
    var vazio   = document.getElementById('recVazio');
    var lista   = document.getElementById('recLista');
    if (loading) loading.classList.add('d-none');
    if (!_recCache.length) {
      if (vazio) vazio.classList.remove('d-none');
      if (lista) lista.classList.add('d-none');
      return;
    }
    if (vazio) vazio.classList.add('d-none');
    if (!lista) return;
    lista.classList.remove('d-none');

    var credito = _recCache.filter(function (r) { return r.tipo === 'credito'; });
    var debito  = _recCache.filter(function (r) { return r.tipo === 'debito';  });

    var html = '';
    if (credito.length) {
      html += '<div class="rec-group-header"><i class="bi bi-credit-card-fill me-1"></i>Crédito automático</div>';
      html += '<div class="rec-card">' + credito.map(renderRow).join('') + '</div>';
    }
    if (debito.length) {
      html += '<div class="rec-group-header"><i class="bi bi-bank me-1"></i>Débito automático</div>';
      html += '<div class="rec-card">' + debito.map(renderRow).join('') + '</div>';
    }
    lista.innerHTML = html;
  }

  function renderRow(rec) {
    var isAtivo   = rec.ativo;
    var iconClass = rec.tipo === 'credito' ? 'rec-icon--credito' : 'rec-icon--debito';
    var iconSvg   = rec.tipo === 'credito' ? 'credit-card-fill' : 'bank';
    var ref       = rec.tipo === 'credito'
      ? (rec.cartao_nome ? esc(rec.cartao_nome) : '—')
      : (rec.conta_nome  ? esc(rec.conta_nome)  : '—');
    var meta = 'Todo dia ' + rec.dia_vencimento + ' · ' + ref;
    if (rec.categoria_nome) meta += ' · ' + esc(rec.categoria_nome);

    var toggleClass = isAtivo ? 'rec-toggle--ativo' : 'rec-toggle--pausado';
    var toggleLabel = isAtivo ? 'Ativo' : 'Pausado';
    var rowOpacity  = isAtivo ? '' : ' style="opacity:.55"';

    return '<div class="rec-row"' + rowOpacity + '>' +
      '<div class="rec-icon ' + iconClass + '"><i class="bi bi-' + iconSvg + '"></i></div>' +
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
  function _preencherSelects() {
    var selCartao = document.getElementById('recCartaoId');
    var selConta  = document.getElementById('recContaId');
    if (selCartao) {
      selCartao.innerHTML = _cartoes.length
        ? _cartoes.map(function (c) { return '<option value="' + c.id + '">' + esc(c.nome) + '</option>'; }).join('')
        : '<option value="">Nenhum cartão cadastrado</option>';
    }
    if (selConta) {
      selConta.innerHTML = _contas.length
        ? _contas.map(function (c) { return '<option value="' + c.id + '">' + esc(c.nome) + '</option>'; }).join('')
        : '<option value="">Nenhuma conta cadastrada</option>';
    }
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
    document.getElementById('recEditId').value  = '';
    document.getElementById('recNome').value    = '';
    document.getElementById('recValor').value   = '';
    document.getElementById('recDia').value     = '';
    document.getElementById('recCategoriaId').value = '';
    var errEl = document.getElementById('recError');
    if (errEl) errEl.style.display = 'none';
    document.getElementById('recBtnDeletar').classList.add('d-none');
    document.getElementById('recTipoGroup').style.display = '';
    _setTipo('credito');
  }

  function abrirModal() {
    _clearModal();
    _preencherSelects();
    document.getElementById('recModalTitulo').textContent = 'Nova Recorrência';
    document.getElementById('recOverlay').style.display = '';
  }

  window.editarRec = function (id) {
    var rec = _recCache.find(function (r) { return r.id === id; });
    if (!rec) return;
    _clearModal();
    _preencherSelects();
    document.getElementById('recEditId').value  = rec.id;
    document.getElementById('recNome').value    = rec.nome || '';
    document.getElementById('recValor').value   = parseFloat(rec.valor) || '';
    document.getElementById('recDia').value     = rec.dia_vencimento || '';
    if (rec.categoria_id) document.getElementById('recCategoriaId').value = rec.categoria_id;
    if (rec.tipo === 'credito' && rec.cartao_id) document.getElementById('recCartaoId').value = rec.cartao_id;
    if (rec.tipo === 'debito'  && rec.conta_id)  document.getElementById('recContaId').value  = rec.conta_id;
    _setTipo(rec.tipo);
    document.getElementById('recTipoGroup').style.display = 'none';
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
    var errEl  = document.getElementById('recError');
    errEl.style.display = 'none';
    var editId = document.getElementById('recEditId').value;
    var payload = {
      nome:           (document.getElementById('recNome').value || '').trim(),
      tipo:           _tipo,
      valor:          parseFloat(document.getElementById('recValor').value) || 0,
      dia_vencimento: parseInt(document.getElementById('recDia').value) || 0,
      categoria_id:   document.getElementById('recCategoriaId').value || null,
      cartao_id:      _tipo === 'credito' ? (document.getElementById('recCartaoId').value || null) : null,
      conta_id:       _tipo === 'debito'  ? (document.getElementById('recContaId').value  || null) : null,
    };

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

  // ── eventos ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var fab = document.getElementById('btnNovaRec');
    if (fab) fab.addEventListener('click', abrirModal);

    document.querySelectorAll('.rec-tipo-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { _setTipo(btn.dataset.tipo); });
    });

    init();
  });
})();
