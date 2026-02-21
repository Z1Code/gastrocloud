'use client';

import { useState, useEffect, useCallback } from 'react';

interface CountdownResult {
  secondsRemaining: number;
  totalSeconds: number;
  percentRemaining: number;
  isExpired: boolean;
  formatted: string;
  urgency: 'normal' | 'warning' | 'critical';
}

export function useCountdown(targetDate: Date, totalSeconds: number): CountdownResult {
  const calculate = useCallback((): CountdownResult => {
    const now = Date.now();
    const target = targetDate.getTime();
    const remaining = Math.max(0, Math.floor((target - now) / 1000));
    const percent = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;

    let urgency: 'normal' | 'warning' | 'critical' = 'normal';
    if (percent <= 25) urgency = 'critical';
    else if (percent <= 50) urgency = 'warning';

    return {
      secondsRemaining: remaining,
      totalSeconds,
      percentRemaining: Math.min(100, Math.max(0, percent)),
      isExpired: remaining <= 0,
      formatted: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
      urgency,
    };
  }, [targetDate, totalSeconds]);

  const [state, setState] = useState<CountdownResult>(calculate);

  useEffect(() => {
    setState(calculate());
    const interval = setInterval(() => {
      setState(calculate());
    }, 1000);
    return () => clearInterval(interval);
  }, [calculate]);

  return state;
}
