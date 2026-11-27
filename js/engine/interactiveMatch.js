/**
 * js/engine/interactiveMatch.js
 * Motor interactivo paso a paso para jugar "LA TERCERA IPA" desde el POV de un jugador humano
 * contra 1 a 5 rivales controlados por IA (partidas de 2 a 6 jugadores).
 * Cumple 100% con el Reglamento Oficial Definitivo:
 * - Draft inicial: repartir 2 Cartas de Bar (de las 18) a cada jugador y elegir 1 en secreto.
 * - Jugador Inicial empieza con 2 fichas ocultas; el resto empieza con 3 fichas ocultas.
 * - 84 fichas en la Despensa, 5 visibles en el Mercado de Abastos.
 * - 24 Cartas de Acción Cervecera (2 en mano inicial).
 * - Cambio rápido gratuito 2x1 en el Mercado (1 vez por turno, antes o después de tu acción principal).
 * - 6 Acciones principales: Cosechar (2), Cocinar (1 + cierre inmediato con coste de 1 ficha o Agua Pura),
 *   Comerciar (Trueque 1-2 fichas), Jugar Carta de Acción Cervecera, Renovar el Mercado (5 nuevas + roba 1),
 *   Cerrar IPA (gratis gastando la acción principal).
 * - Última ronda igualada hasta el último jugador y triple desempate.
 */

import {
  INGREDIENT_DECK_SPEC,
  IPA_RECIPES,
  BAR_CARDS,
  BREWMASTER_DECK_SPEC
} from '../games/laTerceraIpa.js';

const AI_NAMES = [
  'IA Lupulina (Agresiva)',
  'IA Malta Dorada (Táctica)',
  'IA Maestro Lúpulo (Velocista)',
  'IA Barrica Oscura (Saboteadora)',
  'IA Hazy Queen (Negociadora)'
];

export const INGREDIENT_LABELS = {
  lupulo: 'Lúpulo',
  malta: 'Malta',
  levadura: 'Levadura',
  fruta_tropical: 'Fruta Tropical',
  lactosa: 'Lactosa',
  cafe_cacao: 'Café y Cacao',
  pino_resina: 'Pino / Resina',
  agua_pura: 'Agua Pura'
};

/**
 * Crea un estado de partida nuevo para N jugadores (1 Humano + N-1 IAs).
 */
export function createInteractiveMatch(numPlayers = 4) {
  // 1. Construir y barajar la Despensa Principal (84 fichas)
  const pantry = [];
  for (const spec of INGREDIENT_DECK_SPEC) {
    for (let i = 0; i < spec.count; i++) {
      pantry.push(spec.id);
    }
  }
  shuffleArray(pantry);

  // 2. Construir y barajar el mazo de 24 Cartas de Acción Cervecera
  const actionDeck = [];
  for (const spec of BREWMASTER_DECK_SPEC) {
    for (let i = 0; i < spec.count; i++) {
      actionDeck.push({
        id: spec.id,
        name: spec.name,
        text: spec.text
      });
    }
  }
  shuffleArray(actionDeck);

  // 3. Barajar las 18 Cartas de Bar para repartir 2 a cada jugador
  const barDeck = [...BAR_CARDS];
  shuffleArray(barDeck);

  // 4. Revelar 5 fichas en el Mercado de Abastos
  const market = [];
  for (let i = 0; i < 5; i++) {
    market.push(pantry.pop());
  }

  // 5. Determinar aleatoriamente quién es el Jugador Inicial (o sorteo por ficha más escasa)
  const startingSeat = Math.floor(Math.random() * numPlayers);

  // 6. Crear jugadores (Asiento 0 es el Jugador Humano, pero el orden de turno empieza en startingSeat)
  const players = [];
  for (let s = 0; s < numPlayers; s++) {
    const isHuman = s === 0;
    const isFirstPlayer = s === startingSeat;
    const initialTileCount = isFirstPlayer ? 2 : 3;

    const reserve = [];
    for (let t = 0; t < initialTileCount; t++) {
      reserve.push(pantry.pop());
    }

    const hand = [actionDeck.pop(), actionDeck.pop()];
    const draftPair = [barDeck.pop(), barDeck.pop()];

    // Las IAs eligen inmediatamente entre sus 2 cartas de Bar (prefiriendo la que mejor encaje con su mano inicial)
    let chosenBarCard = null;
    if (!isHuman) {
      chosenBarCard = pickBestBarCardForAI(draftPair, reserve);
    }

    players.push({
      seat: s,
      isHuman,
      isFirstPlayer,
      name: isHuman ? 'Tú (Maestro Cervecero)' : AI_NAMES[(s - 1) % AI_NAMES.length],
      draftPair,
      barCard: chosenBarCard,
      reserve,
      hand,
      glasses: [
        { id: 0, ingredients: [], closed: false, matchedRecipeId: null },
        { id: 1, ingredients: [], closed: false, matchedRecipeId: null },
        { id: 2, ingredients: [], closed: false, matchedRecipeId: null }
      ]
    });
  }

  const state = {
    numPlayers,
    round: 1,
    startingSeat,
    currentTurnIndex: 0, // Índice de 0 a numPlayers-1 relativo a startingSeat
    phase: 'DRAFT_BAR_CARD', // 'DRAFT_BAR_CARD' | 'PLAYING' | 'GAME_OVER'
    finalRoundTriggered: false,
    finalRoundTriggeredBy: null,
    usedFreeMarketSwap: false,
    pendingExcessDiscard: false,
    pantry,
    market,
    actionDeck,
    actionDiscard: [],
    players,
    winner: null,
    ranking: [],
    log: [
      `🍺 ¡Partida de ${numPlayers} jugadores preparada! Jugador Inicial: ${players[startingSeat].name} (empieza con 2 fichas ocultas; el resto con 3 fichas).`,
      `📋 Elige 1 de tus 2 Cartas de Bar secretas para comenzar.`
    ]
  };

  return state;
}

