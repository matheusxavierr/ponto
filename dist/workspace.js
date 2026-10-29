(() => {
  'use strict';

  const calculator = window.pontoCalculator;
  const app = calculator.root;
  const find = id => app.querySelector(`#${id}`);
  const storageKey = 'ponto.deposits.v1';
  const divisors = [0.9, 0.4, 0.45, 0.8];
  const dialog = find('records-dialog');
  const target = find('target-screen');
  const dialogTarget = find('dialog-screen');
  const screenGrid = find('screen-grid');
  const cards = find('deposit-cards');
  const saveButton = find('save-deposit');
  const undoButton = find('undo-delete');
  const pipButton = find('pip-toggle');
  const pipLabel = find('pip-label');
  const mainDocument = document;
  const placeholder = mainDocument.getElementById('pip-placeholder');
  const returnButton = mainDocument.getElementById('pip-return');
  const timeFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  let selectedScreen = 0;
  let screens = Array.from({ length: 10 }, () => [null, null]);
  let storageReadable = true;
  let removedDeposit = null;
  let floatingWindow = null;
  let opening = false;

  function element(tag, className, text) {
    const node = app.ownerDocument.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function notify(message, error = false) {
    for (const id of ['save-feedback', 'records-notice']) {
      const notice = find(id);
      notice.textContent = message;
      notice.classList.toggle('error', error);
    }
  }

  function validatedRecord(record) {
    if (record === null) return null;
    if (!record || typeof record.id !== 'string' || record.id.length > 100 ||
        !Number.isFinite(record.initial) || !Number.isFinite(record.x) || !divisors.includes(record.divisor) ||
        !Number.isFinite(record.savedAt) || record.savedAt < 0 || record.savedAt > 8640000000000000) throw new Error('Invalid deposit');
    const { y, z, stop } = calculator.calculate(record.x, record.divisor, record.initial);
    if (![y, z, stop].every(Number.isFinite)) throw new Error('Invalid calculation');
    return { id: record.id, initial: record.initial, x: record.x, divisor: record.divisor, savedAt: record.savedAt };
  }

  function readScreens() {
    const value = window.localStorage.getItem(storageKey);
    if (value === null) return Array.from({ length: 10 }, () => [null, null]);
    const stored = JSON.parse(value);
    if (stored.version !== 1 || !Array.isArray(stored.screens) || stored.screens.length !== 10) throw new Error('Invalid storage');
    return stored.screens.map(slots => {
      if (!Array.isArray(slots) || slots.length !== 2) throw new Error('Invalid screen');
      return slots.map(validatedRecord);
    });
  }

  function refreshStorage() {
    try {
      screens = readScreens();
      storageReadable = true;
      return true;
    } catch {
      storageReadable = false;
      notify('Não foi possível ler os registros deste navegador. Verifique o armazenamento do site.', true);
      return false;
    }
  }

  function persist(nextScreens) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, screens: nextScreens }));
      screens = nextScreens;
      render();
      return true;
    } catch {
      notify('Não foi possível salvar. Verifique o armazenamento do site e tente novamente.', true);
      return false;
    }
  }

  function resultFor(record) {
    return calculator.formatResult(calculator.calculate(record.x, record.divisor, record.initial).stop);
  }

  function destinationHint() {
    if (!storageReadable) return;
    notify(screens[selectedScreen].every(Boolean) ? 'Dois depósitos salvos nesta tela.' : 'Até 2 depósitos por tela.');
  }

  function renderSaveControls() {
    const snapshot = calculator.getSnapshot();
    const nextSlot = screens[selectedScreen].findIndex(record => record === null);
    saveButton.disabled = !storageReadable || !snapshot || nextSlot === -1;
    saveButton.textContent = nextSlot === -1 ? 'Tela completa' : `Salvar ${nextSlot + 1}º depósito`;
    saveButton.setAttribute('aria-label', nextSlot === -1 ? `Tela ${selectedScreen + 1} completa` : `Salvar depósito ${nextSlot + 1} na Tela ${selectedScreen + 1}`);
    cards.querySelectorAll('[data-save-slot]').forEach(button => { button.disabled = !storageReadable || !snapshot; });
  }

  function renderCards() {
    cards.replaceChildren();
    const values = [];
    screens[selectedScreen].forEach((record, slot) => {
      const card = element('article', 'deposit-card');
      card.append(element('h4', 'deposit-label', `Depósito ${slot + 1}`));
      if (record) {
        const value = resultFor(record);
        values.push(BigInt(value));
        const output = element('p', 'deposit-value', value);
        if (value.length > 9) output.classList.add('compact');
        card.append(output);
        card.append(element('p', 'deposit-metadata', `Inicial ${calculator.formatInput(record.initial)} · Perfil ${calculator.formatInput(record.x)} · ÷ ${calculator.formatInput(record.divisor)}`));
        card.append(element('p', 'deposit-time', timeFormatter.format(new Date(record.savedAt))));
        const actions = element('div', 'deposit-actions');
        const load = element('button', 'small-action', 'Carregar');
        load.type = 'button'; load.dataset.loadSlot = slot; load.dataset.recordId = record.id;
        load.setAttribute('aria-label', `Carregar cálculo do depósito ${slot + 1} da Tela ${selectedScreen + 1}`);
        const remove = element('button', 'small-action danger', 'Excluir');
        remove.type = 'button'; remove.dataset.deleteSlot = slot; remove.dataset.recordId = record.id;
        remove.setAttribute('aria-label', `Excluir depósito ${slot + 1} da Tela ${selectedScreen + 1}`);
        actions.append(load, remove); card.append(actions);
      } else {
        card.append(element('p', 'deposit-empty', 'Ainda não salvo'));
        const save = element('button', 'small-action primary', 'Salvar cálculo atual');
        save.type = 'button'; save.dataset.saveSlot = slot;
        save.setAttribute('aria-label', `Salvar cálculo atual como depósito ${slot + 1} da Tela ${selectedScreen + 1}`);
        card.append(save);
      }
      cards.append(card);
    });
    find('screen-total').textContent = values.reduce((total, value) => total + value, 0n).toString();
  }

  function render() {
    let filledScreens = 0;
    screens.forEach((slots, index) => {
      const count = slots.filter(Boolean).length;
      if (count) filledScreens++;
      const text = `Tela ${index + 1} (${count}/2)`;
      target.options[index].textContent = text;
      dialogTarget.options[index].textContent = text;
      const button = screenGrid.children[index];
      button.setAttribute('aria-pressed', String(index === selectedScreen));
      button.setAttribute('aria-label', `Tela ${index + 1}, ${count} de 2 depósitos salvos`);
      button.querySelector('.screen-count').textContent = `${count}/2`;
    });
    target.value = String(selectedScreen); dialogTarget.value = String(selectedScreen);
    find('records-open').setAttribute('aria-label', `Abrir telas salvas, ${filledScreens} de 10 telas com registros`);
    find('selected-screen-title').textContent = `Tela ${selectedScreen + 1}`;
    undoButton.hidden = removedDeposit === null || Boolean(screens[removedDeposit.screen][removedDeposit.slot]);
    renderCards(); renderSaveControls();
  }

  function selectScreen(index) {
    if (!Number.isInteger(index) || index < 0 || index > 9) return;
    selectedScreen = index;
    render(); destinationHint();
  }

  function saveDeposit(slot) {
    const snapshot = calculator.getSnapshot();
    if (!snapshot) { notify('Calcule um valor válido antes de salvar.', true); return; }
    if (!refreshStorage()) { renderSaveControls(); return; }
    const destination = slot === undefined ? screens[selectedScreen].findIndex(record => record === null) : slot;
    if (destination < 0 || screens[selectedScreen][destination]) {
      render(); notify('Esse espaço já está preenchido. Use o outro depósito ou exclua o registro anterior.', true); return;
    }
    const next = screens.map(slots => slots.slice());
    next[selectedScreen][destination] = { ...snapshot, id: window.crypto.randomUUID(), savedAt: Date.now() };
    if (persist(next)) {
      notify(`Depósito ${destination + 1} salvo na Tela ${selectedScreen + 1}.`);
      if (dialog.open) cards.querySelector(`[data-load-slot="${destination}"]`)?.focus();
    }
  }

  for (let index = 0; index < 10; index++) {
    for (const select of [target, dialogTarget]) {
      const option = element('option', '', `Tela ${index + 1} (0/2)`);
      option.value = String(index); select.append(option);
    }
    const button = element('button', 'screen-choice');
    button.type = 'button'; button.dataset.screen = index;
    button.append(element('span', '', `Tela ${index + 1}`), element('span', 'screen-count', '0/2'));
    screenGrid.append(button);
  }

  target.addEventListener('change', () => selectScreen(Number(target.value)));
  dialogTarget.addEventListener('change', () => selectScreen(Number(dialogTarget.value)));
  screenGrid.addEventListener('click', event => {
    const button = event.target.closest('[data-screen]');
    if (button) selectScreen(Number(button.dataset.screen));
  });
  saveButton.addEventListener('click', () => saveDeposit());
  find('records-open').addEventListener('click', () => {
    refreshStorage(); render(); dialog.showModal();
  });
  find('records-close').addEventListener('click', () => dialog.close());
  cards.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.saveSlot !== undefined) { saveDeposit(Number(button.dataset.saveSlot)); return; }
    if (button.dataset.loadSlot !== undefined) {
      if (!refreshStorage()) return;
      const record = screens[selectedScreen][Number(button.dataset.loadSlot)];
      if (record?.id !== button.dataset.recordId) { render(); notify('Esse registro mudou em outra aba. Selecione-o novamente.', true); return; }
      if (record && calculator.restoreSnapshot(record)) { dialog.close(); notify(`Cálculo da Tela ${selectedScreen + 1} carregado.`); }
      return;
    }
    if (button.dataset.deleteSlot !== undefined) {
      if (!refreshStorage()) return;
      const slot = Number(button.dataset.deleteSlot);
      const record = screens[selectedScreen][slot];
      if (record?.id !== button.dataset.recordId) { render(); notify('Esse registro mudou em outra aba. Selecione-o novamente.', true); return; }
      const next = screens.map(slots => slots.slice());
      next[selectedScreen][slot] = null;
      if (persist(next)) {
        removedDeposit = { record, screen: selectedScreen, slot };
        undoButton.hidden = false;
        undoButton.focus();
        notify(`Tela ${selectedScreen + 1}: depósito ${slot + 1} excluído.`);
      }
    }
  });
  undoButton.addEventListener('click', () => {
    if (!removedDeposit || !refreshStorage()) return;
    const { record, screen, slot } = removedDeposit;
    if (screens[screen][slot]) { notify('O espaço já foi preenchido e não pode ser substituído ao desfazer.', true); return; }
    const next = screens.map(slots => slots.slice()); next[screen][slot] = record;
    if (persist(next)) {
      removedDeposit = null; undoButton.hidden = true;
      screenGrid.querySelector(`[data-screen="${selectedScreen}"]`)?.focus();
      notify(`Depósito ${slot + 1} da Tela ${screen + 1} restaurado.`);
    }
  });
  app.addEventListener('calculationchange', () => { renderSaveControls(); destinationHint(); });
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) { refreshStorage(); render(); destinationHint(); }
  });

  function restoreFromFloating() {
    if (app.ownerDocument !== mainDocument) {
      const recordsOpen = dialog.open;
      if (recordsOpen) dialog.close();
      mainDocument.body.insertBefore(app, placeholder);
      if (recordsOpen) dialog.showModal();
    }
    placeholder.hidden = true;
    floatingWindow = null;
    pipLabel.textContent = 'Flutuar';
    pipButton.setAttribute('aria-pressed', 'false');
    pipButton.title = 'Abrir calculadora em uma janela flutuante';
  }

  function returnToTab() {
    const current = floatingWindow;
    restoreFromFloating();
    if (current && !current.closed) current.close();
    window.focus();
  }

  pipButton.addEventListener('click', async () => {
    if (floatingWindow && !floatingWindow.closed) { returnToTab(); return; }
    if (opening) return;
    if (!window.documentPictureInPicture || !window.isSecureContext) {
      notify('Janela flutuante indisponível. Use um navegador compatível, como Chrome ou Edge no computador.', true); return;
    }
    opening = true; pipButton.disabled = true;
    try {
      const child = await window.documentPictureInPicture.requestWindow({ width: 420, height: 620 });
      floatingWindow = child;
      child.addEventListener('pagehide', () => { if (floatingWindow === child) restoreFromFloating(); }, { once: true });
      child.document.documentElement.lang = 'pt-BR';
      child.document.title = 'Ponto — Calculadora flutuante';
      const baseStyle = child.document.createElement('style');
      baseStyle.textContent = ':root{color-scheme:dark}body{margin:0;background:#0d1117;color:#f1f5f9}';
      child.document.head.append(baseStyle);
      mainDocument.querySelectorAll('link[rel="stylesheet"]').forEach(sheet => {
        const link = child.document.createElement('link'); link.rel = 'stylesheet'; link.href = sheet.href;
        child.document.head.append(link);
      });
      child.document.body.classList.add('pip-mode');
      child.document.body.append(app);
      placeholder.hidden = false;
      pipLabel.textContent = 'Voltar'; pipButton.setAttribute('aria-pressed', 'true');
      pipButton.title = 'Voltar à aba original';
    } catch {
      const current = floatingWindow;
      restoreFromFloating();
      if (current && !current.closed) current.close();
      notify('Não foi possível abrir a janela flutuante neste navegador.', true);
    } finally { opening = false; pipButton.disabled = false; }
  });
  returnButton.addEventListener('click', returnToTab);
  app.querySelector('.brand').addEventListener('click', event => {
    if (floatingWindow) { event.preventDefault(); returnToTab(); }
  });

  refreshStorage(); render();
})();
