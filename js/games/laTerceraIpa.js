/**
 * js/games/laTerceraIpa.js
 * Implementación fiel del reglamento "LA TERCERA IPA — Reglamento e Inventario Definitivo"
 * (Pintas de 6 ingredientes, 12 Cartas de Bar de pedidos, 18 Cartas de Maestro Cervecero, 84 fichas).
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
    size: 6,
    ingredients: { lupulo: 3, malta: 2, levadura: 1 }
  },
  hazy_neipa: {
    id: 'hazy_neipa',
    name: 'Hazy / NEIPA',
    copies: 3,
    size: 6,
    ingredients: { lupulo: 2, malta: 2, levadura: 1, fruta_tropical: 1 }
  },
  milkshake_ipa: {
    id: 'milkshake_ipa',
    name: 'Milkshake IPA',
    copies: 2,
    size: 6,
    ingredients: { lupulo: 2, malta: 1, levadura: 1, fruta_tropical: 1, lactosa: 1 }
  },
  black_ipa: {
    id: 'black_ipa',
    name: 'Black IPA',
    copies: 2,
    size: 6,
    ingredients: { lupulo: 2, malta: 2, levadura: 1, cafe_cacao: 1 }
  },
  west_coast_ipa: {
    id: 'west_coast_ipa',
    name: 'West Coast IPA',
    copies: 1,
    size: 6,
    ingredients: { lupulo: 3, malta: 1, levadura: 1, pino_resina: 1 }
  }
};

// Las 12 Cartas de Bar individuales (4 + 3 + 2 + 2 + 1 = 12)
export const BAR_CARDS = [
  { id: 1, name: 'Pedido #1: IPA Clásica', recipes: ['ipa_clasica'] },
  { id: 2, name: 'Pedido #2: IPA Clásica', recipes: ['ipa_clasica'] },
  { id: 3, name: 'Pedido #3: IPA Clásica', recipes: ['ipa_clasica'] },
  { id: 4, name: 'Pedido #4: IPA Clásica', recipes: ['ipa_clasica'] },
  { id: 5, name: 'Pedido #5: Hazy / NEIPA', recipes: ['hazy_neipa'] },
  { id: 6, name: 'Pedido #6: Hazy / NEIPA', recipes: ['hazy_neipa'] },
  { id: 7, name: 'Pedido #7: Hazy / NEIPA', recipes: ['hazy_neipa'] },
  { id: 8, name: 'Pedido #8: Milkshake IPA', recipes: ['milkshake_ipa'] },
  { id: 9, name: 'Pedido #9: Milkshake IPA', recipes: ['milkshake_ipa'] },
  { id: 10, name: 'Pedido #10: Black IPA', recipes: ['black_ipa'] },
  { id: 11, name: 'Pedido #11: Black IPA', recipes: ['black_ipa'] },
  { id: 12, name: 'Pedido #12: West Coast IPA', recipes: ['west_coast_ipa'] }
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

/**
 * Audita las 84 fichas frente a la demanda real de las 12 Cartas de Bar (6 ingredientes cada pinta).
 */
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
    // En 6 jugadores haciendo ~2.5 pintas por jugador (15 pintas en mesa = 1.25x del mazo de 12 cartas)
    const avgDemand6P = Number((totalDemand12 * 1.25).toFixed(1));
    const maxDemand6P = Math.round(totalDemand12 * 1.5);

    let verdict = 'Equilibrado';
    let verdictClass = 'badge-ok';
    if (ing.id === 'agua_pura') {
      verdict = 'Solo limpia errores (no puntúa)';
      verdictClass = 'badge-info';
    } else if (totalDemand12 > ing.count) {
      verdict = `¡DÉFICIT GRAVE! (12 cartas piden ${totalDemand12} y hay ${ing.count})`;
      verdictClass = 'badge-danger';
    } else if (avgDemand6P > ing.count) {
      verdict = `¡Se agota en 6J! (Demanda ~${avgDemand6P} vs ${ing.count} fichas)`;
      verdictClass = 'badge-danger';
    } else if (totalDemand12 <= 2 && ing.count >= 4) {
      verdict = `Sobran fichas (${ing.count} en caja para solo ${totalDemand12} pedidos)`;
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
  name: '🍺 LA TERCERA IPA (Pintas de 6 Ingredientes — 84 Fichas)',
  shortDescription: 'Versión de 3 pintas de 6 ingredientes (18 fichas/jugador). Auditoría activa de stock (84 fichas), Cartas de Bar (12) y acciones 1-5.',
  minutesPerPlayerTurn: 0.75,
  targetDurationMax: 45,
  hasGuaranteedProgression: false,
  customAuditData: auditBarCardsAndIngredients(),
  rulebookText: `LA TERCERA IPA — Pintas de 6 ingredientes (4 a 6 jugadores | 35-45 min)
- OBJETIVO: Cerrar 3 pintas perfectas (6 ingredientes por vaso = 18 ingredientes por jugador).
- CARTAS DE BAR: 12 cartas en total. Se reparten 2 boca arriba por jugador (en 6J se reparten las 12 y el mazo queda vacío).
- ACCIONES (1 por turno):
  1. Cosechar: Coge 2 fichas (Mercado o Despensa).
  2. Cocinar: Coloca 1 o 2 fichas en tus vasos abiertos.
  3. Comerciar: Entrega 1 ficha tuya a la Despensa y toma 1 ficha del Mercado.
  4. Jugar Carta de Maestro Cervecero (y roba 1 si tienes <2).
  5. Renovar el Mercado: Descarta las 5 del Mercado y saca 5 nuevas.`,
  initialState: {
    vp: 0, // 1 PV = 1 ingrediente correcto colocado en vasos (Meta: 18 PV = 3 pintas × 6 ingredientes)
    resources: 3, // 3 fichas iniciales en reserva oculta
    engineLevel: 1,
    shield: 0,
    cards: 2, // 2 Cartas de Maestro Cervecero iniciales en mano
    turnOrderCompensation: 0,
    sharedPoolPerPlayer: 14 // 84 / 6 = 14 fichas por jugador (insuficiente para 18)
  },
  winCondition: {
    targetVP: 18, // 3 pintas × 6 ingredientes = 18
    fixedRounds: null,
    finishRound: false,
    tieBreaker: 'none'
  },
  actions: [
    {
      id: 'cosechar',
      name: '1. Cosechar (Coger 2 fichas del Mercado/Despensa)',
      category: 'economy',
      description: 'Coge 2 fichas gratis. Al avanzar la partida en 5-6J, el Lúpulo y la Malta se agotan en los vasos cerrados.',
      canExecute: (player) => player.resources < 5,
      evaluateUtility: (player) => (player.resources <= 2 ? 36 : 18),
      execute: (player, state, players) => {
        const totalLocked = players.reduce((acc, p) => acc + p.vp, 0);
        // En 5-6J, cuando hay >60 ingredientes bloqueados en vasos, es muy difícil encontrar Lúpulo/Malta/Levadura
        const supplyRatio = Math.max(0.1, (84 - totalLocked) / 84);
        const useful = (Math.random() < supplyRatio ? 1 : 0) + (Math.random() < supplyRatio ? 1 : 0);
        const prev = player.resources;
        player.resources = Math.min(5, player.resources + useful);
        return `Cosecha 2 fichas (útiles: +${useful}, reserva: ${prev} → ${player.resources}/5 | bloqueadas en mesa: ${totalLocked}/84)`;
      }
    },
    {
      id: 'cocinar',
      name: '2. Cocinar (Echar 1 o 2 fichas en vasos)',
      category: 'score',
      description: 'Introduce 1 o 2 fichas de tu reserva en tus vasos abiertos (meta: 18 fichas = 3 pintas).',
      canExecute: (player) => player.resources >= 1 && player.vp < 18,
      evaluateUtility: (player) => {
        if (player.vp + Math.min(2, player.resources) >= 18) return 90;
        if (player.resources >= 2) return 42;
        return 22;
      },
      execute: (player, state, players) => {
        const totalLocked = players.reduce((acc, p) => acc + p.vp, 0);
        if (totalLocked >= 82) {
          return 'No quedan suficientes ingredientes válidos en la Despensa/Mercado para completar el vaso';
        }
        const placed = Math.min(2, player.resources, 18 - player.vp);
        player.resources -= placed;
        player.vp += placed;
        const pints = Math.floor(player.vp / 6);
        return `Cocina ${placed} ficha(s) (${player.vp}/18 ingredientes | Pintas cerradas: ${pints}/3)`;
      }
    },
    {
      id: 'comerciar',
      name: '3. Comerciar (Entregar 1 ficha por 1 del Mercado)',
      category: 'defense',
      description: 'Entrega 1 ficha a la Despensa y toma 1 del Mercado. (Estrictamente peor que Cosechar, que da 2 gratis).',
      canExecute: (player) => player.resources >= 4,
      evaluateUtility: () => 2, // Casi nunca conviene frente a Cosechar
      execute: () => 'Cambia 1 ficha propia por 1 del Mercado (saldo neto: 0 fichas)'
    },
    {
      id: 'jugar_carta_mc',
      name: '4. Jugar Carta de Maestro Cervecero',
      category: 'attack',
      description: 'Juega 1 carta de mano (Contaminación, Cata a Ciegas, Trasvase, Dry Hopping, Fermentación Acelerada...).',
      canExecute: (player) => (player.cards || 0) >= 1,
      evaluateUtility: (player, state, players) => {
        const leader = players.filter(p => p.seat !== player.seat).sort((a, b) => b.vp - a.vp)[0];
        return leader && leader.vp >= 12 ? 32 : 20;
      },
      execute: (player, state, players) => {
        const target = players.filter(p => p.seat !== player.seat).sort((a, b) => b.vp - a.vp)[0];
        // Simular mezcla de cartas de ataque vs fermentación acelerada
        if (Math.random() < 0.35 && player.vp < 17) {
          player.vp += 1;
          return `Juega [Fermentación Acelerada / Dry Hopping] (+1 progreso → ${player.vp}/18)`;
        }
        if (target && target.vp % 6 !== 0) {
          target.vp = Math.max(0, target.vp - 1);
          return `Juega [Contaminación / Trasvase] sobre ${target.name} (-1 ficha de su vaso abierto → ${target.vp}/18)`;
        }
        return `Juega carta táctica y repone 1 carta si tiene <2`;
      }
    },
    {
      id: 'renovar_mercado',
      name: '5. Renovar el Mercado (Sin robar fichas)',
      category: 'defense',
      description: 'Descarta las 5 del Mercado y saca 5 nuevas. No robas ninguna ficha en tu turno.',
      canExecute: () => true,
      evaluateUtility: () => 1.5, // Acción muy débil: pierdes tu turno entero para beneficiar al siguiente jugador
      execute: () => 'Renueva las 5 fichas del Mercado (no gana ninguna ficha este turno)'
    }
  ],
  onTurnStart(player, state) {
    if (state.round === 1) {
      player.cards = 2;
    }
  },
  checkEndCondition(state, players) {
    return players.some(p => p.vp >= 18);
  }
};