export function getActivePlayer(state) {
  const seat = (state.startingSeat + state.currentTurnIndex) % state.numPlayers;
  return state.players[seat];
}

/**
 * El jugador humano elige 1 de sus 2 Cartas de Bar en el Draft inicial.
 */
export function selectHumanBarCard(state, chosenCardId) {
  const human = state.players[0];
  const picked = human.draftPair.find(c => c.id === Number(chosenCardId)) || human.draftPair[0];
  human.barCard = picked;
  state.phase = 'PLAYING';
  addLog(state, `🔒 Has elegido en secreto la ${picked.name}: ${picked.recipes.map(r => IPA_RECIPES[r].name).join(' + ')}.`);
  return state;
}

/**
 * Verifica qué recetas de la Carta de Bar de un jugador ya están cubiertas por sus vasos cerrados
 * y si un vaso abierto concreto coincide exactamente con alguna de las recetas pendientes.
 */
export function checkGlassMatchesPendingRecipe(player, glassIndex) {
  if (!player.barCard) return null;
  const glass = player.glasses[glassIndex];
  if (glass.closed || glass.ingredients.length < 3) return null;

  // Contar qué recetas del menú ya están asignadas a vasos cerrados
  const remainingRecipes = [...player.barCard.recipes];
  for (const g of player.glasses) {
    if (g.closed && g.matchedRecipeId) {
      const idx = remainingRecipes.indexOf(g.matchedRecipeId);
      if (idx !== -1) remainingRecipes.splice(idx, 1);
    }
  }

  for (const rId of remainingRecipes) {
    const rec = IPA_RECIPES[rId];
    if (doesGlassMatchRecipeExact(glass.ingredients, rec.ingredients)) {
      return rec;
    }
  }
  return null;
}

/**
 * Verifica si a un vaso abierto le falta exactamente 1 ingrediente para completar una receta pendiente (para Fermentación Acelerada).
 */
export function checkGlassMissingOneIngredient(player, glassIndex) {
  if (!player.barCard) return null;
  const glass = player.glasses[glassIndex];
  if (glass.closed || glass.ingredients.length < 2) return null;

  const remainingRecipes = [...player.barCard.recipes];
  for (const g of player.glasses) {
    if (g.closed && g.matchedRecipeId) {
      const idx = remainingRecipes.indexOf(g.matchedRecipeId);
      if (idx !== -1) remainingRecipes.splice(idx, 1);
    }
  }

  for (const rId of remainingRecipes) {
    const rec = IPA_RECIPES[rId];
    if (glass.ingredients.length === rec.size - 1 && isSubsetOfRecipe(glass.ingredients, rec.ingredients)) {
      return rec;
    }
  }
  return null;
}

export function doesGlassMatchRecipeExact(glassIngs, recipeMap) {
  const counts = {};
  for (const ing of glassIngs) {
    counts[ing] = (counts[ing] || 0) + 1;
  }
  const recKeys = Object.keys(recipeMap);
  if (Object.keys(counts).length !== recKeys.length) return false;
  for (const k of recKeys) {
    if (counts[k] !== recipeMap[k]) return false;
  }
  return true;
}

export function isSubsetOfRecipe(glassIngs, recipeMap) {
  const counts = {};
  for (const ing of glassIngs) {
    counts[ing] = (counts[ing] || 0) + 1;
    if (!recipeMap[ing] || counts[ing] > recipeMap[ing]) return false;
  }
  return true;
}

/**
 * Calcula qué ingredientes necesita todavía un jugador para sus vasos abiertos.
 */
