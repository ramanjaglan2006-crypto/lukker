import { useState, useCallback, useEffect, useRef } from 'react';
import { PLAYERS, PLAYER_CONFIGS, getTokenCoordinates, isSafeCell } from '../utils/ludoPaths';
import { sounds } from '../utils/soundEffects';

export function useLudoGame({
  playerMode = '4P', // '2P' | '4P' | 'VS_BOT'
  soundEnabled = true
}) {
  // Active players in match
  const activePlayerList = playerMode === '2P' ? ['red', 'yellow'] : PLAYERS;

  const [currentPlayer, setCurrentPlayer] = useState('red');
  const [diceValue, setDiceValue] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [lastRollWasSix, setLastRollWasSix] = useState(false);
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);

  // Tokens state: { red: [-1, -1, -1, -1], green: [...], yellow: [...], blue: [...] }
  const [tokens, setTokens] = useState(() => ({
    red: [-1, -1, -1, -1],
    green: [-1, -1, -1, -1],
    yellow: [-1, -1, -1, -1],
    blue: [-1, -1, -1, -1]
  }));

  const [winner, setWinner] = useState(null);
  const [movingToken, setMovingToken] = useState(null); // { player, tokenIdx }
  const [gameLog, setGameLog] = useState(['Game started! Red turn.']);

  const isAnimatingRef = useRef(false);

  // Helper to log game events
  const addLog = (msg) => {
    setGameLog(prev => [msg, ...prev.slice(0, 19)]);
  };

  // Next player logic
  const getNextPlayer = useCallback((curr) => {
    const idx = activePlayerList.indexOf(curr);
    const nextIdx = (idx + 1) % activePlayerList.length;
    return activePlayerList[nextIdx];
  }, [activePlayerList]);

  // Check if player has any valid moves with current dice roll
  const getMovableTokens = useCallback((player, roll, currentTokens) => {
    const playerTokens = currentTokens[player];
    const movableIndices = [];

    playerTokens.forEach((step, idx) => {
      // 1. In base (-1): can only come out if roll === 6
      if (step === -1) {
        if (roll === 6) movableIndices.push(idx);
      }
      // 2. On track/home path: can move if step + roll <= 56
      else if (step >= 0 && step < 56) {
        if (step + roll <= 56) {
          movableIndices.push(idx);
        }
      }
    });

    return movableIndices;
  }, []);

  // Reset Game
  const resetGame = useCallback(() => {
    setTokens({
      red: [-1, -1, -1, -1],
      green: [-1, -1, -1, -1],
      yellow: [-1, -1, -1, -1],
      blue: [-1, -1, -1, -1]
    });
    setCurrentPlayer('red');
    setDiceValue(1);
    setIsRolling(false);
    setHasRolled(false);
    setLastRollWasSix(false);
    setConsecutiveSixes(0);
    setWinner(null);
    setMovingToken(null);
    setGameLog(['New Game Started!']);
    sounds.playTurnChange();
  }, []);

  // Pass turn to next player
  const passTurn = useCallback((nextP) => {
    const targetPlayer = nextP || getNextPlayer(currentPlayer);
    setCurrentPlayer(targetPlayer);
    setHasRolled(false);
    setLastRollWasSix(false);
    sounds.playTurnChange();
    addLog(`Turn passed to ${PLAYER_CONFIGS[targetPlayer].name}`);
  }, [currentPlayer, getNextPlayer]);

  // Execute step-by-step token movement
  const moveToken = useCallback(async (player, tokenIdx, roll) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setMovingToken({ player, tokenIdx });

    const currentStep = tokens[player][tokenIdx];

    // Case 1: Bringing token out of Home Base (step -1 -> 0)
    if (currentStep === -1 && roll === 6) {
      sounds.playTokenMove();
      setTokens(prev => {
        const next = { ...prev };
        next[player] = [...next[player]];
        next[player][tokenIdx] = 0;
        return next;
      });
      addLog(`${PLAYER_CONFIGS[player].name} brought out a token!`);
      isAnimatingRef.current = false;
      setMovingToken(null);

      // Check if player gets extra turn for 6
      setHasRolled(false);
      setLastRollWasSix(true);
      return;
    }

    // Case 2: Step-by-step movement along path
    const targetStep = currentStep + roll;

    for (let s = currentStep + 1; s <= targetStep; s++) {
      await new Promise(r => setTimeout(r, 160));
      sounds.playTokenMove();

      setTokens(prev => {
        const next = { ...prev };
        next[player] = [...next[player]];
        next[player][tokenIdx] = s;
        return next;
      });
    }

    // Check landing cell events
    const finalStep = targetStep;
    const finalCoords = getTokenCoordinates(player, finalStep);

    let captured = false;
    let reachedHome = false;

    if (finalStep === 56) {
      // Token reached Home Center!
      reachedHome = true;
      sounds.playSafeZone();
      addLog(`🎉 ${PLAYER_CONFIGS[player].name} token reached Home!`);
    } else if (finalCoords && !isSafeCell(finalCoords.r, finalCoords.c)) {
      // Check capture opponent token on non-safe cell
      Object.keys(tokens).forEach(otherPlayer => {
        if (otherPlayer === player) return;
        if (!activePlayerList.includes(otherPlayer)) return;

        tokens[otherPlayer].forEach((otherStep, otherIdx) => {
          if (otherStep >= 0 && otherStep < 51) {
            const otherCoords = getTokenCoordinates(otherPlayer, otherStep);
            if (otherCoords && otherCoords.r === finalCoords.r && otherCoords.c === finalCoords.c) {
              // Capture! Send back to base (-1)
              captured = true;
              sounds.playCapture();
              setTokens(prev => {
                const next = { ...prev };
                next[otherPlayer] = [...next[otherPlayer]];
                next[otherPlayer][otherIdx] = -1;
                return next;
              });
              addLog(`💥 ${PLAYER_CONFIGS[player].name} captured ${PLAYER_CONFIGS[otherPlayer].name}'s token!`);
            }
          }
        });
      });
    }

    // Check Win Condition
    setTokens(prev => {
      const playerHomeCount = prev[player].filter(st => st === 56).length;
      if (playerHomeCount === 4) {
        setWinner(player);
        sounds.playVictory();
        addLog(`🏆 ${PLAYER_CONFIGS[player].name} WINS THE GAME!`);
      }
      return prev;
    });

    isAnimatingRef.current = false;
    setMovingToken(null);

    // Extra turn if rolled 6, captured opponent, or reached home
    if (roll === 6 || captured || reachedHome) {
      setHasRolled(false);
      setLastRollWasSix(true);
      addLog(`${PLAYER_CONFIGS[player].name} gets an extra turn!`);
    } else {
      passTurn();
    }
  }, [tokens, activePlayerList, passTurn]);

  // Roll Dice Action
  const rollDice = useCallback(() => {
    if (hasRolled || isRolling || winner || isAnimatingRef.current) return;

    setIsRolling(true);
    sounds.playDiceRoll();

    setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolled);
      setIsRolling(false);
      setHasRolled(true);

      addLog(`${PLAYER_CONFIGS[currentPlayer].name} rolled a ${rolled}`);

      // Handle 3 consecutive sixes penalty rule
      let currentSixes = consecutiveSixes;
      if (rolled === 6) {
        currentSixes += 1;
        setConsecutiveSixes(currentSixes);
        if (currentSixes === 3) {
          addLog(`⚠️ 3 consecutive sixes! Turn lost.`);
          setConsecutiveSixes(0);
          passTurn();
          return;
        }
      } else {
        setConsecutiveSixes(0);
      }

      // Check if player has any movable tokens
      const movables = getMovableTokens(currentPlayer, rolled, tokens);
      if (movables.length === 0) {
        addLog(`No valid moves available for ${PLAYER_CONFIGS[currentPlayer].name}.`);
        setTimeout(() => {
          if (rolled === 6) {
            setHasRolled(false);
            setLastRollWasSix(true);
          } else {
            passTurn();
          }
        }, 800);
      } else if (movables.length === 1 && (playerMode === 'VS_BOT' && currentPlayer !== 'red')) {
        // Auto-move if only 1 token available for Bot
        setTimeout(() => {
          moveToken(currentPlayer, movables[0], rolled);
        }, 400);
      }
    }, 600);
  }, [hasRolled, isRolling, winner, currentPlayer, consecutiveSixes, getMovableTokens, tokens, passTurn, moveToken, playerMode]);

  // Bot AI Automated Turn Trigger
  useEffect(() => {
    if (playerMode === 'VS_BOT' && currentPlayer !== 'red' && !winner) {
      if (!hasRolled && !isRolling && !isAnimatingRef.current) {
        const timer = setTimeout(() => {
          rollDice();
        }, 1000);
        return () => clearTimeout(timer);
      } else if (hasRolled && !isRolling && !isAnimatingRef.current) {
        const movables = getMovableTokens(currentPlayer, diceValue, tokens);
        if (movables.length > 0) {
          const timer = setTimeout(() => {
            // Smart pick: prefer tokens on track, or bringing out new token
            const chosenToken = movables.find(idx => tokens[currentPlayer][idx] >= 0) ?? movables[0];
            moveToken(currentPlayer, chosenToken, diceValue);
          }, 800);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [playerMode, currentPlayer, hasRolled, isRolling, winner, diceValue, getMovableTokens, tokens, rollDice, moveToken]);

  return {
    currentPlayer,
    diceValue,
    isRolling,
    hasRolled,
    lastRollWasSix,
    tokens,
    winner,
    movingToken,
    gameLog,
    movableTokens: hasRolled ? getMovableTokens(currentPlayer, diceValue, tokens) : [],
    rollDice,
    moveToken: (tokenIdx) => moveToken(currentPlayer, tokenIdx, diceValue),
    resetGame
  };
}
