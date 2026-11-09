import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { MicrophoneButton } from '../../components/voice/MicrophoneButton';
import { AudioWaveform } from '../../components/voice/AudioWaveform';
import { uploadAndTranscribeAudio, enforceLanguageAPI } from '../../lib/api';
import { convertBlobToWav, WavConversionError } from '../../lib/wav';
import { ArrowLeft, ArrowRight, Upload, FileText, Play, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';

export const ReportVoicePage: React.FC = () => {
  const { t, draft, updateDraft, language } = useLanguage();
  const navigate = useNavigate();

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(draft.audio_blob_url || null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab fallbacks: 'mic' | 'upload' | 'text'
  const [inputMode, setInputMode] = useState<'voice' | 'upload' | 'text'>('voice');
  const [typedText, setTypedText] = useState(draft.transcript || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const permissionRequestedRef = useRef(false);

  const getMicrophoneStream = async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access requires HTTPS on mobile. Open the HTTPS address shown by the development server.");
    }
    return navigator.mediaDevices.getUserMedia({ audio: true });
  };

  const getMicrophoneError = (error: unknown) => {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      return "Microphone permission was denied. Allow microphone access for this site in your browser settings, then tap Record again.";
    }
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return "No microphone was found. Check your device microphone and try again.";
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "Microphone access failed. Please use audio upload or type the description instead.";
  };

  const requestMicrophonePermission = async () => {
    if (permissionRequestedRef.current || !window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      return;
    }
    permissionRequestedRef.current = true;
    try {
      const stream = await getMicrophoneStream();
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      permissionRequestedRef.current = false;
      setErrorMsg(getMicrophoneError(error));
    }
  };

  useEffect(() => {
    void requestMicrophonePermission();
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await getMicrophoneStream();
      setAudioStream(stream);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
        setAudioStream(null);
      };

      recorder.start(250);
      setIsRecording(true);
    } catch (error) {
      console.warn("Microphone access error:", error);
      setErrorMsg(getMicrophoneError(error));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleResetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleProceedToProcessing = async () => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      if (inputMode === 'text') {
        if (!typedText.trim()) {
          setErrorMsg("Please type a short description before continuing.");
          setIsProcessing(false);
          return;
        }
        // Typed text bypasses speech transcription, so it must pass through the
        // same language enforcement rule: displayed text in the selected language.
        const enforced = await enforceLanguageAPI(typedText, language);
        updateDraft({
          transcript: enforced.transcript,
          enforced_language: enforced.requested_language,
          transcript_language: enforced.transcript_language,
          language_translated: !!enforced.language_translated,
          original_transcript: enforced.original_transcript,
          input_mode: 'text'
        });
        navigate('/report/processing');
        return;
      }

      // Voice or Audio Upload
      if (!audioBlob) {
        setErrorMsg("Please record your voice or select an audio file first.");
        setIsProcessing(false);
        return;
      }

      // Convert to WAV (the transcription API rejects WebM and limits audio to 30 seconds).
      let wavAudio;
      try {
        wavAudio = await convertBlobToWav(audioBlob);
      } catch (convErr: any) {
        console.warn("Audio conversion error:", convErr);
        setErrorMsg(convErr instanceof WavConversionError ? convErr.message : "The audio could not be processed. Please try again or use the typed description fallback.");
        setIsProcessing(false);
        return;
      }

      // Transcribe via API (Bhashini / Demo)
      const res = await uploadAndTranscribeAudio(wavAudio.blob, language);

      // The backend verifies the transcript is in the selected language and
      // translates it when needed. An empty or unverified transcript is
      // rejected here so the textarea never shows the wrong language.
      if (!res.transcript || !res.transcript.trim()) {
        setErrorMsg("No speech was recognised in this recording. Please re-record, speaking clearly.");
        setIsProcessing(false);
        return;
      }

      updateDraft({
        transcript: res.transcript,
        audio_object_key: res.audio_object_key,
        audio_blob_url: audioUrl || undefined,
        enforced_language: language,
        transcript_language: res.transcript_language,
        language_translated: !!res.language_translated,
        original_transcript: res.original_transcript,
        // Track all original recordings (supports re-record / Record More)
        original_audio_keys: [
          ...(draft.original_audio_keys || []),
          res.audio_object_key,
        ],
        original_transcripts: [
          ...(draft.original_transcripts || []),
          res.original_transcript || res.transcript,
        ],
        input_mode: inputMode
      });

      navigate('/report/processing');
    } catch (err: any) {
      console.error("Audio upload error:", err);
      setErrorMsg(err.message || "Live transcription failed. Please try again or use the typed description fallback.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F0] py-6 sm:py-10">
      <div className="max-w-xl mx-auto px-4 sm:px-6">

        {/* Navigation & Step */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/report" className="text-sm font-medium text-[#647168] hover:text-[#17251D] flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            {t('btn_back')}
          </Link>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E2EEE5] text-[#174B35]">
            {t('step_2')}
          </span>
        </div>

        {/* Stepper bar */}
        <div className="w-full bg-[#E2E7DF] h-1.5 rounded-full overflow-hidden mb-8">
          <div className="bg-[#174B35] h-full w-2/3 transition-all duration-300 rounded-full" />
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E7DF] shadow-sm space-y-6">

          <div className="text-center max-w-sm mx-auto">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#17251D]">
              {t('voice_title')}
            </h1>
            <p className="text-xs sm:text-sm text-[#647168] mt-1.5 leading-relaxed">
              {t('voice_subtitle')}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-[#EEF2E9] p-1 border border-[#E2E7DF]">
            <button
              type="button"
              onClick={() => setInputMode('voice')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${inputMode === 'voice' ? 'bg-white text-[#174B35] shadow-xs' : 'text-[#647168]'
                }`}
            >
              🎤 Microphone
            </button>
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${inputMode === 'upload' ? 'bg-white text-[#174B35] shadow-xs' : 'text-[#647168]'
                }`}
            >
              📁 Audio Upload
            </button>
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${inputMode === 'text' ? 'bg-white text-[#174B35] shadow-xs' : 'text-[#647168]'
                }`}
            >
              ✍️ Type Text
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-[#FCE9E7] border border-[#B83A35]/30 text-[#B83A35] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MODE 1: VOICE MICROPHONE */}
          {inputMode === 'voice' && (
            <div className="py-4 flex flex-col items-center justify-center space-y-6">

              {/* Waveform */}
              <div className="w-full bg-[#F7F7F0] rounded-2xl p-4 border border-[#E2E7DF]">
                <AudioWaveform isRecording={isRecording} audioStream={audioStream} />
              </div>

              {/* Main Microphone Button */}
              <MicrophoneButton
                isRecording={isRecording}
                isProcessing={isProcessing}
                onStart={startRecording}
                onStop={stopRecording}
              />

              {/* Recorded Audio Playback */}
              {audioUrl && !isRecording && (
                <div className="w-full bg-[#E2EEE5]/50 rounded-2xl p-4 border border-[#2D7D57]/30 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#174B35]">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-[#174B35]" />
                      Recording Captured
                    </span>
                    <button
                      type="button"
                      onClick={handleResetRecording}
                      className="text-[#B83A35] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t('voice_rerecord')}
                    </button>
                  </div>
                  <audio src={audioUrl} controls className="w-full h-10" />
                </div>
              )}

            </div>
          )}

          {/* MODE 2: AUDIO FILE UPLOAD */}
          {inputMode === 'upload' && (
            <div className="py-4 space-y-4">
              <label className="border-2 border-dashed border-[#E2E7DF] hover:border-[#174B35] rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer bg-[#F7F7F0] transition-colors">
                <Upload className="w-10 h-10 text-[#174B35] mb-2" />
                <span className="text-sm font-semibold text-[#17251D]">
                  {selectedFile ? selectedFile.name : "Select or drop audio recording"}
                </span>
                <span className="text-xs text-[#647168] mt-1">
                  Supported: WAV, MP3, WEBM, OGG (Max 25MB)
                </span>
                <input
                  type="file"
                  accept=".wav,.mp3,.webm,.ogg,.m4a,audio/wav,audio/mpeg,audio/webm,audio/ogg,audio/mp4"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {audioUrl && (
                <div className="bg-[#E2EEE5]/50 rounded-2xl p-4 border border-[#2D7D57]/30">
                  <audio src={audioUrl} controls className="w-full h-10" />
                </div>
              )}
            </div>
          )}

          {/* MODE 3: TYPED TEXT FALLBACK */}
          {inputMode === 'text' && (
            <div className="py-2 space-y-3">
              <label className="block text-xs font-semibold text-[#17251D]">
                Detailed description of symptoms (Odia, Hindi or English)
              </label>
              <textarea
                rows={5}
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="ଗାଈ ଦୁଇ ଦିନ ହେଲା ଖାଉନି, ବାମ ପଟ ପେଟ ଫୁଲି ଯାଇଛି... / गाय चारा नहीं खा रही है..."
                className="w-full p-4 rounded-2xl border border-[#E2E7DF] bg-[#F7F7F0] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174B35]"
              />
              <div className="text-right text-xs text-[#647168]">
                {typedText.length} characters
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isRecording || isProcessing || (!audioUrl && !typedText.trim())}
              onClick={handleProceedToProcessing}
              className={`w-full py-4 rounded-2xl text-white font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all ${isRecording || (!audioUrl && !typedText.trim())
                ? 'bg-[#C4CEC7] cursor-not-allowed'
                : 'bg-[#174B35] hover:bg-[#103D2A] cursor-pointer transform hover:-translate-y-0.5'
                }`}
            >
              <span>{isProcessing ? "Processing Audio..." : t('btn_continue')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
