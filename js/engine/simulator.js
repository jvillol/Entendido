/**
 * js/engine/simulator.js
 * Motor Monte Carlo para simular cientos o miles de partidas con distintas
 * cantidades de jugadores y distintos arquetipos de decisión.
 */

export const PLAYER_ARCHETYPES = [
  { id: 'aggressive', name: 'Agresivo / Confrontación', bias: { attack: 1.7, score: 1.1, economy: 0.7, defense: 0.6 } },
  { id: 'economic', name: 'Económico / Motor', bias: { attack: 0.6, score: 1.0, economy: 1.8, defense: 1.0 } },
  { id: 'rush', name: 'Velocista (Rush Puntos)', bias: { attack: 0.9, score: 1.9, economy: 0.8, defense: 0.7 } },
  { id: 'defensive', name: 'Conservador / Control', bias: { attack: 0.5, score: 1.1, economy: 1.2, defense: 1.8 } },
  { id: 'tactical', name: 'Táctico / Óptimo', bias: { attack: 1.25, score: 1.45, economy: 1.35, defense: 1.15 } }
];

/**
 * Ejecuta una batería completa de simulaciones para un juego en múltiples conteos de jugadores.
 * @param {Object} gameModule - Definición y lógica del juego
 * @param {Object} config - { playerCounts: [2,3,4...], iterationsPerCount: 300, maxTurns: 100 }
 */
export function runMultiPlayerSimulation(gameModule, config) {
  const { playerCounts, iterationsPerCount, maxTurns } = config;
  const resultsByCount = {};
  const sampleMatches = [];
  const allActionStats = {};

  // Inicializar catálogo de acciones conocidas del juego
  for (const action of gameModule.actions) {
    allActionStats[action.id] = {
      id: action.id,
      name: action.name,
      category: action.category || 'general',
      description: action.description || '',
      timesAvailable: 0,
      timesChosen: 0,
      chosenByWinners: 0,
      chosenByLosers: 0
    };
  }

  for (const numPlayers of playerCounts) {
    const countSummary = {
      numPlayers,
      iterations: iterationsPerCount,
      completedGames: 0,
      stalledGames: 0,
      totalRounds: 0,
      minRounds: Infinity,
      maxRounds: 0,
      totalDeadTurns: 0,
      totalPlayerTurns: 0,
      totalLeadChanges: 0,
      midGameLeaderWins: 0,
      closeFinishes: 0,
      earlyEliminations: 0,
      seatWins: Array(numPlayers).fill(0),
      seatScores: Array(numPlayers).fill(0),
      strategyStats: {},
      actionStats: {},
      scoreDiffs: []
    };

    for (const arch of PLAYER_ARCHETYPES) {
      countSummary.strategyStats[arch.id] = {
        id: arch.id,
        name: arch.name,
        appearances: 0,
        wins: 0,
        totalScore: 0
      };
    }

    for (const action of gameModule.actions) {
      countSummary.actionStats[action.id] = { chosen: 0, available: 0 };
    }

    for (let i = 0; i < iterationsPerCount; i++) {
      const shouldRecordLog = i === 0 || i === iterationsPerCount - 1;
      const singleMatch = simulateSingleMatch(gameModule, numPlayers, maxTurns, shouldRecordLog);

      if (singleMatch.stalled) {
        countSummary.stalledGames++;
      } else {
        countSummary.completedGames++;
      }

      countSummary.totalRounds += singleMatch.rounds;
      countSummary.minRounds = Math.min(countSummary.minRounds, singleMatch.rounds);
      countSummary.maxRounds = Math.max(countSummary.maxRounds, singleMatch.rounds);
      countSummary.totalDeadTurns += singleMatch.deadTurns;
      countSummary.totalPlayerTurns += singleMatch.totalTurns;
      countSummary.totalLeadChanges += singleMatch.leadChanges;

      if (singleMatch.midGameLeaderWon) countSummary.midGameLeaderWins++;
      if (singleMatch.isCloseFinish) countSummary.closeFinishes++;
      if (singleMatch.hadEarlyElimination) countSummary.earlyEliminations++;

      countSummary.scoreDiffs.push(singleMatch.winnerMarginRatio);

      // Registrar victoria por asiento
      if (singleMatch.winnerSeat !== null) {
        countSummary.seatWins[singleMatch.winnerSeat]++;
      }

      // Estadísticas por jugador y estrategia
      singleMatch.players.forEach((p, seatIdx) => {
        countSummary.seatScores[seatIdx] += p.vp;
        const strat = countSummary.strategyStats[p.archetype.id];
        if (strat) {
          strat.appearances++;
          strat.totalScore += p.vp;
          if (seatIdx === singleMatch.winnerSeat) {
            strat.wins++;
          }
        }
      });

      // Estadísticas de uso de acciones/reglas
      for (const [actId, usage] of Object.entries(singleMatch.actionUsage)) {
        if (allActionStats[actId]) {
          allActionStats[actId].timesAvailable += usage.available;
          allActionStats[actId].timesChosen += usage.chosen;
          allActionStats[actId].chosenByWinners += usage.byWinner;
          allActionStats[actId].chosenByLosers += usage.byLoser;
        }
        if (countSummary.actionStats[actId]) {
          countSummary.actionStats[actId].available += usage.available;
          countSummary.actionStats[actId].chosen += usage.chosen;
        }
      }

      // Guardar crónicas interesantes (primera, una bloqueada si ocurre, una muy reñida)
      if (
        (i === 0) ||
        (singleMatch.stalled && sampleMatches.filter(m => m.stalled && m.numPlayers === numPlayers).length === 0) ||
        (singleMatch.leadChanges >= 4 && sampleMatches.filter(m => m.numPlayers === numPlayers).length < 3)
      ) {
        if (!singleMatch.log || singleMatch.log.length === 0) {
          // Re-ejecutar con log si fue un caso especial detectado sin log
          const loggedMatch = simulateSingleMatch(gameModule, numPlayers, maxTurns, true);
          sampleMatches.push(loggedMatch);
        } else {
          sampleMatches.push(singleMatch);
        }
      }
    }

    resultsByCount[numPlayers] = countSummary;
  }

  return {
    gameId: gameModule.id,
    gameName: gameModule.name,
    timestamp: new Date().toLocaleTimeString('es-ES'),
    config,
    resultsByCount,
    allActionStats,
    sampleMatches
  };
}

