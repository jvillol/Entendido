/**
 * js/ui/gameSections.js
 * Gestor modular de Secciones por Juego.
 * Crea una sección dedicada para cada juego registrado en la web, con su ficha técnica,
 * configuración de jugadores recomendada, inventario de componentes, preparación,
 * estructura de turnos y acceso rápido a la simulación de sus partidas.
 */

/**
 * Renderiza el selector superior de Secciones de Juego para cambiar rápidamente de proyecto.
 */
export function renderGameSectionsHub(games, activeGameId, onSelectGame) {
  const container = document.getElementById('gameSectionsGrid');
  if (!container) return;

  container.innerHTML = games.map(game => {
    const isActive = game.id === activeGameId;
    const meta = getGameMetadata(game);

    return `
      <button type="button" class="game-section-card ${isActive ? 'active' : ''}" data-game-id="${game.id}">
        <div class="game-card-top">
          <span class="game-card-icon">${meta.icon}</span>
          <span class="badge ${meta.badgeClass}">${meta.statusBadge}</span>
        </div>
        <div class="game-card-title">${meta.cleanTitle}</div>
        <div class="game-card-meta">
          <span>👥 ${meta.playersLabel}</span>
          <span>⏱️ ${meta.durationLabel}</span>
        </div>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.game-section-card').forEach(card => {
    card.addEventListener('click', () => {
      const selectedId = card.dataset.gameId;
      if (onSelectGame) onSelectGame(selectedId);
    });
  });
}

/**
 * Renderiza la Sección Exclusiva del Juego Activo dentro de su pestaña dedicada (#tab-game-section).
 */
export function renderDedicatedGameSection(gameModule, onRunSimulationForCounts) {
  const container = document.getElementById('dedicatedGameSectionContainer');
  if (!container || !gameModule) return;

  const meta = getGameMetadata(gameModule);
  const sectionData = gameModule.dedicatedSection || buildFallbackSectionData(gameModule, meta);

  const inventoryHtml = sectionData.inventory.map(item => `
    <div class="inventory-item-box">
      <div>
        <strong>${item.name}</strong>
        ${item.detail ? `<div class="helper-text">${item.detail}</div>` : ''}
      </div>
      <span class="inventory-qty">${item.qty}</span>
    </div>
  `).join('');

  const setupHtml = sectionData.setupSteps.map((step, idx) => `
    <div class="rule-step-item">
      <span class="step-number">${idx + 1}</span>
      <div>
        <strong>${step.title}</strong>
        <p class="helper-text">${step.text}</p>
      </div>
    </div>
  `).join('');

  const actionsHtml = gameModule.actions.map((act, idx) => `
    <div class="rule-step-item">
      <span class="step-number">${idx + 1}</span>
      <div>
        <strong>${act.name}</strong> <span class="badge badge-accent">${act.category}</span>
        <p class="helper-text">${act.description}</p>
      </div>
    </div>
  `).join('');

  const customSubsectionsHtml = (sectionData.customCards || []).map(block => `
    <div class="card">
      <div class="card-header">
        <h3>${block.title}</h3>
        <p>${block.subtitle || ''}</p>
      </div>
      <div class="rule-step-list">
        ${block.items.map(it => `
          <div class="check-item">
            <div class="check-icon">${it.icon || '🔹'}</div>
            <div>
              <strong>${it.name}</strong> ${it.badge ? `<span class="badge badge-info">${it.badge}</span>` : ''}
              <p class="helper-text">${it.text}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="game-dedicated-banner">
      <div>
        <span class="badge ${meta.badgeClass}" style="margin-bottom:6px;">Sección Oficial del Juego</span>
        <h3 style="font-size:21px; font-weight:800;">${meta.icon} ${meta.cleanTitle}</h3>
        <p class="helper-text" style="max-width:760px; margin-top:4px;">${sectionData.objective}</p>
        <div class="banner-specs">
          <div class="spec-pill"><strong>Jugadores:</strong> ${meta.playersLabel}</div>
          <div class="spec-pill"><strong>Duración:</strong> ${meta.durationLabel}</div>
          <div class="spec-pill"><strong>Meta Victoria:</strong> ${sectionData.winTargetLabel}</div>
          <div class="spec-pill"><strong>Acciones por Turno:</strong> ${gameModule.actions.length} opciones</div>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; min-width:230px;">
        <button type="button" id="simRecommendedCountsBtn" class="btn btn-primary">
          ▶ Simular Rango Oficial (${meta.recommendedCounts.join(', ')}J)
        </button>
        <button type="button" id="openPlayVsAiFromBannerBtn" class="btn btn-secondary">
          🎮 Jugar Partida vs IA (POV Jugador)
        </button>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-header">
        <h3>📦 1. Inventario de Componentes de ${meta.cleanTitle}</h3>
        <p>Desglose completo de elementos físicos, mazos y fichas configurados para este juego.</p>
      </div>
      <div class="inventory-tag-grid">
        ${inventoryHtml}
      </div>
    </div>

    <div class="section-blocks-grid">
      <div class="card">
        <div class="card-header">
          <h3>🛠️ 2. Preparación de la Partida</h3>
          <p>Configuración inicial de mesa y escalado según el número de jugadores.</p>
        </div>
        <div class="rule-step-list">
          ${setupHtml}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>⚡ 3. Acciones del Turno en este Juego</h3>
          <p>Opciones que los jugadores simulados evalúan en cada ronda.</p>
        </div>
        <div class="rule-step-list">
          ${actionsHtml}
        </div>
      </div>
    </div>

    ${customSubsectionsHtml ? `<div class="section-blocks-grid">${customSubsectionsHtml}</div>` : ''}
  `;

  const simBtn = document.getElementById('simRecommendedCountsBtn');
  if (simBtn && onRunSimulationForCounts) {
    simBtn.addEventListener('click', () => {
      onRunSimulationForCounts(meta.recommendedCounts);
    });
  }

  const playVsAiBtn = document.getElementById('openPlayVsAiFromBannerBtn');
  if (playVsAiBtn) {
    playVsAiBtn.addEventListener('click', () => {
      const tabBtn = document.querySelector('.tab-btn[data-tab="tab-play-vs-ai"]');
      if (tabBtn) tabBtn.click();
    });
  }
}

/**
 * Extrae metadatos homogéneos de cualquier módulo de juego para sus tarjetas de sección.
 */
export function getGameMetadata(game) {
  if (game.sectionMeta) {
    return game.sectionMeta;
  }

  if (game.id === 'la_tercera_ipa') {
    return {
      icon: '🍺',
      cleanTitle: 'LA TERCERA IPA',
      statusBadge: 'Juego Principal',
      badgeClass: 'badge-ok',
      playersLabel: '4 a 6 Jugadores',
      durationLabel: '35 – 45 min',
      recommendedCounts: [4, 5, 6]
    };
  }

  if (game.id === 'flawed_prototype') {
    return {
      icon: '⚔️',
      cleanTitle: 'Señores del Acero',
      statusBadge: 'Prototipo con Errores',
      badgeClass: 'badge-danger',
      playersLabel: '2 a 6 Jugadores',
      durationLabel: '45 – 75 min',
      recommendedCounts: [2, 3, 4, 5]
    };
  }

  if (game.id === 'balanced_euro') {
    return {
      icon: '🏗️',
      cleanTitle: 'Arquitectos del Valle',
      statusBadge: 'Prototipo Calibrado',
      badgeClass: 'badge-info',
      playersLabel: '2 a 5 Jugadores',
      durationLabel: '40 – 65 min',
      recommendedCounts: [2, 3, 4, 5]
    };
  }

  return {
    icon: '📝',
    cleanTitle: game.name.replace(/\(.*\)/, '').trim(),
    statusBadge: 'Borrador Libre',
    badgeClass: 'badge-accent',
    playersLabel: '2 a 5 Jugadores',
    durationLabel: '30 – 60 min',
    recommendedCounts: [2, 3, 4]
  };
}

function buildFallbackSectionData(gameModule, meta) {
  return {
    objective: gameModule.shortDescription,
    winTargetLabel: `${gameModule.winCondition.targetVP} PV`,
    inventory: [
      { name: 'Recursos Iniciales', qty: `${gameModule.initialState.resources} / jugador`, detail: 'Dotación base al empezar' },
      { name: 'Reserva por Jugador', qty: `${gameModule.initialState.sharedPoolPerPlayer || 8} fichas`, detail: 'Escalado de reserva común' },
      { name: 'Compensación Turno', qty: `+${gameModule.initialState.turnOrderCompensation || 0}`, detail: 'Por orden de asiento' },
      { name: 'Acciones Registradas', qty: `${gameModule.actions.length}`, detail: 'Mecánicas en el motor' }
    ],
    setupSteps: [
      {
        title: 'Entrega de Recursos Iniciales',
        text: `Cada jugador comienza con ${gameModule.initialState.resources} recursos y ${gameModule.initialState.vp || 0} PV.`
      },
      {
        title: 'Compensación de Asiento',
        text: gameModule.initialState.turnOrderCompensation > 0
          ? `Cada jugador recibe +${gameModule.initialState.turnOrderCompensation} recurso adicional por puesto detrás del jugador inicial.`
          : 'Sin compensación inicial por orden de turno.'
      },
      {
        title: 'Condición de Fin de Partida',
        text: `La partida finaliza al alcanzar ${gameModule.winCondition.targetVP} PV${gameModule.winCondition.fixedRounds ? ` o tras ${gameModule.winCondition.fixedRounds} rondas` : ''}.`
      }
    ],
    customCards: []
  };
}
