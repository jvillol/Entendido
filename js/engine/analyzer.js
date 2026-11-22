/**
 * js/engine/analyzer.js
 * Analiza los resultados del simulador Monte Carlo para puntuar los 4 pilares de calidad
 * de un juego de mesa: Equilibrio, Entretenimiento/Tensión, Ritmo/Fluidez y Coherencia de Reglas.
 */

export function analyzeSimulationResults(simReport, gameModule) {
  const counts = Object.keys(simReport.resultsByCount).map(Number);
  const scalingRows = [];

  let sumFirstPlayerBias = 0;
  let sumStallRate = 0;
  let sumDeadTurnRate = 0;
  let sumComebackRate = 0;
  let sumCloseFinishRate = 0;
  let sumStrategySpread = 0;

  for (const n of counts) {
    const res = simReport.resultsByCount[n];
    const validGames = Math.max(1, res.completedGames);
    const avgRounds = res.totalRounds / res.iterations;
    const estimatedMinutes = Math.round(avgRounds * n * (gameModule.minutesPerPlayerTurn || 1.2));

    // Ventaja del primer jugador respecto a la esperanza matemática (1 / n)
    const expectedWinRate = 1 / n;
    const firstSeatWinRate = res.seatWins[0] / validGames;
    const lastSeatWinRate = res.seatWins[n - 1] / validGames;
    const firstSeatDeviation = firstSeatWinRate - expectedWinRate;

    sumFirstPlayerBias += Math.abs(firstSeatDeviation);

    // Estrategia dominante en este número de jugadores
    const stratList = Object.values(res.strategyStats)
      .filter(s => s.appearances > 0)
      .map(s => ({
        ...s,
        winRate: s.wins / s.appearances
      }))
      .sort((a, b) => b.winRate - a.winRate);

    const topStrat = stratList[0] || { name: 'N/A', winRate: expectedWinRate };
    const bottomStrat = stratList[stratList.length - 1] || { name: 'N/A', winRate: expectedWinRate };
    const stratSpread = topStrat.winRate - bottomStrat.winRate;
    sumStrategySpread += stratSpread;

    const stallRate = res.stalledGames / res.iterations;
    const deadTurnRate = res.totalDeadTurns / Math.max(1, res.totalPlayerTurns);
    const comebackRate = 1 - (res.midGameLeaderWins / validGames);
    const closeFinishRate = res.closeFinishes / validGames;
    const avgLeadChanges = res.totalLeadChanges / validGames;

    sumStallRate += stallRate;
    sumDeadTurnRate += deadTurnRate;
    sumComebackRate += comebackRate;
    sumCloseFinishRate += closeFinishRate;

    // Veredicto para este conteo de jugadores
    let verdict = 'Óptimo';
    let verdictClass = 'badge-ok';
    const issues = [];

    if (stallRate > 0.05) {
      verdict = 'Riesgo de Bucle';
      verdictClass = 'badge-danger';
      issues.push(`${Math.round(stallRate * 100)}% partidas atascadas`);
    } else if (Math.abs(firstSeatDeviation) > 0.12) {
      verdict = 'Desbalance Turno';
      verdictClass = 'badge-warn';
      issues.push(`Asiento 1 gana ${Math.round(firstSeatWinRate * 100)}% (esp. ${Math.round(expectedWinRate * 100)}%)`);
    } else if (estimatedMinutes > (gameModule.targetDurationMax || 90)) {
      verdict = 'Lento / Pesado';
      verdictClass = 'badge-warn';
      issues.push(`Se alarga a ~${estimatedMinutes} min`);
    } else if (deadTurnRate > 0.18) {
      verdict = 'Mucho Turno Vacío';
      verdictClass = 'badge-warn';
      issues.push(`${Math.round(deadTurnRate * 100)}% turnos sin acción útil`);
    }

    scalingRows.push({
      numPlayers: n,
      iterations: res.iterations,
      avgRounds: avgRounds.toFixed(1),
      estimatedMinutes,
      expectedWinRate,
      firstSeatWinRate,
      lastSeatWinRate,
      firstSeatDeviation,
      seatWinRates: res.seatWins.map(w => w / validGames),
      topStrategy: topStrat,
      bottomStrategy: bottomStrat,
      stratList,
      stallRate,
      deadTurnRate,
      comebackRate,
      closeFinishRate,
      avgLeadChanges: avgLeadChanges.toFixed(1),
      earlyEliminationRate: res.earlyEliminations / res.iterations,
      verdict,
      verdictClass,
      issues
    });
  }

  const numCounts = Math.max(1, counts.length);
  const avgFirstPlayerBias = sumFirstPlayerBias / numCounts;
  const avgStallRate = sumStallRate / numCounts;
  const avgDeadTurnRate = sumDeadTurnRate / numCounts;
  const avgComebackRate = sumComebackRate / numCounts;
  const avgCloseFinishRate = sumCloseFinishRate / numCounts;
  const avgStrategySpread = sumStrategySpread / numCounts;

  // Auditoría de uso de acciones (Reglas Huérfanas vs Acciones Rotas)
  const actionsList = Object.values(simReport.allActionStats);
  const totalChosenAll = Math.max(1, actionsList.reduce((acc, a) => acc + a.timesChosen, 0));

  const actionAudit = actionsList.map(act => {
    const pickShare = act.timesChosen / totalChosenAll;
    const pickRateWhenAvailable = act.timesAvailable > 0 ? act.timesChosen / act.timesAvailable : 0;
    const winnerShare = act.timesChosen > 0 ? act.chosenByWinners / act.timesChosen : 0;

    let status = 'Saludable';
    let statusClass = 'badge-ok';
    let note = 'Uso equilibrado e integrado en el flujo.';

    if (act.timesAvailable === 0) {
      status = 'Regla Inalcanzable';
      statusClass = 'badge-danger';
      note = 'La condición para usar esta regla nunca se cumplió en ninguna partida.';
    } else if (pickShare < 0.03 && act.id !== 'pass_turn') {
      status = 'Regla Huérfana / Inútil';
      statusClass = 'badge-warn';
      note = 'Casi ningún jugador la elige (<3% del total). Su coste es muy alto o su efecto irrelevante.';
    } else if (pickShare > 0.48 && actionsList.length >= 4) {
      status = 'Dominante / Spameada';
      statusClass = 'badge-danger';
      note = 'Acapara casi la mitad de todos los turnos, eclipsando otras decisiones.';
    } else if (winnerShare > 0.55 && pickShare > 0.15) {
      status = 'Posible Acción Rota (OP)';
      statusClass = 'badge-warn';
      note = 'Altísima concentración en los ganadores respecto al resto de la mesa.';
    }

    return {
      ...act,
      pickShare,
      pickRateWhenAvailable,
      winnerShare,
      status,
      statusClass,
      note
    };
  });

  // Cálculo de los 4 KPIs de salud (0 a 100)
  const deadOrBrokenActions = actionAudit.filter(a => a.status !== 'Saludable' && a.id !== 'pass_turn').length;

  const balanceScore = clampScore(
    100 - (avgFirstPlayerBias * 240) - (avgStrategySpread * 110)
  );

  const funScore = clampScore(
    100
    - (avgDeadTurnRate * 160)
    - (Math.max(0, 0.28 - avgComebackRate) * 140)
    - (Math.max(0, 0.20 - avgCloseFinishRate) * 110)
  );

  const pacingScore = clampScore(
    100 - (avgStallRate * 300) - (avgDeadTurnRate * 130)
  );

  const rulesScore = clampScore(
    100 - (deadOrBrokenActions * 18) - (avgStallRate * 200)
  );

  const overallScore = Math.round((balanceScore + funScore + pacingScore + rulesScore) / 4);

  return {
    overallScore,
    kpis: {
      balanceScore: Math.round(balanceScore),
      funScore: Math.round(funScore),
      pacingScore: Math.round(pacingScore),
      rulesScore: Math.round(rulesScore)
    },
    averages: {
      avgFirstPlayerBias,
      avgStallRate,
      avgDeadTurnRate,
      avgComebackRate,
      avgCloseFinishRate,
      avgStrategySpread
    },
    scalingRows,
    actionAudit,
    staticChecklist: evaluateStaticRulebookChecklist(gameModule)
  };
}

