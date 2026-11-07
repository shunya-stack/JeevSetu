import React from 'react';
import { Mic, Square, Loader2, RefreshCw } from 'lucide-react';

interface MicrophoneButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  isRecording,
  isProcessing,
  onStart,
  onStop,
  disabled = false
}) => {
  if (isProcessing) {
    return (
      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#E2EEE5] flex flex-col items-center justify-center text-[#174B35] shadow-inner">
        <Loader2 className="w-10 h-10 animate-spin text-[#174B35]" />
        <span className="text-xs font-medium mt-1">Processing</span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <button
        onClick={onStop}
        disabled={disabled}
        className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#B83A35] hover:bg-[#A32F2A] text-white flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 mic-recording focus:outline-none focus:ring-4 focus:ring-[#B83A35]/30 cursor-pointer"
        aria-label="Stop recording"
      >
        <Square className="w-10 h-10 fill-white" />
        <span className="text-xs font-semibold mt-1 uppercase tracking-wider">Stop</span>
      </button>
    );
  }

  return (
    <button
      onClick={onStart}
      disabled={disabled}
      className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#174B35] hover:bg-[#103D2A] text-white flex flex-col items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#174B35]/30 cursor-pointer"
      aria-label="Start recording voice"
    >
      <Mic className="w-10 h-10" />
      <span className="text-xs font-semibold mt-1 uppercase tracking-wider">Record</span>
    </button>
  );
};

