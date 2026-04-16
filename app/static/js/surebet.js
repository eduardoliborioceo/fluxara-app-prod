/* =============================================
   TABS
============================================= */
(function () {
  var _alvCarregado = false;
  var _monCarregado = false;

  document.querySelectorAll('.surebet-tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.surebet-tab-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var tab = btn.dataset.tab;
      document.getElementById('tab-calculadora').style.display  = tab === 'calculadora'  ? '' : 'none';
      document.getElementById('tab-monitorar').style.display    = tab === 'monitorar'    ? '' : 'none';
      document.getElementById('tab-alavancagem').style.display  = tab === 'alavancagem'  ? '' : 'none';
      document.getElementById('tab-escanear').style.display     = tab === 'escanear'     ? '' : 'none';
      if (tab === 'alavancagem' && !_alvCarregado) {
        _alvCarregado = true;
        alvCarregarLista();
      }
      if (tab === 'monitorar' && !_monCarregado) {
        _monCarregado = true;
        monCarregarLista();
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
  var _alvNumRodadas = 3;
  var _alvFormAberto = false;

  function fmtAlv(v) {
    return 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ---- Rodadas toggle ---- */
  document.getElementById('alvRodadasToggle').addEventListener('click', function (e) {
    var btn = e.target.closest('.surebet-outcome-btn');
    if (!btn) return;
    document.querySelectorAll('#alvRodadasToggle .surebet-outcome-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    _alvNumRodadas = parseInt(btn.dataset.n);
  });

  /* ---- Calcula sequência de rodadas ---- */
  function buildRounds(inicial, odd, n) {
    var rounds = [];
    var aposta = parseFloat(inicial);
    for (var i = 0; i < n; i++) {
      var retorno = aposta * parseFloat(odd);
      var guardar = parseFloat(inicial);
      rounds.push({ num: i + 1, aposta: aposta, retorno: retorno, guardar: guardar });
      aposta = retorno - parseFloat(inicial);
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
      html += '<div class="alv-round-row' + rowCls + '">'
        + '<div class="alv-round-badge' + badgeCls + '">' + badgeContent + '</div>'
        + '<div class="alv-round-info">'
        +   '<div class="alv-round-title">Rodada ' + r.num + ' \u2014 Apostar ' + fmtAlv(r.aposta) + '</div>'
        +   '<div class="alv-round-sub">Guardar se ganhar: ' + fmtAlv(r.guardar) + '</div>'
        + '</div>'
        + '<div class="alv-round-right">'
        +   '<div class="alv-round-retorno">' + fmtAlv(r.retorno) + '</div>'
        +   '<div class="alv-round-guardar">retorno</div>'
        + '</div>'
        + '</div>';
    });
    container.innerHTML = html;

    var totalGuardado = _alvRounds.slice(0, _alvRodadaAtual).reduce(function (s, r) { return s + r.guardar; }, 0);
    var rodadaObj = _alvRounds[_alvRodadaAtual] || null;
    document.getElementById('alvSummary').innerHTML = ''
      + '<div class="alv-summary-chip">'
      +   '<span class="alv-summary-chip-label">Rodada</span>'
      +   '<span class="alv-summary-chip-val">' + (_alvRodadaAtual + 1) + ' / ' + _alvRounds.length + '</span>'
      + '</div>'
      + (rodadaObj ? '<div class="alv-summary-chip">'
      +   '<span class="alv-summary-chip-label">Apostar agora</span>'
      +   '<span class="alv-summary-chip-val">' + fmtAlv(rodadaObj.aposta) + '</span>'
      + '</div>' : '')
      + '<div class="alv-summary-chip">'
      +   '<span class="alv-summary-chip-label">Guardado</span>'
      +   '<span class="alv-summary-chip-val alv-summary-chip-val--green">' + fmtAlv(totalGuardado) + '</span>'
      + '</div>';

    var btnCerto = document.getElementById('alvBtnCerto');
    if (btnCerto) btnCerto.disabled = _alvRodadaAtual >= _alvRounds.length;
  }

  /* ---- Abre uma alavancagem ---- */
  function alvAbrir(alv) {
    _alvAtualId = alv.id;
    _alvRodadaAtual = alv.rodada_atual || 0;
    _alvRounds = buildRounds(alv.aposta_inicial, alv.odd, alv.num_rodadas);
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
    var vazio = document.getElementById('alvListaVazio');
    if (!_alvListaCache || !_alvListaCache.length) {
      container.innerHTML = '';
      vazio.style.display = 'flex';
      return;
    }
    vazio.style.display = 'none';
    container.innerHTML = _alvListaCache.map(function (alv) {
      var progresso = (alv.rodada_atual || 0) + 1;
      var total = alv.num_rodadas;
      var isAtiva = alv.id === _alvAtualId;
      return '<div class="alv-lista-item' + (isAtiva ? ' alv-lista-item--ativa' : '') + '">'
        + '<div class="alv-lista-item-info">'
        +   '<div class="alv-lista-item-nome">' + escAlv(alv.nome) + '</div>'
        +   '<div class="alv-lista-item-meta">'
        +     fmtAlv(alv.aposta_inicial) + ' @ ' + parseFloat(alv.odd).toFixed(2)
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
        num_rodadas: _alvNumRodadas,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        if (data.error) { alert(data.error); return; }
        _alvListaCache.unshift(data);
        document.getElementById('alvNome').value = '';
        document.getElementById('alvFormCard').style.display = 'none';
        _alvFormAberto = false;
        alvAbrir(data);
      })
      .catch(function () {
        btn.disabled = false;
        alert('Erro ao criar. Tente novamente.');
      });
  };

  /* ---- Deu certo → avança rodada ---- */
  window.alvDeuCerto = function () {
    if (!_alvAtualId) return;
    var novaRodada = _alvRodadaAtual + 1;
    if (novaRodada >= _alvRounds.length) return;

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

/* =============================================
   MONITORAR PARTIDAS
============================================= */
(function () {
  var _monCache = [];
  var _monAbertaId = null;
  var _monEditandoId = null;
  var _monFormAberto = false;

  function fmtMon(v) {
    return 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPctMon(v) {
    return (v >= 0 ? '+' : '') + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }

  function escMon(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---- Render lista ---- */
  function renderLista() {
    var container = document.getElementById('monLista');
    var vazio = document.getElementById('monListaVazio');
    if (!_monCache.length) {
      container.innerHTML = '';
      vazio.style.display = 'flex';
      return;
    }
    vazio.style.display = 'none';
    container.innerHTML = _monCache.map(function (p) {
      var s = p.status;
      var isAberta = p.id === _monAbertaId;
      var badgeCls = s.is_surebet ? 'mon-badge--ok' : 'mon-badge--no';
      var badgeTxt = s.is_surebet ? 'SUREBET' : 'Sem surebet';
      return '<div class="alv-lista-item' + (isAberta ? ' alv-lista-item--ativa' : '') + '">'
        + '<div class="alv-lista-item-info">'
        +   '<div class="alv-lista-item-nome">' + escMon(p.nome) + '</div>'
        +   '<div class="alv-lista-item-meta">'
        +     parseFloat(p.odd_mandante).toFixed(2) + ' · '
        +     parseFloat(p.odd_visitante).toFixed(2) + ' · '
        +     parseFloat(p.odd_empate_gols).toFixed(2)
        +   '</div>'
        + '</div>'
        + '<div class="alv-lista-item-acoes">'
        + '<span class="alv-lista-item-badge ' + badgeCls + '">' + badgeTxt + '</span>'
        + (isAberta
            ? ''
            : '<button class="alv-lista-btn alv-lista-btn--abrir" onclick=\'monAbrirById(' + JSON.stringify(p) + ')\'><i class="bi bi-eye"></i></button>'
          )
        + '<button class="alv-lista-btn alv-lista-btn--del" onclick="monExcluir(' + p.id + ')" title="Excluir"><i class="bi bi-trash"></i></button>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  /* ---- Carrega lista ---- */
  function monCarregarLista() {
    fetch('/api/surebet/partida')
      .then(function (r) { return r.json(); })
      .then(function (lista) {
        _monCache = lista;
        renderLista();
      })
      .catch(function () {});
  }

  window.monCarregarLista = monCarregarLista;

  /* ---- Toggle formulário ---- */
  window.monToggleForm = function () {
    if (_monFormAberto && !_monEditandoId) {
      monFecharForm();
      return;
    }
    _monEditandoId = null;
    document.getElementById('monFormLabel').textContent = 'Nova partida';
    document.getElementById('monBtnSalvarLabel').textContent = 'Salvar partida';
    document.getElementById('monNome').value = '';
    document.getElementById('monTotal').value = '100';
    document.getElementById('monBetanoUrl').value = '';
    document.getElementById('monUrlError').style.display = 'none';
    document.getElementById('monOddMandante').value = '';
    document.getElementById('monOddVisitante').value = '';
    document.getElementById('monOddEmpate').value = '';
    document.getElementById('monPreview').style.display = 'none';
    _monFormAberto = true;
    document.getElementById('monFormCard').style.display = '';
    document.getElementById('monFormCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  window.monFecharForm = function () {
    _monFormAberto = false;
    _monEditandoId = null;
    document.getElementById('monFormCard').style.display = 'none';
    document.getElementById('monPreview').style.display = 'none';
  };

  /* ---- Buscar odds via URL Betano ---- */
  window.monBuscarOdds = function () {
    var url = (document.getElementById('monBetanoUrl').value || '').trim();
    var errorEl = document.getElementById('monUrlError');
    var buscarBtn = document.getElementById('monBtnBuscar');
    var buscarIcon = document.getElementById('monBuscarIcon');
    var buscarLabel = document.getElementById('monBuscarLabel');

    errorEl.style.display = 'none';

    if (!url) {
      errorEl.textContent = 'Cole a URL da partida no Betano.';
      errorEl.style.display = '';
      return;
    }
    if (!url.includes('betano')) {
      errorEl.textContent = 'URL inválida — deve ser uma URL do Betano.';
      errorEl.style.display = '';
      return;
    }

    buscarBtn.disabled = true;
    buscarIcon.className = 'bi bi-hourglass-split';
    buscarLabel.textContent = 'Buscando...';

    fetch('/api/surebet/betano/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        buscarBtn.disabled = false;
        buscarIcon.className = 'bi bi-search';
        buscarLabel.textContent = 'Buscar';

        if (data.error) {
          errorEl.textContent = data.error;
          errorEl.style.display = '';
          return;
        }

        if (data.nome) document.getElementById('monNome').value = data.nome;
        if (data.odd_mandante)   document.getElementById('monOddMandante').value = parseFloat(data.odd_mandante).toFixed(2);
        if (data.odd_visitante)  document.getElementById('monOddVisitante').value = parseFloat(data.odd_visitante).toFixed(2);
        if (data.odd_empate_gols) document.getElementById('monOddEmpate').value = parseFloat(data.odd_empate_gols).toFixed(2);

        atualizarPreview();
      })
      .catch(function () {
        buscarBtn.disabled = false;
        buscarIcon.className = 'bi bi-search';
        buscarLabel.textContent = 'Buscar';
        errorEl.textContent = 'Erro de conexão. Tente novamente.';
        errorEl.style.display = '';
      });
  };

  /* ---- Preview inline ao preencher odds ---- */
  function atualizarPreview() {
    var m = parseFloat(document.getElementById('monOddMandante').value);
    var v = parseFloat(document.getElementById('monOddVisitante').value);
    var e = parseFloat(document.getElementById('monOddEmpate').value);
    var total = parseFloat(document.getElementById('monTotal').value) || 100;
    var preview = document.getElementById('monPreview');
    if (!m || m <= 1 || !v || v <= 1 || !e || e <= 1 || total <= 0) {
      preview.style.display = 'none';
      return;
    }
    var invSum = 1 / m + 1 / v + 1 / e;
    var isSurebet = invSum < 1;
    var margem = (1 - invSum) * 100;
    preview.style.display = '';
    preview.className = 'mon-preview ' + (isSurebet ? 'mon-preview--ok' : 'mon-preview--no');
    preview.innerHTML = (isSurebet
      ? '<i class="bi bi-check-circle-fill"></i> <strong>Surebet!</strong> Margem: ' + fmtPctMon(margem)
      : '<i class="bi bi-x-circle-fill"></i> Não é surebet — margem: ' + fmtPctMon(margem));
  }

  ['monOddMandante', 'monOddVisitante', 'monOddEmpate', 'monTotal'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', atualizarPreview);
  });

  /* ---- Salvar (criar ou editar) ---- */
  window.monSalvar = function () {
    var nome = (document.getElementById('monNome').value || '').trim();
    var total = parseFloat(document.getElementById('monTotal').value) || 0;
    var m = parseFloat(document.getElementById('monOddMandante').value) || 0;
    var v = parseFloat(document.getElementById('monOddVisitante').value) || 0;
    var e = parseFloat(document.getElementById('monOddEmpate').value) || 0;

    if (m <= 1 || v <= 1 || e <= 1) {
      alert('Preencha todas as odds (mínimo 1.01).');
      return;
    }
    if (total <= 0) {
      alert('Informe o total a apostar.');
      return;
    }

    var btn = document.getElementById('monBtnSalvar');
    btn.disabled = true;

    var url = _monEditandoId ? '/api/surebet/partida/' + _monEditandoId : '/api/surebet/partida';
    var method = _monEditandoId ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome || null,
        total_apostar: total,
        odd_mandante: m,
        odd_visitante: v,
        odd_empate_gols: e,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        if (data.error) { alert(data.error); return; }
        if (_monEditandoId) {
          _monCache = _monCache.map(function (p) { return p.id === _monEditandoId ? data : p; });
        } else {
          _monCache.unshift(data);
        }
        monFecharForm();
        renderLista();
        monAbrirById(data);
      })
      .catch(function () {
        btn.disabled = false;
        alert('Erro ao salvar. Tente novamente.');
      });
  };

  /* ---- Abrir detalhe ---- */
  function monAbrirDetalhe(p) {
    _monAbertaId = p.id;
    var s = p.status;
    document.getElementById('monDetalheNome').textContent = p.nome;

    var statusCard = document.getElementById('monDetalheStatus');
    statusCard.className = 'surebet-result-card' + (s.is_surebet ? ' surebet-result-card--ok' : ' surebet-result-card--no');

    var header = document.getElementById('monDetalheStatusHeader');
    header.innerHTML = s.is_surebet
      ? '<i class="bi bi-check-circle-fill"></i> Surebet confirmada — lucro garantido!'
      : '<i class="bi bi-exclamation-triangle-fill"></i> Não é surebet ainda';

    var stakesLabels = ['Mandante', 'Visitante', 'Empate c/ gols'];
    document.getElementById('monDetalheStakes').innerHTML = s.stakes.map(function (st, i) {
      return '<div class="surebet-stake-row">'
        + '<span class="surebet-stake-label">' + stakesLabels[i] + ' (@ ' + st.odd.toFixed(2) + ')</span>'
        + '<span class="surebet-stake-value">' + fmtMon(st.stake) + '</span>'
        + '</div>';
    }).join('');

    document.getElementById('monDetalheRetorno').textContent = fmtMon(s.retorno);

    var lucroEl = document.getElementById('monDetalheLucro');
    lucroEl.textContent = fmtMon(s.lucro);
    lucroEl.className = 'surebet-result-value ' + (s.lucro >= 0 ? 'surebet-lucro--pos' : 'surebet-lucro--neg');

    var margemEl = document.getElementById('monDetalheMargem');
    margemEl.textContent = fmtPctMon(s.margem);
    margemEl.style.color = s.is_surebet ? '#16a34a' : '#dc3545';

    document.getElementById('monDetalheCard').style.display = '';
    renderLista();
    document.getElementById('monDetalheCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  window.monAbrirById = function (p) { monAbrirDetalhe(p); };

  window.monFecharDetalhe = function () {
    _monAbertaId = null;
    document.getElementById('monDetalheCard').style.display = 'none';
    renderLista();
  };

  /* ---- Editar partida aberta ---- */
  window.monEditarAberta = function () {
    var p = _monCache.find(function (x) { return x.id === _monAbertaId; });
    if (!p) return;
    _monEditandoId = p.id;
    document.getElementById('monFormLabel').textContent = 'Editar partida';
    document.getElementById('monBtnSalvarLabel').textContent = 'Atualizar odds';
    document.getElementById('monNome').value = p.nome || '';
    document.getElementById('monTotal').value = parseFloat(p.total_apostar).toFixed(2);
    document.getElementById('monOddMandante').value = parseFloat(p.odd_mandante).toFixed(2);
    document.getElementById('monOddVisitante').value = parseFloat(p.odd_visitante).toFixed(2);
    document.getElementById('monOddEmpate').value = parseFloat(p.odd_empate_gols).toFixed(2);
    _monFormAberto = true;
    document.getElementById('monFormCard').style.display = '';
    atualizarPreview();
    document.getElementById('monFormCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  /* ---- Excluir partida ---- */
  window.monExcluir = function (id) {
    if (!confirm('Excluir esta partida monitorada?')) return;
    fetch('/api/surebet/partida/' + id, { method: 'DELETE' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { alert(data.error); return; }
        _monCache = _monCache.filter(function (p) { return p.id !== id; });
        if (_monAbertaId === id) {
          _monAbertaId = null;
          document.getElementById('monDetalheCard').style.display = 'none';
        }
        renderLista();
      });
  };

  window.monExcluirAberta = function () {
    if (_monAbertaId) monExcluir(_monAbertaId);
  };
})();

/* =============================================
   ESCANEAR SUREBETS
============================================= */
(function () {
  var DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var _scanDay = DAYS_EN[new Date().getDay()];
  var _scanMatches = [];
  var _scanRunning = false;
  var _scanAbort = false;

  /* ---- Seleciona dia automaticamente (hoje) ---- */
  (function initDayToggle() {
    var toggle = document.getElementById('scanDayToggle');
    if (!toggle) return;
    toggle.querySelectorAll('.surebet-outcome-btn').forEach(function (btn) {
      if (btn.dataset.day === _scanDay) btn.classList.add('active');
      btn.addEventListener('click', function () {
        toggle.querySelectorAll('.surebet-outcome-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        _scanDay = btn.dataset.day;
      });
    });
  })();

  /* ---- Helpers ---- */
  function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmt(v) {
    return 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPct(v) {
    return (v >= 0 ? '+' : '') + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }

  function calcSurebet(m, v, e) {
    var inv = 1 / m + 1 / v + 1 / e;
    var total = 100;
    return {
      isSurebet: inv < 1,
      inv: inv,
      margem: (1 - inv) * 100,
      retorno: total / inv,
      lucro: total / inv - total,
      stakes: [
        { label: 'Mandante', odd: m, stake: total * (1 / m) / inv },
        { label: 'Visitante', odd: v, stake: total * (1 / v) / inv },
        { label: 'Empate c/ gols', odd: e, stake: total * (1 / e) / inv },
      ],
    };
  }

  function fmtHora(raw) {
    if (!raw) return '';
    try {
      var d = new Date(raw);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  /* ---- Render match list ---- */
  function renderMatches() {
    var container = document.getElementById('scanMatchList');
    if (!container) return;
    if (!_scanMatches.length) {
      container.innerHTML = '<div class="alv-lista-vazio"><div>Nenhuma partida encontrada.</div></div>';
      return;
    }
    container.innerHTML = _scanMatches.map(function (m, i) {
      var statusHtml = '';
      if (m.status === 'waiting') {
        statusHtml = '<span class="scan-match-badge scan-badge--wait"><i class="bi bi-clock"></i></span>';
      } else if (m.status === 'scanning') {
        statusHtml = '<span class="scan-match-badge scan-badge--scan"><i class="bi bi-hourglass-split"></i></span>';
      } else if (m.status === 'surebet') {
        statusHtml = '<span class="scan-match-badge scan-badge--ok"><i class="bi bi-check-circle-fill"></i> Surebet</span>';
      } else if (m.status === 'no') {
        statusHtml = '<span class="scan-match-badge scan-badge--no"><i class="bi bi-x-circle"></i></span>';
      } else if (m.status === 'error') {
        statusHtml = '<span class="scan-match-badge scan-badge--err" title="' + esc(m.error || '') + '"><i class="bi bi-exclamation-triangle"></i></span>';
      }
      var hora = fmtHora(m.hora);
      return '<div class="scan-match-row" id="scan-row-' + i + '">'
        + '<div class="scan-match-info">'
        +   '<div class="scan-match-nome">' + esc(m.nome) + '</div>'
        +   (m.liga || hora
              ? '<div class="scan-match-meta">'
                + (hora ? hora + ' ' : '')
                + (m.liga ? '· ' + esc(m.liga) : '')
                + '</div>'
              : '')
        + '</div>'
        + '<div class="scan-match-status">' + statusHtml + '</div>'
        + '</div>';
    }).join('');
  }

  /* ---- Render surebets ---- */
  function renderSurebets() {
    var surebets = _scanMatches.filter(function (m) { return m.status === 'surebet' && m.sb; });
    var card = document.getElementById('scanSurebetsCard');
    var list = document.getElementById('scanSurebetsList');
    if (!card || !list) return;
    if (!surebets.length) { card.style.display = 'none'; return; }
    card.style.display = '';
    list.innerHTML = surebets.map(function (m) {
      var sb = m.sb;
      return '<div class="scan-sb-item">'
        + '<div class="scan-sb-header">'
        +   '<span class="scan-sb-nome">' + esc(m.nome) + '</span>'
        +   '<span class="scan-sb-margem">' + fmtPct(sb.margem) + '</span>'
        + '</div>'
        + '<div class="scan-sb-odds">'
        +   sb.stakes.map(function (st) {
              return '<div class="scan-sb-stake">'
                + '<span class="scan-sb-stake-label">' + esc(st.label) + ' @ ' + parseFloat(st.odd).toFixed(2) + '</span>'
                + '<span class="scan-sb-stake-value">' + fmt(st.stake) + '</span>'
                + '</div>';
            }).join('')
        + '</div>'
        + '<div class="scan-sb-footer">'
        +   'Retorno: <strong>' + fmt(sb.retorno) + '</strong>'
        +   ' &nbsp;·&nbsp; Lucro: <strong style="color:#16a34a">' + fmt(sb.lucro) + '</strong>'
        + '</div>'
        + '<a href="' + esc(m.url) + '" target="_blank" class="scan-sb-link">'
        +   '<i class="bi bi-box-arrow-up-right"></i> Abrir na Betano'
        + '</a>'
        + '</div>';
    }).join('');
  }

  /* ---- Buscar lista de partidas ---- */
  window.scanBuscarPartidas = function () {
    var errorEl = document.getElementById('scanError');
    var buscarBtn = document.getElementById('scanBtnBuscar');
    var buscarIcon = document.getElementById('scanBuscarIcon');
    var buscarLabel = document.getElementById('scanBuscarLabel');

    errorEl.style.display = 'none';
    buscarBtn.disabled = true;
    buscarIcon.className = 'bi bi-hourglass-split';
    buscarLabel.textContent = 'Buscando...';

    fetch('/api/surebet/betano/upcoming?day=' + encodeURIComponent(_scanDay))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        buscarBtn.disabled = false;
        buscarIcon.className = 'bi bi-search';
        buscarLabel.textContent = 'Buscar partidas';

        if (data.error) {
          errorEl.textContent = data.error;
          errorEl.style.display = '';
          return;
        }

        _scanMatches = data.map(function (m) {
          return Object.assign({}, m, { status: 'waiting', sb: null, error: null });
        });
        _scanAbort = false;

        var resultsCard = document.getElementById('scanResultsCard');
        var scanBtn = document.getElementById('scanBtnScan');
        var progressBar = document.getElementById('scanProgressBar');
        var label = document.getElementById('scanListaLabel');
        var surebetsCard = document.getElementById('scanSurebetsCard');

        resultsCard.style.display = '';
        progressBar.style.display = 'none';
        surebetsCard.style.display = 'none';
        scanBtn.style.display = '';
        document.getElementById('scanBtnScanLabel').textContent = 'Escanear';
        label.textContent = _scanMatches.length + ' partidas encontradas';

        renderMatches();
      })
      .catch(function () {
        buscarBtn.disabled = false;
        buscarIcon.className = 'bi bi-search';
        buscarLabel.textContent = 'Buscar partidas';
        errorEl.textContent = 'Erro de conexão. Tente novamente.';
        errorEl.style.display = '';
      });
  };

  /* ---- Escanear todas sequencialmente (async) ---- */
  window.scanIniciar = async function () {
    if (_scanRunning) {
      _scanAbort = true;
      document.getElementById('scanBtnScanLabel').textContent = 'Parando...';
      return;
    }

    _scanRunning = true;
    _scanAbort = false;

    var scanBtn = document.getElementById('scanBtnScan');
    var progressBar = document.getElementById('scanProgressBar');
    var progressFill = document.getElementById('scanProgressFill');
    var progressLabel = document.getElementById('scanProgressLabel');

    scanBtn.querySelector('i').className = 'bi bi-stop-circle';
    document.getElementById('scanBtnScanLabel').textContent = 'Parar';
    progressBar.style.display = '';

    var total = _scanMatches.length;

    for (var i = 0; i < total; i++) {
      if (_scanAbort) break;

      _scanMatches[i].status = 'scanning';
      renderMatches();

      var pct = Math.round((i / total) * 100);
      progressFill.style.width = pct + '%';
      progressLabel.textContent = i + ' / ' + total + ' verificadas';

      try {
        var resp = await fetch('/api/surebet/betano/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: _scanMatches[i].url }),
        });
        var result = await resp.json();

        if (result.error) {
          _scanMatches[i].status = 'error';
          _scanMatches[i].error = result.error;
        } else {
          var sb = calcSurebet(
            parseFloat(result.odd_mandante),
            parseFloat(result.odd_visitante),
            parseFloat(result.odd_empate_gols)
          );
          _scanMatches[i].status = sb.isSurebet ? 'surebet' : 'no';
          _scanMatches[i].sb = sb;
        }
      } catch (e) {
        _scanMatches[i].status = 'error';
        _scanMatches[i].error = 'Erro de rede';
      }

      renderMatches();
      renderSurebets();
    }

    progressFill.style.width = '100%';
    progressLabel.textContent = total + ' / ' + total + ' verificadas';
    document.getElementById('scanListaLabel').textContent = 'Verificação concluída';
    scanBtn.querySelector('i').className = 'bi bi-radar';
    document.getElementById('scanBtnScanLabel').textContent = 'Escanear novamente';
    _scanRunning = false;
    _scanAbort = false;
  };
})();
