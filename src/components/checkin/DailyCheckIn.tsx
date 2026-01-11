"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckIn } from "@/types"
import { cn } from "@/lib/utils"
import { Heart, Zap, Activity, Wine, MessageSquare, Sparkles } from "lucide-react"

interface DailyCheckInProps {
  onSubmit: (checkIn: Omit<CheckIn, 'id' | 'date'>) => void
  onSkip: () => void
}

const moodEmojis = ['😔', '😕', '😐', '🙂', '😊']
const energyEmojis = ['🔋', '🔋', '🔋', '🔋', '🔋']
const sorenessEmojis = ['💪', '😌', '😐', '😣', '😵']

export function DailyCheckIn({ onSubmit, onSkip }: DailyCheckInProps) {
  const [mood, setMood] = useState<number>(3)
  const [energy, setEnergy] = useState<number>(3)
  const [soreness, setSoreness] = useState<number>(1)
  const [cravings, setCravings] = useState<boolean>(false)
  const [alcoholUnits, setAlcoholUnits] = useState<number>(0)
  const [notes, setNotes] = useState<string>("")
  const [gratitude, setGratitude] = useState<string>("")
  const [winOfDay, setWinOfDay] = useState<string>("")

  const handleSubmit = () => {
    onSubmit({
      mood,
      energy,
      soreness,
      cravings,
      alcoholUnits,
      notes: notes.trim() || undefined,
      gratitude: gratitude.trim() || undefined,
      winOfDay: winOfDay.trim() || undefined,
    })
  }

  const RatingScale = ({ 
    value, 
    onChange, 
    emojis, 
    labels 
  }: { 
    value: number
    onChange: (value: number) => void
    emojis: string[]
    labels: string[]
  }) => (
    <div className="flex justify-between items-center gap-2">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          onClick={() => onChange(rating)}
          className={cn(
            "flex flex-col items-center p-3 rounded-xl transition-all",
            value === rating
              ? "bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 scale-110"
              : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
          )}
        >
          <span className="text-2xl mb-1">{emojis[rating - 1]}</span>
          <span className="text-xs font-medium">{labels[rating - 1]}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-pink-600" />
            <CardTitle>How are you feeling?</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <RatingScale
            value={mood}
            onChange={setMood}
            emojis={moodEmojis}
            labels={['Poor', 'Low', 'Okay', 'Good', 'Great']}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-amber-600" />
            <CardTitle>Energy Level</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <RatingScale
            value={energy}
            onChange={setEnergy}
            emojis={energyEmojis}
            labels={['Drained', 'Low', 'Okay', 'Good', 'High']}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-red-600" />
            <CardTitle>Muscle Soreness</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <RatingScale
            value={soreness}
            onChange={setSoreness}
            emojis={sorenessEmojis}
            labels={['None', 'Light', 'Moderate', 'High', 'Severe']}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Experienced cravings today?</span>
            <div className="flex gap-2">
              <Button
                variant={!cravings ? "default" : "outline"}
                size="sm"
                onClick={() => setCravings(false)}
              >
                No
              </Button>
              <Button
                variant={cravings ? "default" : "outline"}
                size="sm"
                onClick={() => setCravings(true)}
              >
                Yes
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Wine className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Alcohol units today</span>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((units) => (
                <Button
                  key={units}
                  variant={alcoholUnits === units ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAlcoholUnits(units)}
                  className="min-w-[40px]"
                >
                  {units === 4 ? '4+' : units}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <CardTitle>Notes (Optional)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else you'd like to track today?"
            className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
            rows={3}
          />
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20 border-green-200 dark:border-green-800">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
            <CardTitle className="text-green-800 dark:text-green-200">Gratitude & Wins</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">
              What are you grateful for today?
            </label>
            <textarea
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              placeholder="Something you appreciate today..."
              className="w-full p-3 rounded-lg border border-green-200 dark:border-green-700 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              rows={2}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">
              Win of the day
            </label>
            <textarea
              value={winOfDay}
              onChange={(e) => setWinOfDay(e.target.value)}
              placeholder="A small or big win from today..."
              className="w-full p-3 rounded-lg border border-green-200 dark:border-green-700 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onSkip}
          className="flex-1"
        >
          Skip Today
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1"
        >
          Complete Check-in
        </Button>
      </div>
    </div>
  )
}