export function getNeededIngredientsForPlayer(player) {
  if (!player.barCard) return {};
  const remainingRecipes = [...player.barCard.recipes];
  for (const g of player.glasses) {
    if (g.closed && g.matchedRecipeId) {
      const idx = remainingRecipes.indexOf(g.matchedRecipeId);
      if (idx !== -1) remainingRecipes.splice(idx, 1);
    }
  }

  const totalNeeded = {};
  for (const rId of remainingRecipes) {
    const rec = IPA_RECIPES[rId];
    for (const [ing, qty] of Object.entries(rec.ingredients)) {
      totalNeeded[ing] = (totalNeeded[ing] || 0) + qty;
    }
  }

  // Restar los ingredientes válidos que ya están en vasos abiertos
  for (const g of player.glasses) {
    if (!g.closed) {
      for (const ing of g.ingredients) {
        if (totalNeeded[ing] > 0) {
          totalNeeded[ing]--;
        }
      }
    }
  }
  return totalNeeded;
}

/**
 * Acción Gratuita de Turno: Cambio rápido 2x1 en el Mercado (devuelve 2 fichas de tu reserva a la Despensa y toma 1 del Mercado).
 */
export function executeFreeMarketSwap(state, player, reserveIdx1, reserveIdx2, marketIdx) {
  if (state.usedFreeMarketSwap) return { ok: false, msg: 'Ya usaste el cambio rápido 2×1 gratuito en este turno.' };
  if (reserveIdx1 === reserveIdx2) return { ok: false, msg: 'Elige 2 fichas distintas de tu reserva.' };
  if (player.reserve.length < 2) return { ok: false, msg: 'Necesitas al menos 2 fichas en tu reserva oculta.' };

  const indices = [reserveIdx1, reserveIdx2].sort((a, b) => b - a);
  const ret1 = player.reserve.splice(indices[0], 1)[0];
  const ret2 = player.reserve.splice(indices[1], 1)[0];
  state.pantry.unshift(ret1, ret2);
  shuffleArray(state.pantry);

  const taken = state.market.splice(marketIdx, 1)[0];
  player.reserve.push(taken);
  replenishMarket(state);

  state.usedFreeMarketSwap = true;
  addLog(state, `🔄 [Cambio Rápido 2×1 Gratis] ${player.name} devuelve 2 fichas a la Despensa y toma [${INGREDIENT_LABELS[taken]}] del Mercado.`);
  return { ok: true };
}

/**
 * ACCIÓN 1: Cosechar (2 fichas: Mercado y/o Despensa).
 */
export function actionHarvest(state, player, picks) {
  // picks es un array de 2 elementos: { source: 'market', index: i } o { source: 'pantry' }
  const drawnNames = [];
  // Procesar primero mercado de mayor a menor índice para no desplazar
  const marketPicks = picks
    .filter(p => p.source === 'market')
    .map(p => p.index)
    .sort((a, b) => b - a);

  for (const mIdx of marketPicks) {
    if (state.market[mIdx]) {
      const tile = state.market.splice(mIdx, 1)[0];
      player.reserve.push(tile);
      drawnNames.push(`${INGREDIENT_LABELS[tile]} (Mercado)`);
    }
  }

  const pantryCount = picks.filter(p => p.source === 'pantry').length;
  for (let i = 0; i < pantryCount; i++) {
    if (state.pantry.length > 0) {
      const tile = state.pantry.pop();
      player.reserve.push(tile);
      drawnNames.push(player.isHuman ? `${INGREDIENT_LABELS[tile]} (Despensa)` : '1 a ciegas (Despensa)');
    }
  }

  replenishMarket(state);
  addLog(state, `🌾 [Cosechar] ${player.name} coge: ${drawnNames.join(' y ')}.`);
  return finishPlayerAction(state, player);
}

/**
 * ACCIÓN 2: Cocinar (Colocar 1 ficha en un vaso abierto, o limpiar con Agua Pura).
 */
export function actionCook(state, player, reserveIndex, glassIndex, cleanTargetIngIndex = null) {
  const glass = player.glasses[glassIndex];
  if (!glass || glass.closed) return { ok: false, msg: 'Ese vaso ya está cerrado con espuma.' };

  const tile = player.reserve[reserveIndex];
  if (!tile) return { ok: false, msg: 'Ficha no encontrada en tu reserva.' };

  // Regla del Agua Pura: Limpiar 1 ingrediente del vaso
  if (tile === 'agua_pura') {
    if (glass.ingredients.length === 0) {
      return { ok: false, msg: 'El vaso está vacío; no hay ningún ingrediente que limpiar con Agua Pura.' };
    }
    player.reserve.splice(reserveIndex, 1);
    const removeIdx = cleanTargetIngIndex !== null ? cleanTargetIngIndex : glass.ingredients.length - 1;
    const removed = glass.ingredients.splice(removeIdx, 1)[0];
    state.pantry.unshift('agua_pura', removed);
    shuffleArray(state.pantry);
    addLog(state, `💧 [Cocinar - Agua Pura] ${player.name} limpia [${INGREDIENT_LABELS[removed]}] de su Vaso #${glassIndex + 1}.`);
    return finishPlayerAction(state, player);
  }

  // Colocar 1 ingrediente normal boca arriba en el vaso
  player.reserve.splice(reserveIndex, 1);
  glass.ingredients.push(tile);
  addLog(state, `🍺 [Cocinar] ${player.name} añade [${INGREDIENT_LABELS[tile]}] a su Vaso #${glassIndex + 1}.`);

  // Comprobar si acaba de completar una receta de su Carta de Bar
  const matchedRec = checkGlassMatchesPendingRecipe(player, glassIndex);
  if (matchedRec && player.isHuman && player.reserve.length >= 1) {
    // Permitir al jugador humano elegir si quiere Cierre Inmediato con Coste (descartar 1 ficha de su reserva)
    state.awaitingImmediateCloseDecision = {
      glassIndex,
      recipe: matchedRec
    };
    return { ok: true, awaitingImmediateClose: true };
  }

  return finishPlayerAction(state, player);
}

