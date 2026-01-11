"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Volume2, VolumeX, Settings, CheckCircle, XCircle } from "lucide-react"
import { voiceChatManager } from "@/lib/ai/voice-chat"

interface VoiceChatProps {
  onMessage: (message: string) => void
  onResponse: (response: string) => void
}

export function VoiceChat({ onMessage, onResponse }: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState("")
  const [config, setConfig] = useState(voiceChatManager.getConfig())

  useEffect(() => {
    // Check if voice features are supported
    if (!voiceChatManager.isSupported()) {
      setError("Voice features not supported in this browser")
      return
    }

    // Load available voices
    const loadVoices = () => {
      const availableVoices = voiceChatManager.getAvailableVoices()
      setVoices(availableVoices)
      
      if (availableVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(availableVoices[0].name)
      }
    }

    loadVoices()
    
    // Load voices when they become available
    if (typeof window !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    // Update state from manager
    const updateState = () => {
      setIsListening(voiceChatManager.getIsListening())
      setIsSpeaking(voiceChatManager.getIsSpeaking())
    }

    const interval = setInterval(updateState, 100)
    
    return () => {
      clearInterval(interval)
      if (typeof window !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [selectedVoice])

  const handleStartListening = async () => {
    try {
      setError(null)
      setTranscript("")
      
      const result = await voiceChatManager.startListening()
      setTranscript(result)
      onMessage(result)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start listening')
    }
  }

  const handleStopListening = () => {
    voiceChatManager.stopListening()
  }

  const handleSpeak = async (text: string) => {
    try {
      setError(null)
      await voiceChatManager.speak(text)
      onResponse(text)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to speak')
    }
  }

  const handleStopSpeaking = () => {
    voiceChatManager.stopSpeaking()
  }

  const handleToggleVoice = () => {
    if (isEnabled) {
      voiceChatManager.disable()
      setIsEnabled(false)
    } else {
      voiceChatManager.enable()
      setIsEnabled(true)
    }
  }

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName)
    voiceChatManager.updateConfig({ voice: voiceName })
  }

  const handleConfigChange = (key: keyof typeof config, value: any) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    voiceChatManager.updateConfig(newConfig)
  }

  if (!voiceChatManager.isSupported()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mic className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <span>Voice Chat</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              Voice features are not supported in this browser.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mic className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <span>Voice Chat</span>
          </div>
          <Button
            variant={isEnabled ? "default" : "outline"}
            size="sm"
            onClick={handleToggleVoice}
          >
            {isEnabled ? "Disable" : "Enable"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {isEnabled && (
          <>
            {/* Voice Controls */}
            <div className="flex items-center justify-center space-x-4">
              <Button
                size="lg"
                variant={isListening ? "destructive" : "default"}
                onClick={isListening ? handleStopListening : handleStartListening}
                disabled={isSpeaking}
                className="flex items-center space-x-2"
              >
                {isListening ? (
                  <>
                    <MicOff className="h-5 w-5" />
                    <span>Stop Listening</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    <span>Start Listening</span>
                  </>
                )}
              </Button>

              <Button
                size="lg"
                variant={isSpeaking ? "destructive" : "outline"}
                onClick={isSpeaking ? handleStopSpeaking : () => handleSpeak("Hello! How can I help you today?")}
                disabled={isListening}
                className="flex items-center space-x-2"
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="h-5 w-5" />
                    <span>Stop Speaking</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-5 w-5" />
                    <span>Test Voice</span>
                  </>
                )}
              </Button>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {isListening ? 'Listening...' : 'Not listening'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {isSpeaking ? 'Speaking...' : 'Not speaking'}
                </span>
              </div>
            </div>

            {/* Transcript */}
            {transcript && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Transcript
                </h4>
                <p className="text-slate-600 dark:text-slate-400">{transcript}</p>
              </div>
            )}

            {/* Voice Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Voice
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                >
                  {voices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Speed: {config.speed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={config.speed}
                    onChange={(e) => handleConfigChange('speed', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Pitch: {config.pitch.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={config.pitch}
                    onChange={(e) => handleConfigChange('pitch', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Volume: {Math.round(config.volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.volume}
                  onChange={(e) => handleConfigChange('volume', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </>
        )}

        {!isEnabled && (
          <div className="text-center py-8">
            <Mic className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Enable voice chat to interact with your AI coach using speech
            </p>
            <Button onClick={handleToggleVoice}>
              <Mic className="h-4 w-4 mr-2" />
              Enable Voice Chat
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}












