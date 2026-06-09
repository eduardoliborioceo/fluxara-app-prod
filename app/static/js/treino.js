(function () {
  'use strict';

  var _historicoCarregado = false;

  /* ===== TABS ===== */
  document.querySelectorAll('.treino-tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.treino-tab-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      var tab = btn.dataset.tab;
      document.getElementById('tab-treino-hoje').style.display = tab === 'hoje' ? '' : 'none';
      document.getElementById('tab-treino-historico').style.display = tab === 'historico' ? '' : 'none';
      if (tab === 'historico' && !_historicoCarregado) {
        carregarHistorico();
      }
    });
  });

  /* ===== LOAD TODAY ===== */
  function carregarHoje() {
    fetch('/api/treino/hoje')
      .then(function (r) { return r.json(); })
      .then(function (data) { renderizarHoje(data); })
      .catch(function () {
        document.getElementById('treinoVazio').style.display = '';
        atualizarStats({ total_exercicios: 0, total_series: 0, volume_total_kg: 0 });
      });
  }

  function renderizarHoje(data) {
    atualizarStats(data.stats || {});

    var container = document.getElementById('treinoExercicios');
    var vazio = document.getElementById('treinoVazio');

    container.querySelectorAll('.treino-exercicio-card').forEach(function (el) { el.remove(); });

    if (!data.exercicios || data.exercicios.length === 0) {
      vazio.style.display = '';
      return;
    }
    vazio.style.display = 'none';
    data.exercicios.forEach(function (ex) {
      container.insertBefore(construirCardExercicio(ex), vazio);
    });
  }

  function construirCardExercicio(ex) {
    var card = document.createElement('div');
    card.className = 'treino-exercicio-card';

    var html = '<div class="treino-exercicio-head">';
    html += '<div>';
    html += '<span class="treino-exercicio-nome">' + escHtml(ex.nome) + '</span>';
    html += '<br><span class="treino-exercicio-grupo">' + escHtml(ex.grupo) + '</span>';
    html += '</div>';
    html += '<button class="treino-add-serie-btn" onclick="abrirModalSerie(\'' + escAttr(ex.nome) + '\', \'' + escAttr(ex.grupo) + '\')">';
    html += '<i class="bi bi-plus"></i> Série</button>';
    html += '</div>';

    html += '<div class="treino-series-list" id="sl-' + normId(ex.nome) + '">';
    ex.series.forEach(function (s, idx) {
      html += construirSerieHtml(s, idx + 1);
    });
    html += '</div>';

    card.innerHTML = html;
    return card;
  }

  function construirSerieHtml(s, num) {
    var desc = montarDescSerie(s);
    var html = '<div class="treino-serie-item" id="serie-' + s.id + '">';
    html += '<span class="treino-serie-num">' + num + '</span>';
    html += '<span class="treino-serie-desc">' + desc + '</span>';
    if (s.observacao) {
      html += '<span class="treino-serie-obs">' + escHtml(s.observacao) + '</span>';
    }
    html += '<button class="treino-serie-del" onclick="deletarSerie(' + s.id + ')" title="Remover"><i class="bi bi-x"></i></button>';
    html += '</div>';
    return html;
  }

  function montarDescSerie(s) {
    var partes = [];
    if (s.reps) partes.push(s.reps + ' reps');
    if (s.peso_kg) partes.push(s.peso_kg + ' kg');
    if (s.duracao_seg) partes.push(formatDuracao(s.duracao_seg));
    return partes.length ? partes.join(' × ') : '–';
  }

  function formatDuracao(seg) {
    if (seg >= 60) {
      var min = Math.floor(seg / 60);
      var resto = seg % 60;
      return min + 'min' + (resto ? ' ' + resto + 's' : '');
    }
    return seg + 's';
  }

  function atualizarStats(stats) {
    document.getElementById('statExercicios').textContent = stats.total_exercicios !== undefined ? stats.total_exercicios : '–';
    document.getElementById('statSeries').textContent = stats.total_series !== undefined ? stats.total_series : '–';
    var vol = stats.volume_total_kg || 0;
    document.getElementById('statVolume').textContent = vol >= 1000 ? (vol / 1000).toFixed(1) + ' t' : vol + ' kg';
  }

  /* ===== MODAL EXERCÍCIO ===== */
  var _modalSeriePara = null;

  window.abrirModalExercicio = function () {
    _modalSeriePara = null;
    document.getElementById('modalTreinoTitulo').textContent = 'Adicionar exercício';
    document.getElementById('modalGrupo').disabled = false;
    document.getElementById('modalExercicio').disabled = false;
    document.getElementById('modalExercicio').value = '';
    document.getElementById('modalGrupo').selectedIndex = 0;
    atualizarSugestoes();
    limparCamposModais();
    document.getElementById('modalTreino').style.display = 'flex';
    setTimeout(function () { document.getElementById('modalExercicio').focus(); }, 120);
  };

  window.abrirModalSerie = function (nome, grupo) {
    _modalSeriePara = { nome: nome, grupo: grupo };
    document.getElementById('modalTreinoTitulo').textContent = 'Adicionar série — ' + nome;
    document.getElementById('modalGrupo').value = grupo;
    document.getElementById('modalGrupo').disabled = true;
    document.getElementById('modalExercicio').value = nome;
    document.getElementById('modalExercicio').disabled = true;
    atualizarSugestoes();
    limparCamposModais();
    document.getElementById('modalTreino').style.display = 'flex';
    setTimeout(function () { document.getElementById('modalReps').focus(); }, 120);
  };

  window.fecharModalTreino = function (evt) {
    if (!evt || evt.target === document.getElementById('modalTreino')) {
      document.getElementById('modalTreino').style.display = 'none';
      document.getElementById('modalGrupo').disabled = false;
      document.getElementById('modalExercicio').disabled = false;
    }
  };

  window.atualizarSugestoes = function () {
    var grupo = document.getElementById('modalGrupo').value;
    var sugestoes = _EXERCICIOS_PADRAO[grupo] || [];
    var dl = document.getElementById('exerciciosSugestoes');
    dl.innerHTML = '';
    sugestoes.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s;
      dl.appendChild(opt);
    });
  };

  function limparCamposModais() {
    ['modalReps', 'modalPeso', 'modalDuracao', 'modalObs'].forEach(function (id) {
      document.getElementById(id).value = '';
    });
  }

  window.salvarItem = function () {
    var grupo = document.getElementById('modalGrupo').value;
    var exercicio = document.getElementById('modalExercicio').value.trim();
    var reps = document.getElementById('modalReps').value || null;
    var peso = document.getElementById('modalPeso').value || null;
    var dur = document.getElementById('modalDuracao').value || null;
    var obs = document.getElementById('modalObs').value.trim() || null;

    if (!exercicio) { alert('Informe o nome do exercício'); return; }

    fetch('/api/treino/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: _DATA_HOJE,
        grupo: grupo,
        exercicio: exercicio,
        reps: reps ? parseInt(reps, 10) : null,
        peso_kg: peso ? parseFloat(peso) : null,
        duracao_seg: dur ? parseInt(dur, 10) : null,
        observacao: obs,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { alert(data.error); return; }
        fecharModalTreino();
        carregarHoje();
      })
      .catch(function () { alert('Erro ao salvar. Tente novamente.'); });
  };

  window.deletarSerie = function (id) {
    fetch('/api/treino/item/' + id, { method: 'DELETE' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { alert(data.error); return; }
        carregarHoje();
      });
  };

  /* ===== HISTORY ===== */
  function carregarHistorico() {
    document.getElementById('historicoLista').innerHTML = '<div class="treino-loading">Carregando...</div>';
    fetch('/api/treino/historico')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _historicoCarregado = true;
        renderizarHistorico(data);
      })
      .catch(function () {
        document.getElementById('historicoLista').innerHTML = '<div class="treino-empty"><p>Erro ao carregar histórico</p></div>';
      });
  }

  function renderizarHistorico(dias) {
    var container = document.getElementById('historicoLista');
    if (!dias || dias.length === 0) {
      container.innerHTML = '<div class="treino-empty"><i class="bi bi-calendar3"></i><p>Nenhum treino registrado ainda</p></div>';
      return;
    }
    var html = '';
    dias.forEach(function (d) {
      var vol = d.volume_total_kg >= 1000
        ? (d.volume_total_kg / 1000).toFixed(1) + ' t'
        : d.volume_total_kg + ' kg';
      html += '<div class="treino-hist-item" onclick="verDetalheHistorico(\'' + d.data + '\', \'' + escAttr(d.data_formatada) + '\')">';
      html += '<div class="treino-hist-data">' + escHtml(d.data_formatada) + '</div>';
      html += '<div class="treino-hist-stats">';
      html += '<span>' + d.total_exercicios + ' exerc.</span>';
      html += '<span>' + d.total_series + ' séries</span>';
      if (d.volume_total_kg > 0) html += '<span>' + vol + '</span>';
      html += '</div>';
      html += '<i class="bi bi-chevron-right treino-hist-chevron"></i>';
      html += '</div>';
    });
    container.innerHTML = html;
  }

  window.verDetalheHistorico = function (data, titulo) {
    document.getElementById('modalHistoricoTitulo').textContent = titulo;
    document.getElementById('modalHistoricoConteudo').innerHTML = '<div class="treino-loading">Carregando...</div>';
    document.getElementById('modalHistoricoDetalhe').style.display = 'flex';

    fetch('/api/treino/dia?data=' + encodeURIComponent(data))
      .then(function (r) { return r.json(); })
      .then(function (result) {
        var html = '';
        if (!result.exercicios || result.exercicios.length === 0) {
          html = '<div class="treino-empty"><p>Nenhum dado encontrado</p></div>';
        } else {
          result.exercicios.forEach(function (ex) {
            html += '<div class="treino-hist-detalhe-grupo">';
            html += '<div class="treino-hist-detalhe-nome">';
            html += escHtml(ex.nome);
            html += '<span class="treino-exercicio-grupo">' + escHtml(ex.grupo) + '</span>';
            html += '</div>';
            ex.series.forEach(function (s, idx) {
              html += '<div class="treino-hist-detalhe-serie">';
              html += '<span class="treino-serie-num">' + (idx + 1) + '</span>';
              html += '<span>' + montarDescSerie(s) + '</span>';
              if (s.observacao) {
                html += '<span class="treino-serie-obs">' + escHtml(s.observacao) + '</span>';
              }
              html += '</div>';
            });
            html += '</div>';
          });
        }
        document.getElementById('modalHistoricoConteudo').innerHTML = html;
      })
      .catch(function () {
        document.getElementById('modalHistoricoConteudo').innerHTML = '<div class="treino-empty"><p>Erro ao carregar</p></div>';
      });
  };

  window.fecharModalHistorico = function (evt) {
    if (!evt || evt.target === document.getElementById('modalHistoricoDetalhe')) {
      document.getElementById('modalHistoricoDetalhe').style.display = 'none';
    }
  };

  /* ===== HELPERS ===== */
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function normId(s) {
    return String(s).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  /* ===== GUIDE ===== */
  window.toggleTreinoGuide = function () {
    var body = document.getElementById('treinoGuideBody');
    var icon = document.getElementById('treinoGuideIcon');
    if (!body) return;
    var isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : '';
    if (icon) icon.className = isOpen ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
    localStorage.setItem('treinoGuideOpen', isOpen ? '0' : '1');
  };

  (function initGuide() {
    var stored = localStorage.getItem('treinoGuideOpen');
    if (stored === '0') {
      var body = document.getElementById('treinoGuideBody');
      var icon = document.getElementById('treinoGuideIcon');
      if (body) body.style.display = 'none';
      if (icon) icon.className = 'bi bi-chevron-down';
    }
  })();

  /* ===== INIT ===== */
  carregarHoje();
})();