/**
 * Resolución de la decisión de Cierre Inmediato con Coste (descartar 1 ficha de la reserva tras cocinar el último ingrediente).
 */
export function resolveImmediateCloseDecision(state, player, discardReserveIndex = null) {
  const info = state.awaitingImmediateCloseDecision;
  state.awaitingImmediateCloseDecision = null;

  if (info && discardReserveIndex !== null && player.reserve[discardReserveIndex]) {
    const discarded = player.reserve.splice(discardReserveIndex, 1)[0];
    state.pantry.unshift(discarded);
    shuffleArray(state.pantry);

    const glass = player.glasses[info.glassIndex];
    glass.closed = true;
    glass.matchedRecipeId = info.recipe.id;
    addLog(state, `☁️ [Cierre Inmediato con Coste] ${player.name} descarta 1 ficha de su reserva y corona con ESPUMA su Vaso #${info.glassIndex + 1} (${info.recipe.name})!`);
    checkThirdIpaTrigger(state, player);
  }

  return finishPlayerAction(state, player);
}

/**
 * ACCIÓN 3: Comerciar (Trueque libre de 1 ficha con un rival IA).
 */
export function actionTradeWithAI(state, player, targetSeat, myReserveIndex, requestedIngredientId) {
  const partner = state.players[targetSeat];
  const myTile = player.reserve[myReserveIndex];
  if (!partner || !myTile) return { ok: false, msg: 'Datos de trueque no válidos.' };

  const partnerTileIdx = partner.reserve.indexOf(requestedIngredientId);
  const partnerNeeds = getNeededIngredientsForPlayer(partner);

  // La IA acepta si tiene la ficha que le pides, no la necesita urgentemente para sí misma, y sí necesita la que tú le ofreces
  const aiHasTile = partnerTileIdx !== -1;
  const aiWantsOffered = (partnerNeeds[myTile] || 0) > 0;
  const aiCanSpareRequested = (partnerNeeds[requestedIngredientId] || 0) === 0 || partner.reserve.filter(x => x === requestedIngredientId).length > 1;

  if (aiHasTile && (aiWantsOffered || aiCanSpareRequested)) {
    player.reserve.splice(myReserveIndex, 1);
    const received = partner.reserve.splice(partnerTileIdx, 1)[0];
    player.reserve.push(received);
    partner.reserve.push(myTile);
    addLog(state, `🤝 [Comerciar] ¡${partner.name} acepta tu trueque! Entregas [${INGREDIENT_LABELS[myTile]}] y recibes [${INGREDIENT_LABELS[received]}].`);
    return finishPlayerAction(state, player);
  } else {
    addLog(state, `💬 [Comerciar] ${partner.name} rechaza el trueque (no tiene [${INGREDIENT_LABELS[requestedIngredientId]}] disponible para cambiar por [${INGREDIENT_LABELS[myTile]}]). Puedes elegir otra acción.`);
    return { ok: false, rejected: true, msg: `${partner.name} ha rechazado el trato. ¡Elige otra acción para tu turno!` };
  }
}

/**
 * ACCIÓN 4: Jugar una Carta de Acción Cervecera.
 */
