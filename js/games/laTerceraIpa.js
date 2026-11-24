/**
 * js/games/laTerceraIpa.js
 * Sección y motor de simulación oficial de "LA TERCERA IPA" (2 a 6 jugadores | 35 - 45 min).
 * Incluye:
 * - 18 Vasos de chupito + Algodón blanco (espuma)
 * - 84 Fichas circulares de ingredientes
 * - 18 Cartas de Bar (Menús 01 a 18 con las 5 recetas de IPA: 10 o 9 ingredientes)
 * - 24 Cartas de Acción Cervecera (8 tipos de cartas especiales, incluyendo Resaca)
 * - 6 Acciones del turno (Cosechar, Cocinar 1 ficha, Comerciar, Carta de Acción, Renovar Mercado, Cerrar IPA)
 * - Sección visual dedicada para el Hub de "Entendido"
 */

export const INGREDIENT_DECK_SPEC = [
  { id: 'lupulo', name: 'Lúpulo (Verde)', type: 'basico', count: 25 },
  { id: 'malta', name: 'Malta (Ámbar / Dorado)', type: 'basico', count: 21 },
  { id: 'levadura', name: 'Levadura (Beige / Crema)', type: 'basico', count: 12 },
  { id: 'fruta_tropical', name: 'Fruta Tropical (Naranja)', type: 'especial', count: 7 },
  { id: 'lactosa', name: 'Lactosa (Blanco / Gris claro)', type: 'especial', count: 7 },
  { id: 'cafe_cacao', name: 'Café y Cacao (Marrón oscuro)', type: 'especial', count: 5 },
  { id: 'pino_resina', name: 'Pino / Resina (Verde pino)', type: 'especial', count: 4 },
  { id: 'agua_pura', name: 'Agua Pura (Azul - Limpiador)', type: 'limpiador', count: 3 }
];

export const IPA_RECIPES = {
  ipa_clasica: {
    id: 'ipa_clasica',
    name: 'IPA Clásica',
    size: 4,
    ingredients: { lupulo: 2, malta: 1, levadura: 1 }
  },
  hazy_neipa: {
    id: 'hazy_neipa',
    name: 'Hazy / NEIPA',
    size: 3,
    ingredients: { lupulo: 1, malta: 1, fruta_tropical: 1 }
  },
  milkshake_ipa: {
    id: 'milkshake_ipa',
    name: 'Milkshake IPA',
    size: 3,
    ingredients: { lupulo: 1, levadura: 1, lactosa: 1 }
  },
  black_ipa: {
    id: 'black_ipa',
    name: 'Black IPA',
    size: 3,
    ingredients: { lupulo: 1, malta: 1, cafe_cacao: 1 }
  },
  west_coast_ipa: {
    id: 'west_coast_ipa',
    name: 'West Coast IPA',
    size: 3,
    ingredients: { lupulo: 1, levadura: 1, pino_resina: 1 }
  }
};

