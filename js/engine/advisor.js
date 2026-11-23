/**
 * js/engine/advisor.js
 * Genera diagnósticos accionables, correcciones de errores de diseño e ideas creativas
 * a partir de las métricas de simulación y la auditoría de reglas.
 */

export function generateDesignAdvice(analysis, gameModule) {
  const recommendations = [];

  if (gameModule.id === 'la_tercera_ipa' && gameModule.customAuditData) {
    recommendations.push(
      {
        severity: 'ok',
        badge: 'Stock de 84 Fichas Resuelto',
        title: 'Con pintas de 3-4 ingredientes (~10 fichas/jugador), las 84 fichas alcanzan perfectamente para 4-6 jugadores',
        description: 'Las 12 Cartas de Bar suman ahora 16 Lúpulos (hay 25), 9 Maltas (hay 21) y 7 Levaduras (hay 12). Incluso en partidas de 6 jugadores reñidas (~60 fichas cerradas en vasos), siempre quedan fichas suficientes en circulación.',
        fix: 'El tamaño de las recetas (4 para IPA Clásica y 3 para las especiales) está muy bien calibrado para partidas de 35-45 minutos.'
      },
      {
        severity: 'high',
        badge: 'Bloqueo de Mazo en 6 Jugadores',
        title: 'Con 12 Cartas de Bar y 2 por jugador, en 6 jugadores el mazo empieza en 0 y faltan cartas para la 3.ª pinta',
        description: 'Al repartir 2 Cartas de Bar a 6 jugadores (6 × 2 = 12), el mazo queda vacío desde el inicio. Cuando un jugador completa su 1.ª pinta y descarta su carta ("robando una nueva del mazo de Bar si quedan"), no roba nada; al cerrar su 2.ª pinta se queda con 0 Cartas de Bar y no tiene objetivo propio para cerrar la 3.ª pinta.',
        fix: 'Añade en la Sección 4: "Si el mazo de Cartas de Bar se agota, baraja las Cartas de Bar descartadas para formar un nuevo mazo de robo" (o amplía el mazo a 18-24 Cartas de Bar).'
      },
      {
        severity: 'medium',
        badge: 'Acción 3 (Comerciar) Inútil frente a Acción 1 (Cosechar)',
        title: 'Comerciar (1 por 1 del Mercado) es inferior a Cosechar (2 gratis del Mercado)',
        description: 'Si tienes menos de 4 fichas en tu reserva, Cosechar te da 2 fichas del Mercado sin entregar nada; Comerciar gasta tu turno entero para cambiar 1 ficha y quedarte con las mismas.',
        fix: 'Haz que Comerciar permita negociar 1×1 / 2×1 con otros jugadores, o cambiar hasta 2 fichas tuyas por 2 del Mercado.'
      },
      {
        severity: 'medium',
        badge: 'Acción 5 (Renovar el Mercado) Muy Punitiva',
        title: 'Renovar el Mercado consume tu turno entero sin darte ninguna ficha',
        description: 'Gastar tu única acción en cambiar las 5 fichas del Mercado beneficia al jugador sentado a tu izquierda mientras tú pierdes el turno.',
        fix: 'Tras renovar las 5 fichas del Mercado, permite robar 1 ficha del nuevo Mercado.'
      },
      {
        severity: 'idea',
        badge: 'Aclaración de Pedidos Públicos',
        title: '¿Qué ocurre al completar el pedido boca arriba de otro jugador?',
        description: 'La sección 2.2 menciona "cubrir los pedidos públicos de la mesa", pero la sección 4 solo habla de "cualquiera de tus Cartas de Bar". Conviene aclarar si son solo tus 2 cartas o si hay un mercado común de pedidos.',
        fix: 'Especifica que solo puedes completar tus 2 Cartas de Bar (o pon 4 Cartas de Bar comunes en el centro de la mesa).'
      }
    );
  }

  // 1. Detección de bucles infinitos o partidas estancadas
  const stalledCounts = analysis.scalingRows.filter(r => r.stallRate > 0.02);
  if (stalledCounts.length > 0) {
    const worst = stalledCounts.sort((a, b) => b.stallRate - a.stallRate)[0];
    recommendations.push({
      severity: 'high',
      badge: 'Error Crítico de Fin de Partida',
      title: `Partidas que no terminan nunca o se atascan (${Math.round(worst.stallRate * 100)}% en ${worst.numPlayers}J)`,
      description: `En ${worst.numPlayers} jugadores, el ${Math.round(worst.stallRate * 100)}% de las partidas superaron el límite de rondas sin que nadie cumpliera la condición de victoria. Esto ocurre cuando la destrucción de recursos/puntos o la escasez bloquea el avance.`,
      fix: `Añade un "Reloj de Partida" inevitable: por ejemplo, un mazo de eventos o reserva de fichas que al agotarse dispare el final, o limita la pérdida de Puntos de Victoria para que el progreso neto sea siempre positivo.`
    });
  }

  // 2. Ventaja del primer jugador (o último jugador)
  const biasedCounts = analysis.scalingRows.filter(r => Math.abs(r.firstSeatDeviation) > 0.09);
  if (biasedCounts.length > 0) {
    const worst = biasedCounts.sort((a, b) => Math.abs(b.firstSeatDeviation) - Math.abs(a.firstSeatDeviation))[0];
    const isFirstFavored = worst.firstSeatDeviation > 0;
    recommendations.push({
      severity: 'high',
      badge: 'Desequilibrio de Asiento',
      title: isFirstFavored
        ? `Fuerte ventaja del Primer Jugador en ${worst.numPlayers} jugadores (${Math.round(worst.firstSeatWinRate * 100)}% victorias)`
        : `Desventaja por abrir turno en ${worst.numPlayers} jugadores (${Math.round(worst.firstSeatWinRate * 100)}% victorias)`,
      description: `La probabilidad teórica de ganar en ${worst.numPlayers}J debería rondar el ${Math.round(worst.expectedWinRate * 100)}%, pero el Asiento 1 se desvía en ${Math.round(Math.abs(worst.firstSeatDeviation) * 100)} puntos porcentuales.`,
      fix: isFirstFavored
        ? `Activa dos parches clásicos: 1) Cuando alguien alcance ${gameModule.winCondition.targetVP} PV, termina la ronda completa para que todos tengan el mismo número de turnos. 2) Otorga +1 recurso inicial a partir del 3º asiento.`
        : `El primer jugador actúa a ciegas o sufre los ataques del resto. Otorga al jugador inicial una ficha de "Iniciativa" o descuento en su primera acción.`
    });
  }

  // 3. Reglas huérfanas, inútiles o inalcanzables
  for (const act of analysis.actionAudit) {
    if (act.id === 'pass_turn') continue;
    if (act.status === 'Regla Inalcanzable' || act.status === 'Regla Huérfana / Inútil') {
      recommendations.push({
        severity: 'medium',
        badge: 'Regla Sin Sentido / Huérfana',
        title: `La acción "${act.name}" apenas aporta al juego (uso del ${(act.pickShare * 100).toFixed(1)}%)`,
        description: `Los jugadores casi nunca eligen "${act.name}". ${act.note} Si una regla ocupa espacio en el manual pero no se usa en mesa, añade carga cognitiva sin diversión.`,
        fix: `Opciones de rediseño: A) Reduce su requisito/coste a la mitad. B) Combínala como efecto secundario gratuito de otra acción menos popular. C) Elimínala del reglamento para agilizar el juego.`
      });
    } else if (act.status === 'Dominante / Spameada' || act.status === 'Posible Acción Rota (OP)') {
      recommendations.push({
        severity: 'high',
        badge: 'Mecánica Dominante (OP)',
        title: `La acción "${act.name}" eclipsa al resto de opciones (${(act.pickShare * 100).toFixed(1)}% de los turnos)`,
        description: `Repetir "${act.name}" constantemente es demasiado eficiente. Cuando una sola opción es claramente superior, el juego se vuelve repetitivo y automático ("piloto automático").`,
        fix: `Introduce rendimientos decrecientes o enfriamiento (cooldown): encarece su coste cada vez que se repite en rondas consecutivas, o limita sus usos mediante fichas de agotamiento.`
      });
    }
  }

  // 4. Efecto Bola de Nieve (Runaway Leader / Falta de emoción al final)
  if (analysis.averages.avgComebackRate < 0.25) {
    recommendations.push({
      severity: 'medium',
      badge: 'Aburrimiento / Bola de Nieve',
      title: `Quien va ganando a mitad de partida gana el ${Math.round((1 - analysis.averages.avgComebackRate) * 100)}% de las veces`,
      description: `El líder a mitad de partida casi siempre consolida su ventaja sin que los demás puedan remontar. Esto hace que la segunda mitad de la partida se sienta decidida y aburrida para quienes van detrás.`,
      fix: `Añade una mecánica de "Catch-up" (Rebufo) o costes progresivos: por ejemplo, mantener muchos puntos/territorios tiene un pequeño coste de mantenimiento, o los eventos afectan más al líder actual.`
    });
  }

  // 5. Turnos muertos ("Pasar sin hacer nada")
  if (analysis.averages.avgDeadTurnRate > 0.12) {
    recommendations.push({
      severity: 'medium',
      badge: 'Frustración en Mesa',
      title: `Exceso de turnos vacíos o de "pasar" (${Math.round(analysis.averages.avgDeadTurnRate * 100)}% de los turnos)`,
      description: `Más de 1 de cada 8 turnos termina con el jugador pasando o haciendo una acción residual porque no puede pagar nada. Esperar a que te toque para no poder jugar genera desconexión.`,
      fix: `Transforma la acción de "Pasar / Descansar" en una decisión interesante: permitir robar 2 recursos + cambiar una carta o ganar un escudo temporal.`
    });
  }

  // 6. Escalado en números altos de jugadores (5-6J)
  const highCountRow = analysis.scalingRows.find(r => r.numPlayers >= 5);
  const lowCountRow = analysis.scalingRows.find(r => r.numPlayers === 2);
  if (highCountRow && lowCountRow && highCountRow.estimatedMinutes > lowCountRow.estimatedMinutes * 2.2) {
    recommendations.push({
      severity: 'idea',
      badge: 'Idea de Escalado (5-6 Jugadores)',
      title: `Entreturno largo en ${highCountRow.numPlayers} jugadores (~${highCountRow.estimatedMinutes} min estimados)`,
      description: `Al pasar de 2 a ${highCountRow.numPlayers} jugadores, el tiempo de espera entre turnos crece más del doble. Los jugadores pueden distraerse mientras esperan.`,
      fix: `Idea de diseño: Permite una "Reacción Rápida" o comercio pasivo durante el turno de otros jugadores en partidas de 5+ personas, o reduce la meta de Puntos de Victoria en 20% para 5-6 jugadores.`
    });
  }

  // 7. Vacíos en el reglamento estático
  const failedChecks = analysis.staticChecklist.filter(c => !c.passed);
  for (const check of failedChecks) {
    recommendations.push({
      severity: 'idea',
      badge: 'Laguna en Reglamento',
      title: `Revisión de manual: ${check.title}`,
      description: check.detail,
      fix: `Añade un párrafo explícito en las instrucciones cubriendo este punto para evitar discusiones en la mesa durante las pruebas.`
    });
  }

  // 8. Si el juego está muy bien equilibrado, dar ideas de rejugabilidad
  if (recommendations.length <= 1) {
    recommendations.push({
      severity: 'ok',
      badge: 'Diseño Sólido',
      title: '¡Motor matemático muy equilibrado y con buen ritmo!',
      description: 'Las tasas de victoria por asiento, variedad de estrategias y curva de tensión están dentro de los parámetros ideales de un juego de mesa moderno.',
      fix: 'Siguiente paso sugerido: Puedes introducir objetivos secretos de final de partida o poderes asimétricos de inicio para multiplicar la rejugabilidad.'
    });
  }

  return recommendations;
}