export function actionPlayBrewmasterCard(state, player, handIndex, params = {}) {
  const card = player.hand[handIndex];
  if (!card) return { ok: false, msg: 'Carta no disponible.' };

  player.hand.splice(handIndex, 1);
  state.actionDiscard.push(card);

  const targetPlayer = params.targetSeat !== undefined ? state.players[params.targetSeat] : null;

  // Comprobar si el rival afectado se defiende con "Maestro Cervecero" o Escudo de "Agua Pura"
  if (targetPlayer && targetPlayer.seat !== player.seat && ['contaminacion', 'trasvase', 'cata_ciegas', 'inspeccion_sanitaria'].includes(card.id)) {
    const mcIdx = targetPlayer.hand.findIndex(c => c.id === 'maestro_cervecero');
    const aguaIdx = ['contaminacion', 'trasvase'].includes(card.id)
      ? targetPlayer.reserve.indexOf('agua_pura')
      : -1;

    if (aguaIdx !== -1) {
      targetPlayer.reserve.splice(aguaIdx, 1);
      state.pantry.unshift('agua_pura');
      addLog(state, `🛡️ ¡${targetPlayer.name} descarta [Agua Pura] desde su reserva como ESCUDO y anula [${card.name}] de ${player.name}!`);
      replenishHandAtEnd(state, player);
      return finishPlayerAction(state, player);
    } else if (mcIdx !== -1) {
      const counter = targetPlayer.hand.splice(mcIdx, 1)[0];
      state.actionDiscard.push(counter);
      addLog(state, `👑 ¡${targetPlayer.name} juega [Maestro Cervecero] fuera de turno y ANULA [${card.name}] de ${player.name}!`);
      replenishHandAtEnd(state, player);
      return finishPlayerAction(state, player);
    }
  }

  switch (card.id) {
    case 'cata_ciegas': {
      if (targetPlayer && targetPlayer.reserve.length > 0) {
        const randIdx = Math.floor(Math.random() * targetPlayer.reserve.length);
        const stolen = targetPlayer.reserve.splice(randIdx, 1)[0];
        player.reserve.push(stolen);
        addLog(state, `🕵️ [Cata a Ciegas] ${player.name} roba 1 ficha al azar de la reserva de ${targetPlayer.name}${player.isHuman ? ` ([${INGREDIENT_LABELS[stolen]}])` : ''}.`);
      }
      break;
    }
    case 'contaminacion': {
      const tP = targetPlayer || state.players.find(p => p.seat !== player.seat);
      const gIdx = params.glassIndex ?? tP.glasses.findIndex(g => !g.closed && g.ingredients.length > 0);
      if (tP && gIdx !== -1 && tP.glasses[gIdx] && !tP.glasses[gIdx].closed && tP.glasses[gIdx].ingredients.length > 0) {
        const removed = tP.glasses[gIdx].ingredients.pop();
        state.pantry.unshift(removed);
        shuffleArray(state.pantry);
        addLog(state, `☣️ [Contaminación] ${player.name} elimina [${INGREDIENT_LABELS[removed]}] del Vaso #${gIdx + 1} de ${tP.name}.`);
      }
      break;
    }
    case 'trasvase': {
      const fromP = targetPlayer || state.players.find(p => p.seat !== player.seat);
      const fromGIdx = params.fromGlassIndex ?? fromP.glasses.findIndex(g => !g.closed && g.ingredients.length > 0);
      const toP = params.toSeat !== undefined ? state.players[params.toSeat] : player;
      const toGIdx = params.toGlassIndex ?? toP.glasses.findIndex(g => !g.closed);

      if (fromP && fromGIdx !== -1 && toP && toGIdx !== -1 && !fromP.glasses[fromGIdx].closed && !toP.glasses[toGIdx].closed && fromP.glasses[fromGIdx].ingredients.length > 0) {
        const moved = fromP.glasses[fromGIdx].ingredients.pop();
        toP.glasses[toGIdx].ingredients.push(moved);
        addLog(state, `🔄 [Trasvase] ${player.name} mueve [${INGREDIENT_LABELS[moved]}] del Vaso #${fromGIdx + 1} de ${fromP.name} al Vaso #${toGIdx + 1} de ${toP.name}.`);
      }
      break;
    }
    case 'dry_hopping': {
      let added = 0;
      for (let i = 0; i < 2; i++) {
        const lupIdx = player.reserve.indexOf('lupulo');
        if (lupIdx !== -1) {
          const targetG = player.glasses.find(g => !g.closed && g.ingredients.length < 4) || player.glasses.find(g => !g.closed);
          if (targetG) {
            player.reserve.splice(lupIdx, 1);
            targetG.ingredients.push('lupulo');
            added++;
          }
        }
      }
      addLog(state, `🌿 [Dry Hopping Extra] ${player.name} añade ${added} ficha(s) de Lúpulo a sus vasos abiertos.`);
      break;
    }
    case 'inspeccion_sanitaria': {
      if (targetPlayer && targetPlayer.reserve.length > 0) {
        const discarded = targetPlayer.reserve.pop();
        state.pantry.unshift(discarded);
        shuffleArray(state.pantry);
        addLog(state, `🔍 [Inspección Sanitaria] ${player.name} inspecciona la reserva de ${targetPlayer.name} y le descarta [${INGREDIENT_LABELS[discarded]}].`);
      }
      break;
    }
    case 'fermentacion_acelerada': {
      let closedAny = false;
      for (let gIdx = 0; gIdx < 3; gIdx++) {
        const rec = checkGlassMissingOneIngredient(player, gIdx) || checkGlassMatchesPendingRecipe(player, gIdx);
        if (rec) {
          player.glasses[gIdx].closed = true;
          player.glasses[gIdx].matchedRecipeId = rec.id;
          closedAny = true;
          addLog(state, `⚡ [Fermentación Acelerada] ¡${player.name} cierra con ESPUMA su Vaso #${gIdx + 1} (${rec.name}) ahorrando 1 ingrediente!`);
          checkThirdIpaTrigger(state, player);
          break;
        }
      }
      if (!closedAny) {
        addLog(state, `⚡ [Fermentación Acelerada] ${player.name} la juega pero ningún vaso estaba a falta de 1 ingrediente.`);
      }
      break;
    }
    case 'maestro_cervecero': {
      // Acción gratuita extra en su turno: roba 2 fichas de la Despensa
      for (let i = 0; i < 2; i++) {
        if (state.pantry.length > 0 && player.reserve.length < 5) {
          player.reserve.push(state.pantry.pop());
        }
      }
      addLog(state, `👑 [Maestro Cervecero] ${player.name} realiza una acción gratuita extra en su turno.`);
      break;
    }
    case 'resaca': {
      for (const p of state.players) {
        if (p.seat !== player.seat) {
          state.actionDiscard.push(...p.hand);
          p.hand = [];
        }
      }
      state.actionDeck.push(...state.actionDiscard);
      state.actionDiscard = [];
      shuffleArray(state.actionDeck);
      for (const p of state.players) {
        if (p.seat !== player.seat) {
          if (state.actionDeck.length > 0) p.hand.push(state.actionDeck.pop());
          if (state.actionDeck.length > 0) p.hand.push(state.actionDeck.pop());
        }
      }
      addLog(state, `🤕 [¡RESACA!] ${player.name} obliga a todos los rivales a descartar sus Cartas de Acción y robar 2 nuevas.`);
      break;
    }
  }

  replenishHandAtEnd(state, player);
  return finishPlayerAction(state, player);
}

