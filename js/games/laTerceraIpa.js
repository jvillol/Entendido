/**
 * js/games/laTerceraIpa.js
 * Implementación fiel y completa del juego "LA TERCERA IPA" (4 a 6 jugadores, + soporte 2-3J para pruebas).
 * Incluye el inventario exacto de 84 fichas de ingredientes, las 9 recetas de IPA,
 * las 12 Cartas de Bar, las 18 Cartas de Maestro Cervecero, los 3 vasos por jugador
 * y las 5 acciones del turno con límite de reserva de 5 elementos.
 */

export const INGREDIENT_DECK_SPEC = [
  { id: 'lupulo', name: 'Lúpulo', type: 'basico', count: 22 },
  { id: 'malta', name: 'Malta', type: 'basico', count: 20 },
  { id: 'levadura', name: 'Levadura', type: 'basico', count: 14 },
  { id: 'fruta_tropical', name: 'Fruta Tropical', type: 'especial', count: 7 },
  { id: 'pino_resina', name: 'Pino / Resina', type: 'especial', count: 7 },
  { id: 'cafe_cacao', name: 'Café / Cacao', type: 'especial', count: 6 },
  { id: 'lactosa_especias', name: 'Lactosa / Especias', type: 'especial', count: 6 },
  { id: 'agua_pura', name: 'Agua Pura (Comodín)', type: 'comodin', count: 2 }
];

export const IPA_RECIPES = {
  // Recetas de 4 ingredientes
  english_ipa: {
    id: 'english_ipa',
    name: 'English IPA',
    size: 4,
    ingredients: { malta: 2, lupulo: 2 }
  },
  american_ipa: {
    id: 'american_ipa',
    name: 'American IPA',
    size: 4,
    ingredients: { malta: 1, lupulo: 2, levadura: 1 }
  },
  double_ipa: {
    id: 'double_ipa',
    name: 'Double IPA',
    size: 4,
    ingredients: { malta: 1, lupulo: 3 }
  },
  west_coast_ipa: {
    id: 'west_coast_ipa',
    name: 'West Coast IPA',
    size: 4,
    ingredients: { malta: 1, lupulo: 2, pino_resina: 1 }
  },
  // Recetas de 3 ingredientes
  session_ipa: {
    id: 'session_ipa',
    name: 'Session IPA',
    size: 3,
    ingredients: { malta: 1, lupulo: 1, levadura: 1 }
  },
  neipa: {
    id: 'neipa',
    name: 'NEIPA / Hazy IPA',
    size: 3,
    ingredients: { malta: 1, lupulo: 1, fruta_tropical: 1 }
  },
  black_ipa: {
    id: 'black_ipa',
    name: 'Black IPA',
    size: 3,
    ingredients: { malta: 1, lupulo: 1, cafe_cacao: 1 }
  },
  milkshake_ipa: {
    id: 'milkshake_ipa',
    name: 'Milkshake IPA',
    size: 3,
    ingredients: { lupulo: 1, fruta_tropical: 1, lactosa_especias: 1 }
  },
  brut_ipa: {
    id: 'brut_ipa',
    name: 'Brut IPA',
    size: 3,
    ingredients: { lupulo: 1, levadura: 1, lactosa_especias: 1 }
  }
};

export const BAR_CARDS = [
  { id: 1, name: 'Carta de Bar #1', recipes: ['english_ipa', 'session_ipa', 'neipa'] },
  { id: 2, name: 'Carta de Bar #2', recipes: ['english_ipa', 'black_ipa', 'brut_ipa'] },
  { id: 3, name: 'Carta de Bar #3', recipes: ['english_ipa', 'neipa', 'milkshake_ipa'] },
  { id: 4, name: 'Carta de Bar #4', recipes: ['american_ipa', 'session_ipa', 'black_ipa'] },
  { id: 5, name: 'Carta de Bar #5', recipes: ['american_ipa', 'neipa', 'brut_ipa'] },
  { id: 6, name: 'Carta de Bar #6', recipes: ['american_ipa', 'black_ipa', 'milkshake_ipa'] },
  { id: 7, name: 'Carta de Bar #7', recipes: ['double_ipa', 'session_ipa', 'milkshake_ipa'] },
  { id: 8, name: 'Carta de Bar #8', recipes: ['double_ipa', 'neipa', 'black_ipa'] },
  { id: 9, name: 'Carta de Bar #9', recipes: ['double_ipa', 'session_ipa', 'brut_ipa'] },
  { id: 10, name: 'Carta de Bar #10', recipes: ['west_coast_ipa', 'session_ipa', 'neipa'] },
  { id: 11, name: 'Carta de Bar #11', recipes: ['west_coast_ipa', 'session_ipa', 'black_ipa'] },
  { id: 12, name: 'Carta de Bar #12', recipes: ['west_coast_ipa', 'brut_ipa', 'milkshake_ipa'] }
];

