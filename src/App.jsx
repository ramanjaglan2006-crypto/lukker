import React, { useState } from 'react';
import Header from './components/Header';
import PlayerInfoBar from './components/PlayerInfoBar';
import LudoBoard from './components/LudoBoard';
import ActionPanel from './components/ActionPanel';
import WinnerModal from './components/WinnerModal';
import PokerPanel from './components/PokerPanel';
import CommunityCards from './components/CommunityCards';
import { useGameEngine } from './hooks/useGameEngine';
import { Phase } from './engine/gameState';

export default function App() {
  const [playerMode, setPlayerMode] = useState('4P'); // '2P' | '4P' | 'VS_BOT'
  const [soundMuted, setSoundMuted] = useState(false);

  const {
    currentPlayer,
    tokens,
    winner,
    gameLog, 
    movableTokens,
    moveToken,
    resetGame,
    // Poker v2 props
    phase,
    bankroll,
    pokerResult,
    totalWinnings,
    canStartPoker,
    startPokerRound,
    // Interactive Poker v2 props
    pokerPlayers,
    activePokerPlayers,
    communityCards,
    pot,
    currentPokerActor,
    currentBetToMatch,
    submitPokerAction,
    dealer, 
    // Direction
    movementDirection,
    movementTarget,
    chooseDirection,
    opponents,
    // Components
    movementComponents,
    currentComponent,
    componentAssignments,
    skipComponent,
    endMovementPhase,
    // Player choice (Tier 4/5)
    playerChoicePhase,
    pendingPlayerChoices,
    movementTier,
    submitPlayerChoices,
    turnNumber,
  } = useGameEngine({ playerMode, soundEnabled: !soundMuted });

  // Calculate home counts
  const getHomeCount = (playerKey) => {
    return tokens[playerKey].filter(step => step === 56).length;
  };

  const isPokerPhase = [
    Phase.POKER_PRE_FLOP,
    Phase.POKER_FLOP,
    Phase.POKER_TURN,
    Phase.POKER_RIVER,
    Phase.POKER_SHOWDOWN,
  ].includes(phase);

  const renderPlayer = (color) => {
    const isBot = playerMode === 'VS_BOT' && color !== 'red';
    
    return (
      <PlayerInfoBar
        playerColor={color}
        homeCount={getHomeCount(color)}
        isActive={currentPlayer === color}
        isWinner={winner === color}
        isBot={isBot}
      />
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0D1321] text-white flex flex-col md:flex-row">
      
      {/* LEFT COLUMN: LUDO (approx 60-65% width) */}
      <div className="flex-[6] h-full flex flex-col items-center p-2 relative">
        
        {/* Header - Flow normally at the top */}
        <div className="w-full flex justify-start pl-2 pt-2 mb-2">
          <Header
            playerMode={playerMode}
            setPlayerMode={setPlayerMode}
            soundMuted={soundMuted}
            setSoundMuted={setSoundMuted}
            onReset={resetGame}
          />
        </div>

        {/* Ludo Container with constraints to maintain square aspect ratio without overlap */}
        <div className="flex flex-col w-full h-full justify-center items-center flex-1 min-h-0 pb-4">
          
          {/* Top Players - Pushed to the edges */}
          <div className="w-full max-w-[85vh] flex justify-between px-2 mb-3">
            {renderPlayer('red')}
            {renderPlayer('green')}
          </div>

          {/* CENTRAL LUDO BOARD - Auto-scales but stays square */}
          <div className="flex justify-center flex-1 min-h-0 w-full">
            <div className="aspect-square h-full w-auto">
              <LudoBoard
                tokens={tokens}
                currentPlayer={currentPlayer}
                movableTokens={movableTokens}
                onTokenClick={moveToken}
              />
            </div>
          </div>

          {/* Bottom Players - Pushed to the edges */}
          <div className="w-full max-w-[85vh] flex justify-between px-2 mt-3">
            {renderPlayer('blue')}
            {renderPlayer('yellow')}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: POKER / ACTION (approx 35-40% width) */}
      <div className="flex-[4] h-full bg-[#0D1321] border-l border-slate-800 flex flex-col p-4">
        
        {!isPokerPhase ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="bg-[#131C31] border border-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-[450px]">
              <ActionPanel
                phase={phase}
                currentPlayer={currentPlayer}
                bankroll={bankroll}
                pokerResult={pokerResult}
                totalWinnings={totalWinnings}
                canStartPoker={canStartPoker}
                onStartPoker={startPokerRound}
                movementDirection={movementDirection}
                movementTarget={movementTarget}
                onChooseDirection={chooseDirection}
                opponents={opponents}
                movementComponents={movementComponents}
                currentComponent={currentComponent}
                componentAssignments={componentAssignments}
                onSkipComponent={skipComponent}
                onEndMovement={endMovementPhase}
                movableTokens={movableTokens}
                turnNumber={turnNumber}
                playerChoicePhase={playerChoicePhase}
                pendingPlayerChoices={pendingPlayerChoices}
                movementTier={movementTier}
                onSubmitPlayerChoices={submitPlayerChoices}
              />
            </div>
          </div>
        ) : (
          <PokerPanel
            phase={phase}
            currentPlayer={currentPlayer}
            playerMode={playerMode}
            pokerPlayers={pokerPlayers}
            activePokerPlayers={activePokerPlayers}
            communityCards={communityCards}
            pot={pot}
            currentPokerActor={currentPokerActor}
            currentBetToMatch={currentBetToMatch}
            submitPokerAction={submitPokerAction}
          />
        )}
      </div>

      {/* Winner Celebration Modal */}
      <WinnerModal winner={winner} onRestart={resetGame} />
    </div>
  );
}
