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
    gameLog, // We are not using this visually anymore in the production UI, but keeping it in the hook return
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
    dealer, // assuming useGameEngine exposes this or we can derive it. Wait, dealer is in the engine? We might need to check if useGameEngine exposes dealer, sb, bb
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

  // We need to pass the proper props to PlayerInfoBar
  const renderPlayer = (color) => {
    const isBot = playerMode === 'VS_BOT' && color !== 'red';
    const isLocal = playerMode === 'VS_BOT' ? color === 'red' : true;
    
    // We assume dealer, smallBlind, bigBlind might be exposed or we can check pokerPlayers[color] if it has flags. 
    // If they aren't explicitly in the returned hook props, we'll gracefully ignore or just use what we have.
    // For now, let's pass what we know.
    const pState = pokerPlayers ? pokerPlayers[color] : null;

    return (
      <PlayerInfoBar
        playerColor={color}
        homeCount={getHomeCount(color)}
        isActive={currentPlayer === color}
        isWinner={winner === color}
        isBot={isBot}
        isPokerPhase={isPokerPhase}
        pokerState={pState}
        isLocalPlayer={isLocal}
        showdown={phase === Phase.POKER_SHOWDOWN}
        // if dealer etc are not available, they just default to false in PlayerInfoBar
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#0D1321] text-white p-3 sm:p-6 flex flex-col items-center gap-4 mx-auto w-full">
      {/* Top Header Navigation */}
      <Header
        playerMode={playerMode}
        setPlayerMode={setPlayerMode}
        soundMuted={soundMuted}
        setSoundMuted={setSoundMuted}
        onReset={resetGame}
      />

      {/* Main Game Interface Layout */}
      <main className="w-full flex flex-col items-center justify-start gap-4 flex-1 max-w-[800px]">
        
        {/* TOP: Community Cards */}
        <CommunityCards 
          phase={phase} 
          communityCards={communityCards} 
          pot={pot} 
        />

        {/* MIDDLE: 2x2 grid for players + Ludo Board */}
        <div className="w-full flex flex-col gap-4">
          
          {/* Top Players */}
          <div className="w-full flex justify-between gap-4">
            <div className="flex-1 flex justify-start">{renderPlayer('red')}</div>
            <div className="flex-1 flex justify-end">{renderPlayer('green')}</div>
          </div>

          {/* CENTRAL LUDO BOARD */}
          <div className="flex justify-center w-full">
            <LudoBoard
              tokens={tokens}
              currentPlayer={currentPlayer}
              movableTokens={movableTokens}
              onTokenClick={moveToken}
            />
          </div>

          {/* Bottom Players */}
          <div className="w-full flex justify-between gap-4">
            <div className="flex-1 flex justify-start">{renderPlayer('blue')}</div>
            <div className="flex-1 flex justify-end">{renderPlayer('yellow')}</div>
          </div>

        </div>

        {/* BOTTOM: ACTION PANEL — Poker + Direction + Component controls */}
        <div className="w-full max-w-[620px] mt-4">
          {!isPokerPhase && (
            <div className="bg-[#131C31] border border-slate-800 rounded-2xl p-4 flex items-center justify-center shadow-xl">
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
          )}
          
          {isPokerPhase && (
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

      </main>

      {/* Winner Celebration Modal */}
      <WinnerModal winner={winner} onRestart={resetGame} />
    </div>
  );
}
