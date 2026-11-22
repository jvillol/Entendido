/**
 * js/games/laTerceraIpa.js
 * Implementación fiel de "LA TERCERA IPA" (Versión 2 Reequilibrada — 4 a 6 jugadores).
 * Incluye:
 * - Inventario de 84 fichas (6J), 74 fichas (5J) y 64 fichas (4J)
 * - Milkshake IPA actualizada (1 Malta + 1 Fruta Tropical + 1 Lactosa/Especias)
 * - Los 12 Menús de Cartas de Bar reequilibrados
 * - Maestro Cervecero gratuita junto a Cocinar, Trasvase ampliada, Acción E mejorada y verificación de vasos
 */

export const INGREDIENT_DECK_SPEC = [
  { id: 'lupulo', name: 'Lúpulo', type: 'basico', count: 25 },
  { id: 'malta', name: 'Malta', type: 'basico', count: 21 },
  { id: 'levadura', name: 'Levadura', type: 'basico', count: 12 },
  { id: 'fruta_tropical', name: 'Fruta Tropical', type: 'especial', count: 7 },
  { id: 'lactosa_especias', name: 'Lactosa / Especias', type: 'especial', count: 7 },
  { id: 'cafe_cacao', name: 'Café / Cacao', type: 'especial', count: 5 },
  { id: 'pino_resina', name: 'Pino / Resina', type: 'especial', count: 4 },
  { id: 'agua_pura', name: 'Agua Pura (Comodín)', type: 'comodin', count: 3 }
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
    ingredients: { malta: 1, fruta_tropical: 1, lactosa_especias: 1 }
  },
  brut_ipa: {
    id: 'brut_ipa',
    name: 'Brut IPA',
    size: 3,
    ingredients: { lupulo: 1, levadura: 1, lactosa_especias: 1 }
  }
};

export const BAR_CARDS = [
  { id: 1, name: 'Menú 1 (Fácil)', recipes: ['english_ipa', 'session_ipa', 'neipa'] },
  { id: 2, name: 'Menú 2 (Fácil)', recipes: ['american_ipa', 'session_ipa', 'black_ipa'] },
  { id: 3, name: 'Menú 3 (Fácil)', recipes: ['double_ipa', 'session_ipa', 'brut_ipa'] },
  { id: 4, name: 'Menú 4 (Fácil)', recipes: ['english_ipa', 'session_ipa', 'milkshake_ipa'] },
  { id: 5, name: 'Menú 5 (Media)', recipes: ['english_ipa', 'black_ipa', 'brut_ipa'] },
  { id: 6, name: 'Menú 6 (Media)', recipes: ['american_ipa', 'neipa', 'brut_ipa'] },
  { id: 7, name: 'Menú 7 (Media)', recipes: ['american_ipa', 'black_ipa', 'milkshake_ipa'] },
  { id: 8, name: 'Menú 8 (Media)', recipes: ['double_ipa', 'neipa', 'black_ipa'] },
  { id: 9, name: 'Menú 9 (Media)', recipes: ['double_ipa', 'black_ipa', 'brut_ipa'] },
  { id: 10, name: 'Menú 10 (Difícil)', recipes: ['west_coast_ipa', 'session_ipa', 'neipa'] },
  { id: 11, name: 'Menú 11 (Difícil)', recipes: ['west_coast_ipa', 'black_ipa', 'brut_ipa'] },
  { id: 12, name: 'Menú 12 (Difícil)', recipes: ['west_coast_ipa', 'neipa', 'black_ipa'] }
];

export const BREWMASTER_DECK_SPEC = [
  { id: 'contaminacion', name: 'Contaminación (x4)', count: 4 },
  { id: 'maestro_cervecero', name: 'Maestro Cervecero (x4) [Gratuita]', count: 4 },
  { id: 'cata_ciegas', name: 'Cata a Ciegas (x3)', count: 3 },
  { id: 'trasvase', name: 'Trasvase (x3)', count: 3 },
  { id: 'fermentacion_acelerada', name: 'Fermentación Acelerada (x2)', count: 2 },
  { id: 'inspeccion_sanitaria', name: 'Inspección Sanitaria (x2)', count: 2 }
];

/**
 * Calcula la demanda exacta de ingredientes y la dificultad matemática de cada Carta de Bar (Menús 1-12).
 */
