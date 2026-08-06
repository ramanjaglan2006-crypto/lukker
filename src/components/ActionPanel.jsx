import React, { useState } from 'react';
import { PLAYER_CONFIGS } from '../utils/ludoPaths';

/**
 * ActionPanel v3 — Poker-integrated action controls with Tier 4/5 player choice.
 * Same visual style as the frozen frontend (dark card, yellow accents, glow effects).
 *
 * Phases:
 *   WAITING / TURN_COMPLETE → "Play Poker" button
 *   DIRECTION_CHOICE → Forward/Backward choice + opponent selection
 *   PLAYER_CHOICE → Tier 4/5: player picks movement values
 *   MOVEMENT_SELECTION → Component chips + piece selection prompt
 *   MOVEMENT_EXECUTION → Animation indicator
 *   GAME_OVER → Game over display
 */
export default function ActionPanel({
  phase = 'WAITING',
  currentPlayer = 'red',
  bankroll = 6,
  pokerResult = null,
  totalWinnings = 0,
  canStartPoker = false,
  onStartPoker,
  // Direction choice
  movementDirection = null,
  movementTarget = null,
  onChooseDirection,
  opponents = [],
  // Components
  movementComponents = [],
  currentComponent = null,
  componentAssignments = [],
  onSkipComponent,
  onEndMovement,
  movableTokens = [],
  turnNumber = 1,
  // Player choice (Tier 4/5)
  playerChoicePhase = false,
  pendingPlayerChoices = [],
  movementTier = null,
  onSubmitPlayerChoices,
}) {
  const playerConfig = PLAYER_CONFIGS[currentPlayer];
  const targetConfig = movementTarget ? PLAYER_CONFIGS[movementTarget] : null;

  // ─── WAITING / TURN_COMPLETE → "Play Poker" button ─────────
  if (phase === 'WAITING' || phase === 'TURN_COMPLETE') {
    return (
      <div className="flex flex-col items-center gap-3 select-none py-1">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: playerConfig.color }}
          />
          <span className="text-sm font-bold text-slate-300">
            {playerConfig.name}'s Turn
          </span>
          <span className="text-xs text-slate-500 font-mono">Turn #{turnNumber}</span>
        </div>

        {/* Bankroll display */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-yellow-400 font-bold">💰 Bankroll: {bankroll}</span>
        </div>

        {/* Play Poker button */}
        <div className="relative">
          <div
            className="absolute -inset-2 rounded-2xl opacity-75 blur-md animate-pulse"
            style={{ backgroundColor: playerConfig.color }}
          />
          <button
            disabled={!canStartPoker}
            onClick={onStartPoker}
            className={`relative px-8 py-3 rounded-2xl font-black text-base tracking-wider uppercase transition-all shadow-[0_8px_20px_rgba(0,0,0,0.5)] ${
              canStartPoker
                ? 'bg-[#FDD835] text-black hover:bg-yellow-300 hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-yellow-400'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-70'
            }`}
          >
            🃏 Play Poker
          </button>
        </div>
      </div>
    );
  }

  // ─── POKER_ROUND → Resolving ────────────────────────────────
  if (phase === 'POKER_ROUND') {
    return (
      <div className="flex flex-col items-center gap-2 select-none py-2">
        <span className="text-xs font-bold text-yellow-400 animate-pulse uppercase tracking-wider">
          🃏 Resolving Poker Round...
        </span>
      </div>
    );
  }

  // ─── DIRECTION_CHOICE → Forward/Backward + Opponent Selection ─
  if (phase === 'DIRECTION_CHOICE') {
    return (
      <div className="flex flex-col items-center gap-3 select-none py-1 w-full">
        {/* Winnings display */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-yellow-400">
            🃏 Won {totalWinnings} movement power!
          </span>
        </div>

        {/* Direction buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onChooseDirection('FORWARD')}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            ⬆️ Move Forward
          </button>

          <span className="text-xs text-slate-500 font-bold">OR</span>

          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Push Opponent Back</span>
            <div className="flex items-center gap-1.5">
              {opponents.map(opId => {
                const opConfig = PLAYER_CONFIGS[opId];
                return (
                  <button
                    key={opId}
                    onClick={() => onChooseDirection('BACKWARD', opId)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-900/50 border border-red-500/40 text-red-300 hover:bg-red-800/60 hover:border-red-400 hover:text-red-200 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: opConfig.color }} />
                    {opConfig.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── PLAYER_CHOICE → Tier 4/5: Pick movement values ─────────
  if (phase === 'PLAYER_CHOICE') {
    return <PlayerChoicePanel
      tier={movementTier}
      totalWinnings={totalWinnings}
      playerConfig={playerConfig}
      onSubmit={onSubmitPlayerChoices}
    />;
  }

  // ─── MOVEMENT_SELECTION → Component chips + piece selection ──
  if (phase === 'MOVEMENT_SELECTION') {
    const assignedIndices = new Set(componentAssignments.map(a => a.componentIndex));

    return (
      <div className="flex flex-col items-center gap-3 select-none py-1 w-full">
        {/* Direction indicator */}
        <div className="flex items-center gap-2">
          {movementDirection === 'FORWARD' ? (
            <span className="text-xs font-bold text-emerald-400">
              ⬆️ Moving {playerConfig.name}'s pieces forward
            </span>
          ) : (
            <span className="text-xs font-bold text-red-400">
              ⬇️ Pushing {targetConfig?.name}'s pieces backward
            </span>
          )}
        </div>

        {/* Component chips */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {movementComponents.map((value, idx) => {
            const isAssigned = assignedIndices.has(idx);
            const isCurrent = currentComponent && currentComponent.index === idx;
            const assignment = componentAssignments.find(a => a.componentIndex === idx);

            return (
              <div
                key={idx}
                className={`relative px-3 py-1.5 rounded-xl text-sm font-black min-w-[40px] text-center transition-all ${
                  isCurrent
                    ? 'bg-yellow-400 text-black scale-110 ring-2 ring-yellow-300 shadow-lg shadow-yellow-400/30'
                    : isAssigned
                      ? 'bg-slate-700/50 text-slate-500 line-through'
                      : 'bg-[#0D1321] border border-slate-600 text-slate-300'
                }`}
              >
                {value}
                {isAssigned && assignment && (
                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] text-slate-500 whitespace-nowrap">
                    {assignment.pieceId}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Piece selection prompt */}
        {currentComponent && (
          <div className="text-center">
            {movableTokens.length > 0 ? (
              <span className="text-xs text-slate-400 font-medium">
                👆 Select a {movementDirection === 'FORWARD' ? 'piece' : `${targetConfig?.name} piece`} to {movementDirection === 'FORWARD' ? 'move' : 'push back'} {currentComponent.value} steps
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-medium">
                No valid targets for {currentComponent.value} steps
              </span>
            )}
          </div>
        )}

        {/* Skip / End Turn buttons */}
        <div className="flex items-center gap-2">
          {currentComponent && (
            <button
              onClick={onSkipComponent}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#0D1321] border border-slate-600 text-slate-400 hover:border-yellow-400 hover:text-yellow-400 transition-all"
            >
              Skip ({currentComponent.value})
            </button>
          )}
          <button
            onClick={onEndMovement}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#0D1321] border border-slate-600 text-slate-300 hover:border-red-400 hover:text-red-400 transition-all uppercase tracking-wider"
          >
            End Turn
          </button>
        </div>
      </div>
    );
  }

  // ─── MOVEMENT_EXECUTION → Animation ─────────────────────────
  if (phase === 'MOVEMENT_EXECUTION') {
    return (
      <div className="flex flex-col items-center gap-2 select-none py-2">
        <span className="text-xs font-bold text-yellow-400 animate-pulse uppercase tracking-wider">
          {movementDirection === 'FORWARD' ? 'Moving piece...' : 'Pushing piece back...'}
        </span>
      </div>
    );
  }

  // ─── GAME_OVER ──────────────────────────────────────────────
  if (phase === 'GAME_OVER') {
    return (
      <div className="flex flex-col items-center gap-2 select-none py-2">
        <span className="text-sm font-black text-yellow-400 uppercase tracking-wider">
          🏆 Game Over!
        </span>
      </div>
    );
  }

  return null;
}

// ─── Player Choice Sub-Panel for Tier 4/5 ─────────────────────────
// Same dark card + yellow accent styling as the rest of ActionPanel.

function PlayerChoicePanel({ tier, totalWinnings, playerConfig, onSubmit }) {
  // Tier 4: player picks 1 value (the third movement, 1–6)
  // Tier 5: player picks 3 values (all movements, each 1–6)
  const choiceCount = tier === 5 ? 3 : 1;

  const [choices, setChoices] = useState(
    tier === 5 ? [null, null, null] : [null]
  );
  const [currentStep, setCurrentStep] = useState(0);

  const setChoice = (stepIdx, value) => {
    setChoices(prev => {
      const next = [...prev];
      next[stepIdx] = value;
      return next;
    });
  };

  const allChosen = choices.every(v => v !== null);
  const total = choices.reduce((sum, v) => sum + (v || 0), 0);

  // For Tier 4, the fixed components are 6 + 6, so total display = 12 + choice
  const displayTotal = tier === 4 ? 12 + (choices[0] || 0) : total;

  const handleConfirm = () => {
    if (!allChosen) return;
    onSubmit(choices);
  };

  const valueButtons = [1, 2, 3, 4, 5, 6];

  return (
    <div className="flex flex-col items-center gap-3 select-none py-1 w-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-black text-yellow-400">
          {tier === 5 ? '✨' : '🎯'} Tier {tier} — Won {totalWinnings}!
        </span>
      </div>

      {/* Description */}
      <div className="text-center">
        {tier === 5 ? (
          <span className="text-xs text-slate-400 font-medium">
            Choose <span className="text-yellow-400 font-bold">3 movement values</span> (each 1–6, max total 18)
          </span>
        ) : (
          <span className="text-xs text-slate-400 font-medium">
            You get <span className="text-emerald-400 font-bold">6 + 6</span> + choose your <span className="text-yellow-400 font-bold">third movement</span> (1–6)
          </span>
        )}
      </div>

      {/* Fixed components display (Tier 4 only) */}
      {tier === 4 && (
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl text-sm font-black bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 min-w-[40px] text-center">
            6
          </div>
          <span className="text-slate-500 font-bold">+</span>
          <div className="px-3 py-1.5 rounded-xl text-sm font-black bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 min-w-[40px] text-center">
            6
          </div>
          <span className="text-slate-500 font-bold">+</span>
          <div className={`px-3 py-1.5 rounded-xl text-sm font-black min-w-[40px] text-center ${
            choices[0] !== null
              ? 'bg-yellow-400 text-black ring-2 ring-yellow-300'
              : 'bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 animate-pulse'
          }`}>
            {choices[0] !== null ? choices[0] : '?'}
          </div>
        </div>
      )}

      {/* Choice slots display (Tier 5) */}
      {tier === 5 && (
        <div className="flex items-center gap-2">
          {choices.map((val, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-500 font-bold">+</span>}
              <div
                onClick={() => setCurrentStep(idx)}
                className={`px-3 py-1.5 rounded-xl text-sm font-black min-w-[40px] text-center cursor-pointer transition-all ${
                  val !== null
                    ? currentStep === idx
                      ? 'bg-yellow-400 text-black ring-2 ring-yellow-300 scale-110'
                      : 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400'
                    : currentStep === idx
                      ? 'bg-yellow-400/20 border-2 border-yellow-400 text-yellow-400 animate-pulse scale-110'
                      : 'bg-[#0D1321] border border-slate-600 text-slate-500'
                }`}
              >
                {val !== null ? val : '?'}
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Value picker buttons */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          {tier === 5
            ? `Pick value for Move ${currentStep + 1}`
            : 'Pick your third movement value'
          }
        </span>
        <div className="flex items-center gap-1.5">
          {valueButtons.map(val => {
            const targetIdx = tier === 5 ? currentStep : 0;
            const isSelected = choices[targetIdx] === val;
            return (
              <button
                key={val}
                onClick={() => {
                  setChoice(targetIdx, val);
                  // Auto-advance to next empty slot for Tier 5
                  if (tier === 5) {
                    const nextEmpty = choices.findIndex((v, i) => i !== targetIdx && v === null);
                    if (nextEmpty !== -1) {
                      // Small delay so user sees the selection
                      setTimeout(() => setCurrentStep(nextEmpty), 150);
                    }
                  }
                }}
                className={`w-9 h-9 rounded-lg text-sm font-black transition-all ${
                  isSelected
                    ? 'bg-yellow-400 text-black scale-110 ring-2 ring-yellow-300 shadow-lg shadow-yellow-400/30'
                    : 'bg-[#0D1321] border border-slate-600 text-slate-300 hover:border-yellow-400 hover:text-yellow-400 hover:scale-105'
                }`}
              >
                {val}
              </button>
            );
          })}
        </div>
      </div>

      {/* Total display + Confirm */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 font-mono">
          Total: <span className={`font-bold ${displayTotal > 0 ? 'text-yellow-400' : 'text-slate-500'}`}>{displayTotal}</span>
          <span className="text-slate-600"> / 18</span>
        </span>
        <button
          disabled={!allChosen}
          onClick={handleConfirm}
          className={`px-5 py-2 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
            allChosen
              ? 'bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-105 active:scale-95 shadow-lg shadow-yellow-400/20'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          ✓ Confirm
        </button>
      </div>
    </div>
  );
}
