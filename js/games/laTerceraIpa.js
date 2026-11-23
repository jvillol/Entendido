/**
 * js/games/laTerceraIpa.js
 * Implementación fiel del reglamento "LA TERCERA IPA" (Pintas de 3-4 ingredientes, 84 fichas, 12 Cartas de Bar, 18 Cartas de Maestro Cervecero).
 */

export const INGREDIENT_DECK_SPEC = [
  { id: 'lupulo', name: 'Lúpulo (Verde)', type: 'basico', count: 25 },
  { id: 'malta', name: 'Malta (Ámbar)', type: 'basico', count: 21 },
  { id: 'levadura', name: 'Levadura (Beige)', type: 'basico', count: 12 },
  { id: 'fruta_tropical', name: 'Fruta Tropical (Naranja)', type: 'especial', count: 7 },
  { id: 'lactosa', name: 'Lactosa (Blanco/Gris)', type: 'especial', count: 7 },
  { id: 'cafe_cacao', name: 'Café y Cacao (Marrón)', type: 'especial', count: 5 },
  { id: 'pino_resina', name: 'Pino / Resina (Verde pino)', type: 'especial', count: 4 },
  { id: 'agua_pura', name: 'Agua Pura (Azul - Limpiador)', type: 'especial', count: 3 }
];

export const IPA_RECIPES = {
  ipa_clasica: {
    id: 'ipa_clasica',
    name: 'IPA Clásica',
    copies: 4,
    size: 4,
    ingredients: { lupulo: 2, malta: 1, levadura: 1 }
  },
  hazy_neipa: {
    id: 'hazy_neipa',
    name: 'Hazy / NEIPA',
    copies: 3,
    size: 3,
    ingredients: { lupulo: 1, malta: 1, fruta_tropical: 1 }
  },
  milkshake_ipa: {
    id: 'milkshake_ipa',
    name: 'Milkshake IPA',
    copies: 2,
    size: 3,
    ingredients: { lupulo: 1, levadura: 1, lactosa: 1 }
  },
  black_ipa: {
    id: 'black_ipa',
    name: 'Black IPA',
    copies: 2,
    size: 3,
    ingredients: { lupulo: 1, malta: 1, cafe_cacao: 1 }
  },
  west_coast_ipa: {
    id: 'west_coast_ipa',
    name: 'West Coast IPA',
    copies: 1,
    size: 3,
    ingredients: { lupulo: 1, levadura: 1, pino_resina: 1 }
  }
};

export const BAR_CARDS = [
  { id: 1, name: 'Pedido #1: IPA Clásica (4)', recipes: ['ipa_clasica'] },
  { id: 2, name: 'Pedido #2: IPA Clásica (4)', recipes: ['ipa_clasica'] },
  { id: 3, name: 'Pedido #3: IPA Clásica (4)', recipes: ['ipa_clasica'] },
  { id: 4, name: 'Pedido #4: IPA Clásica (4)', recipes: ['ipa_clasica'] },
  { id: 5, name: 'Pedido #5: Hazy / NEIPA (3)', recipes: ['hazy_neipa'] },
  { id: 6, name: 'Pedido #6: Hazy / NEIPA (3)', recipes: ['hazy_neipa'] },
  { id: 7, name: 'Pedido #7: Hazy / NEIPA (3)', recipes: ['hazy_neipa'] },
  { id: 8, name: 'Pedido #8: Milkshake IPA (3)', recipes: ['milkshake_ipa'] },
  { id: 9, name: 'Pedido #9: Milkshake IPA (3)', recipes: ['milkshake_ipa'] },
  { id: 10, name: 'Pedido #10: Black IPA (3)', recipes: ['black_ipa'] },
  { id: 11, name: 'Pedido #11: Black IPA (3)', recipes: ['black_ipa'] },
  { id: 12, name: 'Pedido #12: West Coast IPA (3)', recipes: ['west_coast_ipa'] }
];

export const BREWMASTER_DECK_SPEC = [
  { id: 'cata_ciegas', name: 'Cata a Ciegas (x3)', count: 3 },
  { id: 'contaminacion', name: 'Contaminación (x3)', count: 3 },
  { id: 'trasvase', name: 'Trasvase (x3)', count: 3 },
  { id: 'dry_hopping', name: 'Dry Hopping Extra (x3)', count: 3 },
  { id: 'inspeccion_sanitaria', name: 'Inspección Sanitaria (x2)', count: 2 },
  { id: 'fermentacion_acelerada', name: 'Fermentación Acelerada (x2)', count: 2 },
  { id: 'maestro_cervecero', name: 'Maestro Cervecero (x2)', count: 2 }
];

