'use strict';

const appRoot = document.getElementById('app-root');
const byId = id => appRoot.querySelector(`#${id}`);
const form = byId('calculator-form');
const profile = byId('profile');
const initialValue = byId('initial-value');
const initialWrap = byId('initial-wrap');
const inputWrap = byId('input-wrap');
const inputError = byId('input-error');
const resultElement = byId('result');
const resultHint = byId('result-hint');
const copyButton = byId('copy');
const copyLabel = byId('copy-label');
const copyStatus = byId('copy-status');
const formulaTabs = Array.from(appRoot.querySelectorAll('[data-divisor]'));
const formulaPanel = byId('formula-panel');
const formatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const resultFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0, useGrouping: false });
const inputFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 10 });
let activeDivisor = 0.9;
let currentResult = null;
let feedbackTimer;

function parseValue(value) {
  const normalized = value.trim().replace(/\u2212/g, '-');
  if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(normalized)) return null;
  const number = Number(normalized.replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function calculate(x, divisor, initial) {
  const y = initial - x;
  const z = y / divisor;
  const stop = z - 1000;
  return { y, z, stop };
}

function format(value) {
  // Normalize tiny negative values so rounding never displays "-0,00".
  return formatter.format(Math.abs(value) < 0.005 ? 0 : value);
}

function formatResult(value) {
  // Change only the presentation: keep the signed, precise calculation intact.
  return resultFormatter.format(Math.trunc(Math.abs(value)));
}

function clearCopyFeedback() {
  clearTimeout(feedbackTimer);
  copyLabel.textContent = 'Copiar';
  copyStatus.textContent = '';
}

function setError(message = '', field = profile) {
  appRoot.classList.toggle('has-input-error', Boolean(message));
  inputError.textContent = message;
  inputError.hidden = !message;
  inputWrap.classList.toggle('invalid', Boolean(message) && field === profile);
  initialWrap.classList.toggle('invalid', Boolean(message) && field === initialValue);
  [profile, initialValue].forEach(input => {
    if (message && field === input) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });
}

function renderEmpty() {
  currentResult = null;
  resultElement.textContent = '—';
  resultElement.classList.remove('compact');
  resultHint.textContent = 'Seu ponto de parada aparece aqui.';
  copyButton.disabled = true;
  byId('step-x').textContent = 'X';
  byId('step-y-equation').textContent = 'Y';
  byId('step-z-equation').textContent = 'Z';
  ['step-y', 'step-z', 'step-final'].forEach(id => byId(id).textContent = '—');
  appRoot.dispatchEvent(new Event('calculationchange'));
}

function update(showEmptyError = false) {
  clearCopyFeedback();
  const initialText = initialValue.value.trim();
  const initial = parseValue(initialText);
  const initialOperand = initial === null ? 'B' : (initial < 0 ? `(${inputFormatter.format(initial)})` : inputFormatter.format(initial));
  ['step-initial', 'formula-initial'].forEach(id => {
    byId(id).textContent = initialOperand;
  });
  if (!initialText) {
    renderEmpty();
    setError(showEmptyError ? 'Digite o valor inicial.' : '', initialValue);
    return false;
  }
  if (initial === null) {
    renderEmpty();
    setError('Informe um número válido no valor inicial, como 600 ou 600,50.', initialValue);
    return false;
  }
  const value = profile.value.trim();
  if (!value) {
    renderEmpty();
    setError(showEmptyError ? 'Digite o valor que aparece no seu perfil.' : '');
    return false;
  }
  const x = parseValue(value);
  if (x === null) {
    renderEmpty();
    setError('Informe um número válido, como 300, −500 ou 150,50. Não use separador de milhar.');
    return false;
  }
  const { y, z, stop } = calculate(x, activeDivisor, initial);
  if (![y, z, stop].every(Number.isFinite)) {
    renderEmpty();
    setError('Esse valor é muito grande. Digite um valor menor.');
    return false;
  }
  setError();
  currentResult = stop;
  const resultText = formatResult(stop);
  resultElement.textContent = resultText;
  resultElement.classList.toggle('compact', resultText.length > 12);
  resultHint.textContent = `Para o valor de perfil ${inputFormatter.format(x)}.`;
  copyButton.disabled = false;
  byId('step-x').textContent = x < 0 ? `(${inputFormatter.format(x)})` : inputFormatter.format(x);
  byId('step-y').textContent = format(y);
  byId('step-y-equation').textContent = format(y);
  byId('step-z').textContent = format(z);
  byId('step-z-equation').textContent = format(z);
  byId('step-final').textContent = resultText;
  appRoot.dispatchEvent(new Event('calculationchange'));
  return true;
}

function selectFormula(selectedTab) {
  activeDivisor = Number(selectedTab.dataset.divisor);
  formulaTabs.forEach(tab => {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  formulaPanel.setAttribute('aria-labelledby', selectedTab.id);
  const divisorText = inputFormatter.format(activeDivisor);
  ['divisor-label', 'step-divisor', 'formula-divisor'].forEach(id => {
    byId(id).textContent = divisorText;
  });
  update();
}

formulaTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectFormula(tab));
  tab.addEventListener('keydown', event => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % formulaTabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + formulaTabs.length) % formulaTabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = formulaTabs.length - 1;
    else return;
    event.preventDefault();
    selectFormula(formulaTabs[nextIndex]);
    formulaTabs[nextIndex].focus();
  });
});

