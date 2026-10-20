'use strict';

const form = document.getElementById('calculator-form');
const profile = document.getElementById('profile');
const inputWrap = document.getElementById('input-wrap');
const inputError = document.getElementById('input-error');
const resultElement = document.getElementById('result');
const resultHint = document.getElementById('result-hint');
const copyButton = document.getElementById('copy');
const copyLabel = document.getElementById('copy-label');
const copyStatus = document.getElementById('copy-status');
const formatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const resultFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0, useGrouping: false });
const inputFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 10 });
let currentResult = null;
let feedbackTimer;

function parseProfile(value) {
  const normalized = value.trim().replace(/\u2212/g, '-');
  if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(normalized)) return null;
  const number = Number(normalized.replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function calculate(x) {
  const y = 600 - x;
  const z = y / 0.9;
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

function setError(message = '') {
  inputError.textContent = message;
  inputError.hidden = !message;
  inputWrap.classList.toggle('invalid', Boolean(message));
  if (message) profile.setAttribute('aria-invalid', 'true');
  else profile.removeAttribute('aria-invalid');
}

function renderEmpty() {
  currentResult = null;
  resultElement.textContent = '—';
  resultElement.classList.remove('compact');
  resultHint.textContent = 'Seu ponto de parada aparece aqui.';
  copyButton.disabled = true;
  document.getElementById('step-x').textContent = 'X';
  document.getElementById('step-y-equation').textContent = 'Y';
  document.getElementById('step-z-equation').textContent = 'Z';
  ['step-y', 'step-z', 'step-final'].forEach(id => document.getElementById(id).textContent = '—');
}

function update(showEmptyError = false) {
  clearCopyFeedback();
  const value = profile.value.trim();
  if (!value) {
    renderEmpty();
    setError(showEmptyError ? 'Digite o valor que aparece no seu perfil.' : '');
    return false;
  }
  const x = parseProfile(value);
  if (x === null) {
    renderEmpty();
    setError('Informe um número válido, como 300, −500 ou 150,50. Não use separador de milhar.');
    return false;
  }
  const { y, z, stop } = calculate(x);
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
  document.getElementById('step-x').textContent = x < 0 ? `(${inputFormatter.format(x)})` : inputFormatter.format(x);
  document.getElementById('step-y').textContent = format(y);
  document.getElementById('step-y-equation').textContent = format(y);
  document.getElementById('step-z').textContent = format(z);
  document.getElementById('step-z-equation').textContent = format(z);
  document.getElementById('step-final').textContent = resultText;
  return true;
}

profile.addEventListener('input', () => update());
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!update(true)) profile.focus();
});
form.addEventListener('reset', () => {
  // The reset event fires before the browser clears form fields.
  profile.value = '';
  update();
  profile.focus();
});
document.querySelectorAll('[data-value]').forEach(button => {
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
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const temporary = document.createElement('textarea');
      temporary.value = text;
      temporary.setAttribute('readonly', '');
      temporary.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(temporary);
      let copied = false;
      try {
        temporary.select();
        copied = document.execCommand('copy');
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