function clampScore(val) {
  return Math.max(5, Math.min(100, val));
}

/**
 * Audita si el diseño del juego contempla las reglas críticas que suelen olvidarse al redactar.
 */
function evaluateStaticRulebookChecklist(gameModule) {
  const checks = [
    {
      title: 'Compensación por Orden de Turno',
      passed: Boolean(gameModule.initialState.turnOrderCompensation > 0),
      detail: gameModule.initialState.turnOrderCompensation > 0
        ? `Cada asiento posterior recibe +${gameModule.initialState.turnOrderCompensation} recurso(s) inicial(es).`
        : 'Todos empiezan exactamente igual independientemente de si juegan 1º o últimos.'
    },
    {
      title: 'Criterio de Desempate Explícito',
      passed: Boolean(gameModule.winCondition.tieBreaker && gameModule.winCondition.tieBreaker !== 'none'),
      detail: gameModule.winCondition.tieBreaker && gameModule.winCondition.tieBreaker !== 'none'
        ? `Desempate definido por: ${gameModule.winCondition.tieBreaker}.`
        : 'No se especifica cómo resolver un empate a Puntos de Victoria.'
    },
    {
      title: 'Mecanismo Anti-Bloqueo / Fin de Partida Garantizado',
      passed: Boolean(gameModule.winCondition.fixedRounds || gameModule.hasGuaranteedProgression),
      detail: gameModule.winCondition.fixedRounds
        ? `Límite duro de ${gameModule.winCondition.fixedRounds} rondas máximas.`
        : (gameModule.hasGuaranteedProgression
            ? 'El progreso hacia la condición de victoria es irreversible.'
            : 'Los jugadores pueden perder puntos/recursos indefinidamente sin que la partida termine.')
    },
    {
      title: 'Cierre Equitativo de Última Ronda',
      passed: Boolean(gameModule.winCondition.finishRound),
      detail: gameModule.winCondition.finishRound
        ? 'Cuando se activa el final, se termina la ronda para que todos jueguen los mismos turnos.'
        : 'La partida termina en seco en el turno del jugador que alcanza la meta (ventaja al 1º jugador).'
    },
    {
      title: 'Escalado de Componentes / Reserva por Nº de Jugadores',
      passed: Boolean(gameModule.initialState.sharedPoolPerPlayer),
      detail: gameModule.initialState.sharedPoolPerPlayer
        ? `Reserva común escalada a ${gameModule.initialState.sharedPoolPerPlayer} por jugador.`
        : 'Reserva fija sin adaptar a 2 vs 5-6 jugadores.'
    }
  ];

  return checks;
}
