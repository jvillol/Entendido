/**
 * js/main.js
 * Punto de entrada de la aplicación web "Entendido".
 * Conecta la interfaz de usuario, el selector de juegos, el parser de reglamentos y el motor Monte Carlo.
 */

import { getAllGames, getGameById, registerOrUpdateCustomGame } from './games/registry.js';
import { runMultiPlayerSimulation } from './engine/simulator.js';
import { analyzeSimulationResults } from './engine/analyzer.js';
import { generateDesignAdvice } from './engine/advisor.js';
import { parseDraftRulebook, SAMPLE_DRAFT_RULEBOOK } from './engine/ruleParser.js';
import { renderDashboard } from './ui/renderer.js';

let currentGameId = 'la_tercera_ipa';

document.addEventListener('DOMContentLoaded', () => {
  // Por defecto activar 4, 5 y 6 jugadores para La Tercera IPA
  const checkboxes = document.querySelectorAll('#playerCountToggles input[type="checkbox"]');
  checkboxes.forEach(cb => {
    const val = Number(cb.value);
    cb.checked = (val >= 4 && val <= 6);
  });

  initGameSelector();
  initSidebarControls();
  initTabs();
  initRulebookEditor();

  // Ejecutar simulación inicial al cargar
  executeFullAnalysis();
});

function initGameSelector() {
  const select = document.getElementById('gameSelect');
  const games = getAllGames();

  select.innerHTML = games.map(g =>
    `<option value="${g.id}">${g.name}</option>`
  ).join('');

  select.value = currentGameId;
  select.addEventListener('change', () => {
    currentGameId = select.value;
    syncRulebookTextareaWithActiveGame();
    executeFullAnalysis();
  });

  syncRulebookTextareaWithActiveGame();
}

function syncRulebookTextareaWithActiveGame() {
  const game = getGameById(currentGameId);
  const nameInput = document.getElementById('customGameName');
  const textInput = document.getElementById('customRulebookText');
  if (nameInput && textInput && game) {
    nameInput.value = game.name;
    textInput.value = game.rulebookText || SAMPLE_DRAFT_RULEBOOK;
  }
}

function initSidebarControls() {
  const iterInput = document.getElementById('iterationsInput');
  const iterLabel = document.getElementById('iterationsLabel');
  iterInput.addEventListener('input', () => {
    iterLabel.textContent = iterInput.value;
  });

  const maxTurnsInput = document.getElementById('maxTurnsInput');
  const maxTurnsLabel = document.getElementById('maxTurnsLabel');
  maxTurnsInput.addEventListener('input', () => {
    maxTurnsLabel.textContent = maxTurnsInput.value;
  });

  document.getElementById('runSimBtn').addEventListener('click', () => {
    executeFullAnalysis();
  });

  document.getElementById('openRulesModalBtn').addEventListener('click', () => {
    activateTab('tab-rulebook');
    document.getElementById('customRulebookText').focus();
  });
}

function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      activateTab(btn.dataset.tab);
    });
  });
}

function activateTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === tabId);
  });
}

function initRulebookEditor() {
  document.getElementById('loadSampleDraftBtn').addEventListener('click', () => {
    document.getElementById('customGameName').value = 'Gremios de la Ciudadela (Borrador)';
    document.getElementById('customRulebookText').value = SAMPLE_DRAFT_RULEBOOK;
  });

  document.getElementById('analyzeCustomRulesBtn').addEventListener('click', () => {
    const title = document.getElementById('customGameName').value.trim() || 'Mi Juego en Pruebas';
    const rawText = document.getElementById('customRulebookText').value;

    const customGame = parseDraftRulebook(title, rawText);
    registerOrUpdateCustomGame(customGame);

    currentGameId = customGame.id;
    initGameSelector();
    document.getElementById('gameSelect').value = currentGameId;

    executeFullAnalysis();
    activateTab('tab-ideas');
  });
}

function getSelectedPlayerCounts() {
  const checkboxes = document.querySelectorAll('#playerCountToggles input[type="checkbox"]:checked');
  const counts = Array.from(checkboxes).map(cb => Number(cb.value));
  return counts.length > 0 ? counts : [2, 3, 4];
}

function executeFullAnalysis() {
  const gameModule = getGameById(currentGameId);
  const playerCounts = getSelectedPlayerCounts();
  const iterationsPerCount = Number(document.getElementById('iterationsInput').value) || 300;
  const maxTurns = Number(document.getElementById('maxTurnsInput').value) || 100;

  const simReport = runMultiPlayerSimulation(gameModule, {
    playerCounts,
    iterationsPerCount,
    maxTurns
  });

  const analysis = analyzeSimulationResults(simReport, gameModule);
  const recommendations = generateDesignAdvice(analysis, gameModule);

  renderDashboard(simReport, analysis, recommendations, gameModule);
}
