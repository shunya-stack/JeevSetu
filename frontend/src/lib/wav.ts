// Converts any browser-decodable audio (WebM recording, MP3/OGG/M4A upload) into
// a 16-bit PCM WAV blob, because the Gnani Vachana STT API only accepts
// flac/m4a/ogg/mp3/aac/wav containers and rejects WebM recordings outright.

export interface WavConversion {
  blob: Blob;
  durationSeconds: number;
}

const MAX_DURATION_SECONDS = 30; // Vachana REST endpoint hard limit

export class WavConversionError extends Error {
  detail: 'undecodable' | 'empty' | 'too_long' | 'browser_unsupported';
  constructor(detail: WavConversionError['detail'], message: string) {
    super(message);
    this.detail = detail;
  }
}

export async function convertBlobToWav(source: Blob): Promise<WavConversion> {
  if (!source || source.size === 0) {
    throw new WavConversionError('empty', 'The selected audio is empty (0 bytes).');
  }
  const AudioCtx: typeof AudioContext | undefined = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx || typeof AudioCtx.prototype.decodeAudioData !== 'function') {
    throw new WavConversionError('browser_unsupported', 'This browser cannot decode audio for transcription.');
  }

  const arrayBuffer = await source.arrayBuffer();
  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    throw new WavConversionError('undecodable', 'The audio could not be decoded. Please use a valid WAV, MP3, OGG or M4A file.');
  } finally {
    void ctx.close();
  }

  if (decoded.duration > MAX_DURATION_SECONDS) {
    throw new WavConversionError(
      'too_long',
      `Audio is ${decoded.duration.toFixed(1)} seconds long; the transcription service accepts up to ${MAX_DURATION_SECONDS} seconds.`
    );
  }
  if (decoded.length === 0) {
    throw new WavConversionError('empty', 'The audio contains no recorded samples.');
  }

  const frames = decoded.length;
  const wavBuffer = encodePcmWav(decoded, frames);
  return {
    blob: new Blob([wavBuffer], { type: 'audio/wav' }),
    durationSeconds: decoded.duration
  };
}

function encodePcmWav(decoded: AudioBuffer, frames: number): ArrayBuffer {
  // Mono downmix (average the channels), keep the source sample rate.
  const left = decoded.getChannelData(0);
  const right = decoded.numberOfChannels > 1 ? decoded.getChannelData(1) : null;
  const mono = new Int16Array(frames);
  for (let i = 0; i < frames; i++) {
    const sample = right ? (left[i] + right[i]) / 2 : left[i];
    const clamped = Math.max(-1, Math.min(1, sample));
    mono[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
  }

  const sampleRate = decoded.sampleRate;
  const dataSize = frames * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset++, str.charCodeAt(i));
  };
  const writeU32 = (value: number) => {
    view.setUint32(offset, value, true);
    offset += 4;
  };
  const writeU16 = (value: number) => {
    view.setUint16(offset, value, true);
    offset += 2;
  };

  writeString('RIFF'); writeU32(36 + dataSize); writeString('WAVE');
  writeString('fmt '); writeU32(16); writeU16(1); writeU16(1);
  writeU32(sampleRate); writeU32(sampleRate * 2); writeU16(2); writeU16(16);
  writeString('data'); writeU32(dataSize);
  for (let i = 0; i < frames; i++) {
    view.setInt16(offset, mono[i], true);
    offset += 2;
  }
  return buffer;
}