/**
 * ACCIÓN 5: Renovar el Mercado (Descarta las 5 del Mercado, saca 5 nuevas y roba 1 de ellas).
 */
export function actionRefreshMarket(state, player, chosenNewMarketIndex = 0) {
  state.pantry.unshift(...state.market);
  state.market = [];
  shuffleArray(state.pantry);
  replenishMarket(state);

  const pickIdx = Math.min(chosenNewMarketIndex, state.market.length - 1);
  const taken = state.market.splice(pickIdx, 1)[0];
  if (taken) {
    player.reserve.push(taken);
  }
  replenishMarket(state);

  addLog(state, `♻️ [Renovar el Mercado] ${player.name} renueva las 5 fichas del Mercado y toma [${INGREDIENT_LABELS[taken]}].`);
  return finishPlayerAction(state, player);
}

/**
 * ACCIÓN 6: Cerrar IPA sin coste (Gasta la acción principal del turno para poner espuma gratis).
 */
export function actionCloseIpaFree(state, player, glassIndex) {
  const rec = checkGlassMatchesPendingRecipe(player, glassIndex);
  if (!rec) {
    return { ok: false, msg: 'Ese vaso aún no tiene los ingredientes exactos de una receta pendiente de tu Carta de Bar.' };
  }
  const glass = player.glasses[glassIndex];
  glass.closed = true;
  glass.matchedRecipeId = rec.id;

  addLog(state, `☁️ [Cerrar IPA Gratis] ¡${player.name} coloca la ESPUMA en su Vaso #${glassIndex + 1} (${rec.name})!`);
  checkThirdIpaTrigger(state, player);
  return finishPlayerAction(state, player);
}

/**
 * Descarta el exceso de fichas (>5) al final del turno del jugador humano.
 */
export function discardExcessTile(state, player, reserveIndex) {
  const removed = player.reserve.splice(reserveIndex, 1)[0];
  if (removed) {
    state.pantry.unshift(removed);
    shuffleArray(state.pantry);
    addLog(state, `🗑️ ${player.name} descarta [${INGREDIENT_LABELS[removed]}] por límite de 5 fichas en reserva.`);
  }
  if (player.reserve.length <= 5) {
    state.pendingExcessDiscard = false;
    advanceTurn(state);
  }
  return state;
}

/**
 * Ejecuta automáticamente el turno de un jugador controlado por la IA.
 */