// Las 18 Cartas de Bar únicas (Cartas 01 a 18)
export const BAR_CARDS = [
  { id: 1, name: 'Carta 01 (10 ing.)', recipes: ['ipa_clasica', 'hazy_neipa', 'milkshake_ipa'] },
  { id: 2, name: 'Carta 02 (10 ing.)', recipes: ['ipa_clasica', 'hazy_neipa', 'black_ipa'] },
  { id: 3, name: 'Carta 03 (10 ing.)', recipes: ['ipa_clasica', 'hazy_neipa', 'west_coast_ipa'] },
  { id: 4, name: 'Carta 04 (10 ing.)', recipes: ['ipa_clasica', 'milkshake_ipa', 'black_ipa'] },
  { id: 5, name: 'Carta 05 (10 ing.)', recipes: ['ipa_clasica', 'milkshake_ipa', 'west_coast_ipa'] },
  { id: 6, name: 'Carta 06 (10 ing.)', recipes: ['ipa_clasica', 'black_ipa', 'west_coast_ipa'] },
  { id: 7, name: 'Carta 07 (10 ing.)', recipes: ['ipa_clasica', 'hazy_neipa', 'hazy_neipa'] },
  { id: 8, name: 'Carta 08 (10 ing.)', recipes: ['ipa_clasica', 'milkshake_ipa', 'milkshake_ipa'] },
  { id: 9, name: 'Carta 09 (10 ing.)', recipes: ['ipa_clasica', 'black_ipa', 'black_ipa'] },
  { id: 10, name: 'Carta 10 (9 ing.)', recipes: ['hazy_neipa', 'milkshake_ipa', 'black_ipa'] },
  { id: 11, name: 'Carta 11 (9 ing.)', recipes: ['hazy_neipa', 'milkshake_ipa', 'west_coast_ipa'] },
  { id: 12, name: 'Carta 12 (9 ing.)', recipes: ['hazy_neipa', 'black_ipa', 'west_coast_ipa'] },
  { id: 13, name: 'Carta 13 (9 ing.)', recipes: ['milkshake_ipa', 'black_ipa', 'west_coast_ipa'] },
  { id: 14, name: 'Carta 14 (9 ing.)', recipes: ['hazy_neipa', 'hazy_neipa', 'milkshake_ipa'] },
  { id: 15, name: 'Carta 15 (9 ing.)', recipes: ['hazy_neipa', 'hazy_neipa', 'black_ipa'] },
  { id: 16, name: 'Carta 16 (9 ing.)', recipes: ['hazy_neipa', 'hazy_neipa', 'west_coast_ipa'] },
  { id: 17, name: 'Carta 17 (9 ing.)', recipes: ['milkshake_ipa', 'milkshake_ipa', 'hazy_neipa'] },
  { id: 18, name: 'Carta 18 (9 ing.)', recipes: ['milkshake_ipa', 'milkshake_ipa', 'west_coast_ipa'] }
];

// Las 24 Cartas de Acción Cervecera
export const BREWMASTER_DECK_SPEC = [
  {
    id: 'cata_ciegas',
    name: 'Cata a Ciegas',
    count: 4,
    text: 'Roba al azar 1 ficha de ingrediente de la reserva oculta de un rival.'
  },
  {
    id: 'contaminacion',
    name: 'Contaminación',
    count: 4,
    text: 'Descarta 1 ficha de ingrediente del interior de cualquier vaso abierto (tuyo o de un rival).'
  },
  {
    id: 'trasvase',
    name: 'Trasvase',
    count: 4,
    text: 'Mueve 1 ficha de ingrediente de un vaso abierto a otro vaso abierto (propio o ajeno).'
  },
  {
    id: 'dry_hopping',
    name: 'Dry Hopping Extra',
    count: 3,
    text: 'Añade hasta 2 fichas de Lúpulo desde tu reserva oculta a tus vasos abiertos en este turno.'
  },
  {
    id: 'maestro_cervecero',
    name: 'Maestro Cervecero',
    count: 3,
    text: 'Comodín: anula una carta de Acción Cervecera rival que te afecte (sin gastar turno), o úsala como acción gratuita extra en tu turno.'
  },
  {
    id: 'inspeccion_sanitaria',
    name: 'Inspección Sanitaria',
    count: 2,
    text: 'Mira toda la reserva oculta de un rival y descarta 1 ficha a tu elección.'
  },
  {
    id: 'fermentacion_acelerada',
    name: 'Fermentación Acelerada',
    count: 2,
    text: 'Cierra al instante un vaso al que le falte exactamente 1 ingrediente de su receta (coloca la espuma encima).'
  },
  {
    id: 'resaca',
    name: 'Resaca',
    count: 2,
    text: 'Todos los demás jugadores descartan sus cartas de Acción Cervecera; se baraja el descarte con el mazo y cada rival roba 2 nuevas.'
  }
];

