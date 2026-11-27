/**
 * js/ui/playtableUI.js
 * Interfaz visual e interactiva para jugar "LA TERCERA IPA" en primera persona (POV Jugador)
 * contra 1 a 5 jugadores controlados por la IA (partidas de 2 a 6 jugadores).
 */

import { IPA_RECIPES } from '../games/laTerceraIpa.js';
import {
  INGREDIENT_LABELS,
  createInteractiveMatch,
  getActivePlayer,
  selectHumanBarCard,
  checkGlassMatchesPendingRecipe,
  checkGlassMissingOneIngredient,
  executeFreeMarketSwap,
  actionHarvest,
  actionCook,
  resolveImmediateCloseDecision,
  actionTradeWithAI,
  actionPlayBrewmasterCard,
  actionRefreshMarket,
  actionCloseIpaFree,
  discardExcessTile,
  executeAITurn,
  countClosedGlasses,
  getBarCardTotalIngredients
} from '../engine/interactiveMatch.js';

let matchState = null;
let uiMode = null; // null | 'HARVEST' | 'COOK' | 'FREE_SWAP' | 'TRADE' | 'PLAY_CARD'
let uiSelection = {};
let aiTimer = null;

export function initPlaytableSection() {
  const container = document.getElementById('interactivePlaytableRoot');
  if (!container) return;

  startNewMatch(4);
}

export function startNewMatch(numPlayers) {
  if (aiTimer) clearTimeout(aiTimer);
  matchState = createInteractiveMatch(numPlayers);
  uiMode = null;
  uiSelection = {};
  renderPlaytable();
}

