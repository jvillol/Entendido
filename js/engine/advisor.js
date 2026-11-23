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
        severity: 'high',
        badge: 'Error Matemático Crítico (Stock vs Vasos)',
        title: 'Con 6 ingredientes por pinta (18 por jugador) faltan fichas en la caja para 5 y 6 jugadores',
        description: 'Cada jugador necesita 18 fichas cerradas para ganar (3 pintas × 6 ingredientes). En 6 jugadores, si la partida está reñida (por ejemplo, todos con 2 pintas cerradas = 12 fichas cada uno, y el ganador con 18), se quedan bloqueadas 78 de las 84 fichas solo en vasos. Peor aún: las 12 Cartas de Bar piden 29 Lúpulos en total pero solo existen 25 Lúpulos en la caja (¡y 21 Maltas / 12 Levaduras, que se agotan en cuanto se cierran 10-12 pintas!).',
        fix: 'Tienes 2 soluciones limpias: A) Reducir las pintas a 4 ingredientes (12 por jugador × 6 = 72 fichas máx.) o 5 ingredientes, O B) Si quieres mantener pintas de 6 ingredientes, cuando alguien cierre una pinta con espuma, anota 1 punto/posavasos y DEVUELVE sus 6 fichas a la Despensa (o amplía la caja a 120 fichas con ~42 Lúpulos y ~34 Maltas).'
      },
      {
        severity: 'high',
        badge: 'Error de Mazo en 6 Jugadores',
        title: 'Con 12 Cartas de Bar y 2 por jugador, en 6 jugadores el mazo empieza VACÍO (0 cartas)',
        description: 'Al repartir 2 Cartas de Bar boca arriba a cada uno de los 6 jugadores (6 × 2 = 12 cartas), el mazo de Cartas de Bar queda con 0 cartas desde el minuto 0. Cuando un jugador completa su 1.ª pinta y descarta su carta ("robando una nueva del mazo de Bar si quedan"), no puede robar nada. Al completar la 2.ª pinta, se queda con 0 Cartas de Bar y es imposible completar la 3.ª pinta.',
        fix: 'Solución inmediata: O bien amplías el mazo de Bar a 20-24 Cartas de Bar (3-4 por estilo), O bien cuando se descarte una Carta de Bar completada, se baraja/recicla automáticamente en un mazo común (o son pedidos compartidos en el centro de la mesa).'
      },
      {
        severity: 'high',
        badge: 'Desproporción de Ingredientes Especiales',
        title: 'Sobran muchas fichas de Lactosa (7 para 2 cartas) y Pino (4 para 1 carta) mientras falta Lúpulo',
        description: 'En las 12 Cartas de Bar: Lactosa solo aparece en 2 cartas (Milkshake IPA), pero hay 7 fichas en la caja (sobran 5). Pino/Resina solo aparece en 1 carta (West Coast IPA), pero hay 4 fichas (sobran 3). Café solo aparece en 2 cartas, pero hay 5 fichas. Mientras tanto, Lúpulo se pide 29 veces en esas 12 cartas y solo hay 25 fichas. El Mercado acabará lleno de Lactosa, Pino y Café que nadie necesita.',
        fix: 'Rebalancea las 12 Cartas de Bar para que cada especial se pida al menos 3-4 veces, o baja Lactosa a 3-4, Pino a 2 y Café a 3 para meter +8 Lúpulos y +4 Maltas.'
      },
      {
        severity: 'medium',
        badge: 'Acción 3 (Comerciar) Inútil frente a Acción 1 (Cosechar)',
        title: 'Comerciar (entregar 1 ficha por 1 del Mercado) es casi siempre peor que Cosechar (coger 2 gratis)',
        description: 'Si tienes <4 fichas en la reserva, usar la Acción 1 (Cosechar) te da 2 fichas del Mercado sin entregar nada. Usar la Acción 3 (Comerciar) gasta tu única acción del turno para darte 1 ficha del Mercado y perder 1 ficha tuya (saldo neto: 0).',
        fix: 'Haz que Comerciar sea un trueque entre jugadores (negociación directa 1×1 o 2×1) o permite que al Comerciar en el Mercado puedas cambiar hasta 2 fichas tuyas por 2 del Mercado.'
      },
      {
        severity: 'medium',
        badge: 'Acción 5 (Renovar el Mercado) Muy Punitiva',
        title: 'Renovar el Mercado gasta tu turno entero sin darte ninguna ficha',
        description: 'En las simulaciones, el jugador que gasta su turno en renovar el Mercado pierde ritmo frente a toda la mesa y le regala las 5 fichas nuevas al jugador sentado a su izquierda.',
        fix: 'Permite que tras renovar las 5 fichas del Mercado, el jugador pueda robar 1 ficha del nuevo Mercado (o renovar el Mercado descartando 1 ficha propia como acción gratuita antes de Cosechar).'
      },
      {
        severity: 'idea',
        badge: 'Ambigüedad en "Pedidos Públicos de la Mesa"',
        title: '¿Qué pasa si completas una Carta de Bar que está boca arriba frente a un rival?',
        description: 'La sección 2.2 dice: "puedes intentar completar tus propios pedidos o cubrir los pedidos públicos de la mesa". Pero la sección 4 no aclara qué ocurre si completas la carta de un rival (¿se la robas y se queda sin pedido? ¿la descarta?).',
        fix: 'Si quieres pedidos públicos competitivos, pon 3 o 4 Cartas de Bar comunes en el centro de la mesa (mercado de pedidos) en lugar de repartir 2 personales boca arriba, así todos compiten limpiamente por los mismos pedidos.'
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
