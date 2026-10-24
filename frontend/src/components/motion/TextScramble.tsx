import React, { useEffect, useState } from 'react';

interface TextScrambleProps {
  children: string;
  duration?: number;
  speed?: number;
  characterSet?: string;
  className?: string;
  as?: React.ElementType;
  trigger?: boolean;
  onScrambleComplete?: () => void;
}

const DEFAULT_CHARS = '0123456789abcdefABCDEF!<>-_\\/[]{}—=+*^?#';

export const TextScramble: React.FC<TextScrambleProps> = ({
  children,
  duration = 0.8,
  speed = 0.04,
  characterSet = DEFAULT_CHARS,
  className = '',
  as: Component = 'span',
  trigger = true,
  onScrambleComplete,
}) => {
  const [displayText, setDisplayText] = useState(children);
  const [isScrambling, setIsScrambling] = useState(false);

  useEffect(() => {
    if (!trigger) return;

    let iteration = 0;
    const maxIterations = Math.max(1, Math.floor(duration / speed));
    setIsScrambling(true);

    const interval = setInterval(() => {
      setDisplayText(() =>
        children
          .split('')
          .map((char, index) => {
            if (char === ' ' || char === '\n') return char;
            const progress = iteration / maxIterations;
            if (index / children.length <= progress) {
              return children[index];
            }
            return characterSet[Math.floor(Math.random() * characterSet.length)];
          })
          .join('')
      );

      iteration += 1;

      if (iteration > maxIterations) {
        clearInterval(interval);
        setDisplayText(children);
        setIsScrambling(false);
        if (onScrambleComplete) onScrambleComplete();
      }
    }, speed * 1000);

    return () => clearInterval(interval);
  }, [children, trigger, duration, speed, characterSet, onScrambleComplete]);

  return <Component className={className}>{displayText}</Component>;
};
