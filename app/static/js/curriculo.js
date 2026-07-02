(function () {
  'use strict';

  var _lista = [];
  var _editId = null;
  var _mobileTab = 'form';
  var _template = 'classico';

  // ── autocomplete ─────────────────────────────────────────────
  function buildAutocomplete(input, endpoint) {
    var wrap = document.createElement('div');
    wrap.className = 'cv-autocomplete-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var list = document.createElement('div');
    list.className = 'cv-autocomplete-list';
    wrap.appendChild(list);

    var timer = null;
    var focusedIdx = -1;

    function highlight(text, term) {
      var idx = text.toLowerCase().indexOf(term.toLowerCase());
      if (idx < 0) return esc(text);
      return esc(text.slice(0, idx)) +
        '<mark>' + esc(text.slice(idx, idx + term.length)) + '</mark>' +
        esc(text.slice(idx + term.length));
    }

    function close() {
      list.classList.remove('open');
      list.innerHTML = '';
      focusedIdx = -1;
    }

    function select(value) {
      input.value = value;
      close();
      input.dispatchEvent(new Event('input'));
    }

    function moveFocus(dir) {
      var items = list.querySelectorAll('.cv-autocomplete-item');
      if (!items.length) return;
      items[focusedIdx] && items[focusedIdx].classList.remove('focused');
      focusedIdx = (focusedIdx + dir + items.length) % items.length;
      items[focusedIdx].classList.add('focused');
      items[focusedIdx].scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(timer);
      if (q.length < 2) { close(); return; }
      timer = setTimeout(function () {
        fetch(endpoint + '?q=' + encodeURIComponent(q))
          .then(function (r) { return r.json(); })
          .then(function (results) {
            if (!results.length) { close(); return; }
            list.innerHTML = results.map(function (r) {
              return '<div class="cv-autocomplete-item" data-value="' + esc(r) + '">' +
                highlight(r, q) + '</div>';
            }).join('');
            list.classList.add('open');
            focusedIdx = -1;
            list.querySelectorAll('.cv-autocomplete-item').forEach(function (el) {
              el.addEventListener('mousedown', function (e) {
                e.preventDefault();
                select(el.dataset.value);
              });
            });
          });
      }, 200);
    });

    input.addEventListener('keydown', function (e) {
      if (!list.classList.contains('open')) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(-1); }
      else if (e.key === 'Enter') {
        var focused = list.querySelector('.cv-autocomplete-item.focused');
        if (focused) { e.preventDefault(); select(focused.dataset.value); }
      }
      else if (e.key === 'Escape') { close(); }
    });

    input.addEventListener('blur', function () {
      setTimeout(close, 150);
    });
  }

  // ── utils ────────────────────────────────────────────────────
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function setVal(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = v || '';
  }

  // ── template selection ────────────────────────────────────────
  window.cvAbrirSelecaoTemplate = function () {
    document.getElementById('cvTemplateOverlay').style.display = 'flex';
  };

  window.cvFecharTemplate = function (e) {
    if (!e || e.target === document.getElementById('cvTemplateOverlay')) {
      document.getElementById('cvTemplateOverlay').style.display = 'none';
    }
  };

  window.cvSelecionarTemplate = function (tpl) {
    _template = tpl;
    document.getElementById('cvTemplateOverlay').style.display = 'none';
    _editId = null;
    cvAbrirEditor(null);
  };

  // ── views ────────────────────────────────────────────────────
  function showLista() {
    document.getElementById('cvLista').style.display = 'block';
    var ed = document.getElementById('cvEditor');
    ed.style.display = 'none';
    ed.classList.remove('active');
  }

  function showEditor() {
    document.getElementById('cvLista').style.display = 'none';
    var ed = document.getElementById('cvEditor');
    ed.style.display = 'flex';
    ed.classList.add('active');
    cvTab('form');
  }

  window.cvVoltarLista = function () {
    showLista();
    _editId = null;
  };

  // ── mobile tabs ──────────────────────────────────────────────
  window.cvTab = function (tab) {
    _mobileTab = tab;
    var btns = document.querySelectorAll('.cv-tab-btn');
    btns[0].classList.toggle('active', tab === 'form');
    btns[1].classList.toggle('active', tab === 'preview');
    var form = document.getElementById('cvFormCard');
    var prev = document.getElementById('cvPreviewCard');
    if (window.innerWidth <= 900) {
      form.classList.toggle('cv-tab-active', tab === 'form');
      prev.classList.toggle('cv-tab-active', tab === 'preview');
    } else {
      form.classList.add('cv-tab-active');
      prev.classList.add('cv-tab-active');
    }
  };

  // ── section toggles ──────────────────────────────────────────
  window.cvToggleSection = function (el) {
    el.classList.toggle('open');
    var body = el.nextElementSibling;
    body.classList.toggle('open');
  };

  // ── dynamic items ────────────────────────────────────────────
  function makeItem(listId, innerHtml) {
    var list = document.getElementById(listId);
    var div = document.createElement('div');
    div.className = 'cv-dynamic-item';
    div.innerHTML = '<button class="cv-item-remove" onclick="this.parentElement.remove();cvPreview()" title="Remover"><i class="bi bi-trash3"></i></button>' + innerHtml;
    list.appendChild(div);
    div.querySelectorAll('input,textarea,select').forEach(function (el) {
      el.addEventListener('input', cvPreview);
    });
    cvPreview();
  }

  window.cvAddFormacao = function () {
    makeItem('cvFormacaoList',
      '<div class="cv-field"><label class="cv-label">Instituição</label>' +
      '<input type="text" class="cv-input cv-finst" placeholder="Universidade / Curso" autocomplete="off"></div>' +
      '<div class="cv-field"><label class="cv-label">Descrição</label>' +
      '<input type="text" class="cv-input cv-fdesc" placeholder="Graduação em Análise e Desenvolvimento de Sistemas"></div>' +
      '<div class="cv-row">' +
      '<div class="cv-field"><label class="cv-label">Período</label>' +
      '<input type="text" class="cv-input cv-fperiodo" placeholder="Fevereiro 2026 – Atualmente"></div>' +
      '<div class="cv-field"><label class="cv-label">Localidade</label>' +
      '<input type="text" class="cv-input cv-flocal" placeholder="Manaus, AM" autocomplete="off"></div>' +
      '</div>'
    );
    var items = document.querySelectorAll('#cvFormacaoList .cv-dynamic-item');
    var last = items[items.length - 1];
    buildAutocomplete(last.querySelector('.cv-finst'), '/api/autocomplete/instituicoes');
    buildAutocomplete(last.querySelector('.cv-flocal'), '/api/autocomplete/localidades');
  };

  window.cvAddComp = function () {
    makeItem('cvCompList',
      '<div class="cv-row">' +
      '<div class="cv-field"><label class="cv-label">Categoria</label>' +
      '<input type="text" class="cv-input cv-clabel" placeholder="Linguagem"></div>' +
      '<div class="cv-field" style="flex:2"><label class="cv-label">Descrição</label>' +
      '<input type="text" class="cv-input cv-cval" placeholder="Python, JavaScript, SQL..."></div>' +
      '</div>'
    );
  };

  window.cvAddExp = function () {
    makeItem('cvExpList',
      '<div class="cv-field"><label class="cv-label">Cargo – Tipo de contrato</label>' +
      '<input type="text" class="cv-input cv-ecargo" placeholder="APONTADOR(A) DE PRODUÇÃO – CLT"></div>' +
      '<div class="cv-row">' +
      '<div class="cv-field"><label class="cv-label">Empresa</label>' +
      '<input type="text" class="cv-input cv-eemp" placeholder="Venttos Electronics"></div>' +
      '<div class="cv-field"><label class="cv-label">Período</label>' +
      '<input type="text" class="cv-input cv-eper" placeholder="Abril 2024 – Atualmente"></div>' +
      '</div>' +
      '<div class="cv-field"><label class="cv-label">Responsabilidades (uma por linha)</label>' +
      '<textarea class="cv-textarea cv-eresp" rows="4" placeholder="Lançamento de produção no sistema;\nRegistrar paradas de máquina;"></textarea></div>'
    );
  };

  window.cvAddCert = function () {
    makeItem('cvCertList',
      '<div class="cv-row">' +
      '<div class="cv-field" style="flex:2"><label class="cv-label">Nome / Emissor</label>' +
      '<input type="text" class="cv-input cv-cnome" placeholder="Power BI Completo (udemy) | CERTIFICADO"></div>' +
      '<div class="cv-field"><label class="cv-label">Data</label>' +
      '<input type="text" class="cv-input cv-cdata" placeholder="Julho 2025"></div>' +
      '</div>'
    );
  };

  // ── collect form data ────────────────────────────────────────
  function collectDados() {
    var formacao = [];
    document.querySelectorAll('#cvFormacaoList .cv-dynamic-item').forEach(function (el) {
      formacao.push({
        instituicao: el.querySelector('.cv-finst').value.trim(),
        descricao: el.querySelector('.cv-fdesc').value.trim(),
        periodo: el.querySelector('.cv-fperiodo').value.trim(),
        localidade: el.querySelector('.cv-flocal').value.trim()
      });
    });

    var competencias = [];
    document.querySelectorAll('#cvCompList .cv-dynamic-item').forEach(function (el) {
      competencias.push({
        label: el.querySelector('.cv-clabel').value.trim(),
        valor: el.querySelector('.cv-cval').value.trim()
      });
    });

    var experiencias = [];
    document.querySelectorAll('#cvExpList .cv-dynamic-item').forEach(function (el) {
      experiencias.push({
        cargo_contrato: el.querySelector('.cv-ecargo').value.trim(),
        empresa: el.querySelector('.cv-eemp').value.trim(),
        periodo: el.querySelector('.cv-eper').value.trim(),
        responsabilidades: el.querySelector('.cv-eresp').value.trim()
      });
    });

    var certificados = [];
    document.querySelectorAll('#cvCertList .cv-dynamic-item').forEach(function (el) {
      certificados.push({
        nome: el.querySelector('.cv-cnome').value.trim(),
        data: el.querySelector('.cv-cdata').value.trim()
      });
    });

    return {
      template: _template,
      nome: val('fNome'),
      email: val('fEmail'),
      telefone: val('fTelefone'),
      linkedin: val('fLinkedin'),
      github: val('fGithub'),
      formacao: formacao,
      competencias: competencias,
      experiencias: experiencias,
      certificados: certificados
    };
  }

  // ── populate form from dados ─────────────────────────────────
  function populateForm(dados) {
    _template = dados.template || 'classico';
    setVal('fNome', dados.nome);
    setVal('fEmail', dados.email);
    setVal('fTelefone', dados.telefone);
    setVal('fLinkedin', dados.linkedin);
    setVal('fGithub', dados.github);

    document.getElementById('cvFormacaoList').innerHTML = '';
    (dados.formacao || []).forEach(function (f) {
      cvAddFormacao();
      var items = document.querySelectorAll('#cvFormacaoList .cv-dynamic-item');
      var last = items[items.length - 1];
      last.querySelector('.cv-finst').value = f.instituicao || '';
      last.querySelector('.cv-fdesc').value = f.descricao || '';
      last.querySelector('.cv-fperiodo').value = f.periodo || '';
      last.querySelector('.cv-flocal').value = f.localidade || '';
    });
    // autocomplete já está aplicado por cvAddFormacao()

    document.getElementById('cvCompList').innerHTML = '';
    (dados.competencias || []).forEach(function (c) {
      cvAddComp();
      var items = document.querySelectorAll('#cvCompList .cv-dynamic-item');
      var last = items[items.length - 1];
      last.querySelector('.cv-clabel').value = c.label || '';
      last.querySelector('.cv-cval').value = c.valor || '';
    });

    document.getElementById('cvExpList').innerHTML = '';
    (dados.experiencias || []).forEach(function (e) {
      cvAddExp();
      var items = document.querySelectorAll('#cvExpList .cv-dynamic-item');
      var last = items[items.length - 1];
      last.querySelector('.cv-ecargo').value = e.cargo_contrato || '';
      last.querySelector('.cv-eemp').value = e.empresa || '';
      last.querySelector('.cv-eper').value = e.periodo || '';
      last.querySelector('.cv-eresp').value = e.responsabilidades || '';
    });

    document.getElementById('cvCertList').innerHTML = '';
    (dados.certificados || []).forEach(function (c) {
      cvAddCert();
      var items = document.querySelectorAll('#cvCertList .cv-dynamic-item');
      var last = items[items.length - 1];
      last.querySelector('.cv-cnome').value = c.nome || '';
      last.querySelector('.cv-cdata').value = c.data || '';
    });
  }

  // ── preview (Modelo Clássico) ─────────────────────────────────
  window.cvPreview = function () {
    var dados = collectDados();
    document.getElementById('cvDoc').innerHTML = buildDocHtml(dados);
  };

  function buildDocHtml(d) {
    var html = '';

    // HEADER
    html += '<div class="cvc-header">';
    html += '<div class="cvc-header-left">';
    html += '<div class="cvc-name">' + esc(d.nome || 'Seu Nome') + '</div>';
    if (d.linkedin) {
      html += '<div class="cvc-contact-line">LinkedIn: ' + esc(d.linkedin) + '</div>';
    }
    if (d.github) {
      html += '<div class="cvc-contact-line">GitHub: ' + esc(d.github) + '</div>';
    }
    html += '</div>';
    html += '<div class="cvc-header-right">';
    if (d.email) {
      html += '<div class="cvc-email-label">Email:</div>';
      html += '<div class="cvc-email-val">' + esc(d.email) + '</div>';
    }
    if (d.telefone) {
      html += '<div class="cvc-cel-label">Celular:</div>';
      html += '<div class="cvc-cel-val">' + esc(d.telefone) + '</div>';
    }
    html += '</div>';
    html += '</div>';

    // FORMAÇÃO
    if (d.formacao && d.formacao.length) {
      html += '<div class="cvc-section">';
      html += '<div class="cvc-section-title">FORMAÇÃO</div>';
      d.formacao.forEach(function (f) {
        if (!f.instituicao && !f.descricao) return;
        html += '<div class="cvc-form-item">';
        html += '<div class="cvc-form-left">';
        html += '<div class="cvc-inst">' + esc(f.instituicao) + '</div>';
        html += '<div class="cvc-desc">' + esc(f.descricao) + '</div>';
        html += '</div>';
        html += '<div class="cvc-form-right">';
        html += '<div class="cvc-period">' + esc(f.periodo) + '</div>';
        html += '<div class="cvc-local">' + esc(f.localidade) + '</div>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    // RESUMO DE COMPETÊNCIAS
    var comps = (d.competencias || []).filter(function (c) { return c.label || c.valor; });
    if (comps.length) {
      html += '<div class="cvc-section">';
      html += '<div class="cvc-section-title">RESUMO DE COMPETÊNCIAS</div>';
      html += '<ul class="cvc-bullets">';
      comps.forEach(function (c) {
        html += '<li>';
        if (c.label) html += '<strong>' + esc(c.label) + ':</strong> ';
        html += esc(c.valor);
        html += '</li>';
      });
      html += '</ul>';
      html += '</div>';
    }

    // EXPERIÊNCIA PROFISSIONAL
    var exps = (d.experiencias || []).filter(function (e) { return e.cargo_contrato || e.empresa; });
    if (exps.length) {
      html += '<div class="cvc-section">';
      html += '<div class="cvc-section-title">EXPERIÊNCIA PROFISSIONAL</div>';
      exps.forEach(function (e) {
        html += '<div class="cvc-exp-item">';
        html += '<div class="cvc-exp-header">';
        var title = e.cargo_contrato;
        if (e.empresa) title += (title ? ' | ' : '') + e.empresa;
        html += '<div class="cvc-exp-title">' + esc(title) + '</div>';
        html += '<div class="cvc-exp-period">' + esc(e.periodo) + '</div>';
        html += '</div>';
        if (e.responsabilidades) {
          var bullets = e.responsabilidades.split('\n').filter(function (l) { return l.trim(); });
          if (bullets.length) {
            html += '<ul class="cvc-bullets">';
            bullets.forEach(function (b) {
              html += '<li>' + esc(b.replace(/^[•\-\*]\s*/, '')) + '</li>';
            });
            html += '</ul>';
          }
        }
        html += '</div>';
      });
      html += '</div>';
    }

    // CERTIFICADOS
    var certs = (d.certificados || []).filter(function (c) { return c.nome; });
    if (certs.length) {
      html += '<div class="cvc-section">';
      html += '<div class="cvc-section-title">CERTIFICADOS</div>';
      certs.forEach(function (c) {
        html += '<div class="cvc-cert-row">';
        html += '<div class="cvc-cert-nome">' + esc(c.nome) + '</div>';
        html += '<div class="cvc-cert-data">' + esc(c.data) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    return html;
  }

  // ── CSS inline for print window ──────────────────────────────
  var PRINT_CSS = [
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { font-family: Calibri,"Segoe UI",Arial,sans-serif; font-size:10.5pt; color:#111; background:#fff; padding:18mm 20mm; }',
    '.cvc-header { display:grid; grid-template-columns:1fr auto; gap:16px; align-items:start; margin-bottom:12px; padding-bottom:10px; border-bottom:1.5px solid #555; }',
    '.cvc-name { font-size:17pt; font-weight:700; letter-spacing:.3px; margin:0 0 4px; color:#000; text-transform:uppercase; }',
    '.cvc-contact-line { font-size:9pt; color:#333; margin-bottom:2px; }',
    '.cvc-header-right { text-align:right; }',
    '.cvc-email-label,.cvc-cel-label { font-size:9pt; font-weight:700; color:#000; }',
    '.cvc-email-val,.cvc-cel-val { font-size:9pt; color:#333; margin-bottom:4px; }',
    '.cvc-section { margin-bottom:14px; }',
    '.cvc-section-title { text-align:center; font-weight:700; font-size:9.5pt; letter-spacing:.6px; text-transform:uppercase; border:1px solid #888; padding:4px 8px; margin-bottom:10px; color:#000; }',
    '.cvc-form-item { display:grid; grid-template-columns:1fr auto; gap:16px; align-items:start; margin-bottom:10px; }',
    '.cvc-form-right { text-align:right; white-space:nowrap; }',
    '.cvc-inst { font-weight:700; font-size:9.5pt; color:#000; }',
    '.cvc-desc { font-size:9.5pt; color:#333; margin-top:1px; }',
    '.cvc-period { font-weight:700; font-size:9pt; color:#000; }',
    '.cvc-local { font-size:9pt; color:#555; margin-top:1px; }',
    '.cvc-bullets { padding-left:18px; margin:0; list-style:disc; }',
    '.cvc-bullets li { font-size:9.5pt; color:#333; margin-bottom:3px; line-height:1.4; }',
    '.cvc-exp-item { margin-bottom:14px; }',
    '.cvc-exp-header { display:grid; grid-template-columns:1fr auto; gap:12px; align-items:baseline; margin-bottom:5px; }',
    '.cvc-exp-title { font-weight:700; font-size:9.5pt; color:#000; }',
    '.cvc-exp-period { font-weight:700; font-size:9pt; color:#000; white-space:nowrap; }',
    '.cvc-cert-row { display:grid; grid-template-columns:1fr auto; gap:16px; align-items:baseline; margin-bottom:4px; }',
    '.cvc-cert-nome { font-size:9.5pt; color:#333; }',
    '.cvc-cert-nome::before { content:"• "; }',
    '.cvc-cert-data { font-weight:700; font-size:9pt; color:#000; white-space:nowrap; }',
    '@media print { @page { margin:18mm 20mm; } body { padding:0; } }'
  ].join('\n');

  // ── imprimir ─────────────────────────────────────────────────
  window.cvImprimir = function () {
    var dados = collectDados();
    var docHtml = buildDocHtml(dados);
    var titulo = val('cvTitulo') || 'Currículo';

    var win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(
      '<!DOCTYPE html><html lang="pt-BR"><head>' +
      '<meta charset="utf-8">' +
      '<title>' + esc(titulo) + '</title>' +
      '<style>' + PRINT_CSS + '</style>' +
      '</head><body>' +
      docHtml +
      '<script>window.addEventListener("load",function(){window.print();});<\/script>' +
      '</body></html>'
    );
    win.document.close();
  };

  // ── salvar ───────────────────────────────────────────────────
  window.cvSalvar = function () {
    var titulo = val('cvTitulo');
    if (!titulo) {
      document.getElementById('cvTitulo').focus();
      return;
    }
    var dados = collectDados();
    var btn = document.getElementById('cvBtnSalvar');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass me-1"></i>Salvando…';

    var url = _editId ? '/api/curriculos/' + _editId : '/api/curriculos';
    var method = _editId ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: titulo, dados: dados })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.id) _editId = data.id;
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check2 me-1"></i>Salvo';
        setTimeout(function () {
          btn.innerHTML = '<i class="bi bi-floppy me-1"></i>Salvar';
        }, 2000);
        carregarLista();
      })
      .catch(function () {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-floppy me-1"></i>Salvar';
      });
  };

  // ── abrir editor ─────────────────────────────────────────────
  function cvAbrirEditor(curriculo) {
    if (curriculo) {
      _editId = curriculo.id;
      _template = (curriculo.dados && curriculo.dados.template) || 'classico';
      setVal('cvTitulo', curriculo.titulo);
      populateForm(curriculo.dados || {});
    } else {
      _editId = null;
      setVal('cvTitulo', '');
      document.getElementById('cvFormacaoList').innerHTML = '';
      document.getElementById('cvCompList').innerHTML = '';
      document.getElementById('cvExpList').innerHTML = '';
      document.getElementById('cvCertList').innerHTML = '';
      setVal('fNome', '');
      setVal('fEmail', '');
      setVal('fTelefone', '');
      setVal('fLinkedin', '');
      setVal('fGithub', '');
    }
    showEditor();
    cvPreview();
  }

  // ── lista ────────────────────────────────────────────────────
  function carregarLista() {
    fetch('/api/curriculos')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _lista = data.curriculos || [];
        renderLista();
      });
  }

  function renderLista() {
    var grid = document.getElementById('cvGrid');
    var vazio = document.getElementById('cvVazio');
    if (!_lista.length) {
      grid.innerHTML = '';
      grid.appendChild(vazio);
      vazio.classList.remove('d-none');
      return;
    }
    vazio.classList.add('d-none');
    grid.innerHTML = _lista.map(function (c) {
      return '<div class="cv-card">' +
        '<div class="cv-card-titulo">' + esc(c.titulo) + '</div>' +
        '<div class="cv-card-meta">Atualizado em ' + fmtDate(c.atualizado_em) + '</div>' +
        '<div class="cv-card-actions">' +
        '<button class="btn btn-outline-primary btn-sm" onclick="cvEditar(' + c.id + ')"><i class="bi bi-pencil me-1"></i>Editar</button>' +
        '<button class="btn btn-outline-danger btn-sm" onclick="cvExcluir(' + c.id + ')"><i class="bi bi-trash3 me-1"></i>Excluir</button>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  window.cvEditar = function (id) {
    fetch('/api/curriculos/' + id)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        cvAbrirEditor(data);
      });
  };

  window.cvExcluir = function (id) {
    if (!confirm('Excluir este currículo?')) return;
    fetch('/api/curriculos/' + id, { method: 'DELETE' })
      .then(function () { carregarLista(); });
  };

  // ── init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    showLista();
    carregarLista();
  });

}());
