const stones = [
  [7, 7, 'black'],
  [8, 7, 'white'],
  [6, 8, 'black'],
  [7, 8, 'white'],
  [5, 9, 'black'],
  [8, 8, 'white'],
  [4, 10, 'black'],
  [6, 9, 'white'],
  [8, 6, 'black'],
  [9, 5, 'white'],
  [9, 9, 'black'],
  [10, 8, 'white'],
  [5, 7, 'black'],
] as const;

export default function BoardArt() {
  return (
    <div className="board-art" aria-hidden="true">
      <div className="board-orbit orbit-one" />
      <div className="board-orbit orbit-two" />
      <span className="board-spark spark-one">+</span>
      <span className="board-spark spark-two">+</span>
      <svg className="hero-board" viewBox="0 0 560 410" fill="none">
        <defs>
          <linearGradient
            id="wood"
            x1="70"
            y1="20"
            x2="470"
            y2="400"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#efddbb" />
            <stop offset="1" stopColor="#d7b986" />
          </linearGradient>
          <linearGradient id="edge" x1="40" y1="0" x2="480" y2="400" gradientUnits="userSpaceOnUse">
            <stop stopColor="#caa675" />
            <stop offset="1" stopColor="#ad8957" />
          </linearGradient>
          <radialGradient id="blackStone" cx="0.32" cy="0.22" r="0.8">
            <stop stopColor="#606460" />
            <stop offset="0.45" stopColor="#333733" />
            <stop offset="1" stopColor="#171e19" />
          </radialGradient>
          <radialGradient id="whiteStone" cx="0.32" cy="0.22" r="0.85">
            <stop stopColor="#ffffff" />
            <stop offset="0.6" stopColor="#faf9f3" />
            <stop offset="1" stopColor="#d8d8cd" />
          </radialGradient>
          <filter id="boardShadow" x="-30%" y="-30%" width="170%" height="180%">
            <feDropShadow
              dx="6"
              dy="26"
              stdDeviation="16"
              floodColor="#6a654a"
              floodOpacity="0.2"
            />
          </filter>
          <filter id="stoneShadow" x="-50%" y="-40%" width="220%" height="230%">
            <feDropShadow
              dx="1"
              dy="3"
              stdDeviation="1.7"
              floodColor="#564d36"
              floodOpacity="0.4"
            />
          </filter>
        </defs>
        <g
          transform="translate(83 43) rotate(-11 210 190) skewX(7) scale(.94 .8)"
          filter="url(#boardShadow)"
        >
          <rect x="0" y="13" width="400" height="400" rx="12" fill="url(#edge)" />
          <rect width="400" height="400" rx="12" fill="url(#wood)" />
          <rect x="6" y="6" width="388" height="388" rx="9" stroke="#fff8e8" strokeOpacity=".48" />
          {Array.from({ length: 34 }, (_, i) => (
            <path
              key={`grain-${i}`}
              d={`M 12 ${12 + i * 11.3} Q 200 ${8 + i * 11.3} 388 ${13 + i * 11.3}`}
              stroke="#987445"
              strokeOpacity=".045"
            />
          ))}
          {Array.from({ length: 15 }, (_, i) => (
            <g key={i} stroke="#887c59" strokeOpacity=".53" strokeWidth=".8">
              <path d={`M ${32 + i * 24} 32 V 368`} />
              <path d={`M 32 ${32 + i * 24} H 368`} />
            </g>
          ))}
          {[
            [3, 3],
            [11, 3],
            [7, 7],
            [3, 11],
            [11, 11],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={32 + x * 24} cy={32 + y * 24} r="2.7" fill="#786a4c" />
          ))}
          {stones.map(([x, y, color], i) => (
            <g
              key={`${x}-${y}`}
              className="art-stone"
              style={{ animationDelay: `${i * 65 + 150}ms` }}
            >
              <circle
                cx={32 + x * 24}
                cy={30 + y * 24}
                r="11"
                fill={`url(#${color}Stone)`}
                filter="url(#stoneShadow)"
              />
              {i === stones.length - 1 && (
                <circle cx={32 + x * 24} cy={30 + y * 24} r="2.3" fill="#b5c99b" />
              )}
            </g>
          ))}
        </g>
      </svg>
      <div className="board-caption">
        <span className="caption-stone" />
        一黑一白，无限可能
        <span className="caption-line" />
      </div>
      <span className="board-coordinate">H8 · YOUR NEXT MOVE</span>
    </div>
  );
}