function renderPlaytable() {
  const container = document.getElementById('interactivePlaytableRoot');
  if (!container || !matchState) return;

  const activePlayer = getActivePlayer(matchState);
  const human = matchState.players[0];
  const isMyTurn = matchState.phase === 'PLAYING' && activePlayer.isHuman;

  // Barra superior de configuración de partida vs IA
  const controlsHtml = `
    <div class="playtable-ControlsBar">
      <div class="controls-left">
        <strong>🎮 Modo Jugable vs IA (POV Jugador):</strong>
        <label for="playtablePlayerCountSelect" class="helper-text">Jugadores en mesa:</label>
        <select id="playtablePlayerCountSelect" class="input-select-sm" style="min-width:150px;">
          ${[2, 3, 4, 5, 6].map(n => `
            <option value="${n}" ${matchState.numPlayers === n ? 'selected' : ''}>
              ${n} Jugadores (Tú + ${n - 1} IA)
            </option>
          `).join('')}
        </select>
        <button type="button" id="restartPlaytableBtn" class="btn btn-secondary">🔄 Nueva Partida</button>
      </div>
      <div class="controls-right">
        <span class="badge badge-accent">Ronda ${matchState.round}</span>
        ${matchState.finalRoundTriggered
          ? `<span class="badge badge-danger">🔔 ¡ÚLTIMA RONDA! (Activada por ${matchState.finalRoundTriggeredBy})</span>`
          : ''}
        <span class="badge ${isMyTurn ? 'badge-ok' : 'badge-warn'}">
          Turno actual: ${matchState.phase === 'DRAFT_BAR_CARD' ? 'Eligiendo Carta de Bar' : activePlayer.name}
        </span>
      </div>
    </div>
  `;

  // Si estamos en el Draft Inicial (Elegir 1 de las 2 Cartas de Bar repartidas boca abajo)
  if (matchState.phase === 'DRAFT_BAR_CARD') {
    container.innerHTML = `
      <div class="playtable-wrapper">
        ${controlsHtml}
        ${renderDraftBarCardModal(human)}
      </div>
    `;
    bindControlEvents();
    bindDraftEvents();
    return;
  }

  // Si la partida ha terminado (Fin de la Última Ronda y Triple Desempate)
  const gameOverBannerHtml = matchState.phase === 'GAME_OVER'
    ? renderGameOverBanner(matchState)
    : '';

  // Zona de Rivales IA
  const aiPlayers = matchState.players.slice(1);
  const aiGridHtml = `
    <div class="ai-opponents-grid">
      ${aiPlayers.map(ai => renderAIOpponentCard(ai, activePlayer.seat === ai.seat, matchState.phase === 'GAME_OVER')).join('')}
    </div>
  `;

  // Centro de la Mesa: Mercado de Abastos (5 fichas boca arriba) y Despensa Principal
  const centerZoneHtml = `
    <div class="table-center-zone">
      <div class="market-board">
        <div class="flex-between">
          <div>
            <h4 style="font-size:14px; font-weight:700;">🛒 Mercado de Abastos (5 Fichas Visibles)</h4>
            <p class="helper-text">Haz clic en las fichas cuando estés Cosechando o haciendo el Cambio Rápido 2×1.</p>
          </div>
          <span class="badge badge-info">${matchState.market.length}/5 visibles</span>
        </div>
        <div class="market-slots">
          ${matchState.market.map((ing, idx) => {
            const isSelected = (uiMode === 'HARVEST' && (uiSelection.marketIndices || []).includes(idx)) ||
                               (uiMode === 'FREE_SWAP' && uiSelection.marketIdx === idx);
            return `
              <button type="button" class="ing-chip ing-${ing} ${isSelected ? 'selected' : ''}" data-market-idx="${idx}">
                ● ${INGREDIENT_LABELS[ing]}
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pantry-box">
        <div>
          <h4 style="font-size:14px; font-weight:700;">🎒 Despensa Principal y Mazos</h4>
          <p class="helper-text">Bolsa opaca para robos a ciegas y reposición del Mercado.</p>
        </div>
        <div class="ai-stats-row" style="flex-wrap:wrap; gap:12px;">
          <span class="spec-pill"><strong>Despensa:</strong> ${matchState.pantry.length} fichas</span>
          <span class="spec-pill"><strong>Mazo Acción:</strong> ${matchState.actionDeck.length} cartas</span>
          <span class="spec-pill"><strong>Descartes:</strong> ${matchState.actionDiscard.length}</span>
        </div>
      </div>
    </div>
  `;

  // Zona POV del Jugador Humano
  const humanZoneHtml = renderHumanPOVZone(human, isMyTurn);

  // Crónica en vivo de la partida
  const liveLogHtml = `
    <div class="card">
      <div class="card-header">
        <h3>📜 Crónica de la Mesa en Vivo</h3>
      </div>
      <div class="match-log-viewer" style="max-height:200px;">
        ${matchState.log.map(line => `<div class="log-event">• ${line}</div>`).join('')}
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="playtable-wrapper">
      ${controlsHtml}
      ${gameOverBannerHtml}
      ${aiGridHtml}
      ${centerZoneHtml}
      ${humanZoneHtml}
      ${liveLogHtml}
    </div>
  `;

  bindControlEvents();
  bindGameplayEvents(isMyTurn);

  // Si es el turno de una IA y la partida sigue en curso, ejecutar turno de la IA con breve pausa visual
  if (matchState.phase === 'PLAYING' && !activePlayer.isHuman) {
    aiTimer = setTimeout(() => {
      executeAITurn(matchState);
      renderPlaytable();
    }, 650);
  }
}

function renderDraftBarCardModal(human) {
  return `
    <div class="draft-modal-box">
      <div>
        <span class="badge badge-accent">Preparación — Paso 2 del Reglamento</span>
        <h3 style="font-size:20px; margin-top:6px;">Elige tu Carta de Bar Secreta (Draft: 2 cartas, elige 1)</h3>
        <p class="helper-text">
          Tus fichas iniciales en reserva oculta (${human.isFirstPlayer ? '2 por ser Jugador Inicial' : '3 fichas'}):
          ${human.reserve.map(ing => `<span class="ing-chip ing-sm ing-${ing}">● ${INGREDIENT_LABELS[ing]}</span>`).join(' ')}
        </p>
      </div>
      <div class="draft-cards-pair">
        ${human.draftPair.map(card => {
          const totalIng = getBarCardTotalIngredients(card);
          return `
            <div class="draft-option-card" data-draft-card-id="${card.id}">
              <div class="flex-between">
                <strong style="font-size:16px;">📜 ${card.name}</strong>
                <span class="badge badge-info">${totalIng} ingredientes totales</span>
              </div>
              <div class="rule-step-list">
                ${card.recipes.map(rId => {
                  const rec = IPA_RECIPES[rId];
                  const ingBadges = Object.entries(rec.ingredients)
                    .map(([k, q]) => `<span class="ing-chip ing-sm ing-${k}">${q}× ${INGREDIENT_LABELS[k]}</span>`)
                    .join(' ');
                  return `
                    <div class="bar-recipe-item">
                      <strong>🍺 ${rec.name} (${rec.size} ing.)</strong>
                      <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:4px;">${ingBadges}</div>
                    </div>
                  `;
                }).join('')}
              </div>
              <button type="button" class="btn btn-primary btn-block" style="margin-top:auto;">
                ✔ Quedarme con ${card.name}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderAIOpponentCard(ai, isActiveTurn, revealSecretMenu) {
  const closedCount = countClosedGlasses(ai);
  return `
    <div class="ai-player-card ${isActiveTurn ? 'active-turn' : ''}">
      <div class="ai-header">
        <span>🤖 ${ai.name} ${ai.isFirstPlayer ? '⭐(1.º)' : ''}</span>
        <span class="badge ${closedCount >= 2 ? 'badge-warn' : 'badge-accent'}">${closedCount}/3 IPAs</span>
      </div>
      <div class="ai-stats-row">
        <span>🂠 Reserva oculta: <strong>${ai.reserve.length}/5</strong></span>
        <span>🃏 Cartas Acción: <strong>${ai.hand.length}</strong></span>
      </div>
      ${revealSecretMenu && ai.barCard
        ? `<div class="helper-text" style="color:#a5b4fc;">Menú secreto: <strong>${ai.barCard.name}</strong> (${ai.barCard.recipes.map(r => IPA_RECIPES[r].name).join(' + ')})</div>`
        : '<div class="helper-text">🔒 Carta de Bar cubierta</div>'}
      <div class="mini-glasses-row">
        ${ai.glasses.map((g, idx) => `
          <div class="mini-glass ${g.closed ? 'closed-foam' : ''}">
            <div class="mini-glass-title">
              <span>Vaso #${idx + 1}</span>
              <span>${g.closed ? '☁️ Espuma' : 'Abierto'}</span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:3px;">
              ${g.ingredients.length === 0
                ? '<span class="helper-text" style="font-size:10px;">Vacío</span>'
                : g.ingredients.map(ing => `<span class="ing-chip ing-sm ing-${ing}" style="font-size:9.5px; padding:1px 5px;">${INGREDIENT_LABELS[ing].split(' ')[0]}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderHumanPOVZone(human, isMyTurn) {
  const barCard = human.barCard;
  const closedRecipes = human.glasses.filter(g => g.closed && g.matchedRecipeId).map(g => g.matchedRecipeId);
  const usedCopyFlags = {};

  const recipesHtml = barCard.recipes.map((rId, rIdx) => {
    const rec = IPA_RECIPES[rId];
    const countClosedOfThis = closedRecipes.filter(x => x === rId).length;
    const seenSoFar = (usedCopyFlags[rId] || 0) + 1;
    usedCopyFlags[rId] = seenSoFar;
    const isCompleted = seenSoFar <= countClosedOfThis;

    const ingList = Object.entries(rec.ingredients)
      .map(([k, q]) => `<span class="ing-chip ing-sm ing-${k}">${q}× ${INGREDIENT_LABELS[k]}</span>`)
      .join(' ');

    return `
      <div class="bar-recipe-item ${isCompleted ? 'recipe-done' : ''}">
        <div class="flex-between">
          <strong>${isCompleted ? '✅' : '🍺'} ${rIdx + 1}. ${rec.name} (${rec.size} ing.)</strong>
          ${isCompleted ? '<span class="badge badge-ok">Servida con Espuma</span>' : ''}
        </div>
        <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:4px;">${ingList}</div>
      </div>
    `;
  }).join('');

  const glassesHtml = human.glasses.map((g, idx) => {
    const matchingRec = checkGlassMatchesPendingRecipe(human, idx);
    const missingOneRec = checkGlassMissingOneIngredient(human, idx);
    return `
      <div class="shot-glass-card ${g.closed ? 'glass-closed' : (matchingRec ? 'glass-ready' : '')}">
        <div>
          <div class="flex-between">
            <strong>🥃 Tu Vaso #${idx + 1}</strong>
            ${g.closed
              ? `<span class="badge badge-ok">☁️ Blindado (${IPA_RECIPES[g.matchedRecipeId]?.name || 'IPA'})</span>`
              : (matchingRec
                  ? `<span class="badge badge-ok">¡Receta ${matchingRec.name} Lista!</span>`
                  : `<span class="badge badge-accent">Abierto (${g.ingredients.length} fichas)</span>`)}
          </div>
          <div class="glass-ingredients-list">
            ${g.ingredients.length === 0
              ? '<span class="helper-text">Vaso vacío — Usa "Cocinar" para añadir fichas</span>'
              : g.ingredients.map(ing => `<span class="ing-chip ing-sm ing-${ing}">● ${INGREDIENT_LABELS[ing]}</span>`).join('')}
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${!g.closed && matchingRec && isMyTurn
            ? `<button type="button" class="btn btn-primary btn-block close-free-btn" data-glass-idx="${idx}">
                 ☁️ Cerrar IPA Gratis (Gasta tu Acción)
               </button>`
            : ''}
          ${!g.closed && missingOneRec
            ? `<div class="helper-text" style="color:#34d399;">⚡ A falta de 1 ing. para ${missingOneRec.name} (Apto para Fermentación Acelerada)</div>`
            : ''}
        </div>
      </div>
    `;
  }).join('');

  // Panel contextual según la acción que esté ejecutando el jugador
  const promptPanelHtml = renderActionPromptPanel(human, isMyTurn);

  return `
    <div class="human-pov-zone ${isMyTurn ? 'my-turn-glow' : ''}">
      <div class="flex-between">
        <div>
          <span class="badge ${isMyTurn ? 'badge-ok' : 'badge-accent'}">
            ${isMyTurn ? '🟢 ES TU TURNO — Elige 1 Acción Principal' : '⏳ Esperando turno de la IA...'}
          </span>
          <h3 style="font-size:18px; margin-top:4px;">🧑‍🍳 Tu Puesto de Maestro Cervecero ${human.isFirstPlayer ? '(Jugador Inicial ⭐)' : ''}</h3>
        </div>
        <div>
          <button type="button" id="startFreeSwapBtn" class="btn btn-secondary" ${(!isMyTurn || matchState.usedFreeMarketSwap || human.reserve.length < 2) ? 'disabled' : ''}>
            🔄 Cambio Rápido 2×1 Gratis en Mercado ${matchState.usedFreeMarketSwap ? '(Usado)' : '(Disponible)'}
          </button>
        </div>
      </div>

      ${promptPanelHtml}

      <div class="pov-top-grid">
        <div class="secret-bar-card">
          <div class="flex-between">
            <strong>🔒 Tu Carta de Bar (${barCard.name})</strong>
            <span class="badge badge-info">Secreta</span>
          </div>
          <p class="helper-text">Completa estas 3 recetas en tus 3 vasos y ciérralas con espuma:</p>
          ${recipesHtml}
        </div>

        <div class="player-glasses-grid">
          ${glassesHtml}
        </div>
      </div>

      <div class="pov-bottom-grid">
        <div class="reserve-box">
          <div class="flex-between">
            <strong>🂠 Tu Reserva Oculta (${human.reserve.length}/5 fichas)</strong>
            <span class="helper-text">Solo tú puedes verlas (máx. 5 al final del turno)</span>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; min-height:38px; align-items:center;">
            ${human.reserve.length === 0
              ? '<span class="helper-text">No tienes fichas en tu reserva oculta. ¡Usa Cosechar!</span>'
              : human.reserve.map((ing, idx) => {
                  const isSel = (uiMode === 'COOK' && uiSelection.reserveIdx === idx) ||
                                (uiMode === 'FREE_SWAP' && (uiSelection.reserveIndices || []).includes(idx)) ||
                                (uiMode === 'TRADE' && uiSelection.reserveIdx === idx);
                  return `
                    <button type="button" class="ing-chip ing-${ing} ${isSel ? 'selected' : ''}" data-reserve-idx="${idx}">
                      ● ${INGREDIENT_LABELS[ing]}
                    </button>
                  `;
                }).join('')}
          </div>
        </div>

        <div class="hand-cards-box">
          <div class="flex-between">
            <strong>🃏 Tus Cartas de Acción Cervecera (${human.hand.length}/2 en mano)</strong>
            <span class="helper-text">Se repone 1 al final del turno si juegas una</span>
          </div>
          <div class="action-cards-list">
            ${human.hand.length === 0
              ? '<span class="helper-text">Sin cartas especiales en mano.</span>'
              : human.hand.map((card, idx) => `
                  <div class="brew-action-card">
                    <div>
                      <strong>${card.name}</strong>
                      <p class="helper-text" style="font-size:11.5px; margin-top:2px;">${card.text}</p>
                    </div>
                    <button type="button" class="btn btn-secondary btn-block play-card-init-btn" data-hand-idx="${idx}" ${!isMyTurn ? 'disabled' : ''}>
                      🃏 Jugar Carta
                    </button>
                  </div>
                `).join('')}
          </div>
        </div>
      </div>

      <!-- Barra de las 6 Acciones Principales del Turno -->
      <div class="turn-actions-toolbar">
        <button type="button" id="btnActionHarvest" class="btn btn-primary" ${!isMyTurn ? 'disabled' : ''}>
          1. 🌾 Cosechar (2 fichas)
        </button>
        <button type="button" id="btnActionCook" class="btn btn-primary" ${(!isMyTurn || human.reserve.length === 0) ? 'disabled' : ''}>
          2. 🍺 Cocinar (1 ficha a vaso)
        </button>
        <button type="button" id="btnActionTrade" class="btn btn-secondary" ${(!isMyTurn || human.reserve.length === 0) ? 'disabled' : ''}>
          3. 🤝 Comerciar (Trueque con IA)
        </button>
        <button type="button" id="btnActionRefreshMarket" class="btn btn-secondary" ${!isMyTurn ? 'disabled' : ''}>
          5. ♻️ Renovar Mercado (5 nuevas + roba 1)
        </button>
      </div>
    </div>
  `;
}

function renderActionPromptPanel(human, isMyTurn) {
  // 1. Si acaba de completar una receta al Cocinar y puede hacer Cierre Inmediato con Coste (descartar 1 ficha)
  if (matchState.awaitingImmediateCloseDecision) {
    const info = matchState.awaitingImmediateCloseDecision;
    return `
      <div class="action-prompt-panel" style="border-color:#10b981; background:rgba(16,185,129,0.16);">
        <strong>☁️ ¡Has completado tu ${info.recipe.name} en el Vaso #${info.glassIndex + 1}! ¿Quieres Cierre Inmediato con Coste?</strong>
        <p class="helper-text">Según el reglamento, puedes descartar 1 ficha cualquiera de tu reserva oculta AHORA MISMO para colocarle la espuma y blindarla al instante, o ahorrar tu ficha y cerrarla gratis en un turno posterior:</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${human.reserve.map((ing, idx) => `
            <button type="button" class="btn btn-primary immediate-close-pay-btn" data-pay-idx="${idx}">
              ☁️ Descartar [${INGREDIENT_LABELS[ing]}] y Poner Espuma Ahora
            </button>
          `).join('')}
          <button type="button" id="skipImmediateCloseBtn" class="btn btn-secondary">
            No gastar ficha (Dejar vaso abierto hasta otro turno)
          </button>
        </div>
      </div>
    `;
  }

  // 2. Si tiene exceso de fichas (>5) en su reserva al final del turno
  if (matchState.pendingExcessDiscard) {
    return `
      <div class="action-prompt-panel" style="border-color:#f59e0b; background:rgba(245,158,11,0.16);">
        <strong>⚠️ Límite de Reserva (Máximo 5 fichas): Tienes ${human.reserve.length} fichas.</strong>
        <p class="helper-text">Elige qué ficha descartar a la Despensa para terminar tu turno:</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${human.reserve.map((ing, idx) => `
            <button type="button" class="ing-chip ing-${ing} excess-discard-btn" data-discard-idx="${idx}">
              🗑️ Descartar ${INGREDIENT_LABELS[ing]}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (!isMyTurn || !uiMode) return '';

  if (uiMode === 'HARVEST') {
    const mCount = (uiSelection.marketIndices || []).length;
    const pCount = uiSelection.pantryCount || 0;
    const totalPicked = mCount + pCount;
    return `
      <div class="action-prompt-panel">
        <div class="flex-between">
          <strong>1. 🌾 Cosechar: Elige 2 fichas (${totalPicked}/2 seleccionadas)</strong>
          <button type="button" class="btn btn-secondary cancel-mode-btn">Cancelar</button>
        </div>
        <p class="helper-text">Haz clic en hasta 2 fichas del <strong>Mercado de Abastos</strong> arriba, o pulsa el botón para coger a ciegas de la <strong>Despensa</strong>:</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" id="addPantryPickBtn" class="btn btn-secondary" ${totalPicked >= 2 ? 'disabled' : ''}>
            🎒 +1 Ficha a ciegas de la Despensa (Seleccionadas: ${pCount})
          </button>
          <button type="button" id="confirmHarvestBtn" class="btn btn-primary" ${totalPicked !== 2 ? 'disabled' : ''}>
            ✔ Confirmar Cosecha de 2 Fichas
          </button>
        </div>
      </div>
    `;
  }

  if (uiMode === 'COOK') {
    const selIdx = uiSelection.reserveIdx;
    const selTile = selIdx !== undefined ? human.reserve[selIdx] : null;
    return `
      <div class="action-prompt-panel">
        <div class="flex-between">
          <strong>2. 🍺 Cocinar: ${selTile ? `Ficha elegida: [${INGREDIENT_LABELS[selTile]}]` : 'Haz clic primero en 1 ficha de tu Reserva Oculta'}</strong>
          <button type="button" class="btn btn-secondary cancel-mode-btn">Cancelar</button>
        </div>
        ${selTile !== null
          ? `<div style="display:flex; gap:10px; flex-wrap:wrap;">
               ${human.glasses.map((g, gIdx) => `
                 <button type="button" class="btn btn-primary confirm-cook-glass-btn" data-glass-idx="${gIdx}" ${g.closed ? 'disabled' : ''}>
                   🥃 Echar en Vaso #${gIdx + 1} (${g.ingredients.length} ing.)
                 </button>
               `).join('')}
             </div>`
          : '<p class="helper-text">Selecciona una ficha de tu reserva oculta abajo para elegir en qué vaso echarla.</p>'}
      </div>
    `;
  }

  if (uiMode === 'FREE_SWAP') {
    const rList = uiSelection.reserveIndices || [];
    const mIdx = uiSelection.marketIdx;
    return `
      <div class="action-prompt-panel">
        <div class="flex-between">
          <strong>🔄 Cambio Rápido 2×1 Gratis: Elige 2 fichas de tu Reserva (${rList.length}/2) y 1 del Mercado (${mIdx !== undefined ? '1/1' : '0/1'})</strong>
          <button type="button" class="btn btn-secondary cancel-mode-btn">Cancelar</button>
        </div>
        <button type="button" id="confirmFreeSwapBtn" class="btn btn-primary" ${(rList.length !== 2 || mIdx === undefined) ? 'disabled' : ''}>
          ✔ Ejecutar Cambio Rápido 2×1 Gratis
        </button>
      </div>
    `;
  }

  if (uiMode === 'TRADE') {
    const selIdx = uiSelection.reserveIdx;
    const selTile = selIdx !== undefined ? human.reserve[selIdx] : null;
    return `
      <div class="action-prompt-panel">
        <div class="flex-between">
          <strong>3. 🤝 Comerciar (Trueque con un rival IA)</strong>
          <button type="button" class="btn btn-secondary cancel-mode-btn">Cancelar</button>
        </div>
        <p class="helper-text">1.º Haz clic en la ficha de tu Reserva Oculta que ofreces (${selTile ? `Ofreces: <strong>${INGREDIENT_LABELS[selTile]}</strong>` : 'Ninguna seleccionada'}). 2.º Elige a qué IA y qué ingrediente pides:</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <select id="tradeTargetAISelect" class="input-select-sm">
            ${matchState.players.slice(1).map(ai => `<option value="${ai.seat}">${ai.name}</option>`).join('')}
          </select>
          <select id="tradeRequestedIngSelect" class="input-select-sm">
            ${Object.entries(INGREDIENT_LABELS).map(([id, label]) => `<option value="${id}">Pedir: ${label}</option>`).join('')}
          </select>
          <button type="button" id="confirmTradeBtn" class="btn btn-primary" ${selTile === null ? 'disabled' : ''}>
            🤝 Proponer Trueque
          </button>
        </div>
      </div>
    `;
  }

  if (uiMode === 'PLAY_CARD') {
    const card = human.hand[uiSelection.handIdx];
    if (!card) return '';
    const needsRivalTarget = ['cata_ciegas', 'contaminacion', 'trasvase', 'inspeccion_sanitaria'].includes(card.id);
    return `
      <div class="action-prompt-panel">
        <div class="flex-between">
          <strong>4. 🃏 Jugar Carta: [${card.name}]</strong>
          <button type="button" class="btn btn-secondary cancel-mode-btn">Cancelar</button>
        </div>
        <p class="helper-text">${card.text}</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          ${needsRivalTarget
            ? `<label class="helper-text">Objetivo:</label>
               <select id="cardTargetSeatSelect" class="input-select-sm">
                 ${matchState.players.slice(1).map(ai => `<option value="${ai.seat}">${ai.name}</option>`).join('')}
               </select>`
            : ''}
          <button type="button" id="confirmPlayCardBtn" class="btn btn-primary">
            ✔ Confirmar y Jugar [${card.name}]
          </button>
        </div>
      </div>
    `;
  }

  return '';
}

function renderGameOverBanner(state) {
  return `
    <div class="game-dedicated-banner" style="border-color:#10b981; background:linear-gradient(135deg, rgba(16,185,129,0.22), rgba(99,102,241,0.16));">
      <div>
        <span class="badge badge-ok">Partida Finalizada — Revisión de Cartas de Bar y Desempate</span>
        <h3 style="font-size:22px; margin-top:4px;">🏆 Ganador: ${state.winner.name}</h3>
        <p class="helper-text">Clasificación final aplicando el triple criterio oficial de desempate (IPAs cerradas > Fichas en reserva > Cartas en mano > Menú de 10 ing. vs 9 ing.):</p>
        <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">
          ${state.ranking.map((p, idx) => `
            <div class="spec-pill">
              <strong>#${idx + 1} ${p.name}</strong> —
              ${countClosedGlasses(p)}/3 IPAs con espuma |
              ${p.reserve.length} fichas en reserva |
              ${p.hand.length} cartas en mano |
              ${p.barCard.name} (${getBarCardTotalIngredients(p.barCard)} ing.: ${p.barCard.recipes.map(r => IPA_RECIPES[r].name).join(' + ')})
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function bindControlEvents() {
  const select = document.getElementById('playtablePlayerCountSelect');
  const restartBtn = document.getElementById('restartPlaytableBtn');
  if (select) {
    select.onchange = () => startNewMatch(Number(select.value));
  }
  if (restartBtn) {
    restartBtn.onclick = () => startNewMatch(matchState ? matchState.numPlayers : 4);
  }
}

function bindDraftEvents() {
  document.querySelectorAll('.draft-option-card').forEach(cardEl => {
    cardEl.onclick = () => {
      selectHumanBarCard(matchState, cardEl.dataset.draftCardId);
      renderPlaytable();
    };
  });
}

function bindGameplayEvents(isMyTurn) {
  const human = matchState.players[0];

  // Botones de decisión de Cierre Inmediato con Coste
  document.querySelectorAll('.immediate-close-pay-btn').forEach(btn => {
    btn.onclick = () => {
      resolveImmediateCloseDecision(matchState, human, Number(btn.dataset.payIdx));
      uiMode = null;
      renderPlaytable();
    };
  });
  const skipBtn = document.getElementById('skipImmediateCloseBtn');
  if (skipBtn) {
    skipBtn.onclick = () => {
      resolveImmediateCloseDecision(matchState, human, null);
      uiMode = null;
      renderPlaytable();
    };
  }

  // Botones de descarte por límite de 5 fichas
  document.querySelectorAll('.excess-discard-btn').forEach(btn => {
    btn.onclick = () => {
      discardExcessTile(matchState, human, Number(btn.dataset.discardIdx));
      renderPlaytable();
    };
  });

  if (!isMyTurn) return;

  // Cancelar modo contextual
  document.querySelectorAll('.cancel-mode-btn').forEach(btn => {
    btn.onclick = () => {
      uiMode = null;
      uiSelection = {};
      renderPlaytable();
    };
  });

  // Iniciar Cambio Rápido 2x1 Gratis
  const freeSwapBtn = document.getElementById('startFreeSwapBtn');
  if (freeSwapBtn) {
    freeSwapBtn.onclick = () => {
      uiMode = 'FREE_SWAP';
      uiSelection = { reserveIndices: [], marketIdx: undefined };
      renderPlaytable();
    };
  }

  // Botones de las Acciones Principales
  const btnHarvest = document.getElementById('btnActionHarvest');
  if (btnHarvest) {
    btnHarvest.onclick = () => {
      uiMode = 'HARVEST';
      uiSelection = { marketIndices: [], pantryCount: 0 };
      renderPlaytable();
    };
  }

  const btnCook = document.getElementById('btnActionCook');
  if (btnCook) {
    btnCook.onclick = () => {
      uiMode = 'COOK';
      uiSelection = { reserveIdx: human.reserve.length > 0 ? 0 : undefined };
      renderPlaytable();
    };
  }

  const btnTrade = document.getElementById('btnActionTrade');
  if (btnTrade) {
    btnTrade.onclick = () => {
      uiMode = 'TRADE';
      uiSelection = { reserveIdx: human.reserve.length > 0 ? 0 : undefined };
      renderPlaytable();
    };
  }

  const btnRefresh = document.getElementById('btnActionRefreshMarket');
  if (btnRefresh) {
    btnRefresh.onclick = () => {
      actionRefreshMarket(matchState, human, 0);
      uiMode = null;
      renderPlaytable();
    };
  }

  // Cerrar IPA Gratis
  document.querySelectorAll('.close-free-btn').forEach(btn => {
    btn.onclick = () => {
      actionCloseIpaFree(matchState, human, Number(btn.dataset.glassIdx));
      uiMode = null;
      renderPlaytable();
    };
  });

  // Iniciar Jugar Carta de Acción Cervecera
  document.querySelectorAll('.play-card-init-btn').forEach(btn => {
    btn.onclick = () => {
      uiMode = 'PLAY_CARD';
      uiSelection = { handIdx: Number(btn.dataset.handIdx) };
      renderPlaytable();
    };
  });

  // Clic en fichas del Mercado de Abastos
  document.querySelectorAll('[data-market-idx]').forEach(chip => {
    chip.onclick = () => {
      const idx = Number(chip.dataset.marketIdx);
      if (uiMode !== 'HARVEST' && uiMode !== 'FREE_SWAP') {
        uiMode = 'HARVEST';
        uiSelection = { marketIndices: [idx], pantryCount: 0 };
        renderPlaytable();
        return;
      }
      if (uiMode === 'HARVEST') {
        const list = uiSelection.marketIndices || [];
        const existing = list.indexOf(idx);
        if (existing !== -1) {
          list.splice(existing, 1);
        } else if (list.length + (uiSelection.pantryCount || 0) < 2) {
          list.push(idx);
        }
        renderPlaytable();
      } else if (uiMode === 'FREE_SWAP') {
        uiSelection.marketIdx = idx;
        renderPlaytable();
      }
    };
  });

  // Clic en fichas de la Reserva Oculta del jugador
  document.querySelectorAll('[data-reserve-idx]').forEach(chip => {
    chip.onclick = () => {
      const idx = Number(chip.dataset.reserveIdx);
      if (!uiMode) {
        uiMode = 'COOK';
        uiSelection = { reserveIdx: idx };
        renderPlaytable();
        return;
      }
      if (uiMode === 'COOK' || uiMode === 'TRADE') {
        uiSelection.reserveIdx = idx;
        renderPlaytable();
      } else if (uiMode === 'FREE_SWAP') {
        const list = uiSelection.reserveIndices || [];
        const pos = list.indexOf(idx);
        if (pos !== -1) list.splice(pos, 1);
        else if (list.length < 2) list.push(idx);
        renderPlaytable();
      }
    };
  });

  // Botones de confirmación dentro de los paneles contextuales
  const addPantryBtn = document.getElementById('addPantryPickBtn');
  if (addPantryBtn) {
    addPantryBtn.onclick = () => {
      const total = (uiSelection.marketIndices || []).length + (uiSelection.pantryCount || 0);
      if (total < 2) {
        uiSelection.pantryCount = (uiSelection.pantryCount || 0) + 1;
        renderPlaytable();
      }
    };
  }

  const confirmHarvestBtn = document.getElementById('confirmHarvestBtn');
  if (confirmHarvestBtn) {
    confirmHarvestBtn.onclick = () => {
      const picks = [
        ...(uiSelection.marketIndices || []).map(i => ({ source: 'market', index: i })),
        ...Array.from({ length: uiSelection.pantryCount || 0 }, () => ({ source: 'pantry' }))
      ];
      actionHarvest(matchState, human, picks);
      uiMode = null;
      renderPlaytable();
    };
  }

  document.querySelectorAll('.confirm-cook-glass-btn').forEach(btn => {
    btn.onclick = () => {
      actionCook(matchState, human, uiSelection.reserveIdx, Number(btn.dataset.glassIdx));
      uiMode = null;
      renderPlaytable();
    };
  });

  const confirmFreeSwapBtn = document.getElementById('confirmFreeSwapBtn');
  if (confirmFreeSwapBtn) {
    confirmFreeSwapBtn.onclick = () => {
      const [r1, r2] = uiSelection.reserveIndices;
      executeFreeMarketSwap(matchState, human, r1, r2, uiSelection.marketIdx);
      uiMode = null;
      renderPlaytable();
    };
  }

  const confirmTradeBtn = document.getElementById('confirmTradeBtn');
  if (confirmTradeBtn) {
    confirmTradeBtn.onclick = () => {
      const targetSeat = Number(document.getElementById('tradeTargetAISelect').value);
      const reqIng = document.getElementById('tradeRequestedIngSelect').value;
      const res = actionTradeWithAI(matchState, human, targetSeat, uiSelection.reserveIdx, reqIng);
      if (!res.rejected) {
        uiMode = null;
      }
      renderPlaytable();
    };
  }

  const confirmPlayCardBtn = document.getElementById('confirmPlayCardBtn');
  if (confirmPlayCardBtn) {
    confirmPlayCardBtn.onclick = () => {
      const targetSelect = document.getElementById('cardTargetSeatSelect');
      const targetSeat = targetSelect ? Number(targetSelect.value) : 1;
      actionPlayBrewmasterCard(matchState, human, uiSelection.handIdx, { targetSeat });
      uiMode = null;
      renderPlaytable();
    };
  }
}
