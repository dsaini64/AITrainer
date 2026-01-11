"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Target, TrendingUp } from "lucide-react"

const mockPrograms = [
  {
    id: '1',
    title: 'Metabolic Reset',
    description: '8-week program to optimize metabolism and energy levels',
    duration: 8,
    category: 'Metabolism',
    adherence: 78,
    isActive: true,
    currentWeek: 3
  },
  {
    id: '2',
    title: 'Sleep Upgrade',
    description: '4-week intensive sleep optimization protocol',
    duration: 4,
    category: 'Sleep',
    adherence: 92,
    isActive: false,
    currentWeek: 4
  },
  {
    id: '3',
    title: 'Zone-2 Foundation',
    description: '6-week aerobic base building program',
    duration: 6,
    category: 'Cardio',
    adherence: 0,
    isActive: false,
    currentWeek: 0
  }
]

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Programs
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Structured multi-week protocols for lasting change
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {mockPrograms.map((program) => (
          <Card key={program.id} className={!program.isActive && program.adherence === 0 ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{program.title}</span>
                    {program.isActive && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                        Active
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {program.description}
                  </p>
                </div>
                <Badge variant="outline">{program.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span>{program.duration} weeks</span>
                  </div>
                  {program.isActive && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span>Week {program.currentWeek}</span>
                    </div>
                  )}
                </div>
                {program.adherence > 0 && (
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-4 w-4 text-slate-500" />
                    <span>{program.adherence}% adherence</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {program.adherence === 0 ? (
                  <Button className="flex-1">
                    <Target className="h-4 w-4 mr-2" />
                    Start Program
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1">
                    View Progress
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}