"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

interface OnboardingData {
  // Goals & Motivation
  mainGoal: string
  goalImportance: string
  confidence: number
  coachingStyle: string
  motivationType: string
  
  // Schedule & Context
  wakeUpTime: string
  bedTime: string
  busyDays: string[]
  exerciseLocation: string
  equipment: string[]
  
  // Communication & Check-ins
  checkInFrequency: string
  preferredTime: string
  tone: string
  wearables: string[]
  supportSystem: string
  
  // Commitment
  daysPerWeek: number
  motivationStatement: string
}

const initialData: OnboardingData = {
  mainGoal: "",
  goalImportance: "",
  confidence: 3,
  coachingStyle: "",
  motivationType: "",
  wakeUpTime: "",
  bedTime: "",
  busyDays: [],
  exerciseLocation: "",
  equipment: [],
  checkInFrequency: "",
  preferredTime: "",
  tone: "",
  wearables: [],
  supportSystem: "",
  daysPerWeek: 3,
  motivationStatement: ""
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<OnboardingData>(initialData)
  
  const steps = [
    { title: "Goals & Motivation", description: "Let's understand what drives you" },
    { title: "Schedule & Context", description: "When and where you'll be active" },
    { title: "Communication", description: "How you like to be coached" },
    { title: "Commitment", description: "Your realistic goals" }
  ]

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const isStepValid = (step: number) => {
    switch (step) {
      case 0: // Goals & Motivation
        return data.mainGoal && data.goalImportance && data.coachingStyle && data.motivationType
      case 1: // Schedule & Context
        return data.wakeUpTime && data.bedTime && data.exerciseLocation && data.equipment.length > 0
      case 2: // Communication
        return data.checkInFrequency && data.preferredTime && data.tone
      case 3: // Commitment
        return data.motivationStatement
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!isStepValid(currentStep)) {
      const stepNames = ['Goals & Motivation', 'Schedule & Context', 'Communication', 'Commitment']
      alert(`Please complete all required fields in the ${stepNames[currentStep]} section before proceeding.`)
      return
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Save onboarding data and redirect
      localStorage.setItem('onboardingData', JSON.stringify(data))
      localStorage.setItem('onboardingCompleted', 'true')
      router.push('/coach')
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 pb-32">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Let's personalize your health journey
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-8 h-8 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center text-sm font-semibold text-teal-600 dark:text-teal-400">
                  {currentStep + 1}
                </span>
                {steps[currentStep].title}
              </CardTitle>
              <CardDescription>
                {steps[currentStep].description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isStepValid(currentStep) && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Please fill in all required fields (marked with *) before proceeding to the next step.
                  </p>
                </div>
              )}
              
              {currentStep === 0 && (
                <GoalsMotivationStep data={data} updateData={updateData} />
              )}
              {currentStep === 1 && (
                <ScheduleContextStep data={data} updateData={updateData} />
              )}
              {currentStep === 2 && (
                <CommunicationStep data={data} updateData={updateData} />
              )}
              {currentStep === 3 && (
                <CommitmentStep data={data} updateData={updateData} />
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-8 mb-12">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!isStepValid(currentStep)}
              className="flex items-center gap-2"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Check className="h-4 w-4" />
                  Complete Setup
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Goals & Motivation Step
function GoalsMotivationStep({ data, updateData }: { data: OnboardingData, updateData: (field: keyof OnboardingData, value: any) => void }) {
  const goals = [
    "Longevity (living longer & healthier)",
    "Weight management", 
    "Building strength",
    "Improving energy / mood",
    "Mobility & pain-free movement",
    "Heart & endurance fitness"
  ]

  const coachingStyles = [
    "Gentle & encouraging",
    "Direct & structured", 
    "Playful & lighthearted",
    "Minimal words, just actions"
  ]

  const motivationTypes = [
    "Seeing stats / progress charts",
    "Words of encouragement",
    "Earning badges or streaks", 
    "Trying new challenges",
    "Feeling accountable to someone"
  ]

  return (
    <div className="space-y-6">
      {/* Main Goal */}
      <div>
        <Label className="text-base font-semibold">1️⃣ Your main health goal right now *</Label>
        <RadioGroup value={data.mainGoal} onValueChange={(value) => updateData('mainGoal', value)} className="mt-3">
          {goals.map((goal) => (
            <div key={goal} className="flex items-center space-x-2">
              <RadioGroupItem value={goal} id={goal} />
              <Label htmlFor={goal}>{goal}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Goal Importance */}
      <div>
        <Label className="text-base font-semibold">2️⃣ Why is this goal personally important to you? *</Label>
        <Textarea
          placeholder="1 sentence — this helps personalize motivation."
          value={data.goalImportance}
          onChange={(e) => updateData('goalImportance', e.target.value)}
          className="mt-3"
        />
      </div>

      {/* Confidence */}
      <div>
        <Label className="text-base font-semibold">3️⃣ How confident are you that you can stick to small daily actions this week?</Label>
        <RadioGroup value={data.confidence.toString()} onValueChange={(value) => updateData('confidence', parseInt(value))} className="mt-3">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="flex items-center space-x-2">
                <RadioGroupItem value={num.toString()} id={`conf-${num}`} />
                <Label htmlFor={`conf-${num}`}>{num}</Label>
              </div>
            ))}
          </div>
        </RadioGroup>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>Not confident</span>
          <span>Very confident</span>
        </div>
      </div>

      {/* Coaching Style */}
      <div>
        <Label className="text-base font-semibold">4️⃣ Which coaching style do you prefer? *</Label>
        <RadioGroup value={data.coachingStyle} onValueChange={(value) => updateData('coachingStyle', value)} className="mt-3">
          {coachingStyles.map((style) => (
            <div key={style} className="flex items-center space-x-2">
              <RadioGroupItem value={style} id={style} />
              <Label htmlFor={style}>{style}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Motivation Type */}
      <div>
        <Label className="text-base font-semibold">5️⃣ What keeps you motivated the most? *</Label>
        <RadioGroup value={data.motivationType} onValueChange={(value) => updateData('motivationType', value)} className="mt-3">
          {motivationTypes.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <RadioGroupItem value={type} id={type} />
              <Label htmlFor={type}>{type}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}

// Schedule & Context Step
function ScheduleContextStep({ data, updateData }: { data: OnboardingData, updateData: (field: keyof OnboardingData, value: any) => void }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const locations = ["Home", "Gym", "Outdoors", "Travel often / hotels"]
  const equipment = [
    "None (bodyweight only)",
    "Dumbbells", 
    "Resistance bands",
    "Kettlebells",
    "Barbell / rack",
    "Machines / cable station",
    "Cardio machine (bike/treadmill/etc.)"
  ]

  return (
    <div className="space-y-6">
      {/* Wake Up Time */}
      <div>
        <Label className="text-base font-semibold">6️⃣ What time do you usually wake up? ⏰ *</Label>
        <Input
          type="time"
          value={data.wakeUpTime}
          onChange={(e) => updateData('wakeUpTime', e.target.value)}
          className="mt-3 w-32"
        />
      </div>

      {/* Bed Time */}
      <div>
        <Label className="text-base font-semibold">7️⃣ What time do you usually go to bed? 🌙 *</Label>
        <Input
          type="time"
          value={data.bedTime}
          onChange={(e) => updateData('bedTime', e.target.value)}
          className="mt-3 w-32"
        />
      </div>

      {/* Busy Days */}
      <div>
        <Label className="text-base font-semibold">8️⃣ Which days are you busiest?</Label>
        <div className="flex flex-wrap gap-3 mt-3">
          {days.map((day) => (
            <div key={day} className="flex items-center space-x-2">
              <Checkbox
                id={day}
                checked={data.busyDays.includes(day)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateData('busyDays', [...data.busyDays, day])
                  } else {
                    updateData('busyDays', data.busyDays.filter(d => d !== day))
                  }
                }}
              />
              <Label htmlFor={day}>{day}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Exercise Location */}
      <div>
        <Label className="text-base font-semibold">9️⃣ Where will you mostly exercise? *</Label>
        <RadioGroup value={data.exerciseLocation} onValueChange={(value) => updateData('exerciseLocation', value)} className="mt-3">
          {locations.map((location) => (
            <div key={location} className="flex items-center space-x-2">
              <RadioGroupItem value={location} id={location} />
              <Label htmlFor={location}>{location}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Equipment */}
      <div>
        <Label className="text-base font-semibold">🔟 What equipment do you have access to? *</Label>
        <div className="space-y-2 mt-3">
          {equipment.map((item) => (
            <div key={item} className="flex items-center space-x-2">
              <Checkbox
                id={item}
                checked={data.equipment.includes(item)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateData('equipment', [...data.equipment, item])
                  } else {
                    updateData('equipment', data.equipment.filter(e => e !== item))
                  }
                }}
              />
              <Label htmlFor={item}>{item}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Communication Step
function CommunicationStep({ data, updateData }: { data: OnboardingData, updateData: (field: keyof OnboardingData, value: any) => void }) {
  const frequencies = ["Daily quick check", "Every 2–3 days", "Weekly summary only"]
  const times = ["Morning", "Afternoon", "Evening"]
  const tones = ["Supportive and warm", "Keep it short & factual", "Push me a little if I slack"]
  const wearables = ["Apple Health", "Fitbit", "WHOOP", "Oura", "Not now"]
  const supportSystems = ["Partner / family", "Friend", "Doctor / trainer", "None right now"]

  return (
    <div className="space-y-6">
      {/* Check-in Frequency */}
      <div>
        <Label className="text-base font-semibold">1️⃣1️⃣ How often do you want me to check in? *</Label>
        <RadioGroup value={data.checkInFrequency} onValueChange={(value) => updateData('checkInFrequency', value)} className="mt-3">
          {frequencies.map((freq) => (
            <div key={freq} className="flex items-center space-x-2">
              <RadioGroupItem value={freq} id={freq} />
              <Label htmlFor={freq}>{freq}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Preferred Time */}
      <div>
        <Label className="text-base font-semibold">1️⃣2️⃣ What time of day suits you best for nudges or messages? *</Label>
        <RadioGroup value={data.preferredTime} onValueChange={(value) => updateData('preferredTime', value)} className="mt-3">
          {times.map((time) => (
            <div key={time} className="flex items-center space-x-2">
              <RadioGroupItem value={time} id={time} />
              <Label htmlFor={time}>{time}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Tone */}
      <div>
        <Label className="text-base font-semibold">1️⃣3️⃣ Preferred tone during check-ins: *</Label>
        <RadioGroup value={data.tone} onValueChange={(value) => updateData('tone', value)} className="mt-3">
          {tones.map((tone) => (
            <div key={tone} className="flex items-center space-x-2">
              <RadioGroupItem value={tone} id={tone} />
              <Label htmlFor={tone}>{tone}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Wearables */}
      <div>
        <Label className="text-base font-semibold">1️⃣4️⃣ Would you like to connect any wearable or health app?</Label>
        <div className="space-y-2 mt-3">
          {wearables.map((wearable) => (
            <div key={wearable} className="flex items-center space-x-2">
              <Checkbox
                id={wearable}
                checked={data.wearables.includes(wearable)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateData('wearables', [...data.wearables, wearable])
                  } else {
                    updateData('wearables', data.wearables.filter(w => w !== wearable))
                  }
                }}
              />
              <Label htmlFor={wearable}>{wearable}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Support System */}
      <div>
        <Label className="text-base font-semibold">1️⃣5️⃣ Is there anyone supporting your health journey?</Label>
        <RadioGroup value={data.supportSystem} onValueChange={(value) => updateData('supportSystem', value)} className="mt-3">
          {supportSystems.map((system) => (
            <div key={system} className="flex items-center space-x-2">
              <RadioGroupItem value={system} id={system} />
              <Label htmlFor={system}>{system}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}

// Commitment Step
function CommitmentStep({ data, updateData }: { data: OnboardingData, updateData: (field: keyof OnboardingData, value: any) => void }) {
  const daysOptions = [2, 3, 4, 5]

  return (
    <div className="space-y-6">
      {/* Days Per Week */}
      <div>
        <Label className="text-base font-semibold">1️⃣6️⃣ How many days per week can you realistically commit to movement?</Label>
        <RadioGroup value={data.daysPerWeek.toString()} onValueChange={(value) => updateData('daysPerWeek', parseInt(value))} className="mt-3">
          {daysOptions.map((days) => (
            <div key={days} className="flex items-center space-x-2">
              <RadioGroupItem value={days.toString()} id={`days-${days}`} />
              <Label htmlFor={`days-${days}`}>{days}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Motivation Statement */}
      <div>
        <Label className="text-base font-semibold">1️⃣7️⃣ Finish this sentence: *</Label>
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-slate-600 dark:text-slate-400">"I'm doing this because</span>
            <Input
              value={data.motivationStatement}
              onChange={(e) => updateData('motivationStatement', e.target.value)}
              placeholder="______________________"
              className="flex-1"
            />
            <span className="text-slate-600 dark:text-slate-400">."</span>
          </div>
        </div>
      </div>
    </div>
  )
}
