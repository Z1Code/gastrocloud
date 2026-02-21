'use client';

import { motion } from 'framer-motion';
import { useCountdown } from '@/hooks/useCountdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CountdownTimerProps {
  targetDate: Date;
  totalSeconds: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { ring: 48, stroke: 3, text: 'text-sm', font: 'text-xs' },
  md: { ring: 64, stroke: 4, text: 'text-lg', font: 'text-xs' },
  lg: { ring: 88, stroke: 5, text: 'text-2xl', font: 'text-xs' },
} as const;

const urgencyColors = {
  normal: {
    text: 'text-emerald-400',
    stroke: '#34d399',
    bg: '#34d39920',
    shadow: '0 0 20px rgba(52, 211, 153, 0.3)',
  },
  warning: {
    text: 'text-amber-400',
    stroke: '#fbbf24',
    bg: '#fbbf2420',
    shadow: '0 0 20px rgba(251, 191, 36, 0.3)',
  },
  critical: {
    text: 'text-red-400',
    stroke: '#f87171',
    bg: '#f8717120',
    shadow: '0 0 25px rgba(248, 113, 113, 0.4)',
  },
};

export function CountdownTimer({ targetDate, totalSeconds, size = 'lg' }: CountdownTimerProps) {
  const { formatted, percentRemaining, urgency, isExpired } = useCountdown(targetDate, totalSeconds);
  const config = sizeConfig[size];
  const colors = urgencyColors[urgency];

  const radius = (config.ring - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percentRemaining / 100);

  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={
        urgency === 'critical'
          ? { scale: [1, 1.04, 1], opacity: [1, 0.85, 1] }
          : {}
      }
      transition={
        urgency === 'critical'
          ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
          : {}
      }
    >
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-40"
        style={{ background: colors.bg }}
      />

      <svg
        width={config.ring}
        height={config.ring}
        className="-rotate-90"
      >
        <circle
          cx={config.ring / 2}
          cy={config.ring / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={config.stroke}
        />
        <motion.circle
          cx={config.ring / 2}
          cy={config.ring / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(${colors.shadow})` }}
        />
      </svg>

      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center',
          colors.text
        )}
      >
        <span className={cn('font-mono font-bold tracking-wider', config.text)}>
          {isExpired ? '00:00' : formatted}
        </span>
      </div>
    </motion.div>
  );
}
