(function () {
  var btnRun = document.getElementById('btnRunBackup');
  var modal  = document.getElementById('runModal');
  var btnCancel = document.getElementById('btnCancelRun');
  var formRun   = document.getElementById('formRun');

  btnRun.addEventListener('click', function () {
    modal.style.display = 'flex';
  });

  btnCancel.addEventListener('click', function () {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', function (e) {
    if (e.target === this) this.style.display = 'none';
  });

  formRun.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = formRun.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Executando...';

    var fd = new FormData(formRun);
    fetch(formRun.action, { method: 'POST', body: fd })
      .then(function (r) { return r.json(); })
      .then(function () {
        modal.style.display = 'none';
        setTimeout(function () { window.location.reload(); }, 3000);
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Executar';
      });
  });
})();