export const BREWMASTER_DECK_SPEC = [
  { id: 'contaminacion', name: 'Contaminación (x4)', count: 4 },
  { id: 'maestro_cervecero', name: 'Maestro Cervecero (x4)', count: 4 },
  { id: 'cata_ciegas', name: 'Cata a Ciegas (x3)', count: 3 },
  { id: 'trasvase', name: 'Trasvase (x3)', count: 3 },
  { id: 'fermentacion_acelerada', name: 'Fermentación Acelerada (x2)', count: 2 },
  { id: 'inspeccion_sanitaria', name: 'Inspección Sanitaria (x2)', count: 2 }
];

/**
 * Calcula la demanda exacta de ingredientes y la dificultad matemática de cada Carta de Bar.
 */
export function auditBarCardsAndIngredients() {
  const deckMap = {};
  let totalTiles = 0;
  for (const item of INGREDIENT_DECK_SPEC) {
    deckMap[item.id] = item;
    totalTiles += item.count;
  }

  // Analizar cada Carta de Bar
  const cardAudits = BAR_CARDS.map(card => {
    const totals = {};
    for (const rId of card.recipes) {
      const rec = IPA_RECIPES[rId];
      for (const [ingId, qty] of Object.entries(rec.ingredients)) {
        totals[ingId] = (totals[ingId] || 0) + qty;
      }
    }

    // Calcular índice de escasez (cuanto menor es la proporción copias_mazo / cantidad_pedida, más difícil es)
    let scarcityScore = 0;
    const bottlenecks = [];
    for (const [ingId, qty] of Object.entries(totals)) {
      const supply = deckMap[ingId]?.count || 1;
      const ratio = qty / supply; // % del mazo total que un solo jugador necesita
      scarcityScore += ratio * 100;
      if (ratio >= 0.22) {
        bottlenecks.push(`${qty}x ${deckMap[ingId].name} (${Math.round(ratio * 100)}% del mazo total)`);
      }
    }

    return {
      ...card,
      recipeNames: card.recipes.map(r => IPA_RECIPES[r].name),
      totals,
      scarcityScore: Number(scarcityScore.toFixed(1)),
      bottlenecks
    };
  });

  // Analizar oferta vs demanda global en el mazo de 84 fichas
  const demandAcrossAll12Cards = {};
  for (const c of cardAudits) {
    for (const [ingId, qty] of Object.entries(c.totals)) {
      demandAcrossAll12Cards[ingId] = (demandAcrossAll12Cards[ingId] || 0) + qty;
    }
  }

  const ingredientAudits = INGREDIENT_DECK_SPEC.map(ing => {
    const totalDemand12 = demandAcrossAll12Cards[ing.id] || 0;
    // En 6 jugadores se reparten la mitad de las 12 cartas (6 de 12)
    const avgDemand6P = Number((totalDemand12 * (6 / 12)).toFixed(1));
    const maxDemand6P = cardAudits
      .map(c => c.totals[ing.id] || 0)
      .sort((a, b) => b - a)
      .slice(0, 6)
      .reduce((a, b) => a + b, 0);

    const pressureRatio6P = ing.id === 'agua_pura' ? 0 : (avgDemand6P / ing.count);

    let verdict = 'Equilibrado';
    let verdictClass = 'badge-ok';
    if (maxDemand6P > ing.count) {
      verdict = `¡Déficit en 6J! (Piden hasta ${maxDemand6P} y hay ${ing.count})`;
      verdictClass = 'badge-danger';
    } else if (pressureRatio6P > 0.75) {
      verdict = `Cuello de Botella (${Math.round(pressureRatio6P * 100)}% bloqueado en vasos)`;
      verdictClass = 'badge-warn';
    } else if (ing.id !== 'agua_pura' && maxDemand6P <= 3 && ing.count >= 7) {
      verdict = `Exceso en Mazo (Máx. ${maxDemand6P} pedidos en 6J vs ${ing.count} fichas)`;
      verdictClass = 'badge-warn';
    }

    return {
      ...ing,
      totalDemand12,
      avgDemand6P,
      maxDemand6P,
      pressureRatio6P,
      verdict,
      verdictClass
    };
  });

  return {
    totalTiles,
    cardAudits,
    ingredientAudits
  };
}

