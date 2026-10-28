import confetti from 'canvas-confetti';

export function triggerPurgeConfetti() {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
    });
  } catch {
    // ignore if canvas not supported
  }
}
