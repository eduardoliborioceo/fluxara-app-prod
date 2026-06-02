(function () {
  var activeCalc = null;
  var activeInput = null;

  function buildPopup() {
    var el = document.createElement('div');
    el.className = 'calc-popup';
    el.innerHTML =
      '<div class="calc-display">' +
        '<div class="calc-expr" id="calcExpr"></div>' +
        '<div class="calc-value" id="calcValue">0</div>' +
      '</div>' +
      '<div class="calc-grid">' +
        '<button class="calc-btn calc-clear" data-calc="C">C</button>' +
        '<button class="calc-btn calc-op" data-calc="back">&#8592;</button>' +
        '<button class="calc-btn calc-op" data-calc="pct">%</button>' +
        '<button class="calc-btn calc-op" data-calc="/">÷</button>' +

        '<button class="calc-btn" data-calc="7">7</button>' +
        '<button class="calc-btn" data-calc="8">8</button>' +
        '<button class="calc-btn" data-calc="9">9</button>' +
        '<button class="calc-btn calc-op" data-calc="*">×</button>' +

        '<button class="calc-btn" data-calc="4">4</button>' +
        '<button class="calc-btn" data-calc="5">5</button>' +
        '<button class="calc-btn" data-calc="6">6</button>' +
        '<button class="calc-btn calc-op" data-calc="-">−</button>' +

        '<button class="calc-btn" data-calc="1">1</button>' +
        '<button class="calc-btn" data-calc="2">2</button>' +
        '<button class="calc-btn" data-calc="3">3</button>' +
        '<button class="calc-btn calc-op" data-calc="+">+</button>' +

        '<button class="calc-btn calc-zero" data-calc="0">0</button>' +
        '<button class="calc-btn" data-calc=".">.</button>' +
        '<button class="calc-btn calc-eq" data-calc="=">=</button>' +
      '</div>';
    return el;
  }

  var state = { input: '0', accumulator: null, operator: null, justEvaled: false };

  function resetState(initialValue) {
    var v = parseFloat(String(initialValue).replace(',', '.'));
    state.input = isNaN(v) ? '0' : String(v);
    state.accumulator = null;
    state.operator = null;
    state.justEvaled = false;
  }

  function formatDisplay(v) {
    var n = parseFloat(v);
    if (isNaN(n)) return v;
    var s = n.toLocaleString('pt-BR', { maximumFractionDigits: 10 });
    if (v.slice(-1) === '.') s += ',';
    return s;
  }

  function renderCalc() {
    var valEl = document.getElementById('calcValue');
    var exprEl = document.getElementById('calcExpr');
    if (!valEl) return;
    valEl.textContent = formatDisplay(state.input);
    if (state.operator !== null && state.accumulator !== null) {
      var opSymbol = { '+': '+', '-': '−', '*': '×', '/': '÷' }[state.operator] || state.operator;
      exprEl.textContent = formatDisplay(String(state.accumulator)) + ' ' + opSymbol;
    } else {
      exprEl.textContent = '';
    }
  }

  function compute(a, op, b) {
    var result;
    if (op === '+') result = a + b;
    else if (op === '-') result = a - b;
    else if (op === '*') result = a * b;
    else if (op === '/') result = b !== 0 ? a / b : 0;
    else return b;
    return Math.round(result * 1e10) / 1e10;
  }

  function handleKey(key) {
    if (key === 'C') {
      state.input = '0';
      state.accumulator = null;
      state.operator = null;
      state.justEvaled = false;
    } else if (key === 'back') {
      if (state.justEvaled) { state.input = '0'; state.justEvaled = false; return; }
      state.input = state.input.length > 1 ? state.input.slice(0, -1) : '0';
    } else if (key === 'pct') {
      var n = parseFloat(state.input);
      if (!isNaN(n)) state.input = String(n / 100);
    } else if (key === '=') {
      if (state.operator !== null && state.accumulator !== null) {
        var b = parseFloat(state.input);
        var result = compute(state.accumulator, state.operator, b);
        state.input = String(result);
        state.accumulator = null;
        state.operator = null;
        state.justEvaled = true;
        if (activeInput) {
          activeInput.value = result;
          activeInput.dispatchEvent(new Event('input', { bubbles: true }));
          activeInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        closeCalc();
        return;
      }
      if (activeInput) {
        var val = parseFloat(state.input);
        if (!isNaN(val)) {
          activeInput.value = val;
          activeInput.dispatchEvent(new Event('input', { bubbles: true }));
          activeInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      closeCalc();
      return;
    } else if (['+', '-', '*', '/'].indexOf(key) !== -1) {
      var cur = parseFloat(state.input);
      if (state.operator !== null && state.accumulator !== null && !state.justEvaled) {
        state.accumulator = compute(state.accumulator, state.operator, cur);
      } else {
        state.accumulator = cur;
      }
      state.operator = key;
      state.justEvaled = false;
      state.input = '0';
    } else if (key === '.') {
      if (state.justEvaled) { state.input = '0'; state.justEvaled = false; }
      if (state.input.indexOf('.') === -1) state.input += '.';
    } else {
      var digit = key;
      if (state.justEvaled) { state.input = digit; state.justEvaled = false; }
      else state.input = state.input === '0' ? digit : state.input + digit;
    }
  }

  function openCalc(input, triggerBtn) {
    closeCalc();
    activeInput = input;

    var popup = buildPopup();
    document.body.appendChild(popup);
    activeCalc = popup;

    resetState(input.value);
    renderCalc();

    var rect = triggerBtn.getBoundingClientRect();
    var popupH = 280;
    var top = rect.bottom + 6;
    if (top + popupH > window.innerHeight - 8) {
      top = rect.top - popupH - 6;
    }
    var left = rect.right - 224;
    if (left < 8) left = 8;
    popup.style.top = top + 'px';
    popup.style.left = left + 'px';

    popup.querySelectorAll('[data-calc]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        handleKey(btn.dataset.calc);
        renderCalc();
      });
    });
  }

  function closeCalc() {
    if (activeCalc) {
      activeCalc.remove();
      activeCalc = null;
    }
    activeInput = null;
  }

  document.addEventListener('click', function (e) {
    if (activeCalc && !activeCalc.contains(e.target)) {
      closeCalc();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (!activeCalc) return;
    var map = {
      '0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
      '+':'+','-':'-','*':'*','/':'/','=':'=','Enter':'=','Backspace':'back','Escape':'close','.':'.', ',':'.'
    };
    var key = map[e.key];
    if (!key) return;
    e.preventDefault();
    if (key === 'close') { closeCalc(); return; }
    handleKey(key);
    renderCalc();
  });

  function attachCalcBtn(input) {
    if (input.dataset.calcAttached) return;
    input.dataset.calcAttached = '1';
    input.classList.add('calc-has-btn');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'calc-trigger-btn';
    btn.title = 'Calculadora';
    btn.innerHTML = '<i class="bi bi-calculator"></i>';
    input.parentElement.appendChild(btn);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (activeCalc) { closeCalc(); return; }
      openCalc(input, btn);
    });
  }

  function scanInputs(root) {
    root = root || document;
    root.querySelectorAll('.valor-input, .edit-valor-input').forEach(attachCalcBtn);
  }

  document.addEventListener('DOMContentLoaded', function () { scanInputs(); });

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.matches && (node.matches('.valor-input') || node.matches('.edit-valor-input'))) {
          attachCalcBtn(node);
        }
        if (node.querySelectorAll) scanInputs(node);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
