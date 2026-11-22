/**
 * js/games/registry.js
 * Registro centralizado de juegos disponibles en el simulador.
 */

import { laTerceraIpaGame } from './laTerceraIpa.js';
import { flawedPrototypeGame } from './flawedPrototype.js';
import { balancedEuroGame } from './balancedEuro.js';
import { parseDraftRulebook, SAMPLE_DRAFT_RULEBOOK } from '../engine/ruleParser.js';

const customInitialGame = parseDraftRulebook('Gremios de la Ciudadela (Personalizable)', SAMPLE_DRAFT_RULEBOOK);

const GAME_CATALOG = new Map([
  [laTerceraIpaGame.id, laTerceraIpaGame],
  [flawedPrototypeGame.id, flawedPrototypeGame],
  [balancedEuroGame.id, balancedEuroGame],
  [customInitialGame.id, customInitialGame]
]);

export function getAllGames() {
  return Array.from(GAME_CATALOG.values());
}

export function getGameById(id) {
  return GAME_CATALOG.get(id) || laTerceraIpaGame;
}

export function registerOrUpdateCustomGame(gameModule) {
  GAME_CATALOG.set(gameModule.id, gameModule);
  return gameModule;
}
