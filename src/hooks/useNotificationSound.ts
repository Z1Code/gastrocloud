"use client";

import { useCallback, useRef } from "react";

type SoundType = "urgent" | "normal" | "soft";

interface SoundConfig {
  frequency: number;
  duration: number;
  repeats: number;
  gap: number;
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  urgent: { frequency: 880, duration: 0.15, repeats: 3, gap: 0.1 },
  normal: { frequency: 660, duration: 0.2, repeats: 2, gap: 0.15 },
  soft: { frequency: 440, duration: 0.3, repeats: 1, gap: 0 },
};

const SOURCE_TO_SOUND: Record<string, SoundType> = {
  uber_eats: "urgent",
  rappi: "urgent",
  web: "normal",
  pos_inhouse: "normal",
  whatsapp: "normal",
  qr_table: "soft",
};

export function useNotificationSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback((): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playSound = useCallback(
    (type: SoundType) => {
      const ctx = getAudioContext();
      const config = SOUND_CONFIGS[type];
      const now = ctx.currentTime;

      for (let i = 0; i < config.repeats; i++) {
        const startTime = now + i * (config.duration + config.gap);

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(config.frequency, startTime);

        // Fade in: 0 → 0.3 over 20ms
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);

        // Fade out: 0.3 → 0 over duration
        gainNode.gain.linearRampToValueAtTime(0, startTime + config.duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + config.duration);
      }
    },
    [getAudioContext]
  );

  const playSoundForSource = useCallback(
    (source: string) => {
      const type = SOURCE_TO_SOUND[source] ?? "normal";
      playSound(type);
    },
    [playSound]
  );

  return { playSound, playSoundForSource };
}
