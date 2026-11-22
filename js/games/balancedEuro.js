/**
 * js/games/balancedEuro.js
 * Prototipo calibrado ("Arquitectos del Valle"):
 * - Compensación inicial por orden de turno (+1 recurso por asiento)
 * - Se completa la ronda final para igualar turnos
 * - Costes y recompensas balanceados sin acciones muertas
 * - Reloj de partida garantizado (14 rondas máx o 16 PV)
 */

export const balancedEuroGame = {
  id: 'balanced_euro',
  name: 'Prototipo B: "Arquitectos del Valle" (Versión Calibrada)',
  shortDescription: 'Diseño equilibrado con compensación de turno, final de ronda equitativo, mecánicas de rebufo y cero reglas muertas.',
  minutesPerPlayerTurn: 1.1,
  targetDurationMax: 65,
  hasGuaranteedProgression: true,
  rulebookText: `REGLAMENTO CALIBRADO — ARQUITECTOS DEL VALLE (2 a 6 Jugadores)
1. PREPARACIÓN: Cada jugador empieza con 3 Recursos + 1 Recurso adicional por cada puesto detrás del jugador inicial. Reserva escalada a 9 por jugador.
2. ACCIONES EN TU TURNO (Elige 1):
   - Expedición al Bosque: Gana 3 Recursos (o +4 si vas en última posición de PV: mecánica de rebufo).
   - Ampliar Aserradero (Motor): Paga 4 Recursos para mejorar producción (+1 Recurso por ronda y +1 PV).
   - Erigir Puente del Valle: Paga 3 Recursos para ganar 2 PV.
   - Contrato Real: Paga 5 Recursos para ganar 3 PV y +1 Escudo Comercial.
   - Disputa Comercial: Paga 2 Recursos para robar 1 Recurso al líder y ganar 2 PV (no destruye PV ya ganados, evitando bucles).
3. FINAL DE LA PARTIDA: Cuando alguien alcanza 16 PV o al terminar la ronda 14. Siempre se termina la ronda en curso para que todos jueguen los mismos turnos. Desempate por Recursos sobrantes.`,
  initialState: {
    vp: 0,
    resources: 3,
    engineLevel: 1,
    shield: 0,
    turnOrderCompensation: 1,
    sharedPoolPerPlayer: 9
  },
  winCondition: {
    targetVP: 16,
    fixedRounds: 14,
    finishRound: true,
    tieBreaker: 'resources'
  },
  actions: [
    {
      id: 'forest_expedition',
      name: 'Expedición al Bosque (+3 Rec / Rebufo +4)',
      category: 'economy',
      description: 'Obtiene 3 recursos (4 si el jugador va en último lugar en PV).',
      canExecute: () => true,
      evaluateUtility: (player) => (player.resources <= 2 ? 24 : 11),
      execute: (player, state, players) => {
        const minVP = Math.min(...players.map(p => p.vp));
        const catchupBonus = (player.vp === minVP && state.round > 2) ? 1 : 0;
        const gain = 3 + catchupBonus;
        player.resources += gain;
        return `Recoge +${gain} recursos${catchupBonus ? ' (Bono Rebufo)' : ''}`;
      }
    },
    {
      id: 'upgrade_sawmill',
      name: 'Ampliar Aserradero (4 Rec → Motor +1 y +1 PV)',
      category: 'economy',
      description: 'Aumenta ingresos pasivos por turno y otorga 1 PV.',
      canExecute: (player) => player.resources >= 4 && player.engineLevel < 4,
      evaluateUtility: (player, state) => (state.round <= 7 ? 24 : 10),
      execute: (player) => {
        player.resources -= 4;
        player.engineLevel += 1;
        player.vp += 1;
        return `Mejora Aserradero a Nivel ${player.engineLevel} (+1 PV)`;
      }
    },
    {
      id: 'build_bridge',
      name: 'Erigir Puente del Valle (3 Rec → 2 PV)',
      category: 'score',
      description: 'Acción principal de puntuación constante.',
      canExecute: (player) => player.resources >= 3,
      evaluateUtility: (player, state) => (player.vp + 2 >= state.targetVP ? 40 : 19),
      execute: (player) => {
        player.resources -= 3;
        player.vp += 2;
        return 'Construye Puente (+2 PV)';
      }
    },
    {
      id: 'royal_contract',
      name: 'Contrato Real (5 Rec → 3 PV + 1 Escudo)',
      category: 'defense',
      description: 'Puntuación alta combinada con protección frente a disputas.',
      canExecute: (player) => player.resources >= 5,
      evaluateUtility: (player, state) => (player.vp + 3 >= state.targetVP ? 48 : 23),
      execute: (player) => {
        player.resources -= 5;
        player.vp += 3;
        player.shield = Math.min(2, player.shield + 1);
        return 'Completa Contrato Real (+3 PV y +1 Escudo)';
      }
    },
    {
      id: 'trade_dispute',
      name: 'Disputa Comercial (2 Rec → +2 PV y roba 1 Rec al líder)',
      category: 'attack',
      description: 'Interacción competitiva que frena la economía del líder sin destruir el progreso de la partida.',
      canExecute: (player, state, players) =>
        player.resources >= 2 && players.some(p => p.seat !== player.seat && p.vp >= player.vp),
      evaluateUtility: () => 18,
      execute: (player, state, players) => {
        player.resources -= 2;
        const rival = players.filter(p => p.seat !== player.seat).sort((a, b) => b.vp - a.vp)[0];
        if (rival && rival.shield > 0) {
          rival.shield -= 1;
          player.vp += 1;
          return `Disputa amortiguada por escudo de ${rival.name} (+1 PV)`;
        }
        if (rival && rival.resources > 0) {
          rival.resources -= 1;
          player.resources += 1;
        }
        player.vp += 2;
        return `Gana Disputa contra ${rival ? rival.name : 'rival'} (+2 PV y roba 1 rec.)`;
      }
    }
  ],
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