export function auditBarCardsAndIngredients() {
  const deckMap = {};
  let totalTiles = 0;
  for (const item of INGREDIENT_DECK_SPEC) {
    deckMap[item.id] = item;
    totalTiles += item.count;
  }

  const cardAudits = BAR_CARDS.map(card => {
    const rec = IPA_RECIPES[card.recipes[0]];
    const totals = { ...rec.ingredients };
    let scarcityScore = 0;
    const bottlenecks = [];

    for (const [ingId, qty] of Object.entries(totals)) {
      const supply = deckMap[ingId]?.count || 1;
      const ratio = qty / supply;
      scarcityScore += ratio * 100;
      if (ratio >= 0.2) {
        bottlenecks.push(`${qty}× ${deckMap[ingId].name} (${Math.round(ratio * 100)}% del mazo)`);
      }
    }

    return {
      ...card,
      recipeNames: [rec.name],
      totals,
      scarcityScore: Number(scarcityScore.toFixed(1)),
      bottlenecks
    };
  });

  const demandAcross12Cards = {};
  for (const c of cardAudits) {
    for (const [ingId, qty] of Object.entries(c.totals)) {
      demandAcross12Cards[ingId] = (demandAcross12Cards[ingId] || 0) + qty;
    }
  }

  const ingredientAudits = INGREDIENT_DECK_SPEC.map(ing => {
    const totalDemand12 = demandAcross12Cards[ing.id] || 0;
    const avgDemand6P = Number((totalDemand12 * 1.25).toFixed(1));
    const maxDemand6P = Math.round(totalDemand12 * 1.5);

    let verdict = 'Equilibrado';
    let verdictClass = 'badge-ok';
    if (ing.id === 'agua_pura') {
      verdict = 'Limpiador de errores (no puntúa)';
      verdictClass = 'badge-info';
    } else if (avgDemand6P > ing.count) {
      verdict = `Ajustado en 6J (Demanda ~${avgDemand6P} vs ${ing.count})`;
      verdictClass = 'badge-warn';
    } else if (totalDemand12 <= 2 && ing.count >= 4) {
      verdict = `Abundante en Despensa (${ing.count} fichas para ${totalDemand12} pedidos)`;
      verdictClass = 'badge-warn';
    }

    return {
      ...ing,
      totalDemand12,
      avgDemand6P,
      maxDemand6P,
      pressureRatio6P: totalDemand12 / ing.count,
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
  name: '🍺 LA TERCERA IPA (v3.0 Definitiva — 3-4 Ing. / Vasos con Espuma)',
  shortDescription: 'Reglamento Definitivo v3.0: pintas de 3-4 ingredientes, reciclado de Cartas de Bar en 6J, Comerciar 2×2/Trueque y Renovar con robo.',
  minutesPerPlayerTurn: 0.7,
  targetDurationMax: 45,
  hasGuaranteedProgression: true,
  customAuditData: auditBarCardsAndIngredients(),
  rulebookText: `LA TERCERA IPA (v3.0 Definitiva) — 4 a 6 jugadores | 35-45 min
- OBJETIVO: Cerrar 3 pintas perfectas con espuma (IPA Clásica = 4 ing., Especiales = 3 ing.).
- CARTAS DE BAR: 12 cartas, 2 boca arriba personales por jugador. Si el mazo de Bar se agota, se barajan los descartes.
- ACCIONES (1 por turno): 1. Cosechar (2 fichas), 2. Cocinar (1-2 fichas + Agua Pura), 3. Comerciar (Trueque 1-2 fichas o Cambio rápido 2×2 en Mercado), 4. Jugar Carta de Maestro Cervecero, 5. Renovar Mercado (5 nuevas + roba 1).`,
  initialState: {
    vp: 0,
    resources: 3,
    engineLevel: 1,
    shield: 0,
    cards: 2,
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
      name: '1. Cosechar (Coger 2 fichas del Mercado/Despensa)',
      category: 'economy',
      description: 'Coge 2 fichas gratis del Mercado o de la Despensa (límite 5 en reserva).',
      canExecute: (player) => player.resources < 5,
      evaluateUtility: (player) => (player.resources <= 2 ? 36 : 18),
      execute: (player, state, players) => {
        const totalLocked = players.reduce((acc, p) => acc + p.vp, 0);
        const supplyRatio = Math.max(0.55, (84 - totalLocked) / 84);
        const useful = (Math.random() < supplyRatio ? 1 : 0) + (Math.random() < supplyRatio ? 1 : 0);
        const prev = player.resources;
        player.resources = Math.min(5, player.resources + Math.max(1, useful));
        return `Cosecha 2 fichas (útiles: +${Math.max(1, useful)}, reserva: ${prev} → ${player.resources}/5)`;
      }
    },
    {
      id: 'cocinar',
      name: '2. Cocinar (Echar 1 o 2 fichas en vasos)',
      category: 'score',
      description: 'Coloca 1 o 2 fichas de tu reserva en tus vasos abiertos (3-4 ingredientes por pinta).',
      canExecute: (player) => player.resources >= 1 && player.vp < 10,
      evaluateUtility: (player) => {
        if (player.vp + Math.min(2, player.resources) >= 10) return 90;
        if (player.resources >= 2) return 42;
        return 22;
      },
      execute: (player) => {
        const placed = Math.min(2, player.resources, 10 - player.vp);
        player.resources -= placed;
        player.vp += placed;
        const pints = player.vp >= 10 ? 3 : (player.vp >= 6 ? 2 : (player.vp >= 3 ? 1 : 0));
        return `Cocina ${placed} ficha(s) (${player.vp}/10 ing. | Pintas con espuma: ${pints}/3)`;
      }
    },
    {
      id: 'comerciar',
      name: '3. Comerciar (Trueque 1-2 fichas o Cambio 2×2 en Mercado)',
      category: 'economy',
      description: 'Trueque libre con un rival (1-2 fichas) o cambio rápido de hasta 2 fichas propias por 2 del Mercado.',
      canExecute: (player) => player.resources >= 2,
      evaluateUtility: (player) => (player.resources >= 3 ? 16 : 9),
      execute: () => 'Realiza Trueque / Cambio rápido 2×2 en Mercado (optimiza 2 ingredientes)'
    },
    {
      id: 'jugar_carta_mc',
      name: '4. Jugar Carta de Maestro Cervecero',
      category: 'attack',
      description: 'Juega 1 carta de mano (Contaminación, Trasvase, Dry Hopping Extra, Fermentación Acelerada, etc.).',
      canExecute: (player) => (player.cards || 0) >= 1,
      evaluateUtility: (player, state, players) => {
        const leader = players.filter(p => p.seat !== player.seat).sort((a, b) => b.vp - a.vp)[0];
        return leader && leader.vp >= 7 ? 34 : 20;
      },
      execute: (player, state, players) => {
        const target = players.filter(p => p.seat !== player.seat).sort((a, b) => b.vp - a.vp)[0];
        if (Math.random() < 0.38 && player.vp < 9) {
          player.vp += 1;
          return `Juega [Fermentación Acelerada / Dry Hopping] (+1 progreso → ${player.vp}/10)`;
        }
        if (target && target.vp !== 3 && target.vp !== 6) {
          target.vp = Math.max(0, target.vp - 1);
          return `Juega [Contaminación / Trasvase] sobre ${target.name} (-1 ficha de su vaso abierto → ${target.vp}/10)`;
        }
        return `Juega carta táctica y repone 1 carta si tiene <2`;
      }
    },
    {
      id: 'renovar_mercado',
      name: '5. Renovar el Mercado (5 nuevas + roba 1)',
      category: 'economy',
      description: 'Descarta las 5 del Mercado, saca 5 nuevas y roba 1 de ellas.',
      canExecute: (player) => player.resources < 5,
      evaluateUtility: (player) => (player.resources === 4 ? 14 : 9),
      execute: (player) => {
        player.resources = Math.min(5, player.resources + 1);
        return `Renueva las 5 fichas del Mercado y roba 1 ficha clave (${player.resources}/5)`;
      }
    }
  ],
  onTurnStart(player, state) {
    if (state.round === 1) {
      player.cards = 2;
    }
  },
  checkEndCondition(state, players) {
    return players.some(p => p.vp >= 10);
  }
};
