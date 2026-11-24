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
        badge: 'Gran Acierto de Diseño',
        title: 'El Draft inicial de 18 Cartas de Bar (repartir 2 ocultas y elegir 1) funciona de maravilla de 2 a 6 jugadores',
        description: 'Con 18 Cartas de Bar únicas, incluso en partidas de 6 jugadores se pueden repartir 2 cartas a cada uno (12 cartas) para que elijan 1 en secreto. Esto reduce la mala suerte inicial y mantiene la intriga de principio a fin.',
        fix: 'Mantén exactamente este sistema de selección inicial (Draft 2 elige 1) y el mazo de 24 Cartas de Acción Cervecera.'
      },
      {
        severity: 'high',
        badge: 'Fricción en Mesa (5 y 6 Jugadores)',
        title: 'Cocinar solo 1 ficha por turno + "Cerrar IPA" gastando otro turno expone el vaso lleno a 5 turnos de sabotaje',
        description: 'En las simulaciones de 5 y 6 jugadores ocurre un fenómeno crítico: cuando colocas el último ingrediente de un vaso con la acción "Cocinar", ya gastaste tu turno. Tu vaso queda lleno PERO SIN ESPUMA durante los turnos de los otros 4 o 5 jugadores hasta que te vuelva a tocar para hacer la acción "Cerrar IPA". En 5-6J, casi siempre alguien te tira "Contaminación" o "Trasvase" en esa ventana, provocando frustración y alargando la partida a más de 20 rondas.',
        fix: 'Tienes 2 opciones muy limpias: A) Si al "Cocinar" colocas el último ingrediente de la receta, puedes ponerle la espuma inmediatamente en ese mismo turno (o que "Cerrar IPA" cueste descartar 1 ficha de tu reserva como acción gratuita), O B) Que "Cocinar" permita meter hasta 2 fichas si son en vasos distintos y "Cerrar IPA" sea acción de turno.'
      },
      {
        severity: 'medium',
        badge: 'Regla Dominada (Sin Uso Real)',
        title: 'El "Cambio rápido en el Mercado" (devolver 2 fichas tuyas para coger 1 del Mercado) siempre es peor que "Cosechar"',
        description: 'Con la Acción 1 (Cosechar) coges 2 fichas gratis del Mercado; si tenías 5 fichas en tu reserva, pasas a 7 y al final del turno descartas 2 fichas que no quieras (es decir, cambias 2 tuyas por 2 del Mercado). En cambio, con "Cambio rápido en el Mercado" (Acción 3B) entregas 2 fichas tuyas para recibir solo 1 del Mercado.',
        fix: 'Cambia el "Cambio rápido en el Mercado" a: "Devuelve 1 o 2 fichas de tu reserva a la Despensa y toma la misma cantidad (1 o 2 fichas) del Mercado de Abastos", o permite hacer el cambio 2×1 como acción gratuita una vez por turno antes de Cocinar.'
      },
      {
        severity: 'ok',
        badge: 'Equilibrio Asimétrico Perfecto (9 vs 10 ing.)',
        title: 'Las Cartas 01–09 (10 ing. con IPA Clásica) y las Cartas 10–18 (9 ing. con 3 especiales) tardan los mismos turnos totales',
        description: 'Las Cartas 01 a 09 exigen 10 turnos de Cocinar (1 ficha por turno), pero 8 de sus 10 ingredientes son básicos ultra-abundantes (58 de las 84 fichas de la bolsa son Lúpulo, Malta o Levadura) y solo piden 2 especiales. Las Cartas 10 a 18 ahorran 1 turno de Cocinar (9 ingredientes), pero exigen reunir 3 ingredientes especiales escasos (Fruta, Lactosa, Café o Pino, de los que solo hay 4 a 7 en toda la bolsa), lo que consume 1–2 turnos extra de búsqueda/Mercado. Ambas vías convergen en los mismos turnos totales por caminos estratégicos distintos.',
        fix: 'Mantén exactamente 1 ficha por turno al Cocinar y la composición actual de las 18 Cartas de Bar.'
      },
      {
        severity: 'idea',
        badge: 'Utilidad del Agua Pura (3 fichas)',
        title: 'El Agua Pura solo tiene uso si un rival te mueve una ficha errónea con la carta "Trasvase"',
        description: 'Como cada jugador mete sus propias fichas en sus vasos y la única carta rival que introduce una ficha ajena en tu vaso es "Trasvase (x4)", si nadie te juega Trasvase, robar Agua Pura de la Despensa a ciegas es robar una ficha sin uso.',
        fix: 'Dale al Agua Pura un segundo uso opcional: "Puedes usarla para limpiar 1 ingrediente erróneo de un vaso, O descartarla desde tu reserva para anular una Contaminación contra uno de tus vasos (o sustituir a 1 Malta/Levadura básica)".'
      },
      {
        severity: 'idea',
        badge: 'Resolución de Error al Final de Partida',
        title: 'Si al revisar los 3 vasos al final hay un ingrediente incorrecto y se retira la espuma, ¿cómo saca la ficha mala?',
        description: 'La sección 4 dice: "Si algún vaso tiene un ingrediente incorrecto, se retira la espuma de ese vaso y la partida continúa". Pero si ese vaso ya tiene 3 o 4 fichas dentro, el jugador no podría sacar la ficha errónea salvo que robe Agua Pura o Contaminación.',
        fix: 'Añade: "Se retira la espuma de ese vaso y se descartan a la Despensa las fichas incorrectas de su interior, continuando la partida".'
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

  return recommendations;
}
