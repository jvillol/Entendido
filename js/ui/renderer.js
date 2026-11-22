/**
 * js/ui/renderer.js
 * Renderiza todos los paneles del dashboard de Entendido con los datos del simulador y analizador.
 */

import {
  renderSeatWinRateChart,
  renderStrategyWinRateChart,
  renderFunAndTensionChart,
  renderDurationAndDeadTurnsChart
} from './charts.js';

export function renderDashboard(simReport, analysis, recommendations, gameModule) {
  // Cabecera
  document.getElementById('activeGameTitle').textContent = gameModule.name;
  document.getElementById('gameShortDesc').textContent = gameModule.shortDescription;
  document.getElementById('simTimestamp').textContent =
    `Simulado a las ${simReport.timestamp} (${simReport.config.iterationsPerCount} partidas × ${simReport.config.playerCounts.length} formatos)`;

  // Veredicto Global
  const verdictBox = document.getElementById('globalVerdictContainer');
  let globalBadge = 'badge-ok';
  let globalLabel = 'Listo para Mesa';
  if (analysis.overallScore < 58) {
    globalBadge = 'badge-danger';
    globalLabel = 'Requiere Ajustes Críticos';
  } else if (analysis.overallScore < 78) {
    globalBadge = 'badge-warn';
    globalLabel = 'Jugable con Desajustes';
  }
  verdictBox.innerHTML = `
    <div style="text-align:right;">
      <span class="badge ${globalBadge}" style="font-size:13px; padding:6px 14px;">
        Índice Global de Calidad: ${analysis.overallScore}/100 — ${globalLabel}
      </span>
    </div>
  `;

  // 4 KPIs Principales
  renderHealthKpis(analysis.kpis);

  // Gráficos Pestaña 1 (Equilibrio)
  renderSeatWinRateChart(document.getElementById('seatWinRateChart'), analysis.scalingRows);
  renderStrategyWinRateChart(document.getElementById('strategyWinRateChart'), analysis.scalingRows);
  renderScalingTable(analysis.scalingRows);

  // Gráficos Pestaña 2 (Entretenimiento y Ritmo)
  renderFunAndTensionChart(document.getElementById('funMetricsChart'), analysis.scalingRows);
  renderDurationAndDeadTurnsChart(document.getElementById('durationMetricsChart'), analysis.scalingRows);
  renderExperienceBreakdown(analysis);

  // Pestaña 3 (Auditoría de Reglas)
  renderRuleUsageTable(analysis.actionAudit);
  renderStaticChecklist(analysis.staticChecklist);
  renderCustomComponentAudit(gameModule.customAuditData);

  // Pestaña 4 (Ideas, Errores y Parches)
  renderAdvisorCards(recommendations);

  // Pestaña 5 (Instrucciones y Mecánicas Detectadas)
  renderParsedMechanics(gameModule);

  // Pestaña 6 (Crónica de Partidas)
  renderMatchLogsSelector(simReport.sampleMatches);
}

function renderHealthKpis(kpis) {
  const items = [
    {
      label: 'Equilibrio y Justicia',
      score: kpis.balanceScore,
      sub: 'Simetría de asientos y variedad de estrategias'
    },
    {
      label: 'Diversión y Tensión',
      score: kpis.funScore,
      sub: 'Capacidad de remontada y finales emocionantes'
    },
    {
      label: 'Ritmo y Fluidez',
      score: kpis.pacingScore,
      sub: 'Ausencia de bucles, atascos o turnos muertos'
    },
    {
      label: 'Coherencia de Reglas',
      score: kpis.rulesScore,
      sub: 'Sin acciones huérfanas ni mecánicas rotas (OP)'
    }
  ];

  const grid = document.getElementById('healthKpiGrid');
  grid.innerHTML = items.map(item => {
    const color = item.score >= 78
      ? 'var(--status-ok)'
      : (item.score >= 58 ? 'var(--status-warn)' : 'var(--status-danger)');
    return `
      <div class="kpi-card">
        <div class="kpi-header">
          <span>${item.label}</span>
          <span style="color:${color}; font-weight:700;">${item.score}/100</span>
        </div>
        <div class="kpi-value">${item.score}<span style="font-size:15px; color:var(--text-muted); font-weight:500;">/100</span></div>
        <div class="kpi-bar">
          <div class="kpi-bar-fill" style="width:${item.score}%; background:${color};"></div>
        </div>
        <div class="kpi-sub">${item.sub}</div>
      </div>
    `;
  }).join('');
}

