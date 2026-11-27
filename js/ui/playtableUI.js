/**
 * js/ui/playtableUI.js
 * Mesa visual 3D para jugar "LA TERCERA IPA" en primera persona (POV Jugador) contra 1 a 5 IAs.
 * Renderiza fichas circulares físicas (cara arriba y dorso oscuro), vasos de chupito con cerveza y espuma,
 * cartas físicas ilustradas y un escenario central en vivo donde se ve cada carta y ficha que juegan los rivales.
 */

import { IPA_RECIPES } from '../games/laTerceraIpa.js';
import {
  INGREDIENT_LABELS,
  INGREDIENT_ICONS,
  CARD_ICONS,
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
let aiSpeedMs = 1500; // 1500 (Normal para ver bien las cartas/fichas de la IA) | 800 (Rápido) | 0 (Paso a Paso Manual)

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

/**
 * Renderiza una ficha circular 3D física con icono, color y nombre.
 */
function renderCircularToken(ingId, sizeClass = '', extraClass = '', dataAttr = '') {
  const icon = INGREDIENT_ICONS[ingId] || '🍺';
  const label = INGREDIENT_LABELS[ingId] || ingId;
  return `
    <div class="token-circle ing-${ingId} ${sizeClass} ${extraClass}" ${dataAttr} title="${label}">
      <span class="token-icon">${icon}</span>
      <span class="token-name">${label.split(' ')[0]}</span>
    </div>
  `;
}

function renderPlaytable() {
  const container = document.getElementById('interactivePlaytableRoot');
  if (!container || !matchState) return;

  const activePlayer = getActivePlayer(matchState);
  const human = matchState.players[0];
  const isMyTurn = matchState.phase === 'PLAYING' && activePlayer.isHuman;

  // Barra superior de configuración de partida vs IA y velocidad de animación
  const controlsHtml = `
    <div class="playtable-ControlsBar">
      <div class="controls-left">
        <strong>🎲 Mesa de Juego vs IA:</strong>
        <select id="playtablePlayerCountSelect" class="input-select-sm" style="min-width:165px;">
          ${[2, 3, 4, 5, 6].map(n => `
            <option value="${n}" ${matchState.numPlayers === n ? 'selected' : ''}>
              👥 ${n} Jugadores (Tú + ${n - 1} IA)
            </option>
          `).join('')}
        </select>
        <select id="aiSpeedSelect" class="input-select-sm" style="min-width:175px;">
          <option value="1500" ${aiSpeedMs === 1500 ? 'selected' : ''}>⏱️ Ritmo IA: Normal (1.5s)</option>
          <option value="800" ${aiSpeedMs === 800 ? 'selected' : ''}>⚡ Ritmo IA: Rápido (0.8s)</option>
          <option value="0" ${aiSpeedMs === 0 ? 'selected' : ''}>⏸️ Ritmo IA: Paso a Paso</option>
        </select>
        <button type="button" id="restartPlaytableBtn" class="btn btn-secondary">🔄 Nueva Partida</button>
      </div>
      <div class="controls-right">
        ${(matchState.phase === 'PLAYING' && !activePlayer.isHuman && aiSpeedMs === 0)
          ? `<button type="button" id="stepNextAiBtn" class="btn btn-primary">▶ Ejecutar Turno de ${activePlayer.name}</button>`
          : ''}
        <span class="badge badge-accent">Ronda ${matchState.round}</span>
        ${matchState.finalRoundTriggered
          ? `<span class="badge badge-danger">🔔 ¡ÚLTIMA RONDA! (${matchState.finalRoundTriggeredBy})</span>`
          : ''}
        <span class="badge ${isMyTurn ? 'badge-ok' : 'badge-warn'}">
          Turno: ${matchState.phase === 'DRAFT_BAR_CARD' ? 'Eligiendo Menú' : activePlayer.name}
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

  // Banner si la partida ha terminado
  const gameOverBannerHtml = matchState.phase === 'GAME_OVER'
    ? renderGameOverBanner(matchState)
    : '';

  // Escenario en vivo de la última jugada (muestra visualmente las fichas cogidas o la carta jugada por la IA o por ti)
  const liveStageHtml = renderLiveActionStage(matchState.lastVisualEvent);

  // Zona de Rivales IA con sus fichas físicas boca abajo, sus cartas en abanico y sus 3 vasos 3D
  const aiPlayers = matchState.players.slice(1);
  const aiGridHtml = `
    <div class="ai-opponents-grid">
      ${aiPlayers.map(ai => renderAIOpponentCard(ai, activePlayer.seat === ai.seat, matchState.phase === 'GAME_OVER')).join('')}
    </div>
  `;

  // Centro de la Mesa: Tapete del Mercado de Abastos (5 fichas circulares 3D), Bolsa de la Despensa y Mazo de Cartas
  const topDiscard = matchState.actionDiscard[matchState.actionDiscard.length - 1];
  const centerZoneHtml = `
    <div class="table-center-zone">
      <div class="market-board">
        <div class="flex-between">
          <div>
            <h4 style="font-size:14.5px; font-weight:800;">🛒 Mercado de Abastos (5 Fichas Boca Arriba)</h4>
            <p class="helper-text">Haz clic en cualquier ficha circular para Cosecharla o incluirla en un Cambio Rápido 2×1.</p>
          </div>
          <span class="badge badge-info">${matchState.market.length}/5 Fichas</span>
        </div>
        <div class="market-slots">
          ${matchState.market.map((ing, idx) => {
            const isSelected = (uiMode === 'HARVEST' && (uiSelection.marketIndices || []).includes(idx)) ||
                               (uiMode === 'FREE_SWAP' && uiSelection.marketIdx === idx);
            return `
              <div class="market-slot-ring">
                ${renderCircularToken(ing, '', isSelected ? 'selected' : '', `data-market-idx="${idx}"`)}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="decks-table-board">
        <div class="physical-pantry-bag" id="clickablePantryBag" title="Haz clic para coger 1 ficha a ciegas de la Despensa al Cosechar">
          <div class="bag-icon-3d">🎒</div>
          <strong style="font-size:12px;">Despensa (${matchState.pantry.length})</strong>
          <span class="helper-text" style="font-size:10.5px;">Robar a ciegas</span>
        </div>

        <div class="physical-card-pile">
          <div class="deck-stack-3d">
            <span>🃏</span>
            <strong style="font-size:11px; margin-top:4px;">${matchState.actionDeck.length}</strong>
          </div>
          <span class="helper-text" style="font-size:11px;">Mazo Acción</span>
        </div>

        <div class="physical-card-pile">
          <div class="discard-stack-3d ${topDiscard ? 'has-card' : ''}">
            ${topDiscard
              ? `<span style="font-size:20px;">${CARD_ICONS[topDiscard.id] || '🃏'}</span>
                 <strong style="font-size:9.5px; color:#fde047; line-height:1.1; margin-top:3px;">${topDiscard.name}</strong>`
              : '<span class="helper-text" style="font-size:10px;">Vacío</span>'}
          </div>
          <span class="helper-text" style="font-size:11px;">Descartes (${matchState.actionDiscard.length})</span>
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
        <h3>📜 Registro Completo de Jugadas</h3>
      </div>
      <div class="match-log-viewer" style="max-height:175px;">
        ${matchState.log.map(line => `<div class="log-event">• ${line}</div>`).join('')}
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="playtable-wrapper">
      ${controlsHtml}
      ${gameOverBannerHtml}
      ${liveStageHtml}
      ${aiGridHtml}
      ${centerZoneHtml}
      ${humanZoneHtml}
      ${liveLogHtml}
    </div>
  `;

  bindControlEvents();
  bindGameplayEvents(isMyTurn);

  // Si es el turno de una IA y el ritmo es automático (>0 ms), ejecutar turno tras la pausa
  if (matchState.phase === 'PLAYING' && !activePlayer.isHuman && aiSpeedMs > 0) {
    aiTimer = setTimeout(() => {
      executeAITurn(matchState);
      renderPlaytable();
    }, aiSpeedMs);
  }
}

/**
 * Renderiza el Escenario Central de Jugada en Vivo, mostrando visualmente las fichas o la carta que acaba de usar un jugador.
 */
function renderLiveActionStage(ev) {
  if (!ev) {
    return `
      <div class="live-action-stage">
        <div class="stage-left">
          <div class="stage-actor-avatar">🍺</div>
          <div>
            <strong style="font-size:14.5px;">Mesa Lista — ¡Comienza la elaboración!</strong>
            <p class="helper-text">Aquí verás en grande las fichas y cartas que jueguen tus rivales en cada turno.</p>
          </div>
        </div>
      </div>
    `;
  }

  let visualItemsHtml = '';

  // Si se jugó una Carta de Acción Cervecera, mostrar la carta física ilustrada
  if (ev.card) {
    const cIcon = CARD_ICONS[ev.card.id] || '🃏';
    visualItemsHtml += `
      <div class="physical-action-card card-showcase-sm">
        <div class="pcard-header">
          <span class="pcard-title">${cIcon} ${ev.card.name}</span>
        </div>
        <div class="pcard-desc" style="font-size:10px;">${ev.card.text}</div>
      </div>
    `;
  }

  // Si se movieron, robaron o cocinaron fichas, mostrar las fichas circulares físicas
  if (ev.tiles && ev.tiles.length > 0) {
    visualItemsHtml += ev.tiles.map(t => {
      if (t.visible) {
        return renderCircularToken(t.id);
      }
      return `<div class="token-facedown" style="width:58px; height:58px; font-size:18px;" title="Ficha robada a ciegas de la Despensa">🂠</div>`;
    }).join('');
  }

  return `
    <div class="live-action-stage">
      <div class="stage-left">
        <div class="stage-actor-avatar">${ev.actorSeat === 0 ? '🧑‍🍳' : '🤖'}</div>
        <div>
          <span class="badge badge-accent" style="margin-bottom:3px;">Última Jugada en Mesa (Ronda ${ev.round})</span>
          <h4 style="font-size:15.5px; font-weight:800; color:#f8fafc;">${ev.title}</h4>
          <p class="helper-text" style="color:#cbd5e1; font-size:13px;">${ev.subtitle}</p>
        </div>
      </div>
      <div class="stage-visual-Showcase">
        ${visualItemsHtml}
      </div>
    </div>
  `;
}

function renderDraftBarCardModal(human) {
  return `
    <div class="draft-modal-box">
      <div>
        <span class="badge badge-accent">Preparación — Paso 2 del Reglamento</span>
        <h3 style="font-size:21px; margin-top:6px;">Elige tu Carta de Bar Secreta (Se reparten 2, elige 1)</h3>
        <p class="helper-text" style="margin-top:4px;">
          Tus fichas iniciales en reserva oculta (${human.isFirstPlayer ? '2 fichas por ser el Jugador Inicial ⭐' : '3 fichas'}):
        </p>
        <div style="display:flex; gap:12px; justify-content:center; margin-top:10px;">
          ${human.reserve.map(ing => renderCircularToken(ing)).join('')}
        </div>
      </div>
      <div class="draft-cards-pair">
        ${human.draftPair.map(card => {
          const totalIng = getBarCardTotalIngredients(card);
          return `
            <div class="draft-option-card" data-draft-card-id="${card.id}">
              <div class="flex-between">
                <strong style="font-size:16.5px; color:#fbbf24;">📜 ${card.name}</strong>
                <span class="badge badge-info">${totalIng} ingredientes</span>
              </div>
              <div class="rule-step-list">
                ${card.recipes.map(rId => {
                  const rec = IPA_RECIPES[rId];
                  const ingBadges = Object.entries(rec.ingredients)
                    .map(([k, q]) => `<span class="ing-chip-pill ing-${k}">${INGREDIENT_ICONS[k]} ${q}× ${INGREDIENT_LABELS[k]}</span>`)
                    .join(' ');
                  return `
                    <div class="bar-recipe-item">
                      <strong>🍺 ${rec.name} (${rec.size} ing.)</strong>
                      <div style="display:flex; gap:5px; flex-wrap:wrap; margin-top:4px;">${ingBadges}</div>
                    </div>
                  `;
                }).join('')}
              </div>
              <button type="button" class="btn btn-primary btn-block" style="margin-top:auto;">
                ✔ Elegir ${card.name} en Secreto
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

  // Fichas circulares boca abajo (dorso oscuro) en la reserva de la IA
  const facedownTokensHtml = ai.reserve.length === 0
    ? '<span class="helper-text" style="font-size:10.5px;">0 fichas</span>'
    : ai.reserve.map(() => `<span class="token-facedown" title="Ficha oculta en la reserva de ${ai.name}">●</span>`).join('');

  // Cartas de Acción en mano de la IA (abanico físico)
  const handFanHtml = ai.hand.length === 0
    ? '<span class="helper-text" style="font-size:10.5px;">0 cartas</span>'
    : ai.hand.map(() => `<span class="mini-card-back" title="Carta de Acción Cervecera en mano">🃏</span>`).join('');

  return `
    <div class="ai-player-card ${isActiveTurn ? 'active-turn' : ''}">
      <div class="ai-header">
        <span>🤖 ${ai.name} ${ai.isFirstPlayer ? '⭐(1.º)' : ''}</span>
        <span class="badge ${closedCount >= 2 ? 'badge-warn' : 'badge-accent'}">${closedCount}/3 IPAs</span>
      </div>

      <!-- Inventario Físico Visible del Rival: Carta de Bar boca abajo, Fichas Circulares Ocultas y Cartas en Mano -->
      <div class="ai-physical-inventory">
        <div style="display:flex; align-items:center; gap:6px;" title="Carta de Bar Secreta">
          <div class="mini-bar-card-back">📜</div>
        </div>
        <div class="ai-facedown-tokens" title="Reserva oculta: ${ai.reserve.length}/5 fichas">
          ${facedownTokensHtml}
        </div>
        <div class="ai-hand-fan" title="Cartas de Acción en mano: ${ai.hand.length}">
          ${handFanHtml}
        </div>
      </div>

      ${revealSecretMenu && ai.barCard
        ? `<div class="helper-text" style="color:#fde047;">Menú revelado: <strong>${ai.barCard.name}</strong> (${ai.barCard.recipes.map(r => IPA_RECIPES[r].name).join(' + ')})</div>`
        : ''}

      <!-- Los 3 Vasos de Chupito 3D de la IA con sus fichas circulares dentro -->
      <div class="mini-glasses-row">
        ${ai.glasses.map((g, idx) => {
          const fillLevel = Math.min(3, g.ingredients.length);
          return `
            <div class="mini-glass-3d has-beer-${fillLevel} ${g.closed ? 'closed-foam' : ''}">
              ${g.closed
                ? `<div class="foam-crown-mini">☁️ ESPUMA</div>`
                : `<div class="mini-glass-title"><span>Vaso #${idx + 1}</span></div>`}
              <div style="display:flex; flex-wrap:wrap; gap:3px; justify-content:center; align-items:center; margin:auto 0;">
                ${g.ingredients.length === 0
                  ? '<span class="helper-text" style="font-size:9.5px;">Vacío</span>'
                  : g.ingredients.map(ing => renderCircularToken(ing, 'token-xs')).join('')}
              </div>
            </div>
          `;
        }).join('')}
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
      .map(([k, q]) => `<span class="ing-chip-pill ing-${k}">${INGREDIENT_ICONS[k]} ${q}× ${INGREDIENT_LABELS[k]}</span>`)
      .join(' ');

    return `
      <div class="bar-recipe-item ${isCompleted ? 'recipe-done' : ''}">
        <div class="flex-between">
          <strong>${isCompleted ? '✅' : '🍺'} ${rIdx + 1}. ${rec.name} (${rec.size})</strong>
          ${isCompleted ? '<span class="badge badge-ok">☁️ Servida</span>' : ''}
        </div>
        <div style="display:flex; gap:4px; flex-wrap:wrap;">${ingList}</div>
      </div>
    `;
  }).join('');

  const glassesHtml = human.glasses.map((g, idx) => {
    const matchingRec = checkGlassMatchesPendingRecipe(human, idx);
    const missingOneRec = checkGlassMissingOneIngredient(human, idx);
    const fillLevel = Math.min(4, g.ingredients.length);

    return `
      <div class="shot-glass-3d beer-fill-${fillLevel} ${g.closed ? 'glass-closed' : (matchingRec ? 'glass-ready' : '')}">
        ${g.closed
          ? `<div class="cotton-foam-badge">☁️ ESPUMA (${IPA_RECIPES[g.matchedRecipeId]?.name || 'IPA'})</div>`
          : ''}
        <div class="flex-between">
          <strong>🥃 Vaso #${idx + 1}</strong>
          ${g.closed
            ? `<span class="badge badge-ok">Blindado</span>`
            : (matchingRec
                ? `<span class="badge badge-ok">¡${matchingRec.name} Lista!</span>`
                : `<span class="badge badge-accent">${g.ingredients.length} fichas</span>`)}
        </div>

        <div class="glass-tokens-well">
          ${g.ingredients.length === 0
            ? '<span class="helper-text" style="text-align:center;">Vaso vacío<br/>Haz clic en una ficha de tu reserva para cocinarla aquí</span>'
            : g.ingredients.map(ing => renderCircularToken(ing, 'token-md')).join('')}
        </div>

        <div style="display:flex; flex-direction:column; gap:6px;">
          ${!g.closed && matchingRec && isMyTurn
            ? `<button type="button" class="btn btn-primary btn-block close-free-btn" data-glass-idx="${idx}">
                 ☁️ Cerrar IPA Gratis (Gasta Turno)
               </button>`
            : ''}
          ${!g.closed && missingOneRec
            ? `<div class="helper-text" style="color:#34d399; text-align:center;">⚡ A falta de 1 ing. para ${missingOneRec.name}</div>`
            : ''}
        </div>
      </div>
    `;
  }).join('');

  const promptPanelHtml = renderActionPromptPanel(human, isMyTurn);

  return `
    <div class="human-pov-zone ${isMyTurn ? 'my-turn-glow' : ''}">
      <div class="flex-between">
        <div>
          <span class="badge ${isMyTurn ? 'badge-ok' : 'badge-accent'}">
            ${isMyTurn ? '🟢 ES TU TURNO — Elige 1 Acción Principal o haz clic en fichas/cartas' : '⏳ Observando jugada de la IA...'}
          </span>
          <h3 style="font-size:18px; margin-top:4px;">🧑‍🍳 Tu Puesto de Elaboración ${human.isFirstPlayer ? '(Jugador Inicial ⭐)' : ''}</h3>
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
            <strong style="color:#fbbf24;">📜 ${barCard.name}</strong>
            <span class="badge badge-info">Menú Secreto</span>
          </div>
          ${recipesHtml}
        </div>

        <div class="player-glasses-grid">
          ${glassesHtml}
        </div>
      </div>

      <div class="pov-bottom-grid">
        <div class="reserve-box">
          <div class="flex-between">
            <strong>🂠 Tu Reserva Oculta de Fichas (${human.reserve.length}/5)</strong>
            <span class="helper-text">Haz clic en una ficha para Cocinarla o Comerciar</span>
          </div>
          <div style="display:flex; gap:12px; flex-wrap:wrap; min-height:74px; align-items:center; padding:4px 0;">
            ${human.reserve.length === 0
              ? '<span class="helper-text">Reserva vacía — Coge fichas del Mercado o de la Despensa.</span>'
              : human.reserve.map((ing, idx) => {
                  const isSel = (uiMode === 'COOK' && uiSelection.reserveIdx === idx) ||
                                (uiMode === 'FREE_SWAP' && (uiSelection.reserveIndices || []).includes(idx)) ||
                                (uiMode === 'TRADE' && uiSelection.reserveIdx === idx);
                  return renderCircularToken(ing, '', isSel ? 'selected' : '', `data-reserve-idx="${idx}"`);
                }).join('')}
          </div>
        </div>

        <div class="hand-cards-box">
          <div class="flex-between">
            <strong>🃏 Tu Mano de Cartas de Acción Cervecera (${human.hand.length}/2)</strong>
            <span class="helper-text">Robas 1 al final del turno si tienes &lt;2</span>
          </div>
          <div class="action-cards-list">
            ${human.hand.length === 0
              ? '<span class="helper-text">Sin cartas especiales en mano.</span>'
              : human.hand.map((card, idx) => `
                  <div class="physical-action-card">
                    <div class="pcard-header">
                      <span class="pcard-title">${card.name}</span>
                      <span class="badge badge-accent">Acción</span>
                    </div>
                    <div class="pcard-art">${CARD_ICONS[card.id] || '🃏'}</div>
                    <div class="pcard-desc">${card.text}</div>
                    <button type="button" class="btn btn-primary btn-block play-card-init-btn" data-hand-idx="${idx}" ${!isMyTurn ? 'disabled' : ''}>
                      Jugar Carta
                    </button>
                  </div>
                `).join('')}
          </div>
        </div>
      </div>

      <!-- Barra de Acciones Principales del Turno -->
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
  if (matchState.awaitingImmediateCloseDecision) {
    const info = matchState.awaitingImmediateCloseDecision;
    return `
      <div class="action-prompt-panel" style="border-color:#10b981; background:rgba(16,185,129,0.18);">
        <strong>☁️ ¡Receta ${info.recipe.name} completada en tu Vaso #${info.glassIndex + 1}! ¿Cierre Inmediato con Coste?</strong>
        <p class="helper-text">Elige 1 ficha de tu reserva oculta para descartarla y colocar la ESPUMA ahora mismo, o ahórrate la ficha:</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          ${human.reserve.map((ing, idx) => `
            <button type="button" class="btn btn-primary immediate-close-pay-btn" data-pay-idx="${idx}">
              ☁️ Descartar [${INGREDIENT_ICONS[ing]} ${INGREDIENT_LABELS[ing]}] y Cerrar Ahora
            </button>
          `).join('')}
          <button type="button" id="skipImmediateCloseBtn" class="btn btn-secondary">
            Dejar vaso sin espuma por ahora
          </button>
        </div>
      </div>
    `;
  }

  if (matchState.pendingExcessDiscard) {
    return `
      <div class="action-prompt-panel" style="border-color:#f59e0b; background:rgba(245,158,11,0.18);">
        <strong>⚠️ Límite de 5 Fichas en Reserva: Tienes ${human.reserve.length} fichas. Haz clic en la que quieras descartar:</strong>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          ${human.reserve.map((ing, idx) =>
            renderCircularToken(ing, '', 'excess-discard-btn', `data-discard-idx="${idx}"`)
          ).join('')}
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
          <strong>1. 🌾 Cosechar: Selecciona 2 fichas (${totalPicked}/2 elegidas)</strong>
          <button type="button" class="btn btn-secondary cancel-mode-btn">Cancelar</button>
        </div>
        <p class="helper-text">Haz clic en las fichas del <strong>Mercado de Abastos</strong> o en la <strong>Bolsa de la Despensa</strong>:</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" id="addPantryPickBtn" class="btn btn-secondary" ${totalPicked >= 2 ? 'disabled' : ''}>
            🎒 +1 Ficha a ciegas de la Despensa (${pCount} elegidas)
          </button>
          <button type="button" id="confirmHarvestBtn" class="btn btn-primary" ${totalPicked !== 2 ? 'disabled' : ''}>
            ✔ Confirmar Cosecha
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
          <strong>2. 🍺 Cocinar: ${selTile ? `Ficha seleccionada: [${INGREDIENT_ICONS[selTile]} ${INGREDIENT_LABELS[selTile]}]` : 'Selecciona 1 ficha de tu Reserva'}</strong>
          <button type="button" class="btn btn-secondary cancel-mode-btn">Cancelar</button>
        </div>
        ${selTile !== null
          ? `<div style="display:flex; gap:10px; flex-wrap:wrap;">
               ${human.glasses.map((g, gIdx) => `
                 <button type="button" class="btn btn-primary confirm-cook-glass-btn" data-glass-idx="${gIdx}" ${g.closed ? 'disabled' : ''}>
                   🥃 Echar en Vaso #${gIdx + 1} (${g.ingredients.length} fichas)
                 </button>
               `).join('')}
             </div>`
          : ''}
      </div>
    `;
  }

  if (uiMode === 'FREE_SWAP') {
    const rList = uiSelection.reserveIndices || [];
    const mIdx = uiSelection.marketIdx;
    return `
      <div class="action-prompt-panel">
        <div class="flex-between">
          <strong>🔄 Cambio Rápido 2×1 Gratis: Selecciona 2 fichas de tu Reserva (${rList.length}/2) y 1 del Mercado (${mIdx !== undefined ? '1/1' : '0/1'})</strong>
          <button type="button" class="btn btn-secondary cancel-mode-btn">Cancelar</button>
        </div>
        <button type="button" id="confirmFreeSwapBtn" class="btn btn-primary" ${(rList.length !== 2 || mIdx === undefined) ? 'disabled' : ''}>
          ✔ Confirmar Cambio 2×1 Gratis
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
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <span class="helper-text">Ofreces: <strong>${selTile ? INGREDIENT_LABELS[selTile] : 'Haz clic en 1 ficha tuya'}</strong></span>
          <select id="tradeTargetAISelect" class="input-select-sm">
            ${matchState.players.slice(1).map(ai => `<option value="${ai.seat}">${ai.name}</option>`).join('')}
          </select>
          <select id="tradeRequestedIngSelect" class="input-select-sm">
            ${Object.entries(INGREDIENT_LABELS).map(([id, label]) => `<option value="${id}">Pides: ${INGREDIENT_ICONS[id]} ${label}</option>`).join('')}
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
          <strong>4. 🃏 Jugar Carta: [${CARD_ICONS[card.id] || '🃏'} ${card.name}]</strong>
          <button type="button" class="btn btn-secondary cancel-mode-btn">Cancelar</button>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          ${needsRivalTarget
            ? `<label class="helper-text">Contra el rival:</label>
               <select id="cardTargetSeatSelect" class="input-select-sm">
                 ${matchState.players.slice(1).map(ai => `<option value="${ai.seat}">${ai.name}</option>`).join('')}
               </select>`
            : ''}
          <button type="button" id="confirmPlayCardBtn" class="btn btn-primary">
            ✔ Jugar [${card.name}]
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
        <span class="badge badge-ok">Partida Finalizada — Cartas de Bar Reveladas y Triple Desempate</span>
        <h3 style="font-size:22px; margin-top:4px;">🏆 Ganador: ${state.winner.name}</h3>
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
  const speedSelect = document.getElementById('aiSpeedSelect');
  const restartBtn = document.getElementById('restartPlaytableBtn');
  const stepAiBtn = document.getElementById('stepNextAiBtn');

  if (select) {
    select.onchange = () => startNewMatch(Number(select.value));
  }
  if (speedSelect) {
    speedSelect.onchange = () => {
      aiSpeedMs = Number(speedSelect.value);
      if (aiTimer) clearTimeout(aiTimer);
      renderPlaytable();
    };
  }
  if (restartBtn) {
    restartBtn.onclick = () => startNewMatch(matchState ? matchState.numPlayers : 4);
  }
  if (stepAiBtn) {
    stepAiBtn.onclick = () => {
      executeAITurn(matchState);
      renderPlaytable();
    };
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

  document.querySelectorAll('.excess-discard-btn').forEach(btn => {
    btn.onclick = () => {
      discardExcessTile(matchState, human, Number(btn.dataset.discardIdx));
      renderPlaytable();
    };
  });

  if (!isMyTurn) return;

  document.querySelectorAll('.cancel-mode-btn').forEach(btn => {
    btn.onclick = () => {
      uiMode = null;
      uiSelection = {};
      renderPlaytable();
    };
  });

  const freeSwapBtn = document.getElementById('startFreeSwapBtn');
  if (freeSwapBtn) {
    freeSwapBtn.onclick = () => {
      uiMode = 'FREE_SWAP';
      uiSelection = { reserveIndices: [], marketIdx: undefined };
      renderPlaytable();
    };
  }

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

  document.querySelectorAll('.close-free-btn').forEach(btn => {
    btn.onclick = () => {
      actionCloseIpaFree(matchState, human, Number(btn.dataset.glassIdx));
      uiMode = null;
      renderPlaytable();
    };
  });

  document.querySelectorAll('.play-card-init-btn').forEach(btn => {
    btn.onclick = () => {
      uiMode = 'PLAY_CARD';
      uiSelection = { handIdx: Number(btn.dataset.handIdx) };
      renderPlaytable();
    };
  });

  // Clic directo en la Bolsa de la Despensa
  const pantryBag = document.getElementById('clickablePantryBag');
  if (pantryBag) {
    pantryBag.onclick = () => {
      if (uiMode !== 'HARVEST') {
        uiMode = 'HARVEST';
        uiSelection = { marketIndices: [], pantryCount: 1 };
        renderPlaytable();
        return;
      }
      const total = (uiSelection.marketIndices || []).length + (uiSelection.pantryCount || 0);
      if (total < 2) {
        uiSelection.pantryCount = (uiSelection.pantryCount || 0) + 1;
        renderPlaytable();
      }
    };
  }

  // Clic en fichas circulares del Mercado de Abastos
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

  // Clic en fichas circulares de tu Reserva Oculta
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
