import React from 'react';
import { motion, type Transition } from 'motion/react';

interface BorderTrailProps {
  className?: string;
  size?: number;
  transition?: Transition;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
}

export const BorderTrail: React.FC<BorderTrailProps> = ({
  className = '',
  size = 70,
  transition,
  onAnimationComplete,
  style,
}) => {
  const defaultTransition: Transition = {
    repeat: Infinity,
    duration: 4.5,
    ease: 'linear',
  };

  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={`absolute aspect-square bg-gradient-to-r from-[#ef8354] via-[#ffffff] to-transparent ${className}`}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round 16px)`,
          ...style,
        }}
        animate={{
          offsetDistance: ['0%', '100%'],
        }}
        transition={transition || defaultTransition}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
};
