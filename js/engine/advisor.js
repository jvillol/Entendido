/**
 * js/engine/advisor.js
 * Genera diagnósticos accionables, correcciones de errores de diseño e ideas creativas
 * a partir de las métricas de simulación y la auditoría de reglas.
 */

export function generateDesignAdvice(analysis, gameModule) {
  const recommendations = [];

  // Diagnósticos específicos de componentes cuando el juego incluye auditoría matemática de cartas/fichas (ej. LA TERCERA IPA)
  if (gameModule.id === 'la_tercera_ipa' && gameModule.customAuditData) {
    recommendations.push(
      {
        severity: 'high',
        badge: 'Cuello de Botella en 6 Jugadores',
        title: 'Déficit crítico de Lúpulo en partidas de 6 jugadores (22 fichas en caja vs 25-27 necesarias)',
        description: 'TODAS las recetas del juego piden Lúpulo (cada jugador necesita entre 4 y 5 Lúpulos para sus 3 vasos). En una partida de 6 jugadores, la mesa demanda entre 25 y 27 Lúpulos en total, pero solo existen 22 fichas de Lúpulo (+2 comodines). Como las fichas que entran en un vaso cerrado NUNCA vuelven al descarte, cuando los 6 jugadores llevan 2 vasos cerrados se agotan literalmente todos los Lúpulos del mazo.',
        fix: 'Sube el Lúpulo de 22 a 28 fichas (o añade +2 Agua Pura comodín y baja Pino/Resina de 7 a 4 fichas). Alternativamente, que una receta de 3 ingredientes (ej. Milkshake IPA o Brut IPA) no lleve Lúpulo sino Malta + Especial + Especial.'
      },
      {
        severity: 'high',
        badge: 'Carta Especial Casi Injugable',
        title: 'La carta "Trasvase (x3)" queda muerta si se roba en el 2º vaso',
        description: 'Solo se roban Cartas de Maestro Cervecero al completar el 1º y el 2º vaso. "Trasvase" mueve 1 ficha entre dos vasos tuyos QUE NO ESTÉN COMPLETADOS. Si la robas como recompensa al cerrar tu 2º vaso, ¡solo te queda 1 vaso abierto! Es 100% ilegal jugarla y te ocupa 1 hueco de tu límite de 5 elementos.',
        fix: 'Permite que "Trasvase" también pueda: A) Intercambiar 1 ficha de un vaso tuyo abierto por 1 ficha del Mercado o de tu reserva, o B) Mover 1 ficha entre dos vasos abiertos de CUALQUIER jugador (sirviendo como sabotaje táctico).'
      },
      {
        severity: 'medium',
        badge: 'Desproporción en el Mazo (84 fichas)',
        title: 'Sobran fichas de "Pino / Resina" (7 fichas) y faltan "Lactosa / Especias" (6 fichas)',
        description: '"Pino / Resina" tiene 7 fichas en el mazo, pero SOLO se usa en 1 receta de todo el juego (West Coast IPA, presente solo en las Cartas de Bar 10, 11 y 12, pidiendo 1 unidad). En una partida de 6 jugadores se necesitan de media 1,5 fichas de Pino, por lo que 5-6 fichas de Pino inundan y atascan el Mercado. En cambio, "Lactosa / Especias" solo tiene 6 fichas pero se pide 8 veces en las Cartas de Bar (¡y la Carta 12 pide 2 Lactosas ella sola!).',
        fix: 'Ajusta el desglose de especiales sin cambiar el total de 84 fichas: Pino/Resina baja de 7 a 4; Lactosa/Especias sube de 6 a 7; Fruta Tropical se mantiene en 7 o sube a 8; Agua Pura (Comodín) sube de 2 a 3.'
      },
      {
        severity: 'medium',
        badge: 'Asimetría en Cartas de Bar #3, #7, #8, #9 y #12',
        title: 'Las Cartas de Bar #12 y #3 son mucho más difíciles que las Cartas #1 y #4',
        description: 'La Carta #12 (West Coast + Brut + Milkshake) exige 2 fichas de Lactosa (el 33% de todas las que existen en el juego) + 1 Pino + 1 Fruta Tropical (4 especiales en total). La Carta #3 exige 2 Frutas Tropicales + 1 Lactosa. En cambio, la Carta #1 (English + Session + NEIPA) solo pide 1 ingrediente especial en total (1 Fruta Tropical) y el resto son básicos abundantes.',
        fix: 'Regla de diseño para las 12 Cartas de Bar: ninguna Carta de Bar debería repetir 2 veces el mismo ingrediente especial escaso (como ocurre en la Carta #3 con 2 Frutas Tropicales y en la Carta #12 con 2 Lactosas), y todas deberían pedir exactamente 2 ingredientes especiales en total.'
      },
      {
        severity: 'medium',
        badge: 'Laguna de Verificación en Mesa',
        title: '¿Cómo se verifica "¡Cerveza lista!" en el 1º y 2º vaso si las recetas son secretas?',
        description: 'Las reglas dicen que "nadie puede ver las recetas de los demás" y que al cantar "¡Cerveza lista!" en tu 1º o 2º vaso robas 1 Carta de Maestro Cervecero y ese vaso queda "cerrado y protegido contra Contaminación". Si el jugador mete las fichas ocultas y no enseña su Carta de Bar hasta el 3º vaso, nadie puede comprobar si el vaso 1 o 2 tiene realmente una receta válida o si se equivocó.',
        fix: 'Aclara en la sección 3.B: cuando completas un vaso y dices "¡Cerveza lista!", debes revelar las 3 o 4 fichas de ese vaso boca arriba junto al vaso indicando qué estilo de IPA es (ej. "Cierro una Black IPA: Malta + Lúpulo + Café"), manteniendo tu Carta de Bar en secreto hasta final de partida.'
      },
      {
        severity: 'idea',
        badge: 'Acción E Poco Atractiva',
        title: 'La Acción E (Renovar el Mercado) da solo 1 ficha frente a las 2 de Cosechar (Acción A)',
        description: 'En las simulaciones, elegir Acción E supone perder un 50% de economía de fichas en ese turno (robas 1 en vez de 2) y además le dejas el mercado recién renovado gratis al jugador sentado a tu izquierda.',
        fix: 'Mejora la Acción E ("Renovar el Mercado"): Descarta el Mercado, rellénalo y luego realiza una acción de Cosechar normal (o roba 1 del nuevo Mercado + 1 a ciegas del mazo).'
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
