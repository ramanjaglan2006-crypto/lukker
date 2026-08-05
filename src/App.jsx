import React, { useState } from 'react';
import Header from './components/Header';
import PlayerInfoBar from './components/PlayerInfoBar';
import LudoBoard from './components/LudoBoard';
import ActionPanel from './components/ActionPanel';
import SideGuide from './components/SideGuide';
import WinnerModal from './components/WinnerModal';
import PokerPanel from './components/PokerPanel';
import { useGameEngine } from './hooks/useGameEngine';

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

  return (
    <div className="min-h-screen bg-[#0D1321] text-white p-3 sm:p-6 flex flex-col items-center gap-4 max-w-7xl mx-auto">
      {/* Top Header Navigation */}
      <Header
        playerMode={playerMode}
        setPlayerMode={setPlayerMode}
        soundMuted={soundMuted}
        setSoundMuted={setSoundMuted}
        onReset={resetGame}
      />

      {/* Main Game Interface Layout */}
      <main className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 flex-1">
        {/* Left/Center Game Container */}
        <div className="flex flex-col items-center gap-4 w-full max-w-[620px]">
          {/* TOP PLAYER INFO BARS */}
          <div className="w-full grid grid-cols-2 gap-3 sm:gap-4">
            <PlayerInfoBar
              playerColor="red"
              homeCount={getHomeCount('red')}
              isActive={currentPlayer === 'red'}
              isWinner={winner === 'red'}
            />
            <PlayerInfoBar
              playerColor="green"
              homeCount={getHomeCount('green')}
              isActive={currentPlayer === 'green'}
              isWinner={winner === 'green'}
              isBot={playerMode === 'VS_BOT'}
            />
          </div>

          {/* CENTRAL LUDO BOARD */}
          <LudoBoard
            tokens={tokens}
            currentPlayer={currentPlayer}
            movableTokens={movableTokens}
            onTokenClick={moveToken}
          />

          {/* BOTTOM PLAYER INFO BARS */}
          <div className="w-full grid grid-cols-2 gap-3 sm:gap-4">
            <PlayerInfoBar
              playerColor="blue"
              homeCount={getHomeCount('blue')}
              isActive={currentPlayer === 'blue'}
              isWinner={winner === 'blue'}
              isBot={playerMode === 'VS_BOT'}
            />
            <PlayerInfoBar
              playerColor="yellow"
              homeCount={getHomeCount('yellow')}
              isActive={currentPlayer === 'yellow'}
              isWinner={winner === 'yellow'}
              isBot={playerMode === 'VS_BOT'}
            />
          </div>

          {/* ACTION PANEL — Poker + Direction + Component controls */}
          <div className="w-full bg-[#131C31] border border-slate-800 rounded-2xl p-4 flex items-center justify-around shadow-xl">
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
          </div>
        </div>

        {/* Right Side Guide & Log Panel */}
        <SideGuide gameLog={gameLog} />
      </main>

      {/* Winner Celebration Modal */}
      <WinnerModal winner={winner} onRestart={resetGame} />
    </div>
  );
}
