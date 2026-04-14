import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

/**
 * RecordButton — Botão de gravação com transcrição de áudio.
 * Usa /api/transcribe para converter áudio em texto.
 */
export function RecordButton({ onTranscription, className = '' }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const TAG = '[RecordButton]';

    console.group(`${TAG} transcribeAudio()`);
    console.log('1. Blob recebido:', {
      size: audioBlob.size,
      type: audioBlob.type,
      sizeKB: (audioBlob.size / 1024).toFixed(1) + ' KB',
    });

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      console.log('2. Áudio convertido para base64:', {
        base64Length: base64.length,
        payloadEstimateKB: (base64.length / 1024).toFixed(1) + ' KB',
      });

      const url = '/api/transcribe';
      console.log('3. Enviando para:', url, '→ proxy esperado: http://localhost:3001/api/transcribe');

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, filename: 'recording.webm', mimeType: audioBlob.type || 'audio/webm' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      console.log('4. Resposta HTTP:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        xPoweredBy: response.headers.get('x-powered-by'),
        url: response.url,
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!isJson) {
        const text = await response.text();
        console.error('5. ❌ Resposta não é JSON.', {
          statusRecebido: response.status,
          contentTypeRecebido: contentType,
          corpoResposta: text.slice(0, 300),
          diagnostico: response.status === 404
            ? 'ROTA NÃO ENCONTRADA — servidor pode estar desatualizado (reinicie npm run dev)'
            : response.status === 502 || response.status === 503
            ? 'PROXY FALHOU — Express (porta 3001) provavelmente não está rodando'
            : 'Resposta inesperada do servidor',
        });
        throw new Error(
          response.status === 404
            ? '[404] Rota /api/transcribe não encontrada. Reinicie o servidor (npm run dev).'
            : response.status === 502
            ? '[502] Express não está rodando na porta 3001. Execute: npm run dev'
            : `[${response.status}] Resposta inválida do servidor (não JSON).`
        );
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('5. ❌ Erro do servidor:', errorData);
        throw new Error(errorData.error || `Erro ${response.status} na transcrição`);
      }

      const data = await response.json();
      console.log('5. ✅ Transcrição recebida:', {
        transcription: data.transcription?.slice(0, 80) + (data.transcription?.length > 80 ? '…' : ''),
        length: data.transcription?.length,
      });
      console.groupEnd();
      onTranscription(data.transcription);
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.error(`${TAG} ⏱ Timeout: requisição excedeu 30s`);
      } else {
        console.error(`${TAG} ❌ Erro final:`, error.message);
      }
      console.groupEnd();
      const msg = error.name === 'AbortError' ? 'Tempo limite excedido (30s)' : error.message;
      alert('Erro na transcrição: ' + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isProcessing}
      className={`
        relative flex items-center justify-center
        w-12 h-12 rounded-full
        transition-all duration-300 flex-shrink-0
        ${isRecording
          ? 'animate-pulse'
          : ''
        }
        ${isProcessing ? 'cursor-wait' : ''}
        ${className}
      `}
      style={{
        backgroundColor: isRecording ? '#EF4444' : isProcessing ? 'var(--color-primary)' : 'var(--color-surface)',
        border: `1px solid ${isRecording ? '#EF4444' : 'var(--color-border)'}`,
      }}
    >
      {isProcessing ? (
        <Loader2 size={20} className="text-white animate-spin" style={{ color: 'var(--color-text)' }} />
      ) : isRecording ? (
        <MicOff size={20} className="text-white" />
      ) : (
        <Mic size={20} className="text-white" style={{ color: 'var(--color-text)' }} />
      )}

      {isRecording && (
        <>
          <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-20" />
          <span className="absolute inset-[-4px] rounded-full border-2 border-red-500 animate-pulse" />
        </>
      )}
    </button>
  );
}
