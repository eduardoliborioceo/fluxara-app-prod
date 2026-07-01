(function () {
  'use strict';

  var _lista = [];
  var _editId = null;
  var _skills = [];
  var _mobileTab = 'form';

  // ── utilitários ──────────────────────────────────────────────
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function set(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = v || '';
  }

  function fmt(s) { return esc(s || '').replace(/\n/g, '<br>'); }

  function ptDate(d) {
    if (!d) return '';
    var parts = d.split('-');
    if (parts.length === 2) {
      var months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return months[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
    }
    return d;
  }

  // ── API ──────────────────────────────────────────────────────
  async function apiGet(url) {
    var r = await fetch(url);
    return r.json();
  }

  async function apiPost(url, data) {
    var r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return r.json();
  }

  async function apiPut(url, data) {
    var r = await fetch(url, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return r.json();
  }

  async function apiDelete(url) {
    var r = await fetch(url, { method: 'DELETE' });
    return r.json();
  }

  // ── lista ────────────────────────────────────────────────────
  async function loadLista() {
    try {
      _lista = await apiGet('/api/curriculos');
    } catch (_) { _lista = []; }
    renderLista();
  }

  function renderLista() {
    var grid = document.getElementById('cvGrid');
    var vazio = document.getElementById('cvVazio');
    var cards = _lista.map(function (c) { return renderCard(c); }).join('');
    grid.innerHTML = cards || '';
    if (!_lista.length) {
      grid.appendChild(vazio);
      vazio.style.display = '';
    } else {
      vazio.style.display = 'none';
      grid.insertAdjacentElement('afterbegin', vazio);
    }
  }

  function renderCard(c) {
    var data = new Date(c.atualizado_em).toLocaleDateString('pt-BR');
    return '<div class="cv-card">'
      + '<div class="cv-card-icon"><i class="bi bi-file-person-fill"></i></div>'
      + '<div>'
        + '<div class="cv-card-titulo">' + esc(c.titulo) + '</div>'
        + '<div class="cv-card-meta">Atualizado em ' + data + '</div>'
      + '</div>'
      + '<div class="cv-card-actions">'
        + '<button class="cv-card-btn" onclick="cvEditarCard(' + c.id + ')"><i class="bi bi-pencil"></i> Editar</button>'
        + '<button class="cv-card-btn cv-card-btn--danger" onclick="cvDeletarCard(' + c.id + ',\'' + esc(c.titulo) + '\')"><i class="bi bi-trash"></i> Excluir</button>'
      + '</div>'
    + '</div>';
  }

  window.cvEditarCard = async function (id) {
    var row = await apiGet('/api/curriculos/' + id);
    if (row.error) return;
    _editId = id;
    _carregarDados(row.titulo, row.dados || {});
    _mostrarEditor();
  };

  window.cvDeletarCard = async function (id, titulo) {
    if (!confirm('Excluir o currículo "' + titulo + '"?\nEsta ação não pode ser desfeita.')) return;
    await apiDelete('/api/curriculos/' + id);
    _lista = _lista.filter(function (c) { return c.id !== id; });
    renderLista();
  };

  // ── navegação ────────────────────────────────────────────────
  window.cvNovoEditor = function () {
    _editId = null;
    _limparForm();
    _mostrarEditor();
  };

  window.cvVoltarLista = function () {
    document.getElementById('cvLista').style.display = '';
    document.getElementById('cvEditor').classList.remove('active');
  };

  function _mostrarEditor() {
    document.getElementById('cvLista').style.display = 'none';
    document.getElementById('cvEditor').classList.add('active');
    cvPreview();
    cvTab('form');
  }

  // ── tabs mobile ──────────────────────────────────────────────
  window.cvTab = function (tab) {
    _mobileTab = tab;
    var formCard = document.getElementById('cvFormCard');
    var prevCard = document.getElementById('cvPreviewCard');
    var tabs = document.querySelectorAll('.cv-tab-btn');
    tabs[0].classList.toggle('active', tab === 'form');
    tabs[1].classList.toggle('active', tab === 'preview');
    formCard.classList.toggle('cv-tab-active', tab === 'form');
    prevCard.classList.toggle('cv-tab-active', tab === 'preview');
  };

  // ── seções colapsáveis ────────────────────────────────────────
  window.cvToggleSection = function (toggle) {
    toggle.classList.toggle('open');
    var body = toggle.nextElementSibling;
    if (body) body.classList.toggle('open');
  };

  // ── form: limpar ─────────────────────────────────────────────
  function _limparForm() {
    set('cvTitulo', '');
    set('fNome', ''); set('fCargo', ''); set('fEmail', ''); set('fTelefone', '');
    set('fCidade', ''); set('fLinkedin', ''); set('fGithub', ''); set('fSite', '');
    set('fResumo', '');
    document.getElementById('cvExpList').innerHTML = '';
    document.getElementById('cvEduList').innerHTML = '';
    document.getElementById('cvLangList').innerHTML = '';
    document.getElementById('cvCertList').innerHTML = '';
    _skills = [];
    _renderSkills();
    cvPreview();
  }

  function _carregarDados(titulo, d) {
    set('cvTitulo', titulo);
    set('fNome', d.nome); set('fCargo', d.cargo);
    set('fEmail', d.email); set('fTelefone', d.telefone);
    set('fCidade', d.cidade); set('fLinkedin', d.linkedin);
    set('fGithub', d.github); set('fSite', d.site);
    set('fResumo', d.resumo);

    document.getElementById('cvExpList').innerHTML = '';
    (d.experiencias || []).forEach(function (e) { cvAddExp(e); });

    document.getElementById('cvEduList').innerHTML = '';
    (d.educacao || []).forEach(function (e) { cvAddEdu(e); });

    document.getElementById('cvLangList').innerHTML = '';
    (d.idiomas || []).forEach(function (l) { cvAddLang(l); });

    document.getElementById('cvCertList').innerHTML = '';
    (d.certificacoes || []).forEach(function (c) { cvAddCert(c); });

    _skills = Array.isArray(d.habilidades) ? d.habilidades.slice() : [];
    _renderSkills();
    cvPreview();
  }

  // ── coletar dados do form ─────────────────────────────────────
  function _coletarDados() {
    return {
      nome:      val('fNome'),
      cargo:     val('fCargo'),
      email:     val('fEmail'),
      telefone:  val('fTelefone'),
      cidade:    val('fCidade'),
      linkedin:  val('fLinkedin'),
      github:    val('fGithub'),
      site:      val('fSite'),
      resumo:    document.getElementById('fResumo').value.trim(),
      experiencias:  _coletarExp(),
      educacao:      _coletarEdu(),
      habilidades:   _skills.slice(),
      idiomas:       _coletarLang(),
      certificacoes: _coletarCert(),
    };
  }

  // ── EXPERIÊNCIAS ─────────────────────────────────────────────
  window.cvAddExp = function (data) {
    data = data || {};
    var list = document.getElementById('cvExpList');
    var idx = list.children.length;
    var div = document.createElement('div');
    div.className = 'cv-dynamic-item';
    div.innerHTML = ''
      + '<div class="cv-dynamic-item-header">'
        + '<span class="cv-dynamic-item-num">Exp. ' + (idx + 1) + '</span>'
        + '<button class="cv-dynamic-remove" onclick="this.closest(\'.cv-dynamic-item\').remove();cvPreview();" title="Remover"><i class="bi bi-x-lg"></i></button>'
      + '</div>'
      + '<div class="cv-row">'
        + '<div class="cv-field"><label class="cv-label">Empresa</label>'
          + '<input type="text" class="cv-input exp-empresa" value="' + esc(data.empresa) + '" placeholder="Nome da empresa" oninput="cvPreview()"></div>'
        + '<div class="cv-field"><label class="cv-label">Cargo</label>'
          + '<input type="text" class="cv-input exp-cargo" value="' + esc(data.cargo) + '" placeholder="Cargo ocupado" oninput="cvPreview()"></div>'
      + '</div>'
      + '<div class="cv-row-3">'
        + '<div class="cv-field"><label class="cv-label">Início</label>'
          + '<input type="month" class="cv-input exp-inicio" value="' + esc(data.inicio) + '" oninput="cvPreview()"></div>'
        + '<div class="cv-field"><label class="cv-label">Fim</label>'
          + '<input type="month" class="cv-input exp-fim" value="' + esc(data.fim) + '" oninput="cvPreview()"></div>'
        + '<div class="cv-field" style="display:flex;align-items:flex-end;padding-bottom:2px">'
          + '<div class="cv-check-row"><input type="checkbox" class="exp-atual" ' + (data.atual ? 'checked' : '') + ' onchange="cvPreview()">'
          + '<label>Cargo atual</label></div></div>'
      + '</div>'
      + '<div class="cv-field"><label class="cv-label">Descrição / Realizações</label>'
        + '<textarea class="cv-textarea exp-desc" rows="3" placeholder="Descreva suas responsabilidades e conquistas..." oninput="cvPreview()">' + esc(data.descricao) + '</textarea></div>';
    list.appendChild(div);
    cvPreview();
  };

  function _coletarExp() {
    return Array.from(document.querySelectorAll('#cvExpList .cv-dynamic-item')).map(function (el) {
      return {
        empresa:   el.querySelector('.exp-empresa').value.trim(),
        cargo:     el.querySelector('.exp-cargo').value.trim(),
        inicio:    el.querySelector('.exp-inicio').value,
        fim:       el.querySelector('.exp-fim').value,
        atual:     el.querySelector('.exp-atual').checked,
        descricao: el.querySelector('.exp-desc').value.trim(),
      };
    });
  }

  // ── EDUCAÇÃO ─────────────────────────────────────────────────
  window.cvAddEdu = function (data) {
    data = data || {};
    var list = document.getElementById('cvEduList');
    var idx = list.children.length;
    var div = document.createElement('div');
    div.className = 'cv-dynamic-item';
    div.innerHTML = ''
      + '<div class="cv-dynamic-item-header">'
        + '<span class="cv-dynamic-item-num">Formação ' + (idx + 1) + '</span>'
        + '<button class="cv-dynamic-remove" onclick="this.closest(\'.cv-dynamic-item\').remove();cvPreview();" title="Remover"><i class="bi bi-x-lg"></i></button>'
      + '</div>'
      + '<div class="cv-row">'
        + '<div class="cv-field"><label class="cv-label">Instituição</label>'
          + '<input type="text" class="cv-input edu-inst" value="' + esc(data.instituicao) + '" placeholder="Nome da instituição" oninput="cvPreview()"></div>'
        + '<div class="cv-field"><label class="cv-label">Curso</label>'
          + '<input type="text" class="cv-input edu-curso" value="' + esc(data.curso) + '" placeholder="Nome do curso" oninput="cvPreview()"></div>'
      + '</div>'
      + '<div class="cv-row">'
        + '<div class="cv-field"><label class="cv-label">Grau</label>'
          + '<select class="cv-input edu-grau" onchange="cvPreview()">'
            + ['', 'Bacharelado','Licenciatura','Tecnólogo','Pós-graduação','MBA','Mestrado','Doutorado','Técnico','Ensino Médio','Curso Livre'].map(function (g) {
                return '<option value="' + g + '" ' + (data.grau === g ? 'selected' : '') + '>' + (g || 'Selecionar...') + '</option>';
              }).join('')
          + '</select></div>'
        + '<div class="cv-field"><label class="cv-label">Período</label>'
          + '<input type="text" class="cv-input edu-periodo" value="' + esc(data.periodo) + '" placeholder="2018 – 2022" oninput="cvPreview()"></div>'
      + '</div>';
    list.appendChild(div);
    cvPreview();
  };

  function _coletarEdu() {
    return Array.from(document.querySelectorAll('#cvEduList .cv-dynamic-item')).map(function (el) {
      return {
        instituicao: el.querySelector('.edu-inst').value.trim(),
        curso:       el.querySelector('.edu-curso').value.trim(),
        grau:        el.querySelector('.edu-grau').value,
        periodo:     el.querySelector('.edu-periodo').value.trim(),
      };
    });
  }

  // ── HABILIDADES ──────────────────────────────────────────────
  window.cvAddSkill = function () {
    var input = document.getElementById('cvSkillInput');
    var v = (input.value || '').trim();
    if (!v || _skills.includes(v)) { input.value = ''; return; }
    _skills.push(v);
    input.value = '';
    _renderSkills();
    cvPreview();
  };

  function _renderSkills() {
    var wrap = document.getElementById('cvSkillsTags');
    wrap.innerHTML = _skills.map(function (s, i) {
      return '<span class="cv-tag">' + esc(s)
        + '<button class="cv-tag-remove" onclick="cvRemoveSkill(' + i + ')" title="Remover">×</button></span>';
    }).join('');
  }

  window.cvRemoveSkill = function (i) {
    _skills.splice(i, 1);
    _renderSkills();
    cvPreview();
  };

  // ── IDIOMAS ──────────────────────────────────────────────────
  window.cvAddLang = function (data) {
    data = data || {};
    var list = document.getElementById('cvLangList');
    var div = document.createElement('div');
    div.className = 'cv-dynamic-item';
    div.innerHTML = ''
      + '<div class="cv-dynamic-item-header">'
        + '<span class="cv-dynamic-item-num">Idioma</span>'
        + '<button class="cv-dynamic-remove" onclick="this.closest(\'.cv-dynamic-item\').remove();cvPreview();" title="Remover"><i class="bi bi-x-lg"></i></button>'
      + '</div>'
      + '<div class="cv-row">'
        + '<div class="cv-field"><label class="cv-label">Idioma</label>'
          + '<input type="text" class="cv-input lang-idioma" value="' + esc(data.idioma) + '" placeholder="Inglês" oninput="cvPreview()"></div>'
        + '<div class="cv-field"><label class="cv-label">Nível</label>'
          + '<select class="cv-input lang-nivel" onchange="cvPreview()">'
            + ['', 'Básico','Intermediário','Avançado','Fluente','Nativo'].map(function (n) {
                return '<option value="' + n + '" ' + (data.nivel === n ? 'selected' : '') + '>' + (n || 'Selecionar...') + '</option>';
              }).join('')
          + '</select></div>'
      + '</div>';
    list.appendChild(div);
    cvPreview();
  };

  function _coletarLang() {
    return Array.from(document.querySelectorAll('#cvLangList .cv-dynamic-item')).map(function (el) {
      return {
        idioma: el.querySelector('.lang-idioma').value.trim(),
        nivel:  el.querySelector('.lang-nivel').value,
      };
    });
  }

  // ── CERTIFICAÇÕES ────────────────────────────────────────────
  window.cvAddCert = function (data) {
    data = data || {};
    var list = document.getElementById('cvCertList');
    var div = document.createElement('div');
    div.className = 'cv-dynamic-item';
    div.innerHTML = ''
      + '<div class="cv-dynamic-item-header">'
        + '<span class="cv-dynamic-item-num">Certificação</span>'
        + '<button class="cv-dynamic-remove" onclick="this.closest(\'.cv-dynamic-item\').remove();cvPreview();" title="Remover"><i class="bi bi-x-lg"></i></button>'
      + '</div>'
      + '<div class="cv-row">'
        + '<div class="cv-field"><label class="cv-label">Nome da certificação</label>'
          + '<input type="text" class="cv-input cert-nome" value="' + esc(data.nome) + '" placeholder="AWS Solutions Architect" oninput="cvPreview()"></div>'
        + '<div class="cv-field"><label class="cv-label">Emissor</label>'
          + '<input type="text" class="cv-input cert-emissor" value="' + esc(data.emissor) + '" placeholder="Amazon" oninput="cvPreview()"></div>'
      + '</div>'
      + '<div class="cv-field" style="max-width:120px"><label class="cv-label">Ano</label>'
        + '<input type="text" class="cv-input cert-ano" value="' + esc(data.ano) + '" placeholder="2023" maxlength="4" oninput="cvPreview()"></div>';
    list.appendChild(div);
    cvPreview();
  };

  function _coletarCert() {
    return Array.from(document.querySelectorAll('#cvCertList .cv-dynamic-item')).map(function (el) {
      return {
        nome:    el.querySelector('.cert-nome').value.trim(),
        emissor: el.querySelector('.cert-emissor').value.trim(),
        ano:     el.querySelector('.cert-ano').value.trim(),
      };
    });
  }

  // ── PREVIEW ──────────────────────────────────────────────────
  window.cvPreview = function () {
    var d = _coletarDados();
    var doc = document.getElementById('cvDoc');
    if (!doc) return;

    var semDados = !d.nome && !d.cargo && !d.email && !d.resumo
      && !d.experiencias.length && !d.educacao.length;
    if (semDados) {
      doc.innerHTML = '<div class="cv-empty-state"><i class="bi bi-file-person"></i>Preencha os dados ao lado para visualizar o currículo</div>';
      return;
    }

    var html = '<div class="cv-doc-header">';
    if (d.nome) html += '<div class="cv-doc-name">' + esc(d.nome) + '</div>';
    if (d.cargo) html += '<div class="cv-doc-cargo">' + esc(d.cargo) + '</div>';

    var contacts = [];
    if (d.email)    contacts.push('<span><i class="bi bi-envelope"></i>' + esc(d.email) + '</span>');
    if (d.telefone) contacts.push('<span><i class="bi bi-telephone"></i>' + esc(d.telefone) + '</span>');
    if (d.cidade)   contacts.push('<span><i class="bi bi-geo-alt"></i>' + esc(d.cidade) + '</span>');
    if (d.linkedin) contacts.push('<span><i class="bi bi-linkedin"></i>' + esc(d.linkedin) + '</span>');
    if (d.github)   contacts.push('<span><i class="bi bi-github"></i>' + esc(d.github) + '</span>');
    if (d.site)     contacts.push('<span><i class="bi bi-globe"></i>' + esc(d.site) + '</span>');
    if (contacts.length) html += '<div class="cv-doc-contacts">' + contacts.join('') + '</div>';
    html += '</div>';

    if (d.resumo) {
      html += '<div class="cv-doc-section">'
        + '<div class="cv-doc-section-title">Resumo Profissional</div>'
        + '<p style="margin:0;font-size:.82rem;color:#334155;white-space:pre-wrap">' + esc(d.resumo) + '</p>'
        + '</div>';
    }

    if (d.experiencias.length) {
      html += '<div class="cv-doc-section"><div class="cv-doc-section-title">Experiência Profissional</div>';
      d.experiencias.forEach(function (e) {
        if (!e.empresa && !e.cargo) return;
        var periodo = '';
        if (e.inicio) periodo = ptDate(e.inicio) + ' – ' + (e.atual ? 'Presente' : ptDate(e.fim) || '');
        html += '<div class="cv-doc-item">'
          + '<div class="cv-doc-item-top">'
            + '<div><span class="cv-doc-item-title">' + esc(e.cargo) + '</span>'
              + (e.empresa ? ' <span class="cv-doc-item-sub">— ' + esc(e.empresa) + '</span>' : '') + '</div>'
            + (periodo ? '<span class="cv-doc-item-period">' + periodo + '</span>' : '')
          + '</div>'
          + (e.descricao ? '<div class="cv-doc-item-desc">' + esc(e.descricao) + '</div>' : '')
        + '</div>';
      });
      html += '</div>';
    }

    if (d.educacao.length) {
      html += '<div class="cv-doc-section"><div class="cv-doc-section-title">Educação</div>';
      d.educacao.forEach(function (e) {
        if (!e.instituicao && !e.curso) return;
        html += '<div class="cv-doc-item">'
          + '<div class="cv-doc-item-top">'
            + '<div><span class="cv-doc-item-title">' + esc(e.curso) + '</span>'
              + (e.grau ? ' <span class="cv-doc-item-sub">(' + esc(e.grau) + ')</span>' : '')
              + (e.instituicao ? '<div class="cv-doc-item-sub">' + esc(e.instituicao) + '</div>' : '')
            + '</div>'
            + (e.periodo ? '<span class="cv-doc-item-period">' + esc(e.periodo) + '</span>' : '')
          + '</div>'
        + '</div>';
      });
      html += '</div>';
    }

    if (_skills.length) {
      html += '<div class="cv-doc-section"><div class="cv-doc-section-title">Habilidades</div>'
        + '<div class="cv-doc-skills">'
        + _skills.map(function (s) { return '<span class="cv-doc-skill">' + esc(s) + '</span>'; }).join('')
        + '</div></div>';
    }

    var langs = _coletarLang().filter(function (l) { return l.idioma; });
    if (langs.length) {
      html += '<div class="cv-doc-section"><div class="cv-doc-section-title">Idiomas</div>'
        + '<div class="cv-doc-langs">'
        + langs.map(function (l) {
            return '<span class="cv-doc-lang"><strong>' + esc(l.idioma) + '</strong>'
              + (l.nivel ? ' — ' + esc(l.nivel) : '') + '</span>';
          }).join('')
        + '</div></div>';
    }

    var certs = _coletarCert().filter(function (c) { return c.nome; });
    if (certs.length) {
      html += '<div class="cv-doc-section"><div class="cv-doc-section-title">Certificações</div>';
      certs.forEach(function (c) {
        html += '<div class="cv-doc-item">'
          + '<div class="cv-doc-item-top">'
            + '<span class="cv-doc-item-title">' + esc(c.nome) + '</span>'
            + (c.emissor || c.ano ? '<span class="cv-doc-item-sub">' + esc(c.emissor) + (c.ano ? ' · ' + esc(c.ano) : '') + '</span>' : '')
          + '</div>'
        + '</div>';
      });
      html += '</div>';
    }

    doc.innerHTML = html;
  };

  // ── salvar ────────────────────────────────────────────────────
  window.cvSalvar = async function () {
    var btn = document.getElementById('cvBtnSalvar');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Salvando...';
    try {
      var payload = {
        titulo: val('cvTitulo') || 'Meu Currículo',
        dados:  _coletarDados(),
      };
      var result;
      if (_editId) {
        result = await apiPut('/api/curriculos/' + _editId, payload);
      } else {
        result = await apiPost('/api/curriculos', payload);
        if (result && result.id) _editId = result.id;
      }
      await loadLista();
      btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvo!';
      setTimeout(function () {
        btn.innerHTML = '<i class="bi bi-floppy me-1"></i>Salvar';
        btn.disabled = false;
      }, 1800);
    } catch (_) {
      btn.innerHTML = '<i class="bi bi-floppy me-1"></i>Salvar';
      btn.disabled = false;
    }
  };

  // ── imprimir ──────────────────────────────────────────────────
  window.cvImprimir = function () { window.print(); };

  // ── init ──────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    loadLista();
  });
})();
