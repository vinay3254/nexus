import React from 'react';
import { motion } from 'motion/react';

export const AmbientEmbers: React.FC = () => {
  const embers = [
    { x: '15%', y: '20%', size: 300, color: 'rgba(239, 131, 84, 0.08)', duration: 18, delay: 0 },
    { x: '85%', y: '15%', size: 400, color: 'rgba(79, 93, 117, 0.14)', duration: 24, delay: 2 },
    { x: '50%', y: '60%', size: 350, color: 'rgba(239, 131, 84, 0.06)', duration: 20, delay: 4 },
    { x: '20%', y: '85%', size: 280, color: 'rgba(79, 93, 117, 0.12)', duration: 22, delay: 1 },
    { x: '80%', y: '80%', size: 320, color: 'rgba(191, 192, 192, 0.05)', duration: 26, delay: 3 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {embers.map((ember, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-[100px]"
          style={{
            left: ember.x,
            top: ember.y,
            width: ember.size,
            height: ember.size,
            background: ember.color,
          }}
          animate={{
            x: [0, 30, -25, 0],
            y: [0, -35, 25, 0],
            scale: [1, 1.15, 0.9, 1],
            opacity: [0.6, 1, 0.7, 0.6],
          }}
          transition={{
            duration: ember.duration,
            delay: ember.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};
