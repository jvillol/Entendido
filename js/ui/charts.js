/**
 * js/ui/charts.js
 * Generadores visuales limpios para gráficos de barras comparativos, curvas de tensión y uso de mecánicas.
 */

export function renderSeatWinRateChart(container, scalingRows) {
  if (!scalingRows || scalingRows.length === 0) {
    container.innerHTML = '<p class="helper-text">Sin datos de simulación.</p>';
    return;
  }

  // Mostrar comparativa de tasa de victoria por asiento para el conteo de 4 jugadores (o el mayor disponible)
  const targetRow = scalingRows.find(r => r.numPlayers === 4) || scalingRows[scalingRows.length - 1];
  const expectedPct = (targetRow.expectedWinRate * 100).toFixed(1);

  let html = `<div class="helper-text" style="margin-bottom:8px;">
    Distribución en <strong>${targetRow.numPlayers} Jugadores</strong> (Esperado ideal por asiento: <strong>${expectedPct}%</strong>)
  </div>`;

  targetRow.seatWinRates.forEach((rate, idx) => {
    const pct = (rate * 100).toFixed(1);
    const diff = rate - targetRow.expectedWinRate;
    let color = 'var(--status-ok)';
    if (Math.abs(diff) > 0.12) color = 'var(--status-danger)';
    else if (Math.abs(diff) > 0.07) color = 'var(--status-warn)';

    const width = Math.min(100, Math.max(4, rate * 100 * (targetRow.numPlayers / 2)));

    html += `
      <div class="bar-row">
        <div class="bar-label-line">
          <span>Asiento #${idx + 1} ${idx === 0 ? '(Jugador Inicial)' : idx === targetRow.numPlayers - 1 ? '(Último Turno)' : ''}</span>
          <strong>${pct}% victorias</strong>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${width}%; background: ${color};"></div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

export function renderStrategyWinRateChart(container, scalingRows) {
  if (!scalingRows || scalingRows.length === 0) return;

  // Agregar victorias por arquetipo en todos los conteos
  const agg = {};
  for (const row of scalingRows) {
    for (const s of row.stratList) {
      if (!agg[s.id]) {
        agg[s.id] = { name: s.name, wins: 0, appearances: 0 };
      }
      agg[s.id].wins += s.wins;
      agg[s.id].appearances += s.appearances;
    }
  }

  const list = Object.values(agg)
    .map(s => ({
      ...s,
      winRate: s.appearances > 0 ? s.wins / s.appearances : 0
    }))
    .sort((a, b) => b.winRate - a.winRate);

  let html = '';
  list.forEach((s, idx) => {
    const pct = (s.winRate * 100).toFixed(1);
    const color = idx === 0 && s.winRate > 0.42
      ? 'var(--status-warn)'
      : 'var(--accent-primary)';
    const width = Math.min(100, Math.max(5, s.winRate * 180));

    html += `
      <div class="bar-row">
        <div class="bar-label-line">
          <span>${s.name}</span>
          <strong>${pct}% tasa victoria</strong>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${width}%; background: ${color};"></div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

export function renderFunAndTensionChart(container, scalingRows) {
  let html = '';
  for (const row of scalingRows) {
    const comebackPct = Math.round(row.comebackRate * 100);
    const closePct = Math.round(row.closeFinishRate * 100);
    const color = comebackPct >= 30 ? 'var(--status-ok)' : 'var(--status-warn)';

    html += `
      <div class="bar-row">
        <div class="bar-label-line">
          <span><strong>${row.numPlayers} Jugadores</strong> — Remontadas: ${comebackPct}% | Finales Reñidos: ${closePct}%</span>
          <span>${row.avgLeadChanges} cambios de líder/partida</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${Math.min(100, comebackPct)}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

export function renderDurationAndDeadTurnsChart(container, scalingRows) {
  let html = '';
  for (const row of scalingRows) {
    const deadPct = Math.round(row.deadTurnRate * 100);
    const stallPct = Math.round(row.stallRate * 100);
    const color = stallPct > 5
      ? 'var(--status-danger)'
      : (deadPct > 15 ? 'var(--status-warn)' : 'var(--accent-secondary)');

    html += `
      <div class="bar-row">
        <div class="bar-label-line">
          <span><strong>${row.numPlayers} Jugadores</strong> (~${row.estimatedMinutes} min / ${row.avgRounds} rondas)</span>
          <span>Turnos vacíos: ${deadPct}% | Atascos: ${stallPct}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${Math.min(100, Math.max(8, row.estimatedMinutes))}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}