/**
 * Módulo de simulación de "LA TERCERA IPA" compatible con el motor Monte Carlo.
 * Modela los 10 ingredientes objetivo por jugador (3 vasos: 4 + 3 + 3), la escasez real del mazo de 84 fichas,
 * el mercado (3/4/5 fichas), el límite de reserva de 5 elementos, el trueque y las 18 Cartas de Maestro Cervecero.
 */
export const laTerceraIpaGame = {
  id: 'la_tercera_ipa',
  name: '🍺 LA TERCERA IPA (4 a 6 Jugadores — Juego Oficial)',
  shortDescription: 'Estrategia, negociación y cerveza artesana. Completa tus 3 vasos (10 ingredientes exactos: 4+3+3) antes que nadie.',
  minutesPerPlayerTurn: 0.65,
  targetDurationMax: 35,
  hasGuaranteedProgression: false, // Contaminación y agotamiento de Lúpulo en 6J pueden frenar el cierre
  customAuditData: auditBarCardsAndIngredients(),
  rulebookText: `LA TERCERA IPA — Juego de mesa de estrategia, negociación y cerveza artesana (4 a 6 jugadores | 25-35 min)
- OBJETIVO: Completar las 3 recetas de IPA de tu Carta de Bar secreta (1 receta de 4 ingredientes + 2 recetas de 3 ingredientes = 10 fichas colocadas en tus 3 vasos).
- PREPARACIÓN: 3 vasos por jugador, 1 Carta de Bar secreta (de 12), 3 fichas de ingrediente ocultas iniciales (del mazo de 84 fichas). Mercado abierto: 3 fichas (4J), 4 fichas (5J), 5 fichas (6J). Mazo de 18 Cartas de Maestro Cervecero.
- ACCIONES (Elige 1 por turno):
  A. Cosechar: Roba 2 fichas (del Mercado, del mazo o 1 y 1). Repón el Mercado al instante.
  B. Cocinar: Introduce hasta 2 fichas de tu reserva en tus vasos. Al completar el 1º y 2º vaso robas 1 Carta de Maestro Cervecero y el vaso queda cerrado/protegido. Al completar el 3º vaso ganas.
  C. Trueque Cervecero: Intercambia fichas con otro jugador (mínimo 1 por cada lado). Si nadie acepta, puedes hacer otra acción.
  D. Jugar una Carta de Maestro Cervecero: Contaminación (x4), Maestro Cervecero (x4), Cata a Ciegas (x3), Trasvase (x3), Fermentación Acelerada (x2), Inspección Sanitaria (x2).
  E. Renovar el Mercado: Descarta todo el Mercado, rellénalo y roba 1 ficha a tu elección.
- LÍMITE DE RESERVA: Máximo 5 elementos al final del turno (fichas ocultas + cartas especiales).`,
  initialState: {
    vp: 0, // En La Tercera IPA, 1 PV = 1 ingrediente correcto colocado en tus vasos (Meta = 10 PV = 3 vasos cerrados)
    resources: 3, // Fichas de ingrediente iniciales en la reserva personal (3)
    engineLevel: 1,
    shield: 0,
    turnOrderCompensation: 0, // Todos empiezan con 3 fichas sin compensación de turno
    sharedPoolPerPlayer: 14 // 84 fichas / 6 jugadores = 14 fichas por jugador
  },
  winCondition: {
    targetVP: 10, // 10 ingredientes exactos en los 3 vasos (4 + 3 + 3)
    fixedRounds: null,
    finishRound: false, // Gana al instante quien grita "¡La tercera IPA!"
    tieBreaker: 'none'
  },
  actions: [
    {
      id: 'cosechar',
      name: 'A. Cosechar (Robar 2 fichas de Mercado/Mazo)',
      category: 'economy',
      description: 'Roba 2 fichas de ingrediente reponiendo el Mercado al instante (respetando límite de reserva de 5).',
      canExecute: (player) => player.resources < 5,
      evaluateUtility: (player) => (player.resources <= 1 ? 34 : (player.resources <= 3 ? 20 : 6)),
      execute: (player, state, players) => {
        // A medida que hay más ingredientes bloqueados en vasos de todos los jugadores (especialmente Lúpulo en 6J),
        // disminuye la probabilidad de robar exactamente el ingrediente que te falta.
        const totalLockedInGlasses = players.reduce((acc, p) => acc + p.vp, 0);
        const scarcityPenalty = (state.numPlayers >= 6 && totalLockedInGlasses >= 42) ? 0.45 : 0.78;
        const usefulDrawn = (Math.random() < scarcityPenalty ? 1 : 0) + (Math.random() < scarcityPenalty ? 1 : 0);
        const prev = player.resources;
        player.resources = Math.min(5, player.resources + Math.max(1, usefulDrawn));
        return `Roba 2 fichas (reserva útil sube de ${prev} a ${player.resources}/5)`;
      }
    },
    {
      id: 'cocinar',
      name: 'B. Cocinar (Meter hasta 2 fichas en tus Vasos)',
      category: 'score',
      description: 'Coloca hasta 2 ingredientes válidos en tus vasos. Al llegar a 3, 6 y 10 ingredientes cierras vaso (y robas Carta Especial en el 1º y 2º).',
      canExecute: (player) => player.resources >= 1 && player.vp < 10,
      evaluateUtility: (player) => {
        if (player.vp + Math.min(2, player.resources) >= 10) return 85; // ¡Cerrar la 3ª IPA!
        if (player.resources >= 2) return 38;
        return 22;
      },
      execute: (player) => {
        const placed = Math.min(2, player.resources, 10 - player.vp);
        const oldVp = player.vp;
        player.resources -= placed;
        player.vp += placed;

        // Comprobar si completó el 1º vaso (3 ing.) o el 2º vaso (6 ing.) para robar Carta de Maestro Cervecero
        let rewardMsg = '';
        const prevGlasses = oldVp >= 6 ? 2 : (oldVp >= 3 ? 1 : 0);
        const newGlasses = player.vp >= 6 ? 2 : (player.vp >= 3 ? 1 : 0);
        if (newGlasses > prevGlasses && player.vp < 10) {
          player.cards = Math.min(2, (player.cards || 0) + (newGlasses - prevGlasses));
          // Límite de 5 elementos entre fichas + cartas especiales
          if (player.resources + player.cards > 5) {
            player.resources = Math.max(0, 5 - player.cards);
          }
          rewardMsg = ` ¡Vaso #${newGlasses} completado y protegido! Roba 1 Carta de Maestro Cervecero`;
        }
        return `Introduce ${placed} ingrediente(s) en vaso (${player.vp}/10 ing. colocados).${rewardMsg}`;
      }
    },
    {
      id: 'trueque_cervecero',
      name: 'C. Trueque Cervecero (Negociar 1x1 o 2x1)',
      category: 'economy',
      description: 'Intercambia fichas con otro jugador que tampoco esté a punto de ganar.',
      canExecute: (player, state, players) =>
        player.resources >= 1 &&
        player.vp < 8 && // Nadie negocia con quien está a 1 vaso de ganar (efecto bloqueo al líder)
        players.some(p => p.seat !== player.seat && p.resources >= 1 && p.vp < 8),
      evaluateUtility: (player) => (player.resources >= 2 && player.vp < 7 ? 15 : 7),
      execute: (player, state, players) => {
        const partner = players.find(p => p.seat !== player.seat && p.resources >= 1 && p.vp < 8);
        if (!partner) return 'Nadie acepta el trueque';
        // Ambos optimizan 1 ficha repetida por 1 ficha que encaja en su Carta de Bar
        player.resources = Math.min(5, player.resources + 1);
        partner.resources = Math.min(5, partner.resources + 1);
        return `Trueque 1x1 exitoso con ${partner.name} (ambos obtienen ingrediente clave)`;
      }
    },
    {
      id: 'carta_contaminacion_sabotaje',
      name: 'D1. Carta Especial: Contaminación / Inspección / Cata a Ciegas',
      category: 'attack',
      description: 'Usa una Carta de Maestro Cervecero ofensiva para quitar 1 ficha de un vaso sin cerrar rival o de su reserva.',
      canExecute: (player, state, players) =>
        (player.cards || 0) >= 1 &&
        players.some(p => p.seat !== player.seat && (p.vp % 3 !== 0 || p.resources > 0)),
      evaluateUtility: (player, state, players) => {
        const leader = players.filter(p => p.seat !== player.seat).sort((a, b) => b.vp - a.vp)[0];
        return leader && leader.vp >= 7 ? 42 : 24;
      },
      execute: (player, state, players) => {
        player.cards -= 1;
        const targets = players.filter(p => p.seat !== player.seat).sort((a, b) => b.vp - a.vp);
        const target = targets[0];
        if (!target) return 'Sin objetivo';

        // Un vaso completado (3 o 6 ingredientes exactos) está protegido contra Contaminación
        const hasOpenGlassIngredients = (target.vp > 0 && target.vp !== 3 && target.vp !== 6);
        if (hasOpenGlassIngredients) {
          target.vp = Math.max(0, target.vp - 1);
          return `Juega [Contaminación] contra ${target.name}: retira 1 ingrediente de su vaso abierto (baja a ${target.vp}/10)`;
        } else if (target.resources > 0) {
          target.resources -= 1;
          player.resources = Math.min(5, player.resources + 1);
          return `Juega [Cata a Ciegas / Inspección] contra ${target.name}: le quita 1 ficha de su reserva oculta`;
        }
        return `Intenta sabotear a ${target.name}, pero sus vasos completados están protegidos`;
      }
    },
    {
      id: 'carta_impulso_maestro',
      name: 'D2. Carta Especial: Maestro Cervecero (Cocinar 3) / Fermentación',
      category: 'score',
      description: 'Usa Carta de Maestro Cervecero para meter hasta 3 fichas de golpe o robar 3 y quedarse 2.',
      canExecute: (player) => (player.cards || 0) >= 1 && player.resources >= 2,
      evaluateUtility: (player) => (player.resources >= 3 ? 46 : 20),
      execute: (player) => {
        player.cards -= 1;
        const placed = Math.min(3, player.resources, 10 - player.vp);
        player.resources -= placed;
        player.vp += placed;
        return `Juega [Maestro Cervecero] y cocina ${placed} ingredientes de golpe (${player.vp}/10)`;
      }
    },
    {
      id: 'carta_trasvase',
      name: 'D3. Carta Especial: Trasvase (Mover ficha entre vasos abiertos)',
      category: 'defense',
      description: 'Mueve 1 ficha entre dos vasos tuyos sin completar. (Solo útil si te equivocaste y aún te quedan 2 vasos abiertos).',
      canExecute: (player) => (player.cards || 0) >= 1 && player.vp >= 3 && player.vp < 6 && Math.random() < 0.15,
      evaluateUtility: () => 4,
      execute: (player) => {
        player.cards -= 1;
        return 'Juega [Trasvase] para reordenar 1 ficha entre dos vasos abiertos';
      }
    },
    {
      id: 'renovar_mercado',
      name: 'E. Renovar el Mercado (Limpiar Mercado y robar 1 ficha)',
      category: 'defense',
      description: 'Descarta todas las fichas del Mercado, rellénalo y roba solo 1 ficha a tu elección.',
      canExecute: (player) => player.resources < 5,
      evaluateUtility: (player) => (player.resources === 4 ? 12 : 5), // Da solo 1 ficha frente a las 2 de Cosechar
      execute: (player) => {
        player.resources = Math.min(5, player.resources + 1);
        return `Descarta el Mercado, lo renueva y elige 1 ficha clave (reserva: ${player.resources}/5)`;
      }
    }
  ],
  onTurnStart(player, state) {
    // En la primera ronda, los jugadores aún no tienen Cartas de Maestro Cervecero (solo se ganan al cerrar vaso 1 y 2)
    if (state.round === 1) {
      player.cards = 0;
    }
  },
  checkEndCondition(state, players) {
    return players.some(p => p.vp >= 10);
  }
};
