import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  audioStream?: MediaStream | null;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ isRecording, audioStream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRecording || !audioStream) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(audioStream);
      source.connect(analyser);

      analyser.fftSize = 64;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.85 + 4;
          ctx.fillStyle = '#174B35';
          ctx.beginPath();
          ctx.roundRect(x, (canvas.height - barHeight) / 2, barWidth - 2, barHeight, 4);
          ctx.fill();
          x += barWidth;
        }
      };

      draw();

      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        audioCtx.close().catch(() => {});
      };
    } catch (e) {
      console.warn("AudioContext waveform error:", e);
    }
  }, [isRecording, audioStream]);

  if (!isRecording) {
    return (
      <div className="h-14 w-full flex items-center justify-center gap-1 text-[#647168] text-xs">
        {[4, 8, 12, 16, 20, 14, 18, 10, 6, 12, 16, 8, 4].map((h, i) => (
          <div
            key={i}
            className="w-1.5 bg-[#C4CEC7] rounded-full transition-all duration-300"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="h-14 w-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={260}
        height={56}
        className="w-full max-w-xs h-14"
      />
    </div>
  );
};