/**
 * Simula una partida individual paso a paso.
 */
function simulateSingleMatch(gameModule, numPlayers, maxTurns, recordLog = false) {
  // Asignar arquetipos variados a los asientos rotando para no sesgar asiento con estrategia
  const players = Array.from({ length: numPlayers }, (_, idx) => {
    const arch = PLAYER_ARCHETYPES[Math.floor(Math.random() * PLAYER_ARCHETYPES.length)];
    return {
      seat: idx,
      name: `J${idx + 1} (${arch.name.split(' ')[0]})`,
      archetype: arch,
      vp: gameModule.initialState.vp ?? 0,
      resources: gameModule.initialState.resources + (idx * (gameModule.initialState.turnOrderCompensation || 0)),
      engineLevel: gameModule.initialState.engineLevel ?? 1,
      shield: gameModule.initialState.shield ?? 0,
      cards: gameModule.initialState.cards ?? 2,
      eliminated: false,
      eliminatedAtRound: null,
      actionsTaken: {}
    };
  });

  const state = {
    round: 0,
    numPlayers,
    poolResources: (gameModule.initialState.sharedPoolPerPlayer || 8) * numPlayers,
    deckRemaining: gameModule.initialState.deckSize || 60,
    targetVP: gameModule.winCondition.targetVP || 20,
    maxFixedRounds: gameModule.winCondition.fixedRounds || null,
    customFlags: {}
  };

  const actionUsage = {};
  for (const act of gameModule.actions) {
    actionUsage[act.id] = { available: 0, chosen: 0, byWinner: 0, byLoser: 0 };
  }

  let currentLeader = null;
  let midGameLeader = null;
  let leadChanges = 0;
  let deadTurns = 0;
  let totalTurns = 0;
  let gameEnded = false;
  let stalled = false;
  const log = [];

  while (!gameEnded && state.round < maxTurns) {
    state.round++;
    const roundEvents = [];

    for (let pIdx = 0; pIdx < numPlayers; pIdx++) {
      const player = players[pIdx];
      if (player.eliminated) continue;

      totalTurns++;

      // Fase de mantenimiento / ingreso por ronda si aplica
      if (gameModule.onTurnStart) {
        gameModule.onTurnStart(player, state, players);
      }

      // Evaluar qué acciones están disponibles legalmente para este jugador
      const availableActions = gameModule.actions.filter(act =>
        act.canExecute(player, state, players)
      );

      availableActions.forEach(act => {
        actionUsage[act.id].available++;
      });

      if (availableActions.length === 0) {
        deadTurns++;
        if (recordLog && log.length < 70) {
          roundEvents.push(`⚠️ ${player.name} no tiene ninguna acción válida (Turno muerto / Bloqueo).`);
        }
        continue;
      }

      // Selección de acción ponderada por el arquetipo del jugador y utilidad esperada
      const chosenAction = chooseBestAction(availableActions, player, state, players);
      actionUsage[chosenAction.id].chosen++;
      player.actionsTaken[chosenAction.id] = (player.actionsTaken[chosenAction.id] || 0) + 1;

      const effectMsg = chosenAction.execute(player, state, players);
      if ( chosenAction.isPassOrNothing ) {
        deadTurns++;
      }

      if (recordLog && log.length < 70) {
        roundEvents.push(`${player.name} usa [${chosenAction.name}] → ${effectMsg} (PV: ${player.vp}, Rec: ${player.resources})`);
      }

      // Comprobar si la condición de fin de partida se dispara inmediatamente
      if (gameModule.checkEndCondition(state, players)) {
        gameEnded = true;
        if (!gameModule.winCondition.finishRound) break;
      }
    }

    // Seguimiento de cambios de líder para medir emoción / tensión
    const sortedByVP = [...players].filter(p => !p.eliminated).sort((a, b) => b.vp - a.vp);
    if (sortedByVP.length > 0) {
      const topScore = sortedByVP[0].vp;
      const secondScore = sortedByVP[1]?.vp ?? -999;
      if (topScore > secondScore && topScore > 0) {
        if (currentLeader !== null && currentLeader !== sortedByVP[0].seat) {
          leadChanges++;
        }
        currentLeader = sortedByVP[0].seat;
      }
    }

    // Capturar líder a mitad de partida esperada
    const expectedMid = Math.max(3, Math.floor((state.maxFixedRounds || 12) / 2));
    if (state.round === expectedMid && currentLeader !== null) {
      midGameLeader = currentLeader;
    }

    if (recordLog && roundEvents.length > 0 && log.length < 70) {
      log.push({
        round: state.round,
        events: roundEvents
      });
    }

    if (!gameEnded && gameModule.checkEndCondition(state, players)) {
      gameEnded = true;
    }
  }

  if (!gameEnded && state.round >= maxTurns) {
    stalled = true;
  }

  // Determinar ganador y márgenes
  const alivePlayers = players.filter(p => !p.eliminated);
  const ranking = (alivePlayers.length > 0 ? alivePlayers : players)
    .slice()
    .sort((a, b) => {
      if (b.vp !== a.vp) return b.vp - a.vp;
      if (gameModule.winCondition.tieBreaker === 'resources') {
        return b.resources - a.resources;
      }
      return 0;
    });

  const winner = ranking[0];
  const runnerUp = ranking[1] || ranking[0];
  const winnerSeat = stalled ? null : winner.seat;

  // Atribuir acciones a ganadores vs perdedores
  players.forEach(p => {
    const isWin = p.seat === winnerSeat;
    for (const [actId, count] of Object.entries(p.actionsTaken)) {
      if (isWin) {
        actionUsage[actId].byWinner += count;
      } else {
        actionUsage[actId].byLoser += count;
      }
    }
  });

  const maxScore = Math.max(1, winner.vp);
  const scoreGap = Math.max(0, winner.vp - runnerUp.vp);
  const winnerMarginRatio = scoreGap / maxScore;
  const isCloseFinish = !stalled && winnerMarginRatio <= 0.15;
  const midGameLeaderWon = !stalled && midGameLeader !== null && midGameLeader === winnerSeat;
  const hadEarlyElimination = players.some(p => p.eliminated && p.eliminatedAtRound < state.round * 0.6);

  return {
    numPlayers,
    rounds: state.round,
    totalTurns,
    deadTurns,
    stalled,
    leadChanges,
    winnerSeat,
    winnerName: stalled ? 'Nadie (Bucle/Atasco)' : winner.name,
    winnerScore: winner.vp,
    runnerUpScore: runnerUp.vp,
    winnerMarginRatio,
    isCloseFinish,
    midGameLeaderWon,
    hadEarlyElimination,
    players,
    actionUsage,
    log
  };
}

/**
 * Elige una acción basándose en los pesos heurísticos de la acción y el sesgo del arquetipo.
 */
function chooseBestAction(availableActions, player, state, players) {
  let totalWeight = 0;
  const weighted = availableActions.map(action => {
    const baseUtility = action.evaluateUtility
      ? action.evaluateUtility(player, state, players)
      : 10;
    const catBias = player.archetype.bias[action.category] || 1.0;
    // Ruido estocástico para explorar el espacio de decisiones
    const noise = 0.8 + Math.random() * 0.4;
    const weight = Math.max(0.1, baseUtility * catBias * noise);
    totalWeight += weight;
    return { action, weight };
  });

  let roll = Math.random() * totalWeight;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.action;
  }
  return weighted[weighted.length - 1].action;
}
