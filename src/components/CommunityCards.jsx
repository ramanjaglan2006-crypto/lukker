import React from 'react';
import { Phase } from '../engine/gameState';

export default function CommunityCards({ phase, communityCards = [], pot = 0 }) {
  const isPokerPhase = [
    Phase.POKER_PRE_FLOP,
    Phase.POKER_FLOP,
    Phase.POKER_TURN,
    Phase.POKER_RIVER,
    Phase.POKER_SHOWDOWN,
  ].includes(phase);

  if (!isPokerPhase) return null;

  // Determine which cards to show for community cards
  const displayCommunityCards = [...communityCards];
  while (displayCommunityCards.length < 5) {
    displayCommunityCards.push(null);
  }

  const formatCard = (card) => {
    if (!card) return '🂠';
    return `${card.rank}${card.suit}`;
  };

  const getCardColor = (card) => {
    if (!card) return 'text-slate-600';
    return (card.suit === '♥' || card.suit === '♦') ? 'text-red-600' : 'text-slate-900';
  };

  return (
    <div className="w-full max-w-[620px] bg-[#131C31] border border-slate-800 rounded-2xl p-3 flex flex-col items-center shadow-xl select-none mb-2">
      <div className="flex w-full justify-between items-center px-4 mb-2">
        <span className="text-yellow-400 font-bold uppercase tracking-wider text-sm">
          🃏 {phase.replace('POKER_', '').replace('_', ' ')}
        </span>
        <span className="text-emerald-400 font-black text-sm">
          POT: {pot}
        </span>
      </div>

      <div className="flex gap-2 sm:gap-4 justify-center">
        {displayCommunityCards.map((card, idx) => (
          <div
            key={idx}
            className={`w-12 h-16 sm:w-16 sm:h-24 rounded-lg flex items-center justify-center text-lg sm:text-2xl font-black bg-white shadow-md transition-all duration-300 ${getCardColor(card)}`}
          >
            {formatCard(card)}
          </div>
        ))}
      </div>
    </div>
  );
}
