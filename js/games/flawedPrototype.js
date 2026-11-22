/**
 * js/games/flawedPrototype.js
 * Prototipo de demostración con fallos clásicos de diseño de juegos de mesa:
 * - Ventaja excesiva del primer jugador (sin compensación y muerte súbita sin terminar ronda)
 * - Acción rota ("Saquear Caravana") y acción inútil/huérfana ("Construir Monumento Imperial")
 * - Riesgo de bloqueo/estancamiento cuando hay muchos jugadores agresivos quitándose puntos.
 */

export const flawedPrototypeGame = {
  id: 'flawed_prototype',
  name: 'Prototipo A: "Señores del Acero" (Con Errores de Diseño)',
  shortDescription: 'Borrador inicial sin pulir: incluye reglas huérfanas, ventaja del 1º jugador y posible bloqueo en 5-6 jugadores.',
  minutesPerPlayerTurn: 1.5,
  targetDurationMax: 70,
  hasGuaranteedProgression: false,
  rulebookText: `REGLAMENTO BORRADOR — SEÑORES DEL ACERO (2 a 6 Jugadores)
1. PREPARACIÓN: Todos los jugadores empiezan con 3 de Oro y 0 Puntos de Victoria (PV). No hay compensación por orden de turno.
2. ACCIONES EN TU TURNO (Elige 1):
   - Minar Oro: Gana 2 de Oro de la reserva.
   - Forjar Mercado: Paga 4 de Oro para subir tu nivel de producción (+1 Oro por turno y +1 PV).
   - Reclamar Feudo: Paga 4 de Oro para ganar 2 PV.
   - Saquear Caravana (Ataque): Paga 1 de Oro para robar 2 de Oro al líder y destruirle 2 PV (tú ganas 2 PV).
   - Construir Monumento Imperial: Paga 11 de Oro y ten motor nivel 3 para ganar 4 PV.
   - Levantar Empalizada: Paga 2 de Oro para ganar 1 Escudo.
3. FINAL DE LA PARTIDA: El primer jugador que alcance 15 PV en su turno gana inmediatamente (no se termina la ronda).`,
  initialState: {
    vp: 0,
    resources: 3,
    engineLevel: 1,
    shield: 0,
    turnOrderCompensation: 0,
    sharedPoolPerPlayer: 6
  },
  winCondition: {
    targetVP: 15,
    fixedRounds: null,
    finishRound: false,
    tieBreaker: 'none'
  },
  actions: [
    {
      id: 'mine_gold',
      name: 'Minar Oro (+2 Oro)',
      category: 'economy',
      description: 'Acción básica de obtención de recursos.',
      canExecute: () => true,
      evaluateUtility: (player) => (player.resources < 2 ? 20 : 9),
      execute: (player) => {
        player.resources += 2;
        return 'Obtiene +2 de Oro';
      }
    },
    {
      id: 'forge_market',
      name: 'Forjar Mercado (Motor Nivel +1)',
      category: 'economy',
      description: 'Cuesta 4 Oro. Produce +1 Oro al inicio de cada turno y da 1 PV.',
      canExecute: (player) => player.resources >= 4 && player.engineLevel < 3,
      evaluateUtility: (player, state) => (state.round <= 5 ? 22 : 6),
      execute: (player) => {
        player.resources -= 4;
        player.engineLevel += 1;
        player.vp += 1;
        return `Sube producción a Nivel ${player.engineLevel} (+1 PV)`;
      }
    },
    {
      id: 'claim_fief',
      name: 'Reclamar Feudo (4 Oro → 2 PV)',
      category: 'score',
      description: 'Conversión estándar de recursos en puntos.',
      canExecute: (player) => player.resources >= 4,
      evaluateUtility: (player, state) => (player.vp + 2 >= state.targetVP ? 45 : 16),
      execute: (player) => {
        player.resources -= 4;
        player.vp += 2;
        return 'Compra Feudo (+2 PV)';
      }
    },
    {
      id: 'raid_caravan',
      name: 'Saquear Caravana (Ataque Barato)',
      category: 'attack',
      description: 'Cuesta solo 1 Oro: roba 2 Oro al rival con más PV, le quita 2 PV y tú ganas 2 PV.',
      canExecute: (player, state, players) =>
        player.resources >= 1 && players.some(p => p.seat !== player.seat && (p.vp > 0 || p.resources > 0)),
      evaluateUtility: () => 34, // Desproporcionadamente eficiente (Acción OP)
      execute: (player, state, players) => {
        player.resources -= 1;
        const targets = players.filter(p => p.seat !== player.seat).sort((a, b) => b.vp - a.vp);
        const target = targets[0];
        if (!target) return 'Sin objetivo';
        if (target.shield > 0) {
          target.shield -= 1;
          return `Ataque detenido por la empalizada de ${target.name}`;
        }
        const stolen = Math.min(2, target.resources);
        target.resources -= stolen;
        player.resources += stolen;
        target.vp = Math.max(0, target.vp - 2);
        player.vp += 2;
        return `Saquea a ${target.name}: roba ${stolen} Oro, -2 PV al rival y +2 PV propios`;
      }
    },
    {
      id: 'imperial_monument',
      name: 'Construir Monumento Imperial (11 Oro → 4 PV)',
      category: 'score',
      description: 'Requiere 11 Oro y Motor Nivel 3. (Regla casi imposible de activar / huérfana).',
      canExecute: (player) => player.resources >= 11 && player.engineLevel >= 3,
      evaluateUtility: () => 14,
      execute: (player) => {
        player.resources -= 11;
        player.vp += 4;
        return 'Erige Monumento Imperial (+4 PV)';
      }
    },
    {
      id: 'build_palisade',
      name: 'Levantar Empalizada (2 Oro → 1 Escudo)',
      category: 'defense',
      description: 'Otorga 1 escudo contra saqueos.',
      canExecute: (player) => player.resources >= 2 && player.shield < 1,
      evaluateUtility: () => 5,
      execute: (player) => {
        player.resources -= 2;
        player.shield += 1;
        return 'Levanta 1 Empalizada defensiva';
      }
    }
  ],
  onTurnStart(player) {
    if (player.engineLevel > 1) {
      player.resources += (player.engineLevel - 1);
    }
  },
  checkEndCondition(state, players) {
    return players.some(p => p.vp >= state.targetVP);
  }
};
