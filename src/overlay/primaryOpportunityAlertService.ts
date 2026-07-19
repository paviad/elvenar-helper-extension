let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtx) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioCtx();
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }

  return audioContext;
}

export function playPrimaryOpportunityAlert(): void {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  try {
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(920, now);
    oscillator.frequency.setValueAtTime(740, now + 0.16);
    oscillator.frequency.setValueAtTime(980, now + 0.3);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.24, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.46);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  } catch (error) {
    console.warn('Unable to play primary opportunity alert sound:', error);
  }
}
