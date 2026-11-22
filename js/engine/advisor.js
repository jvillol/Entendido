/**
 * js/engine/advisor.js
 * Genera diagnósticos accionables, correcciones de errores de diseño e ideas creativas
 * a partir de las métricas de simulación y la auditoría de reglas.
 */

export function generateDesignAdvice(analysis, gameModule) {
  const recommendations = [];

  // Diagnósticos específicos de componentes cuando el juego incluye auditoría matemática de cartas/fichas (ej. LA TERCERA IPA v2)
  if (gameModule.id === 'la_tercera_ipa' && gameModule.customAuditData) {
    recommendations.push(
      {
        severity: 'ok',
        badge: 'Mazo y Menús Reequilibrados (v2)',
        title: 'El ajuste de las 84 fichas y los 12 Menús resuelve los cuellos de botella críticos',
        description: 'Subir el Lúpulo a 25 (+3 Agua Pura = 28 efectivos), ajustar Pino/Resina a 4, Lactosa a 7 y modificar la Milkshake IPA para quitarle Lúpulo reduce drásticamente el riesgo de bloqueo en 6 jugadores. Además, "Maestro Cervecero" gratuita, "Trasvase" con el Mercado y "Renovar el Mercado" con 2 fichas eliminan las reglas muertas.',
        fix: 'Las mecánicas principales y la economía de fichas están ahora bien calibradas para 4, 5 y 6 jugadores.'
      },
      {
        severity: 'medium',
        badge: 'Detalle en Escalado de 4 Jugadores',
        title: 'En 4 jugadores (64 fichas) se retiran 8 Lúpulos y quedan 17 (+2 Agua Pura)',
        description: 'Si en una partida de 4 jugadores salen simultáneamente varios Menús con Double IPA (Menú 3, 8 y 9 piden 5 Lúpulos cada uno) más otro menú de 4 Lúpulos, la demanda máxima en 4J llega a 19 Lúpulos frente a 17 Lúpulos + 2 Agua Pura (justo en el límite).',
        fix: 'Ajuste fino opcional para 4 jugadores: retira 6 Lúpulos en lugar de 8 (mazo de 66 fichas) para mantener siempre un pequeño margen de seguridad en 4J.'
      },
      {
        severity: 'idea',
        badge: 'Simetría de los Menús 10, 11 y 12',
        title: 'Los Menús 10, 11 y 12 dependen del Pino/Resina (solo 4 fichas en caja)',
        description: 'Está muy bien etiquetarlos como "(Difícil)" en la carta. Sin embargo, si un jugador tiene el Menú 10 y los rivales retienen o descartan Pino/Resina sin saberlo, puede tardar 2-3 rondas extra. No es un error grave porque existen 3 comodines de Agua Pura y Trueque.',
        fix: 'Si notas en pruebas reales que los Menús 10-12 ganan menos veces que los 1-4, puedes dar a quien le toque un Menú (Difícil) la ventaja de empezar con 4 fichas en lugar de 3, o dejarlos así como reto divertido.'
      },
      {
        severity: 'idea',
        badge: 'Aclaración de la Falsa Alarma en Vaso 1 y 2',
        title: 'Coste de vaciar un vaso erróneo: "gastando una acción de Cocinar"',
        description: 'La regla nueva de verificar el vaso al cantar "¡Cerveza lista!" es excelente y cierra el agujero de seguridad. Solo un matiz menor: si alguien completó una receta válida del manual que no era de su Carta de Bar y tiene que gastar una acción de Cocinar para vaciarlo, pierde 1 turno entero más las fichas.',
        fix: 'Es un castigo justo por despiste; solo asegúrate de aclarar que las fichas de ese vaso erróneo van a la pila de descartes boca arriba.'
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