export function executeAITurn(state) {
  const ai = getActivePlayer(state);
  if (!ai || ai.isHuman || state.phase !== 'PLAYING') return state;

  const needed = getNeededIngredientsForPlayer(ai);

  // 0. ¿Puede hacer Cambio Rápido 2x1 gratuito en el Mercado antes de su acción?
  const uselessIndices = [];
  ai.reserve.forEach((ing, idx) => {
    if (!needed[ing] || needed[ing] <= 0) uselessIndices.push(idx);
  });
  const wantedInMarketIdx = state.market.findIndex(m => (needed[m] || 0) > 0);
  if (!state.usedFreeMarketSwap && uselessIndices.length >= 2 && wantedInMarketIdx !== -1) {
    executeFreeMarketSwap(state, ai, uselessIndices[0], uselessIndices[1], wantedInMarketIdx);
  }

  // 1. ¿Tiene algún vaso ya listo para Cerrar IPA gratis?
  for (let gIdx = 0; gIdx < 3; gIdx++) {
    if (checkGlassMatchesPendingRecipe(ai, gIdx)) {
      actionCloseIpaFree(state, ai, gIdx);
      return state;
    }
  }

  // 2. ¿Puede usar Fermentación Acelerada para cerrar un vaso al que le falte 1 ingrediente?
  const fermIdx = ai.hand.findIndex(c => c.id === 'fermentacion_acelerada');
  if (fermIdx !== -1) {
    for (let gIdx = 0; gIdx < 3; gIdx++) {
      if (checkGlassMissingOneIngredient(ai, gIdx)) {
        actionPlayBrewmasterCard(state, ai, fermIdx);
        return state;
      }
    }
  }

  // 3. ¿Puede Cocinar 1 ingrediente que encaje en uno de sus vasos abiertos?
  const cookableChoice = findBestCookMoveForAI(ai);
  if (cookableChoice) {
    const { reserveIdx, glassIdx } = cookableChoice;
    const tile = ai.reserve.splice(reserveIdx, 1)[0];
    ai.glasses[glassIdx].ingredients.push(tile);
    addLog(state, `🍺 [Cocinar] ${ai.name} coloca [${INGREDIENT_LABELS[tile]}] en su Vaso #${glassIdx + 1}.`);

    // Si acaba de completar el vaso y le queda alguna ficha que no sea crítica, hace Cierre Inmediato con Coste
    const matched = checkGlassMatchesPendingRecipe(ai, glassIdx);
    if (matched && ai.reserve.length >= 1) {
      const discardIdx = ai.reserve.findIndex(ing => !needed[ing]) !== -1
        ? ai.reserve.findIndex(ing => !needed[ing])
        : 0;
      const spent = ai.reserve.splice(discardIdx, 1)[0];
      state.pantry.unshift(spent);
      ai.glasses[glassIdx].closed = true;
      ai.glasses[glassIdx].matchedRecipeId = matched.id;
      addLog(state, `☁️ [Cierre Inmediato] ¡${ai.name} descarta 1 ficha de su reserva y blinda con ESPUMA su Vaso #${glassIdx + 1} (${matched.name})!`);
      checkThirdIpaTrigger(state, ai);
    }
    finishPlayerAction(state, ai);
    return state;
  }

  // 4. ¿Algún rival tiene 2 vasos cerrados o un vaso abierto casi listo y la IA tiene Contaminación?
  const contIdx = ai.hand.findIndex(c => c.id === 'contaminacion');
  if (contIdx !== -1) {
    const dangerousRival = state.players
      .filter(p => p.seat !== ai.seat && p.glasses.some(g => !g.closed && g.ingredients.length >= 2))
      .sort((a, b) => countClosedGlasses(b) - countClosedGlasses(a))[0];

    if (dangerousRival) {
      const targetGIdx = dangerousRival.glasses.findIndex(g => !g.closed && g.ingredients.length >= 2);
      actionPlayBrewmasterCard(state, ai, contIdx, { targetSeat: dangerousRival.seat, glassIndex: targetGIdx });
      return state;
    }
  }

  // 5. ¿Cosechar del Mercado o Despensa?
  const marketWanted = [];
  state.market.forEach((m, idx) => {
    if ((needed[m] || 0) > 0 && marketWanted.length < 2) {
      marketWanted.push({ source: 'market', index: idx });
    }
  });

  if (marketWanted.length === 0 && ai.reserve.length <= 3 && Math.random() < 0.35) {
    // Renovar el Mercado si ninguna de las 5 fichas le sirve
    actionRefreshMarket(state, ai, 0);
    return state;
  }

  while (marketWanted.length < 2) {
    marketWanted.push({ source: 'pantry' });
  }
  actionHarvest(state, ai, marketWanted);
  return state;
}

function finishPlayerAction(state, player) {
  // Si el jugador humano supera las 5 fichas al final de su turno, debe elegir cuáles descartar
  if (player.isHuman && player.reserve.length > 5) {
    state.pendingExcessDiscard = true;
    return { ok: true, pendingExcessDiscard: true };
  }

  // Si es IA y supera las 5 fichas, descarta automáticamente las que no necesite
  if (!player.isHuman && player.reserve.length > 5) {
    const needed = getNeededIngredientsForPlayer(player);
    while (player.reserve.length > 5) {
      let dropIdx = player.reserve.findIndex(ing => !needed[ing]);
      if (dropIdx === -1) dropIdx = 0;
      const dropped = player.reserve.splice(dropIdx, 1)[0];
      state.pantry.unshift(dropped);
    }
  }

  advanceTurn(state);
  return { ok: true };
}

function advanceTurn(state) {
  state.usedFreeMarketSwap = false;
  state.currentTurnIndex++;

  // Si completamos una vuelta entera a la mesa (todos han jugado el mismo número de turnos)
  if (state.currentTurnIndex >= state.numPlayers) {
    if (state.finalRoundTriggered) {
      resolveEndOfGame(state);
      return;
    }
    state.currentTurnIndex = 0;
    state.round++;
  }
}

