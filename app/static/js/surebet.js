/* =============================================
   TABS
============================================= */
(function () {
  var _alvCarregado = false;

  document.querySelectorAll('.surebet-tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.surebet-tab-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var tab = btn.dataset.tab;
      document.getElementById('tab-calculadora').style.display = tab === 'calculadora' ? '' : 'none';
      document.getElementById('tab-alavancagem').style.display = tab === 'alavancagem' ? '' : 'none';
      if (tab === 'alavancagem' && !_alvCarregado) {
        _alvCarregado = true;
        alvCarregarLista();
      }
    });
  });
})();

/* =============================================
   CALCULADORA SUREBET
============================================= */
(function () {
  var numOutcomes = 2;
  var LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  function fmt(v) {
    return 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPct(v) {
    return (v >= 0 ? '+' : '') + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }

  function buildOddsInputs() {
    var container = document.getElementById('sbOddsContainer');
    container.innerHTML = '';
    for (var i = 0; i < numOutcomes; i++) {
      var label = LABELS[i];
      var div = document.createElement('div');
      div.className = 'surebet-odd-row';
      div.innerHTML =
        '<span class="surebet-odd-label">Odd ' + label + '</span>'
        + '<div class="surebet-odd-input-wrap">'
        +   '<input type="number" class="surebet-odd-input" id="sbOdd' + i + '" '
        +          'placeholder="ex: 2.50" step="0.01" min="1.01">'
        + '</div>';
      container.appendChild(div);
    }
    container.querySelectorAll('.surebet-odd-input').forEach(function (inp) {
      inp.addEventListener('input', calculate);
    });
  }

  function calculate() {
    var total = parseFloat(document.getElementById('sbTotal').value) || 0;
    var resultCard = document.getElementById('sbResultCard');
    var resultIcon = document.getElementById('sbResultIcon');
    var resultTitle = document.getElementById('sbResultTitle');
    var resultBody = document.getElementById('sbResultBody');

    if (total <= 0) {
      resultTitle.textContent = 'Informe o total a apostar.';
      resultBody.style.display = 'none';
      resultCard.className = 'surebet-card surebet-result-card';
      return;
    }

    var odds = [];
    for (var i = 0; i < numOutcomes; i++) {
      var v = parseFloat(document.getElementById('sbOdd' + i).value);
      if (!v || v <= 1) {
        resultTitle.textContent = 'Preencha todas as odds (mínimo 1.01).';
        resultBody.style.display = 'none';
        resultCard.className = 'surebet-card surebet-result-card';
        return;
      }
      odds.push(v);
    }

    var invSum = odds.reduce(function (acc, o) { return acc + 1 / o; }, 0);
    var retorno = total / invSum;
    var lucro = retorno - total;
    var margem = (1 - invSum) * 100;
    var isSurebet = invSum < 1;

    var stakesHtml = odds.map(function (o, i) {
      var stake = total * (1 / o) / invSum;
      return '<div class="surebet-stake-row">'
        + '<span class="surebet-stake-label">Apostar em ' + LABELS[i] + ' (odd ' + o.toFixed(2) + ')</span>'
        + '<span class="surebet-stake-value">' + fmt(stake) + '</span>'
        + '</div>';
    }).join('');

    document.getElementById('sbStakes').innerHTML = stakesHtml;
    document.getElementById('sbRetorno').textContent = fmt(retorno);
    document.getElementById('sbLucro').textContent = fmt(lucro);
    document.getElementById('sbLucro').className = 'surebet-result-value ' + (lucro >= 0 ? 'surebet-lucro--pos' : 'surebet-lucro--neg');
    document.getElementById('sbMargem').textContent = fmtPct(margem);
    document.getElementById('sbMargem').style.color = isSurebet ? '#16a34a' : '#dc3545';

    if (isSurebet) {
      resultCard.className = 'surebet-card surebet-result-card surebet-result-card--ok';
      resultIcon.className = 'bi bi-check-circle-fill';
      resultTitle.textContent = 'Surebet confirmada — lucro garantido!';
    } else {
      resultCard.className = 'surebet-card surebet-result-card surebet-result-card--no';
      resultIcon.className = 'bi bi-exclamation-triangle-fill';
      resultTitle.textContent = 'Não é surebet — sem lucro garantido.';
    }

    resultBody.style.display = '';
  }

  document.getElementById('sbOutcomesToggle').addEventListener('click', function (e) {
    var btn = e.target.closest('.surebet-outcome-btn');
    if (!btn) return;
    document.querySelectorAll('#sbOutcomesToggle .surebet-outcome-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    numOutcomes = parseInt(btn.dataset.n);
    buildOddsInputs();
    calculate();
  });

  document.getElementById('sbTotal').addEventListener('input', calculate);

  buildOddsInputs();
})();

/* =============================================
   ALAVANCAGEM — PERSISTÊNCIA
============================================= */
(function () {
  var _alvAtualId = null;
  var _alvRounds = [];
  var _alvRodadaAtual = 0;
  var _alvFormAberto = false;
  var _alvTipo = 'lucro';

  function fmtAlv(v) {
    return 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function _getNumRodadas() {
    var val = parseInt(document.getElementById('alvNumRodadasInput')?.value || '3', 10);
    if (isNaN(val) || val < 2) return 2;
    if (val > 100) return 100;
    return val;
  }

  function _getTipo() {
    var btn = document.querySelector('#alvTipoToggle .surebet-outcome-btn.active');
    return btn ? btn.dataset.tipo : 'lucro';
  }

  document.getElementById('alvTipoToggle').addEventListener('click', function (e) {
    var btn = e.target.closest('.surebet-outcome-btn');
    if (!btn) return;
    document.querySelectorAll('#alvTipoToggle .surebet-outcome-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });

  /* ---- Calcula sequência de rodadas ---- */
  function buildRounds(inicial, odd, n, tipo) {
    tipo = tipo || 'lucro';
    var rounds = [];
    var aposta = parseFloat(inicial);
    for (var i = 0; i < n; i++) {
      var retorno = aposta * parseFloat(odd);
      var guardar = tipo === 'total' ? 0 : aposta;
      rounds.push({ num: i + 1, aposta: aposta, retorno: retorno, guardar: guardar });
      aposta = tipo === 'total' ? retorno : (retorno - aposta);
    }
    return rounds;
  }

  /* ---- Render rodadas ---- */
  function renderRounds() {
    var container = document.getElementById('alvRoundsTable');
    if (!container) return;
    var html = '';
    _alvRounds.forEach(function (r, i) {
      var status = i < _alvRodadaAtual ? 'passado' : (i === _alvRodadaAtual ? 'ativa' : 'futura');
      var rowCls = status === 'passado' ? ' alv-round-row--passado' : '';
      var badgeCls = status === 'ativa' ? ' alv-round-badge--ativa' : (status === 'passado' ? ' alv-round-badge--certo' : '');
      var badgeContent = status === 'passado' ? '<i class="bi bi-check-lg"></i>' : r.num;
      var subText = _alvTipo === 'total'
        ? (i < _alvRounds.length - 1 ? 'Reinvestir tudo na próxima rodada' : 'Retirar tudo ao ganhar')
        : 'Guardar se ganhar: ' + fmtAlv(r.guardar);
      html += '<div class="alv-round-row' + rowCls + '">'
        + '<div class="alv-round-badge' + badgeCls + '">' + badgeContent + '</div>'
        + '<div class="alv-round-info">'
        +   '<div class="alv-round-title">Rodada ' + r.num + ' — Apostar ' + fmtAlv(r.aposta) + '</div>'
        +   '<div class="alv-round-sub">' + subText + '</div>'
        + '</div>'
        + '<div class="alv-round-right">'
        +   '<div class="alv-round-retorno">' + fmtAlv(r.retorno) + '</div>'
        +   '<div class="alv-round-guardar">retorno</div>'
        + '</div>'
        + '</div>';
    });
    container.innerHTML = html;

    var concluida = _alvRodadaAtual >= _alvRounds.length;
    var lastRound = _alvRounds[_alvRounds.length - 1];
    var totalFinal = _alvTipo === 'total'
      ? (lastRound ? lastRound.retorno : 0)
      : _alvRounds.slice(0, _alvRounds.length - 1).reduce(function (s, r) { return s + r.guardar; }, 0)
        + (lastRound ? lastRound.retorno : 0);
    var totalGuardado = _alvTipo === 'total'
      ? 0
      : _alvRounds.slice(0, _alvRodadaAtual).reduce(function (s, r) { return s + r.guardar; }, 0);
    var rodadaObj = _alvRounds[_alvRodadaAtual] || null;
    document.getElementById('alvSummary').innerHTML = ''
      + (concluida
          ? '<div class="alv-summary-chip"><span class="alv-summary-chip-label">Status</span><span class="alv-summary-chip-val alv-summary-chip-val--green">Concluída</span></div>'
          + '<div class="alv-summary-chip"><span class="alv-summary-chip-label">Total obtido</span><span class="alv-summary-chip-val alv-summary-chip-val--green">' + fmtAlv(totalFinal) + '</span></div>'
          : '<div class="alv-summary-chip">'
          +   '<span class="alv-summary-chip-label">Rodada</span>'
          +   '<span class="alv-summary-chip-val">' + (_alvRodadaAtual + 1) + ' / ' + _alvRounds.length + '</span>'
          + '</div>'
          + '<div class="alv-summary-chip">'
          +   '<span class="alv-summary-chip-label">Apostar agora</span>'
          +   '<span class="alv-summary-chip-val">' + fmtAlv(rodadaObj.aposta) + '</span>'
          + '</div>'
          + (_alvTipo !== 'total'
              ? '<div class="alv-summary-chip">'
              +   '<span class="alv-summary-chip-label">Guardado</span>'
              +   '<span class="alv-summary-chip-val alv-summary-chip-val--green">' + fmtAlv(totalGuardado) + '</span>'
              + '</div>'
              : ''
            )
          + '<div class="alv-summary-chip">'
          +   '<span class="alv-summary-chip-label">Total final</span>'
          +   '<span class="alv-summary-chip-val">' + fmtAlv(totalFinal) + '</span>'
          + '</div>'
        );

    var btnCerto = document.getElementById('alvBtnCerto');
    if (btnCerto) btnCerto.disabled = _alvRodadaAtual >= _alvRounds.length;
  }

  /* ---- Abre uma alavancagem ---- */
  function alvAbrir(alv) {
    _alvAtualId = alv.id;
    _alvRodadaAtual = alv.rodada_atual || 0;
    _alvTipo = alv.tipo || 'lucro';
    _alvRounds = buildRounds(alv.aposta_inicial, alv.odd, alv.num_rodadas, _alvTipo);
    document.getElementById('alvAtivaNome').textContent = alv.nome;
    document.getElementById('alvResultCard').style.display = '';
    renderRounds();
    document.getElementById('alvResultCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    renderLista();
  }

  /* ---- Fecha alavancagem ativa ---- */
  window.alvFechar = function () {
    _alvAtualId = null;
    document.getElementById('alvResultCard').style.display = 'none';
    renderLista();
  };

  /* ---- Render lista ---- */
  function renderLista() {
    var container = document.getElementById('alvLista');
    if (!container) return;
    if (!_alvListaCache || !_alvListaCache.length) {
      container.innerHTML = '<div class="alv-lista-vazio" id="alvListaVazio">'
        + '<i class="bi bi-lightning-charge" style="font-size:1.5rem;color:var(--text-muted)"></i>'
        + '<div>Nenhuma alavancagem salva</div>'
        + '</div>';
      return;
    }
    container.innerHTML = _alvListaCache.map(function (alv) {
      var progresso = (alv.rodada_atual || 0) + 1;
      var total = alv.num_rodadas;
      var isAtiva = alv.id === _alvAtualId;
      var tipoLabel = alv.tipo === 'total' ? '100%' : 'Lucro';
      return '<div class="alv-lista-item' + (isAtiva ? ' alv-lista-item--ativa' : '') + '">'
        + '<div class="alv-lista-item-info">'
        +   '<div class="alv-lista-item-nome">' + escAlv(alv.nome) + '</div>'
        +   '<div class="alv-lista-item-meta">'
        +     fmtAlv(alv.aposta_inicial) + ' @ ' + parseFloat(alv.odd).toFixed(2)
        +     ' &middot; ' + tipoLabel
        +     ' &middot; Rodada ' + progresso + '/' + total
        +   '</div>'
        + '</div>'
        + '<div class="alv-lista-item-acoes">'
        + (isAtiva
            ? '<span class="alv-lista-item-badge">Aberta</span>'
            : '<button class="alv-lista-btn alv-lista-btn--abrir" onclick=\'alvAbrirById(' + JSON.stringify(alv) + ')\'><i class="bi bi-play-fill"></i> Abrir</button>'
          )
        + '<button class="alv-lista-btn alv-lista-btn--del" onclick="alvExcluir(' + alv.id + ')" title="Excluir"><i class="bi bi-trash"></i></button>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  function escAlv(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---- Cache da lista ---- */
  var _alvListaCache = [];

  /* ---- Carrega lista do servidor ---- */
  function alvCarregarLista() {
    fetch('/api/surebet/alavancagem')
      .then(function (r) { return r.json(); })
      .then(function (lista) {
        _alvListaCache = lista;
        renderLista();
        if (!lista.length) alvMostrarForm();
      })
      .catch(function () {});
  }

  window.alvCarregarLista = alvCarregarLista;

  /* ---- Toggle formulário nova ---- */
  window.alvToggleForm = function () {
    _alvFormAberto = !_alvFormAberto;
    document.getElementById('alvFormCard').style.display = _alvFormAberto ? '' : 'none';
  };

  function alvMostrarForm() {
    _alvFormAberto = true;
    document.getElementById('alvFormCard').style.display = '';
  }

  /* ---- Abrir por objeto (inline onclick) ---- */
  window.alvAbrirById = function (alv) {
    alvAbrir(alv);
  };

  /* ---- Criar nova alavancagem ---- */
  window.alvCriar = function () {
    var inicial = parseFloat(document.getElementById('alvInicial').value) || 0;
    var odd = parseFloat(document.getElementById('alvOdd').value) || 0;
    var nome = (document.getElementById('alvNome').value || '').trim();
    if (inicial <= 0 || odd <= 1) {
      alert('Preencha valores válidos (aposta > 0, odd > 1).');
      return;
    }
    var btn = document.getElementById('alvBtnCriar');
    btn.disabled = true;

    fetch('/api/surebet/alavancagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome || null,
        aposta_inicial: inicial,
        odd: odd,
        num_rodadas: _getNumRodadas(),
        tipo: _getTipo(),
      }),
    })
      .then(function (r) {
        if (!r.ok) {
          return r.json().catch(function () { return { error: 'Erro do servidor (' + r.status + ')' }; });
        }
        return r.json();
      })
      .then(function (data) {
        btn.disabled = false;
        if (data.error) { alert(data.error); return; }
        _alvListaCache.unshift(data);
        document.getElementById('alvNome').value = '';
        document.getElementById('alvFormCard').style.display = 'none';
        _alvFormAberto = false;
        try {
          alvAbrir(data);
        } catch (e) {
          console.error('[alvAbrir]', e);
        }
      })
      .catch(function (err) {
        btn.disabled = false;
        console.error('[alvCriar]', err);
        alert('Erro ao criar. Tente novamente.');
      });
  };

  /* ---- Deu certo → avança rodada ---- */
  window.alvDeuCerto = function () {
    if (!_alvAtualId) return;
    var novaRodada = _alvRodadaAtual + 1;
    if (novaRodada > _alvRounds.length) return;

    fetch('/api/surebet/alavancagem/' + _alvAtualId + '/rodada', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rodada_atual: novaRodada }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { alert(data.error); return; }
        _alvRodadaAtual = novaRodada;
        var item = _alvListaCache.find(function (a) { return a.id === _alvAtualId; });
        if (item) item.rodada_atual = novaRodada;
        renderRounds();
        renderLista();
      });
  };

  /* ---- Reiniciar → volta para rodada 0 ---- */
  window.alvReiniciar = function () {
    if (!_alvAtualId) return;
    if (!confirm('Reiniciar esta alavancagem do início?')) return;

    fetch('/api/surebet/alavancagem/' + _alvAtualId + '/rodada', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rodada_atual: 0 }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { alert(data.error); return; }
        _alvRodadaAtual = 0;
        var item = _alvListaCache.find(function (a) { return a.id === _alvAtualId; });
        if (item) item.rodada_atual = 0;
        renderRounds();
        renderLista();
      });
  };

  /* ---- Excluir ---- */
  window.alvExcluir = function (id) {
    if (!confirm('Excluir esta alavancagem?')) return;
    fetch('/api/surebet/alavancagem/' + id, { method: 'DELETE' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { alert(data.error); return; }
        _alvListaCache = _alvListaCache.filter(function (a) { return a.id !== id; });
        if (_alvAtualId === id) {
          _alvAtualId = null;
          document.getElementById('alvResultCard').style.display = 'none';
        }
        renderLista();
        if (!_alvListaCache.length) alvMostrarForm();
      });
  };
})();
