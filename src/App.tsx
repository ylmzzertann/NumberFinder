import { useState, useEffect } from 'react';

type GameState = 'SETUP' | 'PLAYING' | 'GAMEOVER';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface NumberItem {
  id: string;
  value: number;
  used: boolean;
}

function App() {
  const [gameState, setGameState] = useState<GameState>('SETUP');
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [timeLeft, setTimeLeft] = useState<number>(90);
  const [targetNumber, setTargetNumber] = useState<number>(0);
  const [numbers, setNumbers] = useState<NumberItem[]>([]);
  const [selectedNumId, setSelectedNumId] = useState<string | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [operations, setOperations] = useState<string[]>([]);
  const [currentClosest, setCurrentClosest] = useState<number>(0);

  useEffect(() => {
    let timer: number;
    if (gameState === 'PLAYING' && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (gameState === 'PLAYING' && timeLeft === 0) {
      endGame();
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const startGame = () => {
    const timeLimits = { EASY: 90, MEDIUM: 60, HARD: 30 };
    setTimeLeft(timeLimits[difficulty]);
    
    const generatedTarget = Math.floor(Math.random() * 900) + 100; // 100 to 999
    setTargetNumber(generatedTarget);

    const newNumbers: NumberItem[] = [];
    for (let i = 0; i < 5; i++) {
      newNumbers.push({
        id: `single-${i}`,
        value: Math.floor(Math.random() * 9) + 1, // 1 to 9
        used: false
      });
    }

    const twoDigitOptions = [25, 50, 75];
    const twoDigit = twoDigitOptions[Math.floor(Math.random() * twoDigitOptions.length)];
    newNumbers.push({
      id: `double-0`,
      value: twoDigit,
      used: false
    });

    setNumbers(newNumbers);
    setOperations([]);
    setSelectedNumId(null);
    setSelectedOperator(null);
    setCurrentClosest(Math.abs(newNumbers[0].value - generatedTarget)); // Init with something
    setGameState('PLAYING');

    // Update closest for initially given numbers
    let bestDist = Infinity;
    let bestNum = 0;
    newNumbers.forEach(n => {
      const dist = Math.abs(n.value - generatedTarget);
      if (dist < bestDist) {
        bestDist = dist;
        bestNum = n.value;
      }
    });
    setCurrentClosest(bestNum);
  };

  const endGame = () => {
    setGameState('GAMEOVER');
  };

  const handleNumberClick = (id: string) => {
    const num = numbers.find(n => n.id === id);
    if (!num || num.used) return;

    if (!selectedNumId) {
      setSelectedNumId(id);
    } else if (selectedNumId && !selectedOperator) {
      setSelectedNumId(id);
    } else if (selectedNumId && selectedOperator && selectedNumId !== id) {
      performOperation(selectedNumId, selectedOperator, id);
    }
  };

  const performOperation = (id1: string, op: string, id2: string) => {
    const num1 = numbers.find(n => n.id === id1);
    const num2 = numbers.find(n => n.id === id2);
    if (!num1 || !num2) return;

    let result = 0;
    const val1 = num1.value;
    const val2 = num2.value;

    switch (op) {
      case '+': result = val1 + val2; break;
      case '-': 
        if (val1 <= val2) return; // Disallow non-positive results
        result = val1 - val2; 
        break;
      case '*': result = val1 * val2; break;
      case '/':
        if (val2 === 0 || val1 % val2 !== 0) return; // Must divide evenly
        result = val1 / val2;
        break;
    }

    const newId = `res-${Date.now()}`;
    const newNum: NumberItem = { id: newId, value: result, used: false };
    
    setNumbers(prev => prev.map(n => 
      n.id === id1 || n.id === id2 ? { ...n, used: true } : n
    ).concat(newNum));

    const logEntry = `${val1} ${op} ${val2} = ${result}`;
    setOperations(prev => [...prev, logEntry]);
    
    setSelectedNumId(null);
    setSelectedOperator(null);

    // Update closest
    const dist = Math.abs(result - targetNumber);
    const currentDist = Math.abs(currentClosest - targetNumber);
    if (dist < currentDist) {
      setCurrentClosest(result);
    }

    if (result === targetNumber) {
      setCurrentClosest(result);
      endGame();
    }
  };

  const getScore = () => {
    const diff = Math.abs(currentClosest - targetNumber);
    if (diff === 0) return { points: 10, msg: "Mükemmel! Tam İsabet!" };
    if (diff === 1) return { points: 7, msg: "Çok Yakın! (Fark: 1)" };
    if (diff === 2) return { points: 5, msg: "Yaklaştın! (Fark: 2)" };
    if (diff === 3) return { points: 3, msg: "Ucundan Kaçtı (Fark: 3)" };
    return { points: 0, msg: `Maalesef Başarısız (Fark: ${diff})` };
  };

  const undoLast = () => {
    setNumbers(prev => {
        const original = prev.filter(n => !n.id.startsWith('res-')).map(n => ({...n, used: false}));
        
        // Recalculate closest for initially given numbers
        let bestDist = Infinity;
        let bestNum = 0;
        original.forEach(n => {
          const dist = Math.abs(n.value - targetNumber);
          if (dist < bestDist) {
            bestDist = dist;
            bestNum = n.value;
          }
        });
        setCurrentClosest(bestNum);

        return original;
    });
    setOperations([]);
    setSelectedNumId(null);
    setSelectedOperator(null);
  }

  return (
    <div className="app-container">
      {gameState === 'SETUP' && (
        <div className="glass-panel">
          <h1>Bir Kelime Bir İşlem</h1>
          <p className="subtitle">Hedef sayıya en az farkla ulaşmaya çalışın!</p>
          
          <div className="difficulty-selector">
            {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(level => (
              <button
                key={level}
                className={`difficulty-btn ${difficulty === level ? 'active' : ''}`}
                onClick={() => setDifficulty(level)}
              >
                {level === 'EASY' ? 'Kolay (90sn)' : level === 'MEDIUM' ? 'Orta (60sn)' : 'Zor (30sn)'}
              </button>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <button className="btn" onClick={startGame}>Oyuna Başla</button>
          </div>
        </div>
      )}

      {gameState === 'PLAYING' && (
        <div className="glass-panel">
          <div className="game-header">
            <div className="timer">
              ⏱️ {timeLeft}
            </div>
            <div className="target-number-container">
              <div className="target-label">Hedef Sayı</div>
              <div className="target-number">{targetNumber}</div>
            </div>
            <div>
               <button className="btn btn-danger" onClick={endGame}>Bitir</button>
            </div>
          </div>

          <div className="numbers-grid">
            {numbers.map(n => (
              <div
                key={n.id}
                className={`number-card ${n.used ? 'used' : ''} ${selectedNumId === n.id ? 'selected' : ''}`}
                onClick={() => handleNumberClick(n.id)}
              >
                {n.value}
              </div>
            ))}
          </div>

          <div className="operators">
            {['+', '-', '*', '/'].map(op => (
              <button
                key={op}
                className={`operator-btn ${selectedOperator === op ? 'selected' : ''}`}
                onClick={() => setSelectedOperator(op)}
                disabled={!selectedNumId}
              >
                {op}
              </button>
            ))}
          </div>

          <div className="operations-log">
            {operations.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem' }}>
                Henüz bir işlem yapılmadı.
              </div>
            ) : (
              operations.map((op, i) => (
                <div key={i} className="log-entry">
                  <span>İşlem {i + 1}:</span>
                  <span className="result">{op}</span>
                </div>
              ))
            )}
          </div>

          <div className="controls">
            <button className="btn" onClick={undoLast}>İşlemleri Sıfırla</button>
          </div>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="glass-panel result-screen">
          <h2 className="result-title">Oyun Bitti!</h2>
          
          <div className="result-stats">
            <div className="stat-row">
              <span>Hedef Sayı:</span>
              <strong>{targetNumber}</strong>
            </div>
            <div className="stat-row">
              <span>Ulaşılan En Yakın Sayı:</span>
              <strong>{currentClosest}</strong>
            </div>
          </div>

          <div className="result-score">
            <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              {getScore().msg}
            </div>
            <div>
              Kazanılan Puan: <strong style={{ color: 'var(--accent-color)', fontSize: '2rem' }}>{getScore().points}</strong>
            </div>
          </div>

          <button className="btn" onClick={() => setGameState('SETUP')}>Tekrar Oyna</button>
        </div>
      )}
    </div>
  );
}

export default App;
