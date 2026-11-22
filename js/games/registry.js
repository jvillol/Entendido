/**
 * js/games/registry.js
 * Registro centralizado de juegos disponibles en el simulador.
 * Cada vez que el usuario envíe nuevas instrucciones redactadas, se puede añadir un
 * módulo dedicado aquí o cargarlo dinámicamente desde el analizador de texto.
 */

import { flawedPrototypeGame } from './flawedPrototype.js';
import { balancedEuroGame } from './balancedEuro.js';
import { parseDraftRulebook, SAMPLE_DRAFT_RULEBOOK } from '../engine/ruleParser.js';

const customInitialGame = parseDraftRulebook('Gremios de la Ciudadela (Personalizable)', SAMPLE_DRAFT_RULEBOOK);

const GAME_CATALOG = new Map([
  [flawedPrototypeGame.id, flawedPrototypeGame],
  [balancedEuroGame.id, balancedEuroGame],
  [customInitialGame.id, customInitialGame]
]);

export function getAllGames() {
  return Array.from(GAME_CATALOG.values());
}

export function getGameById(id) {
  return GAME_CATALOG.get(id) || flawedPrototypeGame;
}

export function registerOrUpdateCustomGame(gameModule) {
  GAME_CATALOG.set(gameModule.id, gameModule);
  return gameModule;
}