profile.addEventListener('input', () => update());
initialValue.addEventListener('input', () => update());
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!update(true)) (form.querySelector('[aria-invalid="true"]') || profile).focus();
});
form.addEventListener('reset', event => {
  // Clear the profile while preserving the chosen initial value and formula.
  event.preventDefault();
  profile.value = '';
  update();
  profile.focus();
});
appRoot.querySelectorAll('[data-value]').forEach(button => {
  button.addEventListener('click', () => {
    profile.value = button.dataset.value;
    update();
    profile.focus();
  });
});

copyButton.addEventListener('click', async () => {
  if (currentResult === null) return;
  const copiedValue = currentResult;
  const text = formatResult(copiedValue);
  const activeDocument = appRoot.ownerDocument;
  const activeWindow = activeDocument.defaultView;
  try {
    if (activeWindow.navigator.clipboard && activeWindow.isSecureContext) {
      await activeWindow.navigator.clipboard.writeText(text);
    } else {
      const temporary = activeDocument.createElement('textarea');
      temporary.value = text;
      temporary.setAttribute('readonly', '');
      temporary.style.cssText = 'position:fixed;left:-9999px;top:0;';
      activeDocument.body.appendChild(temporary);
      let copied = false;
      try {
        temporary.select();
        copied = activeDocument.execCommand('copy');
      } finally {
        temporary.remove();
        copyButton.focus();
      }
      if (!copied) throw new Error('Clipboard unavailable');
    }
    if (currentResult !== copiedValue) return;
    copyLabel.textContent = 'Copiado!';
    copyStatus.textContent = `Resultado ${text} copiado.`;
  } catch {
    if (currentResult !== copiedValue) return;
    copyLabel.textContent = 'Selecione o valor';
    copyStatus.textContent = 'Não foi possível copiar. Selecione o resultado e copie manualmente.';
  }
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(clearCopyFeedback, 2500);
});

window.pontoCalculator = Object.freeze({
  root: appRoot,
  calculate,
  formatResult,
  formatInput: value => inputFormatter.format(value),
  getSnapshot() {
    if (currentResult === null) return null;
    return { initial: parseValue(initialValue.value), x: parseValue(profile.value), divisor: activeDivisor };
  },
  restoreSnapshot(snapshot) {
    const tab = formulaTabs.find(item => Number(item.dataset.divisor) === snapshot.divisor);
    if (!tab || !Number.isFinite(snapshot.initial) || !Number.isFinite(snapshot.x)) return false;
    initialValue.value = String(snapshot.initial).replace('.', ',');
    profile.value = String(snapshot.x).replace('.', ',');
    selectFormula(tab);
    return true;
  }
});