function renderScalingTable(rows) {
  const tbody = document.querySelector('#scalingComparisonTable tbody');
  tbody.innerHTML = rows.map(r => {
    const devSign = r.firstSeatDeviation >= 0 ? '+' : '';
    const devPct = `${devSign}${Math.round(r.firstSeatDeviation * 100)}%`;
    return `
      <tr>
        <td><strong>${r.numPlayers} Jugadores</strong></td>
        <td>${r.iterations}</td>
        <td>${r.avgRounds} rondas (~${r.estimatedMinutes} min)</td>
        <td>Asiento 1: <strong>${Math.round(r.firstSeatWinRate * 100)}%</strong> (${devPct} vs ideal)</td>
        <td>${r.topStrategy.name} (${Math.round(r.topStrategy.winRate * 100)}%)</td>
        <td>${Math.round(r.stallRate * 100)}% atasco / ${Math.round(r.deadTurnRate * 100)}% vacío</td>
        <td><span class="badge ${r.verdictClass}">${r.verdict}</span></td>
      </tr>
    `;
  }).join('');
}

function renderExperienceBreakdown(analysis) {
  const container = document.getElementById('experienceBreakdownGrid');
  const comebackPct = Math.round(analysis.averages.avgComebackRate * 100);
  const closePct = Math.round(analysis.averages.avgCloseFinishRate * 100);
  const deadPct = Math.round(analysis.averages.avgDeadTurnRate * 100);
  const stallPct = Math.round(analysis.averages.avgStallRate * 100);

  container.innerHTML = `
    <div class="metric-tile">
      <h4>Índice de Remontada</h4>
      <div class="tile-val">${comebackPct}%</div>
      <p>Partidas donde quien iba perdiendo a mitad de partida logra remontar y ganar.</p>
    </div>
    <div class="metric-tile">
      <h4>Finales de Infarto (Margen &le;15%)</h4>
      <div class="tile-val">${closePct}%</div>
      <p>Frecuencia con la que el 1º y 2º puesto terminan a muy pocos puntos de diferencia.</p>
    </div>
    <div class="metric-tile">
      <h4>Ratio de Turnos Vacíos</h4>
      <div class="tile-val">${deadPct}%</div>
      <p>Turnos en los que un jugador no puede hacer nada relevante o se ve obligado a pasar.</p>
    </div>
    <div class="metric-tile">
      <h4>Riesgo de Bucle / Partida Infinita</h4>
      <div class="tile-val">${stallPct}%</div>
      <p>Partidas que alcanzan el límite máximo de turnos sin que nadie logre ganar.</p>
    </div>
  `;
}