/**
 * Audita las 18 Cartas de Bar y la oferta/demanda de las 84 fichas de ingredientes,
 * modelando la compensación entre Turnos de Cocinado (10 vs 9) y Turnos de Búsqueda de Especiales.
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
    let totalIngredientsCount = 0;
    let specialCount = 0;

    for (const rId of card.recipes) {
      const rec = IPA_RECIPES[rId];
      for (const [ingId, qty] of Object.entries(rec.ingredients)) {
        totals[ingId] = (totals[ingId] || 0) + qty;
        totalIngredientsCount += qty;
        if (deckMap[ingId]?.type === 'especial') {
          specialCount += qty;
        }
      }
    }

    // Cálculo de turnos esperados:
    // - Cartas 01-09: 10 turnos de Cocinar + menor coste de búsqueda (solo 2 especiales; 58/84 fichas son básicos)
    // - Cartas 10-18: 9 turnos de Cocinar + mayor coste de búsqueda (3 especiales escasos de 4-7 fichas en la bolsa)
    let searchDifficulty = 0;
    const bottlenecks = [];
    for (const [ingId, qty] of Object.entries(totals)) {
      const supply = deckMap[ingId]?.count || 1;
      const isSpecial = deckMap[ingId]?.type === 'especial';
      // Peso de búsqueda inversamente proporcional a la abundancia en la bolsa de 84 fichas
      const expectedSearchCost = isSpecial
        ? (qty * (14 / supply))
        : (qty * (10 / supply));
      searchDifficulty += expectedSearchCost;

      if (qty / supply >= 0.25) {
        bottlenecks.push(`${qty}× ${deckMap[ingId].name.split(' ')[0]} (${supply} en bolsa)`);
      }
    }

    // Índice de Esfuerzo Total (Turnos de Cocinar + Esfuerzo de Búsqueda)
    const totalEffortScore = Number((totalIngredientsCount * 2.2 + searchDifficulty * 3.1).toFixed(1));

    return {
      ...card,
      recipeNames: card.recipes.map(r => IPA_RECIPES[r].name),
      totals,
      totalIngredientsCount,
      specialCount,
      scarcityScore: totalEffortScore,
      bottlenecks: [
        `${totalIngredientsCount} turnos Cocinar + ${specialCount} especiales`,
        ...bottlenecks
      ]
    };
  });

  const demandAcross18Cards = {};
  for (const c of cardAudits) {
    for (const [ingId, qty] of Object.entries(c.totals)) {
      demandAcross18Cards[ingId] = (demandAcross18Cards[ingId] || 0) + qty;
    }
  }

  const ingredientAudits = INGREDIENT_DECK_SPEC.map(ing => {
    const totalDemand18 = demandAcross18Cards[ing.id] || 0;
    const abundanceRatio = totalDemand18 > 0 ? (ing.count / totalDemand18).toFixed(2) : '-';
    const avgDemand6P = Number((totalDemand18 * (6 / 18)).toFixed(1));
    const maxDemand6P = cardAudits
      .map(c => c.totals[ing.id] || 0)
      .sort((a, b) => b - a)
      .slice(0, 6)
      .reduce((a, b) => a + b, 0);

    let verdict = `Ratio ${abundanceRatio} (Equilibrado)`;
    let verdictClass = 'badge-ok';

    if (ing.id === 'agua_pura') {
      verdict = 'Limpiador táctico (3 en bolsa)';
      verdictClass = 'badge-info';
    } else if (ing.type === 'basico') {
      verdict = `Ratio ${abundanceRatio} (Básico abundante — 58/84 en bolsa)`;
      verdictClass = 'badge-ok';
    } else if (ing.count <= 5) {
      verdict = `Ratio ${abundanceRatio} (Especial escaso — disputa en Mercado)`;
      verdictClass = 'badge-info';
    }

    return {
      ...ing,
      totalDemand12: `${totalDemand18} veces (Ratio ${abundanceRatio})`,
      avgDemand6P,
      maxDemand6P,
      pressureRatio6P: avgDemand6P / ing.count,
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
  name: '🍺 LA TERCERA IPA (Oficial — 2 a 6 Jugadores | 18 Menús y 24 Cartas Acción)',
  shortDescription: 'Completa y cierra con espuma las 3 IPAs de tu Carta de Bar secreta (9-10 ingredientes + 3 cierres de espuma).',
  minutesPerPlayerTurn: 0.45,
  targetDurationMax: 45,
  hasGuaranteedProgression: true,
  customAuditData: auditBarCardsAndIngredients(),
  sectionMeta: {
    icon: '🍺',
    cleanTitle: 'LA TERCERA IPA',
    statusBadge: 'Reglamento Oficial (2-6J)',
    badgeClass: 'badge-ok',
    playersLabel: '2 a 6 Jugadores',
    durationLabel: '35 – 45 min',
    recommendedCounts: [2, 3, 4, 5, 6]
  },
  dedicatedSection: {
    objective: 'Ser el primer Maestro Cervecero en completar y servir las 3 IPAs perfectas indicadas en tu Carta de Bar secreta (3 vasos cerrados con su porción de algodón blanco como espuma).',
    winTargetLabel: '3 IPAs con Espuma (9-10 ing. + 3 cierres)',
    inventory: [
      { name: 'Vasos de Chupito', qty: '18 uds', detail: '3 vasos transparentes por jugador' },
      { name: 'Algodón Blanco (Espuma)', qty: '18+ uds', detail: 'Corona y blinda cada IPA cerrada' },
      { name: 'Lúpulo (Verde)', qty: '25 fichas', detail: 'Ingrediente básico principal' },
      { name: 'Malta (Ámbar / Dorado)', qty: '21 fichas', detail: 'Ingrediente básico' },
      { name: 'Levadura (Beige / Crema)', qty: '12 fichas', detail: 'Ingrediente básico' },
      { name: 'Fruta Tropical (Naranja)', qty: '7 fichas', detail: 'Especial (Hazy / NEIPA)' },
      { name: 'Lactosa (Blanco / Gris)', qty: '7 fichas', detail: 'Especial (Milkshake IPA)' },
      { name: 'Café y Cacao (Marrón)', qty: '5 fichas', detail: 'Especial (Black IPA)' },
      { name: 'Pino / Resina (Verde pino)', qty: '4 fichas', detail: 'Especial (West Coast IPA)' },
      { name: 'Agua Pura (Azul)', qty: '3 fichas', detail: 'Limpia 1 ingrediente erróneo del vaso' },
      { name: 'Cartas de Bar (Menús)', qty: '18 cartas', detail: 'Cartas 01 a 18 (3 IPAs por carta)' },
      { name: 'Cartas de Acción Cervecera', qty: '24 cartas', detail: '8 tipos de acciones especiales' }
    ],
    setupSteps: [
      {
        title: 'Vasos de Elaboración',
        text: 'Entrega 3 vasos de chupito vacíos a cada jugador (uno por cada cerveza de su menú).'
      },
      {
        title: 'Elección Secreta de Carta de Bar (Draft de 2 elige 1)',
        text: 'Baraja las 18 Cartas de Bar y reparte 2 boca abajo a cada jugador. Cada jugador elige 1 como su menú secreto de 3 IPAs y devuelve la otra y las sobrantes a la caja.'
      },
      {
        title: 'Mazo de Acción Cervecera',
        text: 'Baraja las 24 Cartas de Acción Cervecera, reparte 2 a cada jugador en mano y deja el resto boca abajo.'
      },
      {
        title: 'Despensa Principal y Mercado de Abastos',
        text: 'Mezcla las 84 fichas boca abajo (Despensa), revela 5 fichas boca arriba en el centro (Mercado) y reparte 3 fichas a cada jugador en su reserva oculta (límite de 5 al final del turno).'
      }
    ],
    customCards: [
      {
        title: '🍻 Las 5 Recetas de IPA (18 Combinaciones de Cartas de Bar)',
        subtitle: 'Cartas 01 a 09 suman 10 ingredientes (incluyen 1 IPA Clásica); Cartas 10 a 18 suman 9 ingredientes (3 IPAs de 3 ing.).',
        items: [
          { icon: '🍺', name: 'IPA Clásica', badge: '4 Ingredientes', text: '2 Lúpulos + 1 Malta + 1 Levadura (Presente en Cartas 01 a 09).' },
          { icon: '🍊', name: 'Hazy / NEIPA', badge: '3 Ingredientes', text: '1 Lúpulo + 1 Malta + 1 Fruta Tropical.' },
          { icon: '🥛', name: 'Milkshake IPA', badge: '3 Ingredientes', text: '1 Lúpulo + 1 Levadura + 1 Lactosa.' },
          { icon: '☕', name: 'Black IPA', badge: '3 Ingredientes', text: '1 Lúpulo + 1 Malta + 1 Café y Cacao.' },
          { icon: '🌲', name: 'West Coast IPA', badge: '3 Ingredientes', text: '1 Lúpulo + 1 Levadura + 1 Pino / Resina.' }
        ]
      },
      {
        title: '🃏 Las 24 Cartas de Acción Cervecera',
        subtitle: 'Se roba 1 al final del turno si tienes menos de 2 en mano al jugar una carta.',
        items: [
          { icon: '🕵️', name: 'Cata a Ciegas', badge: '4 copias', text: 'Roba al azar 1 ficha de la reserva oculta de un rival.' },
          { icon: '☣️', name: 'Contaminación', badge: '4 copias', text: 'Descarta 1 ficha del interior de cualquier vaso abierto (tuyo o rival).' },
          { icon: '🔄', name: 'Trasvase', badge: '4 copias', text: 'Mueve 1 ficha de un vaso abierto a otro vaso abierto (propio o ajeno).' },
          { icon: '🌿', name: 'Dry Hopping Extra', badge: '3 copias', text: 'Añade hasta 2 fichas de Lúpulo desde tu reserva oculta a tus vasos abiertos en este turno.' },
          { icon: '👑', name: 'Maestro Cervecero', badge: '3 copias', text: 'Comodín: anula una carta rival que te afecte (sin gastar turno) o úsala como acción gratuita extra en tu turno.' },
          { icon: '🔍', name: 'Inspección Sanitaria', badge: '2 copias', text: 'Mira toda la reserva oculta de un rival y descarta 1 ficha a tu elección.' },
          { icon: '⚡', name: 'Fermentación Acelerada', badge: '2 copias', text: 'Cierra un vaso al que le falte exactamente 1 ingrediente (coloca la espuma encima al instante).' },
          { icon: '🤕', name: 'Resaca', badge: '2 copias', text: 'Todos los rivales descartan sus cartas de Acción Cervecera; se baraja con el mazo y cada rival roba 2 nuevas.' }
        ]
      }
    ]
  },
  rulebookText: `LA TERCERA IPA — Reglamento Oficial (2 a 6 jugadores | 35-45 min)
- OBJETIVO: Completar y cerrar con espuma las 3 IPAs de tu Carta de Bar secreta (elegida entre 2 al inicio de un mazo de 18 Cartas de Bar).
- INVENTARIO: 18 vasos, algodón (espuma), 84 fichas (25 Lúpulo, 21 Malta, 12 Levadura, 7 Fruta Tropical, 7 Lactosa, 5 Café/Cacao, 4 Pino/Resina, 3 Agua Pura), 18 Cartas de Bar y 24 Cartas de Acción Cervecera.
- ACCIONES DEL TURNO (Elige 1):
  1. Cosechar: Coge 2 fichas (Mercado / Despensa). Máximo 5 en reserva oculta.
  2. Cocinar: Coloca 1 ficha de tu reserva boca arriba en un vaso abierto (o usa Agua Pura para limpiar 1 ficha errónea).
  3. Comerciar: Trueque de 1-2 fichas con un rival, O Cambio rápido en el Mercado (devuelve 2 fichas tuyas a la Despensa y toma 1 del Mercado).
  4. Jugar una Carta de Acción Cervecera (y roba 1 si tienes <2 en mano).
  5. Renovar el Mercado: Descarta las 5 del Mercado, saca 5 nuevas y roba 1 de ellas.
  6. Cerrar IPA: Coloca la espuma (algodón) en un vaso que tenga los ingredientes exactos de una receta de tu Carta de Bar (gasta turno).`,
  initialState: {
    // 12 pasos de progreso total = ~9.5 ingredientes colocados de 1 en 1 + 3 acciones de "Cerrar IPA" con espuma
    vp: 0,
    resources: 3,
    engineLevel: 1,
    shield: 0,
    cards: 2,
    turnOrderCompensation: 0,
    sharedPoolPerPlayer: 14
  },
  winCondition: {
    targetVP: 12, // 9 ingredientes + 3 acciones de Cerrar IPA = 12 pasos de victoria
    fixedRounds: null,
    finishRound: false,
    tieBreaker: 'none'
  },
  actions: [
    {
      id: 'cosechar',
      name: '1. Cosechar (Coger 2 fichas de Mercado / Despensa)',
      category: 'economy',
      description: 'Coge 2 fichas a tu elección (Mercado o Despensa) y repón el Mercado a 5. Límite de 5 fichas en reserva.',
      canExecute: (player) => player.resources < 5,
      evaluateUtility: (player) => (player.resources <= 1 ? 38 : (player.resources <= 3 ? 19 : 7)),
      execute: (player, state, players) => {
        const totalLocked = players.reduce((acc, p) => acc + p.vp, 0);
        const supplyRatio = Math.max(0.6, (84 - totalLocked) / 84);
        const useful = (Math.random() < supplyRatio ? 1 : 0) + (Math.random() < supplyRatio ? 1 : 0);
        const prev = player.resources;
        player.resources = Math.min(5, player.resources + Math.max(1, useful));
        return `Cosecha 2 fichas (reserva útil: ${prev} → ${player.resources}/5)`;
      }
    },
    {
      id: 'cocinar',
      name: '2. Cocinar (Colocar 1 ficha en un vaso abierto)',
      category: 'score',
      description: 'Coloca 1 ficha de tu reserva oculta boca arriba dentro de uno de tus vasos abiertos (o limpia 1 ficha errónea con Agua Pura).',
      canExecute: (player) => player.resources >= 1 && player.vp < 12 && (player.vp % 4 !== 3),
      evaluateUtility: (player) => (player.resources >= 1 ? 35 : 15),
      execute: (player) => {
        player.resources -= 1;
        player.vp += 1;
        return `Cocina 1 ingrediente en vaso abierto (progreso: ${player.vp}/12)`;
      }
    },
    {
      id: 'cerrar_ipa',
      name: '6. Cerrar IPA (Colocar Espuma — Gasta turno)',
      category: 'score',
      description: 'Coloca el algodón (espuma) sobre un vaso completado para blindarlo. Gasta tu acción del turno.',
      canExecute: (player) => player.vp % 4 === 3 && player.vp < 12,
      evaluateUtility: (player) => (player.vp + 1 >= 12 ? 95 : 65),
      execute: (player) => {
        player.vp += 1;
        const closedCount = Math.floor(player.vp / 4);
        return `¡Coloca espuma y blinda su IPA #${closedCount}/3! (Vaso cerrado y protegido)`;
      }
    },
    {
      id: 'comerciar_trueque',
      name: '3A. Comerciar: Trueque con un rival (1-2 fichas)',
      category: 'economy',
      description: 'Intercambia libremente 1 o 2 fichas de tu reserva oculta con otro jugador.',
      canExecute: (player, state, players) =>
        player.resources >= 1 &&
        player.vp < 9 &&
        players.some(p => p.seat !== player.seat && p.resources >= 1 && p.vp < 9),
      evaluateUtility: (player) => (player.resources >= 2 ? 15 : 8),
      execute: (player, state, players) => {
        const partner = players.find(p => p.seat !== player.seat && p.resources >= 1 && p.vp < 9);
        if (!partner) return 'Nadie acepta el trueque';
        player.resources = Math.min(5, player.resources + 1);
        partner.resources = Math.min(5, partner.resources + 1);
        return `Trueque exitoso con ${partner.name}`;
      }
    },
    {
      id: 'comerciar_mercado_2x1',
      name: '3B. Comerciar: Cambio rápido en Mercado (Entregar 2 por 1)',
      category: 'defense',
      description: 'Devuelve 2 fichas de tu reserva a la Despensa y toma 1 del Mercado. (Dominada por Cosechar).',
      canExecute: (player) => player.resources >= 4,
      evaluateUtility: () => 1.5,
      execute: (player) => {
        player.resources = Math.max(0, player.resources - 1);
        return `Entrega 2 fichas y toma 1 del Mercado (reserva baja a ${player.resources}/5)`;
      }
    },
    {
      id: 'jugar_carta_accion',
      name: '4. Jugar Carta de Acción Cervecera (24 cartas)',
      category: 'attack',
      description: 'Juega Contaminación, Trasvase, Cata a Ciegas, Dry Hopping Extra (+2 Lúpulos), Fermentación Acelerada, Maestro Cervecero o Resaca.',
      canExecute: (player) => (player.cards || 0) >= 1,
      evaluateUtility: (player, state, players) => {
        const leader = players.filter(p => p.seat !== player.seat).sort((a, b) => b.vp - a.vp)[0];
        if (player.vp % 4 === 2) return 46; // Fermentación Acelerada / Dry Hopping Extra
        return leader && leader.vp >= 8 ? 36 : 20;
      },
      execute: (player, state, players) => {
        // Dry Hopping Extra (meter 2 Lúpulos) o Fermentación Acelerada (ahorra 1 ing + cierra con espuma al instante)
        if (Math.random() < 0.4 && player.vp < 11) {
          const boost = Math.min(2, 12 - player.vp);
          player.vp += boost;
          return `Juega [Dry Hopping Extra / Fermentación Acelerada] (+${boost} pasos de avance → ${player.vp}/12)`;
        }
        // Sabotaje (Contaminación / Trasvase) a un vaso abierto que aún no tiene espuma
        const target = players
          .filter(p => p.seat !== player.seat && (p.vp % 4 !== 0))
          .sort((a, b) => b.vp - a.vp)[0];
        if (target) {
          // 25% probabilidad de que el rival lo anule con "Maestro Cervecero"
          if (Math.random() < 0.22) {
            return `Juega [Contaminación] contra ${target.name}, pero este la anula con [Maestro Cervecero]`;
          }
          target.vp = Math.max(0, target.vp - 1);
          return `Juega [Contaminación / Trasvase] sobre el vaso sin espuma de ${target.name} (retrocede a ${target.vp}/12)`;
        }
        return 'Juega [Cata a Ciegas / Resaca] y repone hasta 2 cartas en mano';
      }
    },
    {
      id: 'renovar_mercado',
      name: '5. Renovar el Mercado (5 nuevas + roba 1)',
      category: 'economy',
      description: 'Descarta las 5 fichas del Mercado, saca 5 nuevas y roba 1 de ellas.',
      canExecute: (player) => player.resources < 5,
      evaluateUtility: (player) => (player.resources === 4 ? 14 : 9),
      execute: (player) => {
        player.resources = Math.min(5, player.resources + 1);
        return `Renueva las 5 fichas del Mercado y roba 1 ficha (${player.resources}/5)`;
      }
    }
  ],
  onTurnStart(player, state) {
    if (state.round === 1) {
      player.cards = 2;
    }
  },
  checkEndCondition(state, players) {
    return players.some(p => p.vp >= 12);
  }
};
