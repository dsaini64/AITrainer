"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageCircle, Sparkles } from "lucide-react"

interface CoachSnapshotProps {
  insight: string
  promptChips: string[]
  onPromptClick: (prompt: string) => void
  onChatClick: () => void
}

export function CoachSnapshot({
  insight,
  promptChips,
  onPromptClick,
  onChatClick
}: CoachSnapshotProps) {
  return (
    <Card className="bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-950/20 dark:to-blue-950/20 border-teal-200 dark:border-teal-800">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-full bg-teal-100 dark:bg-teal-900/50">
              <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                What changed since yesterday
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {insight}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Ask the coach:
            </h4>
            <div className="flex flex-wrap gap-2">
              {promptChips.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onPromptClick(prompt)}
                  className="text-xs bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800"
                >
                  {prompt}
                </Button>
              ))}
            </div>
            <Button
              onClick={onChatClick}
              variant="ghost"
              size="sm"
              className="w-full justify-center text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Open Coach Chat
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}