function checkThirdIpaTrigger(state, player) {
  const closedCount = countClosedGlasses(player);
  if (closedCount >= 3 && !state.finalRoundTriggered) {
    state.finalRoundTriggered = true;
    state.finalRoundTriggeredBy = player.name;
    addLog(state, `🔔 ¡${player.name} ha cerrado su TERCERA IPA con espuma! Se termina la ronda actual hasta el último jugador para igualar turnos.`);
  }
}

function resolveEndOfGame(state) {
  state.phase = 'GAME_OVER';

  // Ordenar jugadores por:
  // 1) Número de IPAs cerradas (3 para los finalistas)
  // 2) Desempate 1: Más fichas de ingrediente en su reserva oculta
  // 3) Desempate 2: Más cartas de Acción Cervecera en la mano
  // 4) Desempate 3: Carta de Bar con más ingredientes totales (10 frente a 9)
  const ranked = [...state.players].sort((a, b) => {
    const closedA = countClosedGlasses(a);
    const closedB = countClosedGlasses(b);
    if (closedB !== closedA) return closedB - closedA;
    if (b.reserve.length !== a.reserve.length) return b.reserve.length - a.reserve.length;
    if (b.hand.length !== a.hand.length) return b.hand.length - a.hand.length;
    const sizeA = getBarCardTotalIngredients(a.barCard);
    const sizeB = getBarCardTotalIngredients(b.barCard);
    return sizeB - sizeA;
  });

  state.ranking = ranked;
  state.winner = ranked[0];
  addLog(state, `🏆 ¡FIN DE LA PARTIDA! Ganador oficial: ${state.winner.name} (${countClosedGlasses(state.winner)} IPAs cerradas, ${state.winner.reserve.length} fichas en reserva, ${state.winner.hand.length} cartas en mano, Menú de ${getBarCardTotalIngredients(state.winner.barCard)} ing.).`);
}

export function countClosedGlasses(player) {
  return player.glasses.filter(g => g.closed).length;
}

export function getBarCardTotalIngredients(barCard) {
  if (!barCard) return 9;
  return barCard.recipes.reduce((acc, rId) => acc + IPA_RECIPES[rId].size, 0);
}

function findBestCookMoveForAI(ai) {
  if (!ai.barCard || ai.reserve.length === 0) return null;

  // Asignar a cada vaso abierto una receta objetivo de su Carta de Bar
  const remainingRecipes = [...ai.barCard.recipes];
  for (const g of ai.glasses) {
    if (g.closed && g.matchedRecipeId) {
      const idx = remainingRecipes.indexOf(g.matchedRecipeId);
      if (idx !== -1) remainingRecipes.splice(idx, 1);
    }
  }

  const openGlasses = ai.glasses.filter(g => !g.closed);
  for (let i = 0; i < openGlasses.length; i++) {
    const g = openGlasses[i];
    const targetRecId = remainingRecipes[i];
    if (!targetRecId) continue;
    const rec = IPA_RECIPES[targetRecId];

    // Ver qué ingrediente de esa receta falta aún en este vaso
    const currentCounts = {};
    for (const ing of g.ingredients) {
      currentCounts[ing] = (currentCounts[ing] || 0) + 1;
    }

    for (const [reqIng, reqQty] of Object.entries(rec.ingredients)) {
      if ((currentCounts[reqIng] || 0) < reqQty) {
        const resIdx = ai.reserve.indexOf(reqIng);
        if (resIdx !== -1) {
          return { reserveIdx: resIdx, glassIdx: g.id };
        }
      }
    }
  }
  return null;
}

function pickBestBarCardForAI(draftPair, initialReserve) {
  let best = draftPair[0];
  let bestMatches = -1;
  for (const card of draftPair) {
    let matches = 0;
    const copy = [...initialReserve];
    for (const rId of card.recipes) {
      const rec = IPA_RECIPES[rId];
      for (const [ing, qty] of Object.entries(rec.ingredients)) {
        for (let k = 0; k < qty; k++) {
          const idx = copy.indexOf(ing);
          if (idx !== -1) {
            matches++;
            copy.splice(idx, 1);
          }
        }
      }
    }
    if (matches > bestMatches) {
      bestMatches = matches;
      best = card;
    }
  }
  return best;
}

function replenishMarket(state) {
  while (state.market.length < 5 && state.pantry.length > 0) {
    state.market.push(state.pantry.pop());
  }
}

function replenishHandAtEnd(state, player) {
  if (player.hand.length < 2) {
    if (state.actionDeck.length === 0 && state.actionDiscard.length > 0) {
      state.actionDeck.push(...state.actionDiscard);
      state.actionDiscard = [];
      shuffleArray(state.actionDeck);
    }
    if (state.actionDeck.length > 0) {
      player.hand.push(state.actionDeck.pop());
    }
  }
}

function addLog(state, message) {
  state.log.unshift(`[Ronda ${state.round}] ${message}`);
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
