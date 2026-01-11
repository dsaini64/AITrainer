/**
 * Voice Chat Integration
 * Handles speech-to-text and text-to-speech for AI coach
 */

export interface VoiceConfig {
  enabled: boolean
  language: string
  voice: string
  speed: number
  pitch: number
  volume: number
}

export interface VoiceMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: string
  duration?: number
}

class VoiceChatManager {
  private config: VoiceConfig
  private recognition: any = null
  private synthesis: SpeechSynthesis
  private isListening: boolean = false
  private isSpeaking: boolean = false

  constructor() {
    this.config = {
      enabled: false,
      language: 'en-US',
      voice: 'default',
      speed: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
    
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis
      this.initializeSpeechRecognition()
    }
  }

  /**
   * Initialize speech recognition
   */
  private initializeSpeechRecognition(): void {
    if (typeof window === 'undefined') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition()
      this.recognition.continuous = false
      this.recognition.interimResults = true
      this.recognition.lang = this.config.language
      
      this.recognition.onstart = () => {
        this.isListening = true
      }
      
      this.recognition.onend = () => {
        this.isListening = false
      }
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        this.isListening = false
      }
    }
  }

  /**
   * Start listening for voice input
   */
  async startListening(): Promise<string> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported')
    }

    if (this.isListening) {
      throw new Error('Already listening')
    }

    return new Promise((resolve, reject) => {
      let finalTranscript = ''
      
      this.recognition.onresult = (event: any) => {
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        // You could emit interim results here for real-time display
        if (interimTranscript) {
          console.log('Interim transcript:', interimTranscript)
        }
      }
      
      this.recognition.onend = () => {
        this.isListening = false
        if (finalTranscript) {
          resolve(finalTranscript.trim())
        } else {
          reject(new Error('No speech detected'))
        }
      }
      
      this.recognition.onerror = (event: any) => {
        this.isListening = false
        reject(new Error(`Speech recognition error: ${event.error}`))
      }
      
      try {
        this.recognition.start()
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }

  /**
   * Speak text using text-to-speech
   */
  async speak(text: string): Promise<void> {
    if (this.isSpeaking) {
      this.stopSpeaking()
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      
      // Configure voice settings
      utterance.rate = this.config.speed
      utterance.pitch = this.config.pitch
      utterance.volume = this.config.volume
      utterance.lang = this.config.language
      
      // Set voice if available
      const voices = this.synthesis.getVoices()
      const selectedVoice = voices.find(voice => 
        voice.name === this.config.voice || 
        voice.lang === this.config.language
      )
      
      if (selectedVoice) {
        utterance.voice = selectedVoice
      }
      
      utterance.onstart = () => {
        this.isSpeaking = true
      }
      
      utterance.onend = () => {
        this.isSpeaking = false
        resolve()
      }
      
      utterance.onerror = (event) => {
        this.isSpeaking = false
        reject(new Error(`Speech synthesis error: ${event.error}`))
      }
      
      this.synthesis.speak(utterance)
    })
  }

  /**
   * Stop speaking
   */
  stopSpeaking(): void {
    if (this.isSpeaking) {
      this.synthesis.cancel()
      this.isSpeaking = false
    }
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices()
  }

  /**
   * Update voice configuration
   */
  updateConfig(config: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config }
    
    if (this.recognition && config.language) {
      this.recognition.lang = config.language
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): VoiceConfig {
    return this.config
  }

  /**
   * Check if voice features are supported
   */
  isSupported(): boolean {
    return !!(this.recognition && this.synthesis)
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening
  }

  /**
   * Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking
  }

  /**
   * Enable voice chat
   */
  enable(): void {
    this.config.enabled = true
  }

  /**
   * Disable voice chat
   */
  disable(): void {
    this.config.enabled = false
    this.stopListening()
    this.stopSpeaking()
  }
}

export const voiceChatManager = new VoiceChatManager()
