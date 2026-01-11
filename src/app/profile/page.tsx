"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { UserPreferences } from "@/types"
import { useAuth } from "@/contexts/AuthContext"
import { updateUserPreferences } from "@/lib/api/auth"
import { 
  User, 
  Bell, 
  Shield, 
  Download, 
  Trash2, 
  Moon, 
  Sun,
  Globe,
  Clock,
  Loader2
} from "lucide-react"

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences>({
    units: 'metric' as const,
    timeFormat: '24h' as const,
    quietHours: {
      start: '22:00',
      end: '07:00'
    },
    notifications: {
      morning: true,
      evening: true,
      nudges: false
    }
  })
  const [darkMode, setDarkMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load user preferences
  useEffect(() => {
    if (user?.preferences) {
      setPreferences({
        units: user.preferences.units || 'metric',
        timeFormat: user.preferences.time_format || '24h',
        quietHours: {
          start: user.preferences.quiet_hours_start || '22:00',
          end: user.preferences.quiet_hours_end || '07:00'
        },
        notifications: {
          morning: user.preferences.notifications_morning ?? true,
          evening: user.preferences.notifications_evening ?? true,
          nudges: user.preferences.notifications_nudges ?? false
        }
      })
    }
  }, [user])

  useEffect(() => {
    // Check if dark mode is enabled
    setDarkMode(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    const newTheme = !darkMode
    setDarkMode(newTheme)
    
    if (newTheme) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const handlePreferenceChange = async (key: keyof UserPreferences, value: any) => {
    const newPreferences = {
      ...preferences,
      [key]: value
    }
    setPreferences(newPreferences)
    setError(null)
    
    // Save to database
    try {
      setSaving(true)
      await updateUserPreferences({
        units: newPreferences.units,
        time_format: newPreferences.timeFormat,
        quiet_hours_start: newPreferences.quietHours.start,
        quiet_hours_end: newPreferences.quietHours.end,
        notifications_morning: newPreferences.notifications.morning,
        notifications_evening: newPreferences.notifications.evening,
        notifications_nudges: newPreferences.notifications.nudges
      })
    } catch (error) {
      console.error('Error saving preferences:', error)
      setError('Failed to save preferences. Please try again.')
      // Revert the change
      setPreferences(preferences)
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationChange = async (key: keyof UserPreferences['notifications'], value: boolean) => {
    const newPreferences = {
      ...preferences,
      notifications: {
        ...preferences.notifications,
        [key]: value
      }
    }
    const oldPreferences = preferences
    setPreferences(newPreferences)
    setError(null)
    
    // Save to database
    try {
      setSaving(true)
      await updateUserPreferences({
        notifications_morning: newPreferences.notifications.morning,
        notifications_evening: newPreferences.notifications.evening,
        notifications_nudges: newPreferences.notifications.nudges
      })
    } catch (error) {
      console.error('Error saving preferences:', error)
      setError('Failed to save notification preferences. Please try again.')
      // Revert the change
      setPreferences(oldPreferences)
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = () => {
    console.log('Export user data')
    // In real app, trigger data export
  }

  const handleDeleteAccount = () => {
    console.log('Delete account')
    // In real app, show confirmation dialog and delete account
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-slate-600 dark:text-slate-400">Please sign in to view your profile</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle missing created_at gracefully
  const startDate = user.created_at 
    ? new Date(user.created_at) 
    : (user.start_date 
        ? new Date(user.start_date) 
        : new Date())
  const journeyDays = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Profile
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage your account and preferences
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                <User className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <CardTitle>{user.name || user.email?.split('@')[0] || 'User'}</CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {user.email || 'No email'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Member since:</span>
                <span>{startDate.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Journey length:</span>
                <span>{journeyDays} {journeyDays === 1 ? 'day' : 'days'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sun className="h-5 w-5" />
              <span>Appearance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Dark mode</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Switch between light and dark themes
                </div>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Units & Format */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Units & Format</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Measurement units</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Choose metric or imperial units
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={preferences.units === 'metric' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePreferenceChange('units', 'metric')}
                >
                  Metric
                </Button>
                <Button
                  variant={preferences.units === 'imperial' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePreferenceChange('units', 'imperial')}
                >
                  Imperial
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Time format</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  12-hour or 24-hour clock
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={preferences.timeFormat === '12h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePreferenceChange('timeFormat', '12h')}
                >
                  12h
                </Button>
                <Button
                  variant={preferences.timeFormat === '24h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePreferenceChange('timeFormat', '24h')}
                >
                  24h
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Morning check-in</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Daily morning wellness check-in reminder
                </div>
              </div>
              <Switch
                checked={preferences.notifications.morning}
                onCheckedChange={(checked) => handleNotificationChange('morning', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Evening reflection</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  End-of-day reflection and tomorrow prep
                </div>
              </div>
              <Switch
                checked={preferences.notifications.evening}
                onCheckedChange={(checked) => handleNotificationChange('evening', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Smart nudges</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Context-aware reminders throughout the day
                </div>
              </div>
              <Switch
                checked={preferences.notifications.nudges}
                onCheckedChange={(checked) => handleNotificationChange('nudges', checked)}
              />
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="font-medium">Quiet hours</span>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                No notifications during these hours: {preferences.quietHours.start} - {preferences.quietHours.end}
              </div>
              <Button variant="outline" size="sm">
                Adjust quiet hours
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Privacy & Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              onClick={handleExportData}
              className="w-full justify-start"
            >
              <Download className="h-4 w-4 mr-2" />
              Export my data
            </Button>
            
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p>• Your data is encrypted and stored securely</p>
              <p>• We never share personal health information</p>
              <p>• You can export or delete your data anytime</p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button
                variant="outline"
                onClick={handleDeleteAccount}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}