(function () {
  var CRITERIA = [
    { id: 'pc-len',     label: 'Mínimo de 10 caracteres',            test: function (p)     { return p.length >= 10; } },
    { id: 'pc-upper',   label: 'Pelo menos uma letra maiúscula',      test: function (p)     { return /[A-Z]/.test(p); } },
    { id: 'pc-lower',   label: 'Pelo menos uma letra minúscula',      test: function (p)     { return /[a-z]/.test(p); } },
    { id: 'pc-number',  label: 'Pelo menos um número',                test: function (p)     { return /\d/.test(p); } },
    { id: 'pc-special', label: 'Pelo menos um caractere especial',    test: function (p)     { return /[@$#!%&*\-_+=?]/.test(p); } },
  ];

  function buildChecklist(container, username) {
    var criteriaToShow = CRITERIA.slice();
    if (username && username.length >= 3) {
      criteriaToShow.push({
        id: 'pc-user',
        label: 'Não contém nome de usuário',
        test: function (p) { return !p.toLowerCase().includes(username.toLowerCase()); },
      });
    }
    criteriaToShow.push({
      id: 'pc-system',
      label: 'Não contém "fluxara"',
      test: function (p) { return !p.toLowerCase().includes('fluxara'); },
    });

    container.innerHTML = '<ul class="pwd-checklist">'
      + criteriaToShow.map(function (c) {
          return '<li id="' + c.id + '" class="pwd-check-item">'
            + '<i class="bi bi-circle pwd-check-icon"></i>'
            + '<span>' + c.label + '</span>'
            + '</li>';
        }).join('')
      + '</ul>';

    return criteriaToShow;
  }

  function updateChecklist(container, criteria, password) {
    var allOk = true;
    criteria.forEach(function (c) {
      var ok = c.test(password);
      if (!ok) allOk = false;
      var li = container.querySelector('#' + c.id);
      if (!li) return;
      li.className = 'pwd-check-item ' + (ok ? 'ok' : (password.length > 0 ? 'fail' : ''));
      li.querySelector('.pwd-check-icon').className = 'bi pwd-check-icon '
        + (ok ? 'bi-check-circle-fill' : (password.length > 0 ? 'bi-x-circle-fill' : 'bi-circle'));
    });
    return allOk;
  }

  function getStrengthLabel(password, criteria) {
    if (!password) return { label: '', cls: '' };
    var passed = criteria.filter(function (c) { return c.test(password); }).length;
    var total = criteria.length;
    var pct = passed / total;
    if (pct === 1)   return { label: 'Forte', cls: 'strong' };
    if (pct >= 0.7)  return { label: 'Boa', cls: 'good' };
    if (pct >= 0.4)  return { label: 'Média', cls: 'medium' };
    return { label: 'Fraca', cls: 'weak' };
  }

  window.PasswordPolicy = {
    init: function (inputEl, containerEl, username) {
      var criteria = buildChecklist(containerEl, username || '');

      var barWrap = document.createElement('div');
      barWrap.className = 'pwd-strength-wrap';
      barWrap.innerHTML = '<div class="pwd-strength-bar"><div class="pwd-strength-fill" id="pwdStrengthFill"></div></div>'
        + '<span class="pwd-strength-label" id="pwdStrengthLabel"></span>';
      containerEl.insertBefore(barWrap, containerEl.firstChild);

      inputEl.addEventListener('input', function () {
        var pass = this.value;
        updateChecklist(containerEl, criteria, pass);
        var st = getStrengthLabel(pass, criteria);
        var fill = containerEl.querySelector('#pwdStrengthFill');
        var lbl  = containerEl.querySelector('#pwdStrengthLabel');
        var passed = criteria.filter(function (c) { return c.test(pass); }).length;
        fill.style.width = (pass.length ? Math.round(passed / criteria.length * 100) : 0) + '%';
        fill.className = 'pwd-strength-fill ' + st.cls;
        lbl.textContent = st.label;
        lbl.className = 'pwd-strength-label ' + st.cls;
        containerEl.style.display = pass.length ? '' : 'none';
      });

      containerEl.style.display = 'none';
    },
  };
})();
