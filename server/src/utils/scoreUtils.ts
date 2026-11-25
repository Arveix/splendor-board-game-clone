import { getCardDetails } from './cardUtils.js';

// Compute total prestige points for a player (cards points + noble points)
export function computeScore(player: { cards?: string[]; nobles?: string[] } | null | undefined): number {
  const cardPoints = (player?.cards || []).reduce(
    (acc, cardId) => acc + (getCardDetails(cardId)?.points || 0),
    0
  );
  const noblePoints = (player?.nobles || []).length * 3;
  return cardPoints + noblePoints;
}

/**
 * Utility helper function to determine the winner at the end of the final round.
 * 1. The player with the highest prestige points wins.
 * 2. In case of a tie for highest points, the player who has bought fewer development cards wins.
 * (Only bought development cards count, not reserved cards).
 */
export function determineWinner<
  T extends {
    calculateScore?: () => number;
    getScore?: () => number;
    cards?: string[];
    nobles?: string[];
    score?: number;
  }
>(players: T[]): T | null {
  if (!players || players.length === 0) return null;

  let winner: T | null = null;
  let highestScore = -1;
  let fewestCards = Infinity;

  for (const player of players) {
    const score =
      typeof player.calculateScore === 'function'
        ? player.calculateScore()
        : typeof player.getScore === 'function'
        ? player.getScore()
        : player.score ?? computeScore(player);
    const boughtCardsCount = (player.cards || []).length;

    if (score > highestScore) {
      highestScore = score;
      fewestCards = boughtCardsCount;
      winner = player;
    } else if (score === highestScore) {
      // Tie-breaker: player who has bought a lower number of development cards wins
      if (boughtCardsCount < fewestCards) {
        fewestCards = boughtCardsCount;
        winner = player;
      }
    }
  }

  return winner;
}
