/**
 * js/engine/ruleParser.js
 * Analizador de texto de reglamentos redactados en español.
 * Extrae parámetros clave, detecta acciones, identifica posibles ambigüedades
 * y construye un módulo de juego ejecutable por el simulador Monte Carlo.
 */

export function parseDraftRulebook(title, rawText) {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();

  // 1. Extraer meta de Puntos de Victoria o Rondas
  const vpMatch = lower.match(/(\d+)\s*(?:puntos de victoria|puntos|pv|estrellas|monedas para ganar)/);
  const targetVP = vpMatch ? Math.max(5, Math.min(100, parseInt(vpMatch[1], 10))) : 15;

  const roundsMatch = lower.match(/(\d+)\s*(?:rondas|turnos máximos|días|eras)/);
  const fixedRounds = roundsMatch ? Math.max(4, Math.min(50, parseInt(roundsMatch[1], 10))) : null;

  const initResMatch = lower.match(/empiezan? con\s*(\d+)\s*(?:recursos?|monedas?|oro|energía)/);
  const initialResources = initResMatch ? parseInt(initResMatch[1], 10) : 3;

  // 2. Detectar banderas de reglas explícitas en el texto
  const hasTieBreaker = /empate|desempate/.test(lower);
  const hasFinishRound = /termina(?:r)? la ronda|mismo número de turnos|completar la ronda/.test(lower);
  const hasTurnCompensation = /segundo jugador|según el orden|recursos? adicionales? por turno|compensación/.test(lower);
  const hasAttack = /atacar|robar al rival|quitar|combate|daño|sabotaje|destruir/.test(lower);
  const hasEconomy = /construir|mina|motor|producción|mejorar|fábrica|invertir/.test(lower);
  const hasDefense = /escudo|defender|proteger|muralla|bloquear/.test(lower);
  const hasExpensiveSpecial = /ritual|maravilla|habilidad especial|artefacto|8 recursos|10 recursos/.test(lower);

  // 3. Construir lista de acciones detectadas o inferidas del texto
  const detectedActions = [
    {
      id: 'gather_resources',
      name: 'Recolectar / Tomar Recursos',
      category: 'economy',
      description: 'Obtiene recursos básicos de la reserva.',
      canExecute: () => true,
      evaluateUtility: (player) => (player.resources < 3 ? 22 : 10),
      execute: (player, state) => {
        const gain = Math.min(2 + Math.floor(player.engineLevel / 2), Math.max(1, state.poolResources));
        player.resources += gain;
        return `Gana +${gain} recursos`;
      }
    },
    {
      id: 'convert_vp',
      name: 'Comprar / Reclamar Puntos de Victoria',
      category: 'score',
      description: 'Gasta recursos acumulados para avanzar hacia la victoria.',
      canExecute: (player) => player.resources >= 3,
      evaluateUtility: (player, state) => (player.vp + 3 >= state.targetVP ? 45 : 18),
      execute: (player) => {
        player.resources -= 3;
        const gained = 2 + (player.engineLevel >= 3 ? 1 : 0);
        player.vp += gained;
        return `Paga 3 rec. y consigue +${gained} PV`;
      }
    }
  ];

  if (hasEconomy) {
    detectedActions.push({
      id: 'upgrade_engine',
      name: 'Mejorar Motor / Producción',
      category: 'economy',
      description: 'Invierte recursos para producir más en turnos futuros.',
      canExecute: (player) => player.resources >= 4 && player.engineLevel < 4,
      evaluateUtility: (player, state) => (state.round <= 6 ? 25 : 7),
      execute: (player) => {
        player.resources -= 4;
        player.engineLevel += 1;
        player.vp += 1;
        return `Mejora motor a Nivel ${player.engineLevel} (+1 PV)`;
      }
    });
  }

  if (hasAttack) {
    detectedActions.push({
      id: 'attack_rival',
      name: 'Sabotear / Atacar Rival',
      category: 'attack',
      description: 'Ataca al líder para restarle puntos o robarle recursos.',
      canExecute: (player, state, players) =>
        player.resources >= 2 && players.some(p => p.seat !== player.seat && (p.vp > 0 || p.resources > 0)),
      evaluateUtility: (player, state, players) => {
        const leader = players.filter(p => p.seat !== player.seat).sort((a, b) => b.vp - a.vp)[0];
        return leader && leader.vp >= state.targetVP - 3 ? 28 : 14;
      },
      execute: (player, state, players) => {
        player.resources -= 2;
        const targets = players.filter(p => p.seat !== player.seat).sort((a, b) => b.vp - a.vp);
        const target = targets[0];
        if (!target) return 'Sin objetivo';
        if (target.shield > 0) {
          target.shield -= 1;
          return `Ataque bloqueado por el escudo de ${target.name}`;
        }
        const stolen = Math.min(2, target.resources);
        target.resources -= stolen;
        player.resources += stolen;
        if (target.vp > 0) target.vp -= 1;
        player.vp += 1;
        return `Ataca a ${target.name}: roba ${stolen} rec. y +1 PV (-1 PV al rival)`;
      }
    });
  }

  if (hasDefense) {
    detectedActions.push({
      id: 'build_defense',
      name: 'Fortificar / Levantar Escudo',
      category: 'defense',
      description: 'Previene ataques rivales y otorga 1 PV defensivo.',
      canExecute: (player) => player.resources >= 2 && player.shield < 2,
      evaluateUtility: (player) => (player.shield === 0 ? 11 : 4),
      execute: (player) => {
        player.resources -= 2;
        player.shield += 1;
        player.vp += 1;
        return `Gana +1 Escudo y +1 PV`;
      }
    });
  }

  if (hasExpensiveSpecial) {
    detectedActions.push({
      id: 'expensive_ritual',
      name: 'Gran Maravilla / Acción Especial Cara',
      category: 'score',
      description: 'Acción de coste muy elevado detectada en el reglamento.',
      canExecute: (player) => player.resources >= 9,
      evaluateUtility: () => 12,
      execute: (player) => {
        player.resources -= 9;
        player.vp += 4;
        return `Completa Gran Maravilla (+4 PV por 9 recursos)`;
      }
    });
  }

  // Acción de respaldo si alguien se queda bloqueado
  detectedActions.push({
    id: 'pass_turn',
    name: 'Pasar / Acción Menor de Reserva',
    category: 'defense',
    isPassOrNothing: true,
    description: 'Acción de emergencia cuando no se puede o quiere hacer otra.',
    canExecute: (player) => player.resources < 2,
    evaluateUtility: () => 1,
    execute: (player) => {
      player.resources += 1;
      return 'Pasa el turno y recupera +1 recurso';
    }
  });

  // Advertencias de lectura de texto
  const textWarnings = [];
  if (!hasTieBreaker) {
    textWarnings.push('No se menciona la palabra "empate" o "desempate" en el texto.');
  }
  if (!hasFinishRound) {
    textWarnings.push('No se especifica si se termina la ronda completa cuando alguien alcanza la condición de victoria.');
  }
  if (!hasTurnCompensation) {
    textWarnings.push('No se menciona compensación inicial para los jugadores que van últimos en el orden de turno.');
  }
  if (hasAttack && !fixedRounds) {
    textWarnings.push('Hay mecánicas de ataque/quitar puntos pero no hay un límite máximo de rondas (riesgo de partida infinita si todos se atacan).');
  }

  return {
    id: 'custom_rulebook',
    name: title || 'Prototipo Personalizado (Desde Instrucciones)',
    shortDescription: `Reglamento analizado: Meta de ${targetVP} PV${fixedRounds ? `, máx. ${fixedRounds} rondas` : ''}, ${detectedActions.length} acciones detectadas.`,
    rulebookText: text,
    minutesPerPlayerTurn: 1.3,
    targetDurationMax: 75,
    hasGuaranteedProgression: !hasAttack,
    initialState: {
      vp: 0,
      resources: initialResources,
      engineLevel: 1,
      shield: 0,
      turnOrderCompensation: hasTurnCompensation ? 1 : 0,
      sharedPoolPerPlayer: 8
    },
    winCondition: {
      targetVP,
      fixedRounds,
      finishRound: hasFinishRound,
      tieBreaker: hasTieBreaker ? 'resources' : 'none'
    },
    actions: detectedActions,
    textWarnings,
    onTurnStart(player) {
      if (player.engineLevel > 1) {
        player.resources += (player.engineLevel - 1);
      }
    },
    checkEndCondition(state, players) {
      if (state.maxFixedRounds && state.round >= state.maxFixedRounds) return true;
      return players.some(p => p.vp >= state.targetVP);
    }
  };
}

export const SAMPLE_DRAFT_RULEBOOK = `NOMBRE: Gremios de la Ciudadela

PREPARACIÓN:
Pueden jugar de 2 a 5 jugadores. Todos los jugadores empiezan con 3 monedas de oro y 0 puntos de victoria.

TURNO DEL JUGADOR:
En su turno, el jugador debe elegir 1 de las siguientes acciones:
1. Recolectar: Toma 2 monedas de oro de la reserva.
2. Construir Taller (Motor): Paga 4 monedas para mejorar su taller (+1 moneda automática al inicio de cada turno y +1 punto de victoria).
3. Comprar Prestigio: Paga 3 monedas para ganar 2 puntos de victoria.
4. Sabotear al Rival (Atacar): Paga 2 monedas para robar 2 monedas a otro jugador y quitarle 1 punto de victoria.
5. Gran Ritual de la Ciudadela: Paga 9 monedas para ganar 4 puntos de victoria de golpe.

FINAL DE LA PARTIDA:
El primer jugador que llegue a 14 puntos de victoria gana inmediatamente la partida.`;
