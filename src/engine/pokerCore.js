// src/engine/pokerCore.js

export const Suits = ['♠', '♥', '♦', '♣'];
export const Ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RankValues = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export function createDeck() {
  const deck = [];
  for (const suit of Suits) {
    for (const rank of Ranks) {
      deck.push({ suit, rank, value: RankValues[rank] });
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

export function dealCards(deck, count) {
  return deck.splice(0, count);
}

// ─── Hand Evaluation ─────────────────────────────────────────────────────────

export const HandRank = {
  HIGH_CARD: 1,
  ONE_PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10
};

// Generates all combinations of k elements from array
function combinations(array, k) {
  if (k === 0) return [[]];
  if (array.length === 0) return [];
  const [first, ...rest] = array;
  const withFirst = combinations(rest, k - 1).map(comb => [first, ...comb]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluate5Cards(cards) {
  // Sort descending by value
  cards.sort((a, b) => b.value - a.value);

  const isFlush = cards.every(c => c.suit === cards[0].suit);
  
  // Check for straight
  let isStraight = true;
  for (let i = 0; i < 4; i++) {
    if (cards[i].value - 1 !== cards[i+1].value) {
      isStraight = false;
      break;
    }
  }
  
  // Special check for A-2-3-4-5 straight
  let isLowStraight = false;
  if (!isStraight && cards[0].value === 14 && cards[1].value === 5 && cards[2].value === 4 && cards[3].value === 3 && cards[4].value === 2) {
    isLowStraight = true;
    isStraight = true;
    // Move Ace to back for comparison purposes
    cards = [cards[1], cards[2], cards[3], cards[4], { ...cards[0], value: 1 }];
  }

  if (isStraight && isFlush) {
    if (cards[0].value === 14 && !isLowStraight) {
      return { rank: HandRank.ROYAL_FLUSH, cards, score: [HandRank.ROYAL_FLUSH] };
    }
    return { rank: HandRank.STRAIGHT_FLUSH, cards, score: [HandRank.STRAIGHT_FLUSH, cards[0].value] };
  }

  // Count frequencies
  const counts = {};
  cards.forEach(c => {
    counts[c.value] = (counts[c.value] || 0) + 1;
  });
  
  const freqGroups = Object.entries(counts).map(([val, count]) => ({ val: Number(val), count }));
  freqGroups.sort((a, b) => b.count - a.count || b.val - a.val); // Sort by frequency desc, then value desc

  if (freqGroups[0].count === 4) {
    return { rank: HandRank.FOUR_OF_A_KIND, cards, score: [HandRank.FOUR_OF_A_KIND, freqGroups[0].val, freqGroups[1].val] };
  }

  if (freqGroups[0].count === 3 && freqGroups[1].count === 2) {
    return { rank: HandRank.FULL_HOUSE, cards, score: [HandRank.FULL_HOUSE, freqGroups[0].val, freqGroups[1].val] };
  }

  if (isFlush) {
    return { rank: HandRank.FLUSH, cards, score: [HandRank.FLUSH, ...cards.map(c => c.value)] };
  }

  if (isStraight) {
    return { rank: HandRank.STRAIGHT, cards, score: [HandRank.STRAIGHT, cards[0].value] };
  }

  if (freqGroups[0].count === 3) {
    return { rank: HandRank.THREE_OF_A_KIND, cards, score: [HandRank.THREE_OF_A_KIND, freqGroups[0].val, freqGroups[1].val, freqGroups[2].val] };
  }

  if (freqGroups[0].count === 2 && freqGroups[1].count === 2) {
    return { rank: HandRank.TWO_PAIR, cards, score: [HandRank.TWO_PAIR, freqGroups[0].val, freqGroups[1].val, freqGroups[2].val] };
  }

  if (freqGroups[0].count === 2) {
    return { rank: HandRank.ONE_PAIR, cards, score: [HandRank.ONE_PAIR, freqGroups[0].val, freqGroups[1].val, freqGroups[2].val, freqGroups[3].val] };
  }

  return { rank: HandRank.HIGH_CARD, cards, score: [HandRank.HIGH_CARD, ...cards.map(c => c.value)] };
}

export function evaluateBestHand(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) return null; // Not enough cards

  const combs = combinations(allCards, 5);
  let bestHand = null;

  for (const comb of combs) {
    const hand = evaluate5Cards(comb);
    if (!bestHand || compareScores(hand.score, bestHand.score) > 0) {
      bestHand = hand;
    }
  }

  return bestHand;
}

// Returns > 0 if scoreA beats scoreB, < 0 if scoreB beats scoreA, 0 if tie
export function compareScores(scoreA, scoreB) {
  for (let i = 0; i < Math.max(scoreA.length, scoreB.length); i++) {
    const a = scoreA[i] || 0;
    const b = scoreB[i] || 0;
    if (a !== b) {
      return a - b;
    }
  }
  return 0;
}