function renderRuleUsageTable(actionAudit) {
  const container = document.getElementById('ruleUsageTableContainer');
  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Acción / Regla</th>
          <th>Categoría</th>
          <th>Frecuencia Global</th>
          <th>Peso en Ganadores</th>
          <th>Diagnóstico</th>
        </tr>
      </thead>
      <tbody>
        ${actionAudit.map(a => `
          <tr>
            <td>
              <strong>${a.name}</strong>
              <div class="helper-text">${a.description}</div>
            </td>
            <td><code>${a.category}</code></td>
            <td><strong>${(a.pickShare * 100).toFixed(1)}%</strong> (${a.timesChosen} usos)</td>
            <td>${(a.winnerShare * 100).toFixed(1)}% por el ganador</td>
            <td>
              <span class="badge ${a.statusClass}">${a.status}</span>
              <div class="helper-text" style="margin-top:4px;">${a.note}</div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderStaticChecklist(checks) {
  const container = document.getElementById('staticRuleChecklist');
  container.innerHTML = checks.map(c => `
    <div class="check-item">
      <div class="check-icon">${c.passed ? '✅' : '⚠️'}</div>
      <div>
        <strong>${c.title}</strong>
        <p class="helper-text">${c.detail}</p>
      </div>
    </div>
  `).join('');
}

function renderCustomComponentAudit(auditData) {
  const container = document.getElementById('customComponentAuditSection');
  if (!container) return;
  if (!auditData) {
    container.innerHTML = '';
    return;
  }

  const ingRows = auditData.ingredientAudits.map(ing => `
    <tr>
      <td><strong>${ing.name}</strong> <span class="badge badge-accent">${ing.type}</span></td>
      <td><strong>${ing.count}</strong> fichas</td>
      <td>${ing.totalDemand12} en las 12 cartas</td>
      <td>Media: <strong>${ing.avgDemand6P}</strong> (Máx: <strong>${ing.maxDemand6P}</strong>)</td>
      <td><span class="badge ${ing.verdictClass}">${ing.verdict}</span></td>
    </tr>
  `).join('');

  const cardRows = auditData.cardAudits.map(c => {
    const ingSummary = Object.entries(c.totals)
      .map(([k, v]) => `${v}× ${k.replace('_', ' ')}`)
      .join(', ');
    const difficultyBadge = c.scarcityScore >= 60
      ? '<span class="badge badge-danger">Alta Dificultad (Cuello de botella)</span>'
      : (c.scarcityScore >= 48
          ? '<span class="badge badge-warn">Dificultad Media-Alta</span>'
          : '<span class="badge badge-ok">Equilibrada</span>');

    return `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.recipeNames.join(' + ')}</td>
        <td><code>${ingSummary}</code></td>
        <td><strong>${c.scarcityScore}</strong> pts</td>
        <td>
          ${difficultyBadge}
          ${c.bottlenecks.length ? `<div class="helper-text" style="margin-top:3px;">⚠️ Exige: ${c.bottlenecks.join(', ')}</div>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="panel-grid-2">
      <div class="card">
        <div class="card-header">
          <h3>Auditoría Matemática del Mazo de Ingredientes (${auditData.totalTiles} Fichas)</h3>
          <p>Oferta en la caja vs. Demanda real cuando los jugadores bloquean fichas dentro de sus vasos.</p>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>En Caja</th>
                <th>Demanda Total (12 Cartas)</th>
                <th>Demanda en 6 Jugadores</th>
                <th>Diagnóstico de Stock</th>
              </tr>
            </thead>
            <tbody>${ingRows}</tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Auditoría de Simetría de las 12 Cartas de Bar</h3>
          <p>Compara la dificultad real de completar cada Carta de Bar según la escasez de los ingredientes que pide.</p>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Carta</th>
                <th>3 Recetas (4 + 3 + 3)</th>
                <th>Total Ingredientes (10)</th>
                <th>Índice Escasez</th>
                <th>Equilibrio de Carta</th>
              </tr>
            </thead>
            <tbody>${cardRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderAdvisorCards(recommendations) {
  const container = document.getElementById('advisorCardsContainer');
  container.innerHTML = recommendations.map(rec => {
    const badgeClass = rec.severity === 'high'
      ? 'badge-danger'
      : (rec.severity === 'medium' ? 'badge-warn' : (rec.severity === 'ok' ? 'badge-ok' : 'badge-info'));

    return `
      <div class="advisor-card severity-${rec.severity}">
        <div class="advisor-title">
          <span>${rec.title}</span>
          <span class="badge ${badgeClass}">${rec.badge}</span>
        </div>
        <p class="advisor-desc">${rec.description}</p>
        <div class="advisor-fix">
          <strong>Propuesta / Solución:</strong> ${rec.fix}
        </div>
      </div>
    `;
  }).join('');
}

function renderParsedMechanics(gameModule) {
  const container = document.getElementById('parsedMechanicsContainer');
  const warningsHtml = (gameModule.textWarnings && gameModule.textWarnings.length > 0)
    ? `<div class="advisor-card severity-medium" style="margin-bottom:14px;">
        <strong>Avisos detectados al leer el texto:</strong>
        <ul style="padding-left:18px; margin-top:6px; color:var(--text-secondary); font-size:12.5px;">
          ${gameModule.textWarnings.map(w => `<li>${w}</li>`).join('')}
        </ul>
      </div>`
    : '';

  container.innerHTML = `
    ${warningsHtml}
    <div class="metrics-detail-grid" style="margin-bottom:14px;">
      <div class="metric-tile">
        <h4>Condición de Victoria</h4>
        <div class="tile-val">${gameModule.winCondition.targetVP} PV</div>
        <p>${gameModule.winCondition.fixedRounds ? `Máximo ${gameModule.winCondition.fixedRounds} rondas` : 'Sin límite fijo de rondas'}</p>
      </div>
      <div class="metric-tile">
        <h4>Recursos Iniciales</h4>
        <div class="tile-val">${gameModule.initialState.resources}</div>
        <p>Compensación turno: +${gameModule.initialState.turnOrderCompensation}/asiento</p>
      </div>
    </div>
    <h4 style="margin-bottom:8px; font-size:13px; color:var(--text-secondary);">Acciones Simuladas en este Motor (${gameModule.actions.length}):</h4>
    <div class="checklist-container">
      ${gameModule.actions.map(a => `
        <div class="check-item">
          <div class="check-icon">⚙️</div>
          <div>
            <strong>${a.name}</strong> <span class="badge badge-accent">${a.category}</span>
            <p class="helper-text">${a.description}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export function renderMatchLogsSelector(sampleMatches) {
  const select = document.getElementById('sampleMatchSelect');
  if (!sampleMatches || sampleMatches.length === 0) {
    select.innerHTML = '<option>Sin partidas registradas</option>';
    return;
  }

  select.innerHTML = sampleMatches.map((m, idx) => {
    const tag = m.stalled
      ? '⚠️ ATASCADA/BUCLE'
      : (m.isCloseFinish ? '🔥 FINAL REÑIDO' : '✅ NORMAL');
    return `<option value="${idx}">${tag} — ${m.numPlayers}J (${m.rounds} rondas) — Ganador: ${m.winnerName}</option>`;
  }).join('');

  select.onchange = () => {
    const chosen = sampleMatches[Number(select.value)] || sampleMatches[0];
    renderSingleMatchLog(chosen);
  };

  renderSingleMatchLog(sampleMatches[0]);
}

function renderSingleMatchLog(match) {
  const viewer = document.getElementById('matchLogViewer');
  if (!match) return;

  const summaryHeader = `
    <div class="log-turn" style="background:rgba(99,102,241,0.12); border-radius:6px;">
      <div class="log-turn-header">
        RESUMEN DE PARTIDA (${match.numPlayers} Jugadores | ${match.rounds} Rondas | Cambios de líder: ${match.leadChanges})
      </div>
      <div class="log-event">
        Estado Final: <span class="${match.stalled ? 'log-warning' : 'log-highlight'}">
          ${match.stalled ? 'PARTIDA BLOQUEADA (Límite de turnos alcanzado sin ganador)' : `Victoria de ${match.winnerName} con ${match.winnerScore} PV (2º puesto: ${match.runnerUpScore} PV)`}
        </span>
      </div>
    </div>
  `;

  const roundsHtml = (match.log || []).map(r => `
    <div class="log-turn">
      <div class="log-turn-header">Ronda ${r.round}</div>
      ${r.events.map(ev => `<div class="log-event">• ${ev}</div>`).join('')}
    </div>
  `).join('');

  viewer.innerHTML = summaryHeader + roundsHtml;
}
