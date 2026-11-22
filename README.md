# 🎲 Entendido — Laboratorio y Simulador de Juegos de Mesa

Aplicación web modular diseñada para **simular, probar, auditar reglas y proponer mejoras de equilibrio y diversión** en juegos de mesa durante su fase de diseño.

## 🚀 Características Principales

1. **Simulador Monte Carlo Multi-Jugador (2 a 6+ jugadores)**:
   - Simula cientos o miles de partidas por cada número de jugadores con distintos arquetipos de IA (*Agresivo, Económico, Velocista, Conservador y Táctico*).
   - Detecta ventaja o desventaja por orden de turno (**Efecto Primer Jugador**).
2. **Métricas de Entretenimiento y Ritmo**:
   - **Índice de Remontada (Anti-Bola de Nieve)**: mide si el líder a mitad de partida gana siempre o si hay emoción hasta el final.
   - **Tensión y Finales Reñidos**: porcentaje de partidas decididas por estrecho margen.
   - **Detector de Turnos Vacíos y Bucles**: identifica si los jugadores se quedan bloqueados sin acciones útiles o si la partida puede estancarse indefinidamente.
3. **Auditoría de Reglas y Mecánicas**:
   - Detecta **Reglas Huérfanas / Sin Sentido** (acciones que nadie elige porque son muy caras o poco útiles) y **Mecánicas Rotas / Spameadas** (acciones dominantes).
   - Lista de comprobación estática del manual (criterios de desempate, compensación inicial, cierre equitativo de ronda, escalado de reserva).
4. **Analizador Interactivo de Instrucciones + Módulos a Medida**:
   - Puedes pegar directamente un borrador de reglas en la pestaña **📜 Instrucciones y Parámetros** o enviar las reglas en el chat para codificar su módulo exacto en `js/games/`.

## 📂 Estructura Modular del Proyecto

```text
Entendido/
├── index.html                  # Interfaz principal del laboratorio de playtesting
├── css/
│   ├── variables.css           # Tokens de diseño, paleta y tipografía
│   ├── layout.css              # Estructura del panel lateral, rejillas y contenedores
│   └── components.css          # Tarjetas KPI, tablas, barras, pestañas y visor de partidas
└── js/
    ├── main.js                 # Controlador principal y eventos de interfaz
    ├── engine/
    │   ├── simulator.js        # Motor Monte Carlo multi-jugador y arquetipos de decisión
    │   ├── analyzer.js         # Cálculo de KPIs de Equilibrio, Diversión, Ritmo y Reglas
    │   ├── advisor.js          # Generador automático de parches, errores e ideas de diseño
    │   └── ruleParser.js       # Intérprete de reglamentos redactados en texto libre
    ├── games/
    │   ├── registry.js         # Catálogo central de juegos registrados
    │   ├── flawedPrototype.js  # Ejemplo con errores de diseño (reglas muertas, ventaja 1ºJ)
    │   └── balancedEuro.js     # Ejemplo calibrado y equilibrado
    └── ui/
        ├── charts.js           # Visualizaciones de victorias por asiento, arquetipo y tensión
        └── renderer.js         # Renderizado del dashboard y crónica turno a turno
```
