import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { google } from '@google-cloud/text-to-speech/build/protos/protos.js';

class TTSService {
  private client: TextToSpeechClient;

  constructor() {
    // If GOOGLE_APPLICATION_CREDENTIALS is set, the client will use it automatically.
    // Otherwise, we fallback to the GEMINI_API_KEY.
    const config: any = {};
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GEMINI_API_KEY) {
        config.apiKey = process.env.GEMINI_API_KEY;
    }
    
    this.client = new TextToSpeechClient(config);
  }

  /**
   * Converts text to speech and returns the audio buffer (MP3)
   */
  async synthesize(text: string): Promise<Buffer> {
    const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
      input: { text },
      // Select the language and SSML voice gender (optional)
      voice: { 
        languageCode: 'fr-FR',
        name: 'fr-FR-Wavenet-B', // High quality neural voice (Male)
        ssmlGender: 'MALE' 
      },
      // select the type of audio encoding
      audioConfig: { audioEncoding: 'MP3' },
    };

    // Performs the text-to-speech request
    const [response] = await this.client.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error('TTS failed: No audio content returned');
    }

    return response.audioContent as Buffer;
  }
}

export const ttsService = new TTSService();
