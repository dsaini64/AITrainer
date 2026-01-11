"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Camera, 
  Upload, 
  Image as ImageIcon, 
  Utensils, 
  Dumbbell, 
  Heart, 
  Moon,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2
} from "lucide-react"

interface ImageAnalysisResult {
  id: string
  type: 'food' | 'exercise' | 'skin' | 'sleep' | 'general'
  confidence: number
  analysis: {
    description: string
    insights: string[]
    recommendations: string[]
    healthScore?: number
    nutritionalInfo?: any
    exerciseInfo?: any
    skinAnalysis?: any
  }
  timestamp: string
}

export function ImageAnalysis() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ImageAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisType, setAnalysisType] = useState<'auto' | 'food' | 'exercise' | 'skin' | 'sleep' | 'general'>('auto')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCameraCapture = () => {
    // In a real implementation, this would open the camera
    fileInputRef.current?.click()
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedFile)
      if (analysisType !== 'auto') {
        formData.append('type', analysisType)
      }

      const response = await fetch('/api/ai/image-analysis', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const data = await response.json()
      setAnalysis(data.result)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'food': return <Utensils className="h-4 w-4" />
      case 'exercise': return <Dumbbell className="h-4 w-4" />
      case 'skin': return <Heart className="h-4 w-4" />
      case 'sleep': return <Moon className="h-4 w-4" />
      default: return <ImageIcon className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'food': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'exercise': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'skin': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      case 'sleep': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Camera className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          <span>Image Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleCameraCapture}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Camera className="h-4 w-4" />
              <span>Camera</span>
            </Button>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Analysis Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Analysis Type
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'auto', label: 'Auto Detect', icon: <ImageIcon className="h-4 w-4" /> },
                { value: 'food', label: 'Food', icon: <Utensils className="h-4 w-4" /> },
                { value: 'exercise', label: 'Exercise', icon: <Dumbbell className="h-4 w-4" /> },
                { value: 'skin', label: 'Skin', icon: <Heart className="h-4 w-4" /> },
                { value: 'sleep', label: 'Sleep', icon: <Moon className="h-4 w-4" /> }
              ].map((type) => (
                <Button
                  key={type.value}
                  variant={analysisType === type.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalysisType(type.value as any)}
                  className="flex items-center space-x-2"
                >
                  {type.icon}
                  <span>{type.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg border"
              />
              <div className="absolute top-2 right-2">
                <Badge className={getTypeColor(analysisType)}>
                  {getTypeIcon(analysisType)}
                  <span className="ml-1 capitalize">{analysisType}</span>
                </Badge>
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analyze Image
                </>
              )}
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">Analysis Failed</h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Analysis Results
              </h3>
              <Badge className={getTypeColor(analysis.type)}>
                {getTypeIcon(analysis.type)}
                <span className="ml-1 capitalize">{analysis.type}</span>
              </Badge>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Description
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    {analysis.analysis.description}
                  </p>
                </div>

                {analysis.analysis.healthScore && (
                  <div className="flex items-center justify-between p-4 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-lg">
                    <div>
                      <h4 className="font-medium text-teal-800 dark:text-teal-200">
                        Health Score
                      </h4>
                      <p className="text-sm text-teal-600 dark:text-teal-400">
                        Based on visual analysis
                      </p>
                    </div>
                    <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                      {analysis.analysis.healthScore}/10
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                  <span>Confidence: {Math.round(analysis.confidence * 100)}%</span>
                  <span>{new Date(analysis.timestamp).toLocaleString()}</span>
                </div>
              </TabsContent>

              <TabsContent value="insights" className="space-y-4">
                <div className="space-y-3">
                  {analysis.analysis.insights.map((insight, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">{insight}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                <div className="space-y-3">
                  {analysis.analysis.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-700 dark:text-green-300">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* No File Selected */}
        {!preview && !loading && (
          <div className="text-center py-12">
            <Camera className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              Upload an Image
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Get AI-powered health insights from your photos
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Choose Image
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}