export function auditBarCardsAndIngredients() {
  const deckMap = {};
  let totalTiles = 0;
  for (const item of INGREDIENT_DECK_SPEC) {
    deckMap[item.id] = item;
    totalTiles += item.count;
  }

  const cardAudits = BAR_CARDS.map(card => {
    const totals = {};
    for (const rId of card.recipes) {
      const rec = IPA_RECIPES[rId];
      for (const [ingId, qty] of Object.entries(rec.ingredients)) {
        totals[ingId] = (totals[ingId] || 0) + qty;
      }
    }

    let scarcityScore = 0;
    const bottlenecks = [];
    for (const [ingId, qty] of Object.entries(totals)) {
      const supply = deckMap[ingId]?.count || 1;
      const ratio = qty / supply;
      scarcityScore += ratio * 100;
      if (ratio >= 0.24) {
        bottlenecks.push(`${qty}× ${deckMap[ingId].name} (${Math.round(ratio * 100)}% del mazo)`);
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

  const demandAcrossAll12Cards = {};
  for (const c of cardAudits) {
    for (const [ingId, qty] of Object.entries(c.totals)) {
      demandAcrossAll12Cards[ingId] = (demandAcrossAll12Cards[ingId] || 0) + qty;
    }
  }

  const ingredientAudits = INGREDIENT_DECK_SPEC.map(ing => {
    const totalDemand12 = demandAcrossAll12Cards[ing.id] || 0;
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
      verdict = `Posible tensión en 6J (Máx ${maxDemand6P} vs ${ing.count} + 3 comodines)`;
      verdictClass = 'badge-warn';
    } else if (pressureRatio6P > 0.85) {
      verdict = `Ajustado (${Math.round(pressureRatio6P * 100)}% uso medio en 6J)`;
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

export const laTerceraIpaGame = {
  id: 'la_tercera_ipa',
  name: '🍺 LA TERCERA IPA (v2.1 Definitiva — 4 a 6 Jugadores)',
  shortDescription: 'Reglamento Oficial v2.1 listo para imprimir: mazos escalados (66/74/84 fichas), 12 Menús equilibrados y reglas 100% cerradas.',
  minutesPerPlayerTurn: 0.6,
  targetDurationMax: 35,
  hasGuaranteedProgression: true,
  customAuditData: auditBarCardsAndIngredients(),
  rulebookText: `LA TERCERA IPA (v2.1 Definitiva) — 4 a 6 jugadores | 25 - 35 minutos
- MAZO ESCALADO: 6J (84 fichas / 5 Mercado), 5J (74 fichas / 4 Mercado), 4J (66 fichas / 3 Mercado — retira 6 Lúpulos, 7 Maltas, 4 Levaduras, 1 Agua Pura).
- CARTAS DE BAR: 12 Menús reequilibrados (Fácil, Media y Difícil), confidenciales hasta la victoria.
- TURNO (1 acción principal): A. Cosechar (2 fichas), B. Cocinar (hasta 2 fichas + Carta "Maestro Cervecero" gratuita hasta 4), C. Trueque, D. Carta Especial, E. Renovar Mercado (2 fichas: 1 del nuevo Mercado + 1 del mazo).
- VERIFICACIÓN Y DESCARTES: Al cantar "¡Cerveza lista!" en vaso 1 y 2 muestras las fichas de ese vaso (sin enseñar la Carta de Bar). Si hay error de receta, las fichas vaciadas van boca arriba al descarte.`,
  initialState: {
    vp: 0,
    resources: 3,
    engineLevel: 1,
    shield: 0,
    turnOrderCompensation: 0,
    sharedPoolPerPlayer: 14
  },
  winCondition: {
    targetVP: 10,
    fixedRounds: null,
    finishRound: false,
    tieBreaker: 'none'
  },
  actions: [
    {
      id: 'cosechar',
      name: 'A. Cosechar (Robar 2 fichas de Mercado/Mazo)',
      category: 'economy',
      description: 'Roba 2 fichas de ingrediente reponiendo el Mercado al instante (máx. 5 elementos en reserva).',
      canExecute: (player) => player.resources < 5,
      evaluateUtility: (player) => (player.resources <= 1 ? 34 : (player.resources <= 3 ? 20 : 6)),
      execute: (player, state, players) => {
        // Con el nuevo mazo (25 Lúpulos, 21 Maltas, 3 Agua Pura) y escalado 64/74/84, la escasez crítica disminuye notablemente
        const totalLocked = players.reduce((acc, p) => acc + p.vp, 0);
        const scarcityPenalty = (totalLocked >= state.numPlayers * 7.5) ? 0.68 : 0.86;
        const usefulDrawn = (Math.random() < scarcityPenalty ? 1 : 0) + (Math.random() < scarcityPenalty ? 1 : 0);
        const prev = player.resources;
        player.resources = Math.min(5, player.resources + Math.max(1, usefulDrawn));
        return `Roba 2 fichas (reserva sube de ${prev} a ${player.resources}/5)`;
      }
    },
    {
      id: 'cocinar',
      name: 'B. Cocinar (+ Carta "Maestro Cervecero" gratuita)',
      category: 'score',
      description: 'Mete hasta 2 fichas en vasos (o hasta 4 si combina con la carta gratuita Maestro Cervecero). Muestra el vaso al completarlo.',
      canExecute: (player) => player.resources >= 1 && player.vp < 10,
      evaluateUtility: (player) => {
        if (player.vp + Math.min(2, player.resources) >= 10) return 90;
        if ((player.cards || 0) >= 1 && player.resources >= 3) return 58; // Combo gratuito Maestro Cervecero
        if (player.resources >= 2) return 40;
        return 22;
      },
      execute: (player) => {
        let maxToPlace = 2;
        let usedFreeCard = false;
        if ((player.cards || 0) >= 1 && player.resources >= 3 && Math.random() < 0.7) {
          maxToPlace = 4;
          player.cards -= 1;
          usedFreeCard = true;
        }
        const placed = Math.min(maxToPlace, player.resources, 10 - player.vp);
        const oldVp = player.vp;
        player.resources -= placed;
        player.vp += placed;

        let rewardMsg = '';
        const prevGlasses = oldVp >= 6 ? 2 : (oldVp >= 3 ? 1 : 0);
        const newGlasses = player.vp >= 6 ? 2 : (player.vp >= 3 ? 1 : 0);
        if (newGlasses > prevGlasses && player.vp < 10) {
          player.cards = Math.min(2, (player.cards || 0) + (newGlasses - prevGlasses));
          if (player.resources + player.cards > 5) {
            player.resources = Math.max(0, 5 - player.cards);
          }
          rewardMsg = ` ¡Vaso #${newGlasses} verificado y cerrado! Roba 1 Carta Especial`;
        }
        return `${usedFreeCard ? '[Combo Maestro Cervecero] ' : ''}Introduce ${placed} ingrediente(s) (${player.vp}/10).${rewardMsg}`;
      }
    },
    {
      id: 'trueque_cervecero',
      name: 'C. Trueque Cervecero (Negociar 1x1 o 2x1)',
      category: 'economy',
      description: 'Intercambia fichas con otro jugador que no esté a punto de cerrar su 3ª IPA.',
      canExecute: (player, state, players) =>
        player.resources >= 1 &&
        player.vp < 8 &&
        players.some(p => p.seat !== player.seat && p.resources >= 1 && p.vp < 8),
      evaluateUtility: (player) => (player.resources >= 2 && player.vp < 7 ? 16 : 8),
      execute: (player, state, players) => {
        const partner = players.find(p => p.seat !== player.seat && p.resources >= 1 && p.vp < 8);
        if (!partner) return 'Nadie acepta el trueque';
        player.resources = Math.min(5, player.resources + 1);
        partner.resources = Math.min(5, partner.resources + 1);
        return `Trueque 1x1 exitoso con ${partner.name}`;
      }
    },
    {
      id: 'carta_sabotaje',
      name: 'D1. Carta Especial: Contaminación / Cata a Ciegas / Inspección',
      category: 'attack',
      description: 'Sabotea un vaso abierto rival o su reserva oculta.',
      canExecute: (player, state, players) =>
        (player.cards || 0) >= 1 &&
        players.some(p => p.seat !== player.seat && (p.vp % 3 !== 0 || p.resources > 0)),
      evaluateUtility: (player, state, players) => {
        const leader = players.filter(p => p.seat !== player.seat).sort((a, b) => b.vp - a.vp)[0];
        return leader && leader.vp >= 7 ? 42 : 23;
      },
      execute: (player, state, players) => {
        player.cards -= 1;
        const target = players.filter(p => p.seat !== player.seat).sort((a, b) => b.vp - a.vp)[0];
        if (!target) return 'Sin objetivo';
        const hasOpenGlass = (target.vp > 0 && target.vp !== 3 && target.vp !== 6);
        if (hasOpenGlass) {
          target.vp = Math.max(0, target.vp - 1);
          return `Juega [Contaminación] a ${target.name} (baja a ${target.vp}/10)`;
        } else if (target.resources > 0) {
          target.resources -= 1;
          player.resources = Math.min(5, player.resources + 1);
          return `Juega [Cata a Ciegas / Inspección] a ${target.name} (-1 ficha oculta)`;
        }
        return `Sabotaje bloqueado (vasos de ${target.name} cerrados)`;
      }
    },
    {
      id: 'carta_trasvase_fermentacion',
      name: 'D2. Carta Especial: Trasvase (Mercado/Rivales) o Fermentación',
      category: 'defense',
      description: 'Trasvase intercambia 1 ficha de vaso abierto por 1 del Mercado o mueve entre vasos abiertos (tuyos o rivales); Fermentación roba 3 y elige 2.',
      canExecute: (player) => (player.cards || 0) >= 1 && player.resources < 5,
      evaluateUtility: (player) => (player.resources <= 2 ? 24 : 14),
      execute: (player) => {
        player.cards -= 1;
        player.resources = Math.min(5, player.resources + 1);
        return `Juega [Trasvase / Fermentación Acelerada] y optimiza ingrediente clave`;
      }
    },
    {
      id: 'renovar_mercado',
      name: 'E. Renovar el Mercado (Rellena + roba 1 Mercado + 1 Mazo)',
      category: 'economy',
      description: 'Descarta el Mercado, rellénalo y roba 2 fichas (1 del nuevo Mercado y 1 del mazo).',
      canExecute: (player) => player.resources < 5,
      evaluateUtility: (player) => (player.resources <= 3 ? 17 : 8),
      execute: (player) => {
        const gain = Math.min(2, 5 - player.resources);
        player.resources += gain;
        return `Renueva el Mercado y roba ${gain} ficha(s) (1 Mercado + 1 Mazo)`;
      }
    }
  ],
  onTurnStart(player, state) {
    if (state.round === 1) {
      player.cards = 0;
    }
  },
  checkEndCondition(state, players) {
    return players.some(p => p.vp >= 10);
  }
};
