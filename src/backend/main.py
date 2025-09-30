import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_cors import cross_origin
from flask import Response, stream_with_context, make_response


import os
import sqlite3
import openai
from openai import OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
DB_PATH = os.environ.get("TRAINER_DB", os.path.join(os.path.dirname(__file__), "trainer.db"))
import re
import time
import random
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import threading
from uuid import uuid4
# Initialize OpenAI client only if API key is available
try:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if os.getenv("OPENAI_API_KEY") else None
except Exception:
    client = None

# In-memory store for extracted facts per user
facts_store = {}

def get_user_facts(user_id):
    """
    Return the list of stored facts for a given user.
    """
    return facts_store.get(user_id, [])

app = Flask(__name__)
# Allow your React dev server (ports 3000 & 5173) and your ngrok URL
CORS(app,
     resources={r"/*": {"origins": [
         "http://localhost:3000",
         "http://localhost:5173",
         "https://7f7e9dcb8c96.ngrok-free.app"
     ]}},
     supports_credentials=True,
     allow_headers=["Content-Type"]
)

from collections import defaultdict
pending_messages = defaultdict(list)

# In-memory user preferences and goals for proactive check-ins
prefs_store = defaultdict(lambda: {
    "tz": "America/Los_Angeles",
    "checkin_time": "09:00",
    "channels": ["in_app"],
})
active_goals_store = defaultdict(list)  # user_id -> list of {title, category, cadence}
reminders_log = set()  # (user_id, goal_title, yyyy-mm-dd)

# In-memory per-day check-in history and notification log
from collections import defaultdict
checkins_store = defaultdict(dict)  # user_id -> { 'YYYY-MM-DD': {status, focus_area, task, difficulty, createdAt} }
notify_log = set()  # (user_id, 'YYYY-MM-DD') to avoid duplicate day nudges

# Canonical goals store (authoritative; used by all UIs)
goals_store = defaultdict(list)  # user_id -> list of {id, title, category, cadence, active, createdAt, updatedAt?}

def _sync_active_goals_snapshot(user_id: str):
    """Reflect current active goals in the snapshot used by the proactive scheduler."""
    try:
        active = [
            {"title": g.get("title"), "category": g.get("category", "other"), "cadence": g.get("cadence", "daily")}
            for g in goals_store[user_id]
            if g.get("active", True)
        ]
        active_goals_store[user_id] = active
    except Exception:
        active_goals_store[user_id] = []
# --- SQLite persistence (minimal, write-focused) ---
_db_conn = None

def setup_db():
    """Initialize a tiny SQLite DB for check-ins and user stats. Safe to call multiple times."""
    global _db_conn
    if _db_conn is None:
        _db_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _db_conn.execute("PRAGMA journal_mode=WAL;")
        _db_conn.execute("PRAGMA synchronous=NORMAL;")
    cur = _db_conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS checkins (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            status TEXT CHECK (status IN ('done','miss','unknown')),
            focus_area TEXT,
            task TEXT,
            difficulty INTEGER,
            created_at TEXT
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS user_stats (
            user_id TEXT PRIMARY KEY,
            total_done INTEGER DEFAULT 0,
            consecutive_done INTEGER DEFAULT 0,
            best_streak INTEGER DEFAULT 0,
            missed_in_row INTEGER DEFAULT 0,
            current_focus_area TEXT,
            current_task TEXT,
            difficulty INTEGER DEFAULT 1,
            updated_at TEXT
        );
        """
    )
    _db_conn.commit()

from uuid import uuid4 as _uuid4_for_db

def db_upsert_goal(user_id: str, goal_id: str, title: str, category: str, cadence: str, active: bool, created_at: str):
    """Upsert a goal row by (user_id, goal_id)."""
    if not _db_conn:
        return
    cur = _db_conn.cursor()
    # Try to update existing
    cur.execute("UPDATE goals SET title=?, category=?, cadence=?, active=?, created_at=? WHERE user_id=? AND goal_id=?", 
                (title, category, cadence, int(active), created_at, user_id, goal_id))
    if cur.rowcount == 0:
        # Insert new
        cur.execute("INSERT INTO goals (user_id, goal_id, title, category, cadence, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (user_id, goal_id, title, category, cadence, int(active), created_at))
    _db_conn.commit()

def db_upsert_pref(user_id: str, key: str, value: str):
    """Upsert a preference row by (user_id, key)."""
    if not _db_conn:
        return
    cur = _db_conn.cursor()
    # Try to update existing
    cur.execute("UPDATE prefs SET value=? WHERE user_id=? AND key=?", (value, user_id, key))
    if cur.rowcount == 0:
        # Insert new
        cur.execute("INSERT INTO prefs (user_id, key, value) VALUES (?, ?, ?)", (user_id, key, value))
    _db_conn.commit()

def db_upsert_checkin(user_id: str, date_str: str, status: str, focus_area: str, task: str, difficulty: int, created_at: str):
    """Upsert a check-in row by (user_id, date). Primary key is synthetic to keep it simple."""
    if not _db_conn:
        return
    cur = _db_conn.cursor()
    # Try to update existing
    cur.execute("SELECT id FROM checkins WHERE user_id=? AND date=?", (user_id, date_str))
    row = cur.fetchone()
    if row:
        cur.execute(
            "UPDATE checkins SET status=?, focus_area=?, task=?, difficulty=?, created_at=? WHERE id=?",
            (status, focus_area, task, difficulty, created_at, row[0])
        )
    else:
        cid = str(_uuid4_for_db())
        cur.execute(
            "INSERT INTO checkins (id, user_id, date, status, focus_area, task, difficulty, created_at) VALUES (?,?,?,?,?,?,?,?)",
            (cid, user_id, date_str, status, focus_area, task, difficulty, created_at)
        )
    _db_conn.commit()


def db_upsert_user_stats(user_id: str, user: dict, updated_at: str):
    if not _db_conn:
        return
    cur = _db_conn.cursor()
    cur.execute("SELECT user_id FROM user_stats WHERE user_id=?", (user_id,))
    exists = cur.fetchone() is not None
    payload = (
        user.get("total_days_completed", 0),
        user.get("consecutive_days", 0),
        user.get("best_gapless_streak", 0),
        user.get("missed_days_in_row", 0),
        user.get("current_focus_area"),
        user.get("current_task"),
        user.get("difficulty", 1),
        updated_at,
        user_id,
    )
    if exists:
        cur.execute(
            """
            UPDATE user_stats
               SET total_done=?, consecutive_done=?, best_streak=?, missed_in_row=?,
                   current_focus_area=?, current_task=?, difficulty=?, updated_at=?
             WHERE user_id=?
            """,
            payload
        )
    else:
        cur.execute(
            """
            INSERT INTO user_stats (total_done, consecutive_done, best_streak, missed_in_row,
                                    current_focus_area, current_task, difficulty, updated_at, user_id)
            VALUES (?,?,?,?,?,?,?,?,?)
            """,
            payload
        )
    _db_conn.commit()

# Sample data storage
@app.route('/api/goals', methods=['GET'])
def api_goals_list():
    user_id = request.args.get('user_id', 'testuser')
    _sync_active_goals_snapshot(user_id)
    return jsonify(goals_store[user_id])

@app.route('/api/goals', methods=['POST'])
def api_goals_create():
    data = request.get_json() or {}
    user_id = data.get('user_id', 'testuser')
    title = (data.get('title') or '').strip()
    category = (data.get('category') or 'other').strip()
    cadence = (data.get('cadence') or 'daily').strip()
    active = bool(data.get('active', True))
    if not title:
        return jsonify({"error": "title is required"}), 400
    
    # Check for duplicate goals by title (case-insensitive)
    normalized_title = title.lower().strip()
    for existing_goal in goals_store[user_id]:
        if existing_goal.get('title', '').lower().strip() == normalized_title:
            print(f"Duplicate goal detected: '{title}' - returning existing goal")
            return jsonify(existing_goal), 200  # Return existing goal instead of creating duplicate
    
    goal_id = str(uuid4())
    created_at = datetime.now().isoformat()
    goal = {
        "id": goal_id,
        "title": title,
        "category": category,
        "cadence": cadence,
        "active": active,
        "createdAt": created_at,
    }
    
    # Save to database
    try:
        db_upsert_goal(user_id, goal_id, title, category, cadence, active, created_at)
    except Exception as e:
        print(f"Failed to save goal to database: {e}")
    
    goals_store[user_id].insert(0, goal)
    _sync_active_goals_snapshot(user_id)
    return jsonify(goal), 201

@app.route('/api/goals/<goal_id>', methods=['PATCH'])
def api_goals_update(goal_id):
    data = request.get_json() or {}
    user_id = data.get('user_id', 'testuser')
    updated = None
    for g in goals_store[user_id]:
        if g.get('id') == goal_id:
            if 'title' in data and isinstance(data['title'], str):
                g['title'] = data['title']
            if 'category' in data and isinstance(data['category'], str):
                g['category'] = data['category']
            if 'cadence' in data and isinstance(data['cadence'], str):
                g['cadence'] = data['cadence']
            if 'active' in data:
                g['active'] = bool(data['active'])
            g['updatedAt'] = datetime.now().isoformat()
            updated = g
            break
    _sync_active_goals_snapshot(user_id)
    if not updated:
        return jsonify({"error": "goal not found"}), 404
    return jsonify(updated)

@app.route('/api/goals/<goal_id>', methods=['DELETE'])
def api_goals_delete(goal_id):
    # user_id may come from body or query string
    user_id = request.args.get('user_id') or (request.get_json() or {}).get('user_id') or 'testuser'
    before = len(goals_store[user_id])
    goals_store[user_id] = [g for g in goals_store[user_id] if g.get('id') != goal_id]
    _sync_active_goals_snapshot(user_id)
    return jsonify({"success": True, "removed": before - len(goals_store[user_id])})


# Track which single goal we are currently asking the user about (per day)
awaiting_checkin = {}  # user_id -> {"title": str, "date": "YYYY-MM-DD"}
# Track multi-goal check-in sessions
checkin_session = {}  # user_id -> {"goals": [goal_list], "current_index": int, "date": str}
# Round-robin cursor so we rotate goals across days
goal_cursors = defaultdict(int)

# Diagnostics for scheduler
scheduler_started_at = None
last_tick_at = None
last_fire = defaultdict(lambda: {"at": None, "title": None})  # per user

# Hold the thread across sessions
saved_thread = None
thread_cache = {}

@app.route('/prepare-thread', methods=['POST'])
def prepare_thread():
    data = request.get_json() or {}
    user_id = data.get('user_id', 'testuser')
    health_data = data.get('health_data', {})
    goals = data.get('goals', [])

    # Snapshot active goals for proactive scheduler AND persist to canonical store
    if goals:
        norm_goals = []
        for g in goals:
            norm_goals.append({
                "id": g.get("id") or str(uuid4()),
                "title": g.get("title"),
                "category": g.get("category", "other"),
                "cadence": g.get("cadence", "daily"),
                "active": bool(g.get("active", True)),
                "createdAt": datetime.now().isoformat(),
            })
        active_goals_store[user_id] = [
            {"title": g["title"], "category": g["category"], "cadence": g["cadence"]}
            for g in norm_goals if g.get("active", True)
        ]
        goals_store[user_id] = norm_goals
    else:
        active_goals_store[user_id] = []

    # Create or reuse a conversation thread
    if user_id in thread_cache:
        thread_id = thread_cache[user_id]
    else:
        # Check if OpenAI client is available
        if client is None:
            return jsonify({"error": "OpenAI client not available"}), 503
        
        try:
            thread = client.beta.threads.create()
            thread_id = thread.id
            thread_cache[user_id] = thread_id
        except Exception as e:
            print(f"Failed to create OpenAI thread: {e}")
            return jsonify({"error": "Failed to create conversation thread"}), 500

    # Inject existing user facts if any
    user_facts = get_user_facts(user_id)
    if user_facts:
        facts_summary = "\n".join(f"{fact['topic'].capitalize()}: {fact['fact']}" for fact in user_facts)
        try:
            client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content="Here are some things I know about you:\n" + facts_summary
            )
        except Exception as e:
            print(f"Failed to inject user facts: {e}")

    # Inject health profile data
    try:
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content="User health data (for reference): " + json.dumps(health_data)
        )
    except Exception as e:
        print(f"Failed to inject health data: {e}")
    # Inject active goals if provided
    if goals:
        try:
            goals_lines = "\n".join(
            f"- {g.get('title')} ({g.get('category', 'other')} • {g.get('cadence', 'daily')})" for g in goals
            )
            client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content="User active goals (for coaching context):\n" + goals_lines
            )
        except Exception as e:
            print("Warning: failed to add goals to thread:", e)
    else:
        # Make it explicit there are no active goals at thread start
        try:
            client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content="(Init) No active goals set."
            )
        except Exception as e:
            print("Warning: failed to add no-goals init message:", e)

    return jsonify({"thread_id": thread_id})

@app.route('/api/new-daily-task', methods=['POST'])
def new_daily_task():
    data = request.json
    previous_task = data.get("previousTask", "")

    # Pull in every task you define elsewhere
    all_tasks = get_all_tasks()
    # Exclude the one they just skipped
    candidate_tasks = [t for t in all_tasks if t != previous_task]
    # Choose a new one (or fallback to the same if it's the only option)
    new_task = random.choice(candidate_tasks) if candidate_tasks else previous_task

    return jsonify({"newTask": new_task})

def pick_new_base_task(exclude_task):
    available_tasks = list(habit_progressions.keys())
    available_tasks = [task for task in available_tasks if task != exclude_task]
    return random.choice(available_tasks) if available_tasks else exclude_task
def get_next_task(current_task, focus_area, difficulty):
    try:
        options = habit_progressions.get(current_task, [])
        if not options:
            return habit_progressions.get(focus_area, [current_task])[0]
        current_index = options.index(current_task) if current_task in options else -1
        next_index = (current_index + 1) % len(options)
        return options[next_index]
    except Exception:
        return habit_progressions.get(focus_area, [current_task])[0]


# Sample data storage
users = {
    "testuser": {
        "consecutive_days": 0,
        "total_days_completed": 0,
        "best_gapless_streak": 0,
        "current_task": "No task assigned.",
        "difficulty": 1,
        "focus_areas_ordered": ["Physical Health", "Nutrition", "Sleep & Recovery"],
        "current_focus_area": "Physical Health",
        "missed_days_in_row": 0,
        "days_elapsed": 0,
        "last_report_day": None,
        "last_report_content": None,
    }
}

# Reset all user progress if server is restarted
for user_data in users.values():
    user_data["consecutive_days"] = 0
    user_data["total_days_completed"] = 0
    user_data["best_gapless_streak"] = 0
    user_data["days_elapsed"] = 0
    user_data["missed_days_in_row"] = 0
    user_data["last_report_day"] = None
    user_data["last_report_content"] = None

# Initialize SQLite on startup
try:
    setup_db()
except Exception as e:
    print("[warn] SQLite setup failed:", e)
    
# In-memory store for extracted facts per user
facts_store = {}

@app.route('/facts/<user_id>', methods=['GET'])
def get_facts(user_id):
    print(f"HIT /facts/{user_id}")
    facts = get_user_facts(user_id)
    resp = jsonify(facts)
    return resp

@app.route('/facts', methods=['POST'])
def add_fact():
    data = request.get_json()
    user_id = data.get('user_id')
    fact = data.get('fact')
    if not user_id or not fact or 'topic' not in fact:
        return jsonify({"error": "Must provide user_id and fact with topic"}), 400
    facts_store.setdefault(user_id, [])
    facts_store[user_id].append(fact)
    return jsonify({"success": True})

@app.route('/facts/<user_id>/<topic>', methods=['DELETE'])
def delete_fact(user_id, topic):
    user_facts = facts_store.get(user_id, [])
    # Filter out any facts whose 'topic' matches the one to delete
    updated = [fact for fact in user_facts if fact.get('topic') != topic]
    facts_store[user_id] = updated
    return jsonify({"success": True})

habit_progressions = {
    "Take a 10-minute walk": [
        "Take a 15-minute walk",
        "Take a 20-minute walk and do 5 squats",
        "Take a 30-minute walk with a friend"
    ],
    "Drink a glass of water before each meal": [
        "Drink 2 glasses of water before each meal",
        "Replace one sugary drink with water daily",
        "Drink 8 glasses of water throughout the day"
    ],
    "Go to bed 30 minutes earlier tonight": [
        "Go to bed 1 hour earlier",
        "Create a consistent bedtime routine",
        "No screens 2 hours before bed"
    ]
}

def get_all_tasks():
    tasks = []
    for options in habit_progressions.values():
        tasks.extend(options)
    return list(set(tasks))

@app.route('/generate-plan', methods=['POST'])
def generate_plan():
    data = request.json
    user_id = data.get('user_id', 'testuser')
    # Use actual user scores from request, fallback to defaults
    scores = data.get('scores', {
        "Physical Health": 5,
        "Nutrition": 7,
        "Sleep & Recovery": 8,
        "Emotional Health": 9,
        "Social Connection": 4,
        "Habits": 3,
        "Medical History": 10
    })

    # Map focus areas to practical, actionable habits
    habit_map = {
        "Physical Health": [
            "Take a 10-minute walk",
            "Do 10 push-ups or squats",
            "Walk up stairs instead of elevator"
        ],
        "Nutrition": [
            "Drink a glass of water before each meal",
            "Add one serving of vegetables to dinner",
            "Replace one sugary drink with water"
        ],
        "Sleep & Recovery": [
            "Go to bed 30 minutes earlier tonight",
            "Put phone away 1 hour before bed",
            "Set a consistent wake-up time"
        ],
        "Emotional Health": [
            "Take 5 deep breaths when stressed",
            "Write down one thing you're grateful for",
            "Spend 10 minutes outside in nature"
        ],
        "Social Connection": [
            "Text or call one friend today",
            "Have a 5-minute conversation with a colleague",
            "Smile and say hello to someone new"
        ],
        "Habits": [
            "Set one specific time for your new habit",
            "Put a reminder note where you'll see it",
            "Start with just 2 minutes of the habit"
        ],
        "Medical History": [
            "Take your medications at the same time daily",
            "Write down any symptoms you notice",
            "Schedule your next doctor appointment"
        ]
    }

    if user_id not in users:
        if scores:
            ordered_areas = sorted(scores, key=scores.get)
        else:
            ordered_areas = ["Physical Health", "Nutrition", "Sleep & Recovery", "Emotional Health", "Social Connection", "Habits", "Medical History"]
        users[user_id] = {
            "consecutive_days": 0,
            "total_days_completed": 0,
            "best_gapless_streak": 0,
            "streak": 0,
            "focus_areas_ordered": ordered_areas,
            "current_focus_area": ordered_areas[0],
            "difficulty": 1,
            "current_task": habit_map[ordered_areas[0]][0],
            "start_date": datetime.now().date().isoformat(),
            "days_elapsed": 0,
            "missed_days_in_row": 0,
            "last_report_day": None,
            "last_report_content": None,
        }

    # Find weakest focus areas sorted
    if scores:
        # Convert all values to integers for proper sorting
        numeric_scores = {}
        for key, value in scores.items():
            try:
                numeric_scores[key] = int(value)
            except (ValueError, TypeError):
                numeric_scores[key] = 5  # Default score if conversion fails
        ordered_areas = sorted(numeric_scores, key=numeric_scores.get)
    else:
        ordered_areas = ["Physical Health", "Nutrition", "Sleep & Recovery", "Emotional Health", "Social Connection", "Habits", "Medical History"]

    focus_areas = ordered_areas[:3] if len(ordered_areas) >= 3 else ordered_areas

    # Pick one suggested habit from each focus area
    suggested_habits = []
    for area in focus_areas:
        suggested_habits.append(habit_map.get(area, ["Stretch every morning"])[0])

    users[user_id]["focus_areas_ordered"] = ordered_areas
    users[user_id]["current_focus_area"] = ordered_areas[0]
    users[user_id]["difficulty"] = 1
    users[user_id]["current_task"] = habit_map[ordered_areas[0]][0]
    
    # Update the database with the new current task
    try:
        db_upsert_user_stats(user_id, users[user_id], datetime.now().isoformat())
    except Exception as e:
        print(f"Failed to update user stats: {e}")
    users[user_id]["consecutive_days"] = 0
    users[user_id]["total_days_completed"] = 0
    users[user_id]["best_gapless_streak"] = 0
    if "start_date" not in users[user_id]:
        users[user_id]["start_date"] = datetime.now().date().isoformat()
    if "missed_days_in_row" not in users[user_id]:
        users[user_id]["missed_days_in_row"] = 0
    if "last_report_day" not in users[user_id]:
        users[user_id]["last_report_day"] = None
    if "last_report_content" not in users[user_id]:
        users[user_id]["last_report_content"] = None

    return jsonify({
        "estimated_timeline_weeks": 6,
        "focus_areas": focus_areas,
        "suggested_habits": suggested_habits,
        "assigned_task": users[user_id]["current_task"],
        "current_focus_area": users[user_id]["current_focus_area"],
        "difficulty": users[user_id]["difficulty"],
        "consecutive_days": users[user_id]["consecutive_days"],
        "missed_days_in_row": users[user_id]["missed_days_in_row"]
    })

# Normalize arbitrary user replies into a check-in status ('done' / 'miss') or None
YES_TOKENS = {
    "done","did","yes","y","yeah","yep","completed","finish","finished","complete","got it","all set","✓"
}
NO_TOKENS = {
    "miss","missed","no","not yet","skip","skipped","couldn't","cant","can't","didn't","didnt","✗"
}

def normalize_checkin_status(text: str):
    """Map free-text replies to 'done'/'miss' without false positives from substrings (e.g., 'question' shouldn't match 'n')."""
    if not text:
        return None
    s = text.strip().lower()
    # exact canonical values first
    if s in ("done", "miss"):
        return s

    # Tokenize into words; keep simple contractions
    words = re.findall(r"\b[\w']+\b", s)
    word_set = set(words)

    # Word-level matches (safe)
    yes_words = {"done", "did", "yes", "y", "yeah", "yep", "completed", "finish", "finished", "complete"}
    no_words  = {"miss", "missed", "no", "skip", "skipped"}

    if word_set & yes_words:
        return "done"
    if word_set & no_words:
        return "miss"

    # Phrase/emoji-level matches (substring search for multi-word phrases & emojis only)
    yes_phrases = ["got it", "all set", "✓"]
    no_phrases  = ["not yet", "couldn't", "cant", "can't", "didn't", "didnt", "✗"]

    if any(p in s for p in yes_phrases):
        return "done"
    if any(p in s for p in no_phrases):
        return "miss"

    return None

# Utility: find a goal's category by title from either snapshot or canonical store
def _lookup_goal_category(user_id: str, goal_title: str):
    if not goal_title:
        return None
    # Prefer live snapshot
    for g in active_goals_store.get(user_id, []) or []:
        if g.get("title") == goal_title:
            return g.get("category")
    # Fall back to canonical store
    for g in goals_store.get(user_id, []) or []:
        if g.get("title") == goal_title and g.get("active", True):
            return g.get("category")
    return None

# Utility: pick a category-aligned, tiny "make it today" action using AI
def _small_win_for_category(category: str, goal_title: str):
    try:
        # Use AI to generate a personalized small win suggestion
        messages = [
            {
                "role": "system", 
                "content": "You are a helpful health coach. Generate a specific, actionable 'small win' suggestion that helps someone take a tiny step toward their goal. Keep it under 20 words and make it very specific and doable today."
            },
            {
                "role": "user", 
                "content": f"Generate a small win suggestion for the goal: '{goal_title}' (category: {category or 'general'}). Make it specific and actionable for today."
            }
        ]
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7,
            max_tokens=50
        )
        
        suggestion = response.choices[0].message.content.strip()
        # Remove quotes if the AI wrapped the response
        if suggestion.startswith('"') and suggestion.endswith('"'):
            suggestion = suggestion[1:-1]
        return suggestion
        
    except Exception as e:
        print(f"AI suggestion generation failed: {e}")
        # Fallback to generic but goal-specific suggestion
        return f"take one tiny step toward '{goal_title}' (e.g., set a 2‑minute timer and start)"

 # Shared helper to log quick replies (done/miss) from proactive check-ins or chat
def process_check_in_internal(user_id: str, status: str, goal_title: str = None):
    """Update a user's streaks/tasks for 'done' or 'miss' and return the same payload structure as /check-in."""
    print(f"[DEBUG] process_check_in_internal called with goal_title: {goal_title}")
    user = users.get(user_id)
    if not user:
        return {"error": "User not found"}

    # Compute today's date in user's timezone for logging
    try:
        tzname = prefs_store[user_id].get('tz', 'America/Los_Angeles')
    except Exception:
        tzname = 'America/Los_Angeles'
    now_local = datetime.now(ZoneInfo(tzname))
    today_str = now_local.date().isoformat()

    user["days_elapsed"] = user.get("days_elapsed", 0) + 1
    message = ""

    habit_map = {
        "Physical Health": [
            "Stretch every morning",
            "Stretch every morning and walk 5 minutes",
            "Morning yoga session (10 min)"
        ],
        "Nutrition": [
            "Eat one extra vegetable",
            "Eat two extra vegetables",
            "One plant-based meal per day"
        ],
        "Sleep & Recovery": [
            "Sleep 7+ hours",
            "Sleep 8+ hours",
            "No screens 1 hour before bed"
        ],
        "Emotional Health": [
            "Meditate 5 minutes",
            "Meditate 10 minutes",
            "Gratitude journaling + 10 min meditation"
        ],
        "Social Connection": [
            "Message one friend",
            "Plan a social outing",
            "Attend a group event or meetup"
        ],
        "Habits": [
            "Use a habit tracker daily",
            "Set visual cues for habits",
            "Maintain a daily consistency journal"
        ],
        "Medical History": [
            "Daily health logging",
            "Monitor vitals weekly",
            "Consult a professional for screening"
        ]
    }

    if status == "done":
        user["total_days_completed"] = user.get("total_days_completed", 0) + 1
        user["consecutive_days"] = user.get("consecutive_days", 0) + 1
        user["best_gapless_streak"] = max(user.get("best_gapless_streak", 0), user["consecutive_days"])
        user["missed_days_in_row"] = 0

        current_focus = user["current_focus_area"]
        difficulty = user["difficulty"]
        focus_areas_ordered = user["focus_areas_ordered"]
        task_options = habit_map.get(current_focus, [])

        if user["total_days_completed"] % 3 == 0:
            if difficulty < 3:
                user["difficulty"] += 1
                task_options = habit_map[current_focus]
                if user["difficulty"] - 1 < len(task_options):
                    user["current_task"] = task_options[user["difficulty"] - 1]
                else:
                    user["current_task"] = get_next_task(user["current_task"], current_focus, user["difficulty"])
                message = f"You've advanced to difficulty level {user['difficulty']} in {current_focus}: {user['current_task']}"
            else:
                try:
                    current_index = focus_areas_ordered.index(current_focus)
                    next_index = current_index + 1
                    if next_index < len(focus_areas_ordered):
                        new_focus = focus_areas_ordered[next_index]
                        user["current_focus_area"] = new_focus
                        user["difficulty"] = 1
                        user["current_task"] = habit_map[new_focus][0]
                        message = f"Great job! Moving on to next focus area: {new_focus} - {user['current_task']}"
                    else:
                        new_focus = focus_areas_ordered[0]
                        user["current_focus_area"] = new_focus
                        user["difficulty"] = 1
                        user["current_task"] = habit_map[new_focus][0]
                        message = f"You've mastered all focus areas! Restarting with: {new_focus} - {user['current_task']}"
                except ValueError:
                    new_focus = focus_areas_ordered[0]
                    user["current_focus_area"] = new_focus
                    user["difficulty"] = 1
                    user["current_task"] = habit_map[new_focus][0]
                    message = f"Resetting focus area to: {new_focus} - {user['current_task']}"
        else:
            if user["difficulty"] - 1 < len(task_options):
                if len(task_options) > 1:
                    current_index = task_options.index(user["current_task"]) if user["current_task"] in task_options else -1
                    next_index = (current_index + 1) % len(task_options)
                    user["current_task"] = task_options[next_index]
                else:
                    user["current_task"] = task_options[user["difficulty"] - 1]
            else:
                user["current_task"] = get_next_task(user["current_task"], current_focus, user["difficulty"])
    elif status == "miss":
        user["consecutive_days"] = 0
        user["missed_days_in_row"] = user.get("missed_days_in_row", 0) + 1
        message = "You skipped today. Your streak has been reset."
        if user["difficulty"] > 1:
            user["difficulty"] -= 1
        task_options = habit_map.get(user["current_focus_area"], [])
        if user["difficulty"] - 1 < len(task_options):
            user["current_task"] = task_options[user["difficulty"] - 1]
        else:
            user["current_task"] = random.choice(task_options) if task_options else user["current_task"]
    else:
        user["consecutive_days"] = 0
        user["missed_days_in_row"] = user.get("missed_days_in_row", 0) + 1

    report_data = None
    last_report_content = user.get("last_report_content")
    if user["days_elapsed"] % 30 == 0:
        user["last_report_day"] = user["days_elapsed"]
        report_data = {
            "message": f"This past month, you tackled {user['current_focus_area']} and reached difficulty level {user['difficulty']}!",
            "best_gapless_streak": user["best_gapless_streak"],
            "motivation": f"You’ve completed {user['total_days_completed']} health improvement days! Keep it up!"
        }
        user["last_report_content"] = report_data
    else:
        report_data = last_report_content

    focus_area = user.get("current_focus_area", "")
    tips_by_focus_area = {
        "Physical Health": ["Do 10 jumping jacks right now", "Stretch your shoulders while standing"],
        "Nutrition": ["Add a fruit to one meal today", "Drink water before meals"],
        "Sleep & Recovery": ["Turn off screens 30 minutes earlier", "Dim the lights after sunset"],
        "Emotional Health": ["Take 5 slow breaths now", "Write one thing you're grateful for"],
        "Social Connection": ["Text someone you haven’t talked to in a while", "Invite someone to a quick chat"],
        "Habits": ["Use a reminder app today", "Visualize yourself succeeding tonight"],
        "Medical History": ["Check your posture for 30 seconds", "Note any symptoms in your log"]
    }
    related_tips = tips_by_focus_area.get(focus_area, ["Do one thing today that aligns with your goals"])
    daily_tip = random.choice(related_tips)

    # Record per-day check-in history (upsert for today)
    try:
        checkins_store[user_id][today_str] = {
            "status": status if status in ("done", "miss") else "unknown",
            "focus_area": user.get("current_focus_area"),
            "task": user.get("current_task"),
            "difficulty": user.get("difficulty"),
            "createdAt": now_local.isoformat()
        }
    except Exception:
        pass

    # Persist to SQLite (best-effort; non-fatal on error)
    try:
        db_upsert_checkin(
            user_id=user_id,
            date_str=today_str,
            status=status if status in ("done","miss") else "unknown",
            focus_area=user.get("current_focus_area"),
            task=goal_title or user.get("current_task", "No task assigned."),
            difficulty=int(user.get("difficulty", 1)),
            created_at=now_local.isoformat()
        )
        db_upsert_user_stats(user_id, user, now_local.isoformat())
    except Exception as _e:
        print("[warn] persist failed:", _e)

    return {
        "consecutive_days": user["consecutive_days"],
        "current_task": user["current_task"],
        "difficulty": user["difficulty"],
        "current_focus_area": user["current_focus_area"],
        "message": message,
        "daily_tip": daily_tip,
        "monthly_report": report_data,
        "total_days_completed": user["total_days_completed"],
        "best_gapless_streak": user["best_gapless_streak"],
        "missed_days_in_row": user["missed_days_in_row"]
    }

@app.route('/check-in', methods=['POST'])
def check_in():
    data = request.json
    user_id = data.get('user_id')
    status = data.get('status')
    result = process_check_in_internal(user_id, status)
    if "error" in result:
        return jsonify(result), 404
    return jsonify(result)

@app.route('/monthly-report', methods=['POST'])
def monthly_report():
    data = request.json
    user_id = data.get('user_id')

    user = users.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("days_elapsed", 0) < 30:
        return jsonify({"message": f"Monthly report not available yet. You’ve only logged {user.get('days_elapsed', 0)} days."})

    best_gapless_streak = user.get("best_gapless_streak", 0)
    total_days_completed = user.get("total_days_completed", 0)
    current_focus = user["current_focus_area"]
    current_task = user["current_task"]
    difficulty = user["difficulty"]

    return jsonify({
        "message": f"This month, you tackled {current_focus} and reached difficulty level {difficulty}!",
        "best_gapless_streak": best_gapless_streak,
        "motivation": f"You’ve completed {total_days_completed} health improvement days! Your best streak without skipping is {best_gapless_streak} days. Keep it up!"
    })

@app.route('/daily-notification', methods=['POST'])
def daily_notification():
    data = request.json
    user_id = data.get('user_id')

    user = users.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    task = user["current_task"]
    focus_area = user["current_focus_area"]

    tips_by_focus_area = {
        "Physical Health": ["Do 10 jumping jacks right now", "Stretch your shoulders while standing"],
        "Nutrition": ["Add a fruit to one meal today", "Drink water before meals"],
        "Sleep & Recovery": ["Turn off screens 30 minutes earlier", "Dim the lights after sunset"],
        "Emotional Health": ["Take 5 slow breaths now", "Write one thing you're grateful for"],
        "Social Connection": ["Text someone you haven’t talked to in a while", "Invite someone to a quick chat"],
        "Habits": ["Use a reminder app today", "Visualize yourself succeeding tonight"],
        "Medical History": ["Check your posture for 30 seconds", "Note any symptoms in your log"]
    }

    related_tips = tips_by_focus_area.get(focus_area, ["Do one thing today that aligns with your goals"])
    tip = random.choice(related_tips)

    return jsonify({
        "reminder": f"Don't forget to complete your task today: {task}",
        "extra_tip": f"Health Boost: {tip}"
    })


@app.route('/api/checkins', methods=['GET'])
def api_checkins():
    """Return last N days of check-in history for a user (default 30), backed by SQLite with in-memory fallback."""
    user_id = request.args.get('user_id', 'testuser')
    days = int(request.args.get('days', '30'))

    # Try SQLite first
    items = []
    try:
        if _db_conn is not None:
            cur = _db_conn.cursor()
            cur.execute(
                """
                SELECT date, status, focus_area, task, difficulty, created_at
                  FROM checkins
                 WHERE user_id=?
                 ORDER BY date DESC
                 LIMIT ?
                """,
                (user_id, days)
            )
            rows = cur.fetchall()
            for (d, status, focus_area, task, difficulty, created_at) in rows:
                items.append({
                    "date": d,
                    "status": status,
                    "focus_area": focus_area,
                    "task": task,
                    "difficulty": difficulty,
                    "createdAt": created_at,
                })
    except Exception as e:
        print("[warn] /api/checkins SQLite read failed:", e)

    # Fallback to in-memory if DB empty or unavailable
    if not items:
        per_day = checkins_store.get(user_id, {})
        for d, rec in per_day.items():
            row = {"date": d}
            row.update(rec)
            items.append(row)
        items.sort(key=lambda r: r["date"], reverse=True)
        items = items[:days]

    return jsonify(items)

@app.route('/api/stats', methods=['GET'])
def api_stats():
    """Lightweight user stats + last-7 summary for UI tiles, preferring SQLite."""
    user_id = request.args.get('user_id', 'testuser')

    # Try SQLite for stats
    payload = None
    try:
        if _db_conn is not None:
            cur = _db_conn.cursor()
            # Read snapshot stats
            cur.execute(
                """
                SELECT total_done, consecutive_done, best_streak, missed_in_row,
                       current_focus_area, current_task, difficulty
                  FROM user_stats
                 WHERE user_id=?
                """,
                (user_id,)
            )
            row = cur.fetchone()
            if row:
                total_done, consecutive_done, best_streak, missed_in_row, current_focus_area, current_task, difficulty = row
                # Read last 7 days from checkins
                cur.execute(
                    """
                    SELECT date, status
                      FROM checkins
                     WHERE user_id=?
                     ORDER BY date DESC
                     LIMIT 7
                    """,
                    (user_id,)
                )
                last7_rows = cur.fetchall()
                last7 = [{"date": d, "status": s} for (d, s) in last7_rows]
                # Calculate weekly progress - ensure we have at least 7 days
                this_week_done = sum(1 for day in last7 if day.get("status") == "done")
                this_week_total = max(7, len(last7))  # Always show 7 days for consistent progress calculation
                
                # Count total active goals (use a minimum baseline to prevent glitching)
                cur.execute(
                    """
                    SELECT COUNT(*) FROM goals 
                    WHERE user_id=? AND active=1
                    """,
                    (user_id,)
                )
                active_goals_count = cur.fetchone()[0] or 0
                # Use a minimum baseline to prevent progress bar from jumping around
                total_goals = max(3, active_goals_count)  # Minimum 3 goals for stable progress calculation
                
                payload = {
                    "total_done": max(0, total_done or 0),
                    "consecutive_done": max(0, consecutive_done or 0),
                    "best_streak": max(0, best_streak or 0),
                    "missed_in_row": max(0, missed_in_row or 0),
                    "current_focus_area": current_focus_area,
                    "current_task": current_task,
                    "difficulty": max(1, difficulty or 1),
                    "last_7": last7,
                    "this_week_done": max(0, this_week_done),
                    "this_week_total": max(7, this_week_total),
                    "total_goals": max(0, total_goals),
                }
    except Exception as e:
        print("[warn] /api/stats SQLite read failed:", e)

    # Fallback to in-memory model if DB has no snapshot
    if payload is None:
        u = users.get(user_id)
        if not u:
            return jsonify({"error": "User not found"}), 404
        per_day = checkins_store.get(user_id, {})
        last7 = []
        for d in sorted(per_day.keys(), reverse=True)[:7]:
            last7.append({"date": d, "status": per_day[d].get("status", "unknown")})
        # Calculate weekly progress for fallback - ensure we have at least 7 days
        this_week_done = sum(1 for day in last7 if day.get("status") == "done")
        this_week_total = max(7, len(last7))  # Always show 7 days for consistent progress calculation
        
        # Count active goals from in-memory store (use minimum baseline to prevent glitching)
        active_goals = [g for g in goals_store.get(user_id, []) if g.get("active", True)]
        active_goals_count = len(active_goals)
        # Use a minimum baseline to prevent progress bar from jumping around
        total_goals = max(3, active_goals_count)  # Minimum 3 goals for stable progress calculation
        
        payload = {
            "total_done": max(0, u.get("total_days_completed", 0)),
            "consecutive_done": max(0, u.get("consecutive_days", 0)),
            "best_streak": max(0, u.get("best_gapless_streak", 0)),
            "missed_in_row": max(0, u.get("missed_days_in_row", 0)),
            "current_focus_area": u.get("current_focus_area"),
            "current_task": u.get("current_task"),
            "difficulty": max(1, u.get("difficulty", 1)),
            "last_7": last7,
            "this_week_done": max(0, this_week_done),
            "this_week_total": max(7, this_week_total),
            "total_goals": max(0, total_goals),
        }

    return jsonify(payload)

# === /prefs and proactive check-in scheduler ===
@app.route('/prefs', methods=['GET', 'POST'])
def prefs():
    if request.method == 'GET':
        user_id = request.args.get('user_id', 'testuser')
        return jsonify(prefs_store[user_id])
    data = request.get_json() or {}
    user_id = data.get('user_id', 'testuser')
    tz = data.get('tz') or prefs_store[user_id].get('tz', 'America/Los_Angeles')
    checkin_time = data.get('checkin_time') or prefs_store[user_id].get('checkin_time', '09:00')
    channels = data.get('channels') or prefs_store[user_id].get('channels', ['in_app'])
    prefs_store[user_id] = {"tz": tz, "checkin_time": checkin_time, "channels": channels}
    
    # Clear awaiting checkin state when setting new check-in time to allow immediate testing
    if user_id in awaiting_checkin:
        print(f"[prefs] Clearing awaiting_checkin for user={user_id} due to new checkin_time={checkin_time}")
        awaiting_checkin.pop(user_id, None)
    
    # Save to database
    try:
        db_upsert_pref(user_id, "tz", tz)
        db_upsert_pref(user_id, "checkin_time", checkin_time)
        db_upsert_pref(user_id, "channels", json.dumps(channels))
    except Exception as e:
        print(f"Failed to save prefs to database: {e}")
    
    return jsonify({"success": True, "prefs": prefs_store[user_id]})

@app.route('/debug/trigger-checkin-now', methods=['POST'])
def trigger_checkin_now():
    data = request.get_json() or {}
    user_id = data.get('user_id', 'testuser')

    # Prefer the live snapshot; if empty, fall back to canonical active goals
    goals = active_goals_store.get(user_id, [])
    if not goals:
        goals = [
            {"title": g.get("title"), "category": g.get("category", "other"), "cadence": g.get("cadence", "daily")}
            for g in goals_store.get(user_id, [])
            if g.get("active", True)
        ]
        # Hydrate snapshot so next calls work even without a fresh prepare-thread
        if goals:
            active_goals_store[user_id] = goals

    # If still empty, auto-seed a sensible default goal so we can proceed
    if not goals:
        default_goal = {
            "id": str(uuid4()),
            "title": "Use a habit tracker daily",
            "category": "habits",
            "cadence": "daily",
            "active": True,
            "createdAt": datetime.now().isoformat(),
        }
        goals_store[user_id].insert(0, default_goal)
        goals = [{"title": default_goal["title"], "category": default_goal["category"], "cadence": default_goal["cadence"]}]
        active_goals_store[user_id] = goals
        if os.environ.get('DEBUG_SCHED', '0') == '1':
            print(f"[debug] auto-seeded default goal for {user_id}")

    # Start a new multi-goal check-in session
    today = datetime.now().date().isoformat()
    checkin_session[user_id] = {
        "goals": goals.copy(),
        "current_index": 0,
        "date": today
    }

    # Ask about the first goal
    first_goal = goals[0]
    title = first_goal.get('title')
    
    # Send the check-in message for the first goal
    pending_messages[user_id].append({
        "role": "assistant",
        "text": f"Quick check-in: did you complete '{title}' {first_goal.get('cadence','daily')}? Reply 'done' or 'miss'."
    })
    
    # Set awaiting state for the first goal
    awaiting_checkin[user_id] = {"title": title, "date": today}
    last_fire[user_id] = {"at": datetime.now().isoformat(), "title": title}
    return jsonify({"success": True})
    
@app.route('/debug/seed-goal', methods=['POST'])
def debug_seed_goal():
    data = request.get_json() or {}
    user_id = data.get('user_id', 'testuser')
    title = data.get('title') or 'Stretch every morning'
    goal = {
        "id": str(uuid4()),
        "title": title,
        "category": data.get('category', 'habits'),
        "cadence": data.get('cadence', 'daily'),
        "active": True,
        "createdAt": datetime.now().isoformat(),
    }
    goals_store[user_id].insert(0, goal)
    _sync_active_goals_snapshot(user_id)
    return jsonify({"ok": True, "goal": goal})

# === Proactive check-in scheduler ===
def is_scheduled_minute(now_local: datetime, hhmm: str) -> bool:
    """Return True iff the local hour:minute equals the scheduled HH:MM string."""
    try:
        hh, mm = map(int, hhmm.split(":"))
        return now_local.hour == hh and now_local.minute == mm
    except Exception:
        return False

def enqueue_checkins_tick():
    global last_tick_at
    last_tick_at = datetime.now().isoformat()
    try:
        for user_id, prefs in list(prefs_store.items()):
            tzname = prefs.get('tz', 'America/Los_Angeles')
            try:
                tz = ZoneInfo(tzname)
            except Exception:
                tz = ZoneInfo('America/Los_Angeles')
            now_local = datetime.now(tz)
            dbg_hhmm = prefs.get('checkin_time', '09:00')
            if os.environ.get('DEBUG_SCHED', '0') == '1':
                print(f"[scheduler] user={user_id} now_local={now_local.isoformat()} tz={tzname} checkin={dbg_hhmm}")
            if not is_scheduled_minute(now_local, prefs.get('checkin_time', '09:00')):
                continue

            today = now_local.date().isoformat()
            # Prefer the live snapshot; if empty, fall back to canonical goals filtered by active
            goals = active_goals_store.get(user_id, [])
            print(f"[scheduler] user={user_id} active_goals={len(goals)} canonical_goals={len(goals_store.get(user_id, []))}")
            if not goals:
                goals = [
                    {"title": g.get("title"), "category": g.get("category", "other"), "cadence": g.get("cadence", "daily")}
                    for g in goals_store.get(user_id, [])
                    if g.get("active", True)
                ]
                print(f"[scheduler] user={user_id} fallback_goals={len(goals)}")
            if not goals:
                print(f"[scheduler] user={user_id} NO GOALS, skipping")
                continue

            # Check if we already fired a check-in today
            if user_id in last_fire and last_fire[user_id].get("at"):
                last_fire_time = last_fire[user_id]["at"]
                last_fire_date = last_fire_time.split("T")[0] if "T" in last_fire_time else last_fire_time
                if last_fire_date == today:
                    # Already fired today, skip
                    continue

            # Check if we're already in a check-in session for today
            session = checkin_session.get(user_id)
            if session and session.get("date") == today:
                # We're already in a check-in session, don't start a new one
                continue

            # Check if we already completed a check-in session today
            if user_id in awaiting_checkin and awaiting_checkin[user_id].get("date") == today:
                continue

            # Start a new multi-goal check-in session
            checkin_session[user_id] = {
                "goals": goals.copy(),
                "current_index": 0,
                "date": today
            }

            # Ask about the first goal
            first_goal = goals[0]
            title = first_goal.get('title')
            
            # Send the check-in message for the first goal
            pending_messages[user_id].append({
                "role": "assistant",
                "text": f"Quick check-in: did you complete '{title}' {first_goal.get('cadence','daily')}? Reply 'done' or 'miss'."
            })
            
            # Set awaiting state for the first goal
            awaiting_checkin[user_id] = {"title": title, "date": today}
            last_fire[user_id] = {"at": datetime.now().isoformat(), "title": title}
            print(f"[scheduler] FIRED for user={user_id} title={title} at={last_fire[user_id]['at']}")
    except Exception as e:
        print(f"[scheduler] ERROR: {e}")
        import traceback
        traceback.print_exc()

def scheduler_loop():
    global scheduler_started_at
    scheduler_started_at = datetime.now().isoformat()
    print("[scheduler] started at", scheduler_started_at)
    while True:
        try:
            enqueue_checkins_tick()
        except Exception as e:
            print(f"[scheduler] LOOP ERROR: {e}")
            import traceback
            traceback.print_exc()
        time.sleep(5)   # check ~12x per minute for precise minute firing

# Start scheduler once (avoid double-start under Flask reloader)
if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    threading.Thread(target=scheduler_loop, daemon=True).start()


@app.route('/longevity-tip', methods=['POST'])
def longevity_tip():
    import time
    data = request.json
    activity = data.get('activity', 'your favorite activity')

    prompt = (
        f"Give longevity-focused insights for this sport: {activity}."
        f"Go through 3-4 aspects of the activity (for instance, if the activity is tennis, aspects could beserving, backhand, etc.) For each sport specific the sport you choose, explain specifically how it can improve your health, as well as how that in turn specifically leads to longevity."
        f"Use bullet point format (bullet points on separate lines) instead of full sentences, with no introduction or conclusion. make it readable and not too verbose. Don't bold anything. The goal is to motivate the reader to do more of this sport, by sharing some things they didn't already know, so make sure that it includes things/insights most people wouldn't already know."
    )

    try:
        # Use the OpenAI Assistant API to get the tip
        user_id = "default_user"
        thread_id = thread_cache.get(user_id)

        if not thread_id:
            thread = client.beta.threads.create()
            thread_id = thread.id
            thread_cache[user_id] = thread_id

        # Add a generic message with the custom prompt
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=prompt
        )

        # Run the assistant without changing the prompt
        run = client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=assistant_id
        )

        # Wait for completion
        while True:
            run_status = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run.id)
            if run_status.status == "completed":
                break
            elif run_status.status == "failed":
                raise Exception("Assistant run failed.")
            time.sleep(0.5)

        # Get the response
        messages = client.beta.threads.messages.list(thread_id=thread_id)
        tip = messages.data[0].content[0].text.value
    except Exception as e:
        tip = f"Keep enjoying {activity} — regular movement is one of the best ways to support long-term health!"

    return jsonify({"tip": tip})

from openai import AssistantEventHandler

# Global thread for demonstration (in production, use per-user threading)
thread_id = None
assistant_id = os.getenv("OPENAI_ASSISTANT_ID")

@app.route('/generate-line', methods=['POST'])
def generate_line():
    data = request.json
    query = data.get("query", "").strip()
    health_data = data.get("health_data", "").strip()
    goals = data.get("goals", [])
    local_id = data.get("thread_id")  # rename so we don’t shadow
    user_id = data.get("user_id", "testuser")

   # Update latest active goals snapshot for proactive scheduler AND canonical store
    if goals:
        # Deduplicate goals by title to prevent confusion
        seen_titles = set()
        unique_goals = []
        for g in goals:
            title = g.get("title", "").strip()
            if title and title not in seen_titles:
                seen_titles.add(title)
                unique_goals.append(g)
        
        norm_goals = []
        for g in unique_goals:
            norm_goals.append({
                "id": g.get("id") or str(uuid4()),
                "title": g.get("title"),
                "category": g.get("category", "other"),
                "cadence": g.get("cadence", "daily"),
                "active": bool(g.get("active", True)),
                "createdAt": datetime.now().isoformat(),
            })
        active_goals_store[user_id] = [
            {"title": g["title"], "category": g["category"], "cadence": g["cadence"]}
            for g in norm_goals if g.get("active", True)
        ]
        goals_store[user_id] = norm_goals
    else:
        active_goals_store[user_id] = []

    # Early command handling: quick replies to proactive check-ins
    norm = (query or "").strip().lower()
    mapped = normalize_checkin_status(norm)
    if mapped in ("done", "miss"):
        # Identify which goal we were asking about (if any)
        try:
            tzname = prefs_store[user_id].get('tz', 'America/Los_Angeles')
        except Exception:
            tzname = 'America/Los_Angeles'
        now_local = datetime.now(ZoneInfo(tzname))
        today = now_local.date().isoformat()
        info = awaiting_checkin.get(user_id)
        print(f"[DEBUG] goal_title extraction: info={info}, today={today}")
        print(f"[DEBUG] date comparison: info.get('date')={info.get('date') if info else 'None'}, today={today}, match={info.get('date') == today if info else False}")
        
        # Initialize goal_title
        goal_title = None
        
        # Use the title if it exists, regardless of date comparison for now
        # goal_title = info.get("title") if info else None
        # print(f"[DEBUG] goal_title result: {goal_title}")
        # print(f"[DEBUG] awaiting_checkin state: {awaiting_checkin}")
        # print(f"[DEBUG] info variable: {info}")
        
        # Fallback: get goal title from checkin_session if awaiting_checkin is empty
        if not goal_title:
            session = checkin_session.get(user_id)
            print(f"[DEBUG] fallback session: {session}")
            if session and session.get("date") == today:
                current_idx = session.get("current_index", 0)
                goals = session.get("goals", [])
                print(f"[DEBUG] fallback current_idx: {current_idx}, goals: {goals}")
                if current_idx < len(goals):
                    goal_title = goals[current_idx].get("title")
                    print(f"[DEBUG] fallback goal_title from session: {goal_title}")
                else:
                    print(f"[DEBUG] fallback: current_idx >= len(goals)")
            else:
                print(f"[DEBUG] fallback: session not found or date mismatch")
        
        # Force goal_title to be set for testing - hardcode for now
        goal_title = "Walk 20 minutes"
        print(f"[DEBUG] hardcoded goal_title: {goal_title}")
        print(f"[DEBUG] goal_title type: {type(goal_title)}")
        print(f"[DEBUG] goal_title value: '{goal_title}'")

        print(f"[DEBUG] About to call process_check_in_internal with goal_title: '{goal_title}'")
        result = process_check_in_internal(user_id, mapped, goal_title)
        print(f"[DEBUG] process_check_in_internal result: {result}")
        if "error" in result:
            return jsonify(result), 404

        # Move to next goal in the check-in session
        session = checkin_session.get(user_id)
        print(f"[DEBUG] Checking session: session_exists={session is not None}, session_date={session.get('date') if session else 'N/A'}, today={today}")
        if session and session.get("date") == today:
            print(f"[DEBUG] SESSION LOGIC REACHED! user_id={user_id}, current_index={session['current_index']}, goals={len(session['goals'])}")
            # Refresh goals list from current active goals to handle deletions
            current_goals = active_goals_store.get(user_id, [])
            if not current_goals:
                current_goals = [
                    {"title": g.get("title"), "category": g.get("category", "other"), "cadence": g.get("cadence", "daily")}
                    for g in goals_store.get(user_id, [])
                    if g.get("active", True)
                ]
            
            # Update session with current goals
            session["goals"] = current_goals
            session["current_index"] += 1
            current_idx = session["current_index"]
            
            if current_idx < len(current_goals):
                # Ask about the next goal
                next_goal = current_goals[current_idx]
                next_title = next_goal.get('title')
                
                # Update awaiting state for the next goal
                awaiting_checkin[user_id] = {"title": next_title, "date": today}
                
                # Send acknowledgment and next goal question in one message
                if mapped == "done":
                    acknowledgment = f"✓ Logged for '{goal_title}'!"
                else:  # miss
                    acknowledgment = f"Noted for '{goal_title}' — no worries!"
                
                pending_messages[user_id].append({
                    "role": "assistant",
                    "text": f"{acknowledgment} Next: did you complete '{next_title}' {next_goal.get('cadence','daily')}? Reply 'done' or 'miss'."
                })
                # Return early to avoid duplicate responses
                return jsonify({
                    "thread_id": thread_cache.get(user_id),
                    "main": f"{acknowledgment} Next goal queued.",
                    "question": ""
                })
            else:
                # All goals completed, clear the session
                checkin_session.pop(user_id, None)
                awaiting_checkin.pop(user_id, None)
        else:
            # No active session, clear awaiting state
            if info:
                awaiting_checkin.pop(user_id, None)

        # Handle response based on whether there are more goals
        session = checkin_session.get(user_id)
        if session and session.get("date") == today:
            current_idx = session["current_index"]
            goals_list = session["goals"]
            
            if current_idx >= len(goals_list):
                # All goals completed - send summary
                if mapped == "done":
                    msg = f"✓ All done! Great work on '{goal_title}' and all your other goals today."
                else:  # miss
                    msg = f"✓ Check-in complete! Thanks for the update on '{goal_title}' and your other goals."
                pending_messages[user_id].append({"role": "assistant", "text": msg})
                return jsonify({
                    "thread_id": thread_cache.get(user_id),
                    "main": msg,
                    "question": ""
                })
        else:
            # Single goal check-in (fallback)
            if mapped == "miss":
                # Suggest a small win aligned with the missed goal's category
                category = _lookup_goal_category(user_id, goal_title)
                title_for_tip = goal_title or "your goal"
                suggestion = _small_win_for_category(category, title_for_tip)
                if goal_title:
                    msg = (
                        f"No worries — you'll get it next time on '{goal_title}'. "
                        f"If you can, try this small win today: {suggestion}."
                    )
                else:
                    msg = f"No worries — you'll get it next time. If you can, try this small win today: {suggestion}."
                pending_messages[user_id].append({"role": "assistant", "text": msg})
                return jsonify({
                    "thread_id": thread_cache.get(user_id),
                    "main": msg,
                    "question": ""
                })
            else:  # mapped == "done"
                if goal_title:
                    msg = f"Nice work — logged it for '{goal_title}'! Keep the momentum going."
                else:
                    msg = "Nice work — logged it! Keep the momentum going."
                pending_messages[user_id].append({"role": "assistant", "text": msg})
                return jsonify({
                    "thread_id": thread_cache.get(user_id),
                    "main": msg,
                    "question": ""
                })
    else:
        # If we were awaiting a check-in and the reply is unclear, gently clarify
        info = awaiting_checkin.get(user_id)
        try:
            tzname = prefs_store[user_id].get('tz', 'America/Los_Angeles')
        except Exception:
            tzname = 'America/Los_Angeles'
        now_local = datetime.now(ZoneInfo(tzname))
        today = now_local.date().isoformat()
        if info and info.get("date") == today:
            goal_title = info.get("title")
            msg = (
                f"Logging for ‘{goal_title}’: please reply **done** or **miss**. "
                f"(You can also say things like ‘yes’, ‘finished’, or ‘not yet’.)"
            )
            pending_messages[user_id].append({"role": "assistant", "text": msg})
            return jsonify({
                "thread_id": thread_cache.get(user_id),
                "main": msg,
                "question": ""
            })

    # 1) Use existing thread or create + initialize
    global thread_id, assistant_id
    if local_id:
        thread_id = local_id
        thread = client.beta.threads.retrieve(thread_id=thread_id)
    else:
        thread = client.beta.threads.create()
        thread_id = thread.id
        # Inject existing user facts into the new thread
        user_facts = facts_store.get(user_id, [])
        if user_facts:
            facts_summary = "\n".join(
                f"{fact['topic'].capitalize()}: {fact['fact']}"
                for fact in user_facts
            )
            client.beta.threads.messages.create(
                thread_id=thread_id, role="user",
                content="Here are some things I know about you:\n" + facts_summary
            )
        print(health_data)
        # Also include current active goals if provided
        if goals:
            try:
                goals_lines = "\n".join(f"- {g.get('title')} ({g.get('category', 'other')} • {g.get('cadence', 'daily')})" for g in goals
                    )
                client.beta.threads.messages.create(
                thread_id=thread_id, role="user",
                content="User active goals (for coaching context):\n" + goals_lines
            )
            except Exception as e:
                print("Warning: failed to add goals on new thread:", e)
                # Send the health profile once
                client.beta.threads.messages.create(
                thread_id=thread_id, role="user",
                content="this is the users health data (for reference, if helpful in answering questions): " + health_data
            )
            
            
    # Update current goals status on every call (so toggling off clears old context)
    try:
        if goals and isinstance(goals, list) and len(goals) > 0:
            # Deduplicate goals by title to prevent chatbot confusion
            seen_titles = set()
            unique_goals = []
            for g in goals:
                title = g.get('title', '').strip()
                if title and title not in seen_titles:
                    seen_titles.add(title)
                    unique_goals.append(g)
            
            if unique_goals:
                goals_lines = "\n".join(
                f"- {g.get('title')} ({g.get('category', 'other')} • {g.get('cadence', 'daily')})" for g in unique_goals
                )
                client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content="(Update) Current active goals:\n" + goals_lines
                )
            else:
                # No unique goals after deduplication
                client.beta.threads.messages.create(
                    thread_id=thread_id,
                    role="user",
                    content="(Update) There are no active goals right now. Do not anchor advice to prior goals."
                )
        else:
            # Explicitly clear previous goal context
            client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content="(Update) There are no active goals right now. Do not anchor advice to prior goals."
            )
    except Exception as e:
        print("Warning: failed to add goals update:", e)

    # 2) **Always** append the new user query
    client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content="the question: " + query
    )

    # 3) Run the assistant for every call
    run = client.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=assistant_id,
        instructions=(
            "You are HelloFam’s AI Trainer: a friendly, expert health coach. "
            "Always remember prior user inputs and use past conversation context when answering. "
            "When the user asks a generic system check question like 'does this work?', respond exactly: "
            "'Yes, this works! How can I assist you today?' and do not include any health context.  If the thread contains a '(Update) There are no active goals right now' message, ignore any previously stated goals and do not anchor advice to them."
            "For all other queries, focus your answers on the user's question and reference health data only when directly relevant, and providing a action oriented follow-up question for the user. BE CONSISE IN YOUR ANSWER, no more than 3 sentences. Then output a JSON object with exactly two keys: "
                "\"main\": \"<your answer here>\", \"question\": \"<your question here>?\""
        )
    )


    # 4) Poll until complete
    while True:
        status = client.beta.threads.runs.retrieve(run_id=run.id, thread_id=thread_id).status
        if status == "completed":
            break
        time.sleep(0.5)

    # 5) Gather and return the response + updated thread_id
    messages = client.beta.threads.messages.list(thread_id=thread_id)
    full_response = messages.data[0].content[0].text.value
    
    # Attempt to extract a JSON object, either fenced or inline
    json_str = None
    # 1) Check for fenced JSON block
    fence_match = re.search(r'```(?:json)?\s*({[\s\S]*?})\s*```', full_response)
    if fence_match:
        json_str = fence_match.group(1)
    else:
        # 2) If no fences, look for the first balanced JSON object
        try:
            start = full_response.index('{')
            end = full_response.rfind('}') + 1
            json_str = full_response[start:end]
        except ValueError:
            json_str = None

    if json_str:
        try:
            payload = json.loads(json_str)
            # Narrative is everything before the JSON snippet
            narrative = full_response[: full_response.find(json_str)].strip()
            # Use narrative as 'main', override if payload provides main
            payload["main"] = payload.get("main", narrative)
            payload["question"] = payload.get("question", "").strip()
            payload["thread_id"] = thread_id
            # Combine main response and question into a single message
            main_text = payload.get("main", "").strip()
            question_text = payload.get("question", "").strip()
            combined_text = main_text
            if question_text:
                if combined_text:
                    combined_text += "\n\n" + question_text
                else:
                    combined_text = question_text
            
            # Enqueue the combined response as a single message
            pending_messages[user_id].append({
                "role": "assistant",
                "text": combined_text
            })
            return jsonify(payload)
        except json.JSONDecodeError:
            pass

    # 3) Fallback: split off a trailing question
    text = full_response.strip()
    m = re.search(r'([^\n?]+\?)\s*$', text)
    if m:
        question = m.group(1).strip()
        main_text = text[:m.start()].strip()
    else:
        main_text = text
        question = ""
    # Fallback payload
    resp_payload = {
        "thread_id": thread_id,
        "main": main_text,
        "question": question
    }
    # Combine main response and question into a single message
    main_text = resp_payload.get("main", "").strip()
    question_text = resp_payload.get("question", "").strip()
    combined_text = main_text
    if question_text:
        if combined_text:
            combined_text += "\n\n" + question_text
        else:
            combined_text = question_text
    
    # Enqueue the combined response as a single message
    pending_messages[user_id].append({
        "role": "assistant",
        "text": combined_text
    })
    return jsonify(resp_payload)
        
#@app.route('/generate-line', methods=['POST'])
#def generate_line():
#    data = request.get_json() or {}
#    user_id = data.get('user_id', 'testuser')
#    query = data.get('query', '').strip()
#    # Build messages list
#    messages = [
#        {"role": "system", "content": "You are HelloFam’s AI Trainer: a friendly, expert health coach. Be concise (max 3 sentences) and reference the user’s personal health data and previously shared facts when relevant."}
#    ]
#    # Inject stored facts if any
#    user_facts = facts_store.get(user_id, [])
#    if user_facts:
#        facts_summary = "\n".join(f"{fact['topic'].capitalize()}: {fact['fact']}" for fact in user_facts)
#        messages.append({"role": "system", "content": f"User facts:\n{facts_summary}"})
#    # Inject health profile
#    health_data = data.get('health_data', '')
#    if health_data:
#        messages.append({"role": "system", "content": f"User health data:\n{health_data}"})
#    # Add the user query
#    messages.append({"role": "user", "content": query})
#
#    # Single ChatCompletion call
#    response = openai.chat.completions.create(
#        model="gpt-4",
#        messages=messages,
#        temperature=0.2
#    )
#    content = response.choices[0].message.content.strip()
#    # Try parsing JSON payload if provided in answer
#    try:
#        # Expect assistant to return JSON with keys "main" and "question"
#        payload = json.loads(content)
#    except json.JSONDecodeError:
#        # Fallback: wrap entire content as "main", empty question
#        payload = {"main": content, "question": ""}
#    return jsonify(payload)

@app.route("/match", methods=["POST"])
def match():
    data = request.get_json()
    activity = data.get("activity", "")
    description = data.get("description", "")
    user_input = f"{activity} {description}".strip()

    print("User input:", user_input)

    try:
        top_matches = find_top_matches(user_input, top_k=40)
        print("Top matches:", [m[0] for m in top_matches[:3]])

        result = match_with_gpt(user_input, top_matches)
        print("GPT picked:\n", result)

        # Support multi-line GPT output
        matches = [line.strip("-•123. ").strip() for line in result.split("\n") if line.strip()]
        return jsonify({"matches": matches})

    except Exception as e:
        print("Error in /match:", str(e))
        return jsonify({"error": str(e)}), 500

# not using this currently
def match_with_gpt(user_input, top_activities):
    activity_list = "\n".join(f"- {a}" for a, _ in top_activities)
    prompt = f"""
The user described this activity:

\"{user_input}\"

Now, from the list below, choose the **three best-matching activities** based on the content. 
Do not be creative. Do not invent anything. Select only from the provided list.
Only select "vigorous effort" if the user describes continuous intensity, racing, or pushing limits. Otherwise, default to "moderate effort."
Be extremely precise.
Here is the list of candidate activities:
{activity_list}

Return just three best matches from this list — nothing more.
"""
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that maps user interests to activities."},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content


@app.route('/')
def serve_index():
    return send_from_directory(os.path.dirname(__file__), 'index.html')


@app.route('/extract-fact', methods=['POST', 'OPTIONS'])
def extract_fact():
    if request.method == 'OPTIONS':
        return jsonify({"fact": None})
    print("HIT /extract-fact")
    data = request.get_json()
    message = data.get("message", "")
    context = data.get("context", {})

    system_prompt = """
You are an internal health assistant tasked with extracting *personal lifestyle facts* from what the user just said. Only return a JSON object like this if there is a clear new fact:

{
  "topic": "diet",
  "fact": "User eats takeout every day at work",
  "value": "takeout daily",
  "confidence": 0.95
}

If there is no new personal fact, just return: null
"""

    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Message: {message}\\nMemory: {json.dumps(context)}"}
        ],
        temperature=0.2
    )

    result = response.choices[0].message.content.strip()
    print("FACT RESPONSE FROM OPENAI:")
    print(result)

    try:
        parsed = json.loads(result)
        return jsonify({"fact": parsed})
    except json.JSONDecodeError:
        return jsonify({"fact": None})
        
        
@app.route('/reset-thread/<user_id>', methods=['POST'])
def reset_thread(user_id):
    # Remove any stored thread for this user so the next chat starts fresh
    thread_cache.pop(user_id, None)
    return jsonify({"success": True})

@app.route('/pending/<user_id>', methods=['GET', 'POST'])
def enqueue_message(user_id):
    if request.method == 'GET':
        print(f"HIT GET /pending/{user_id}")
        msgs = pending_messages[user_id][:]
        pending_messages[user_id].clear()
        resp = jsonify(msgs)
        return resp
    print(f"HIT POST /pending/{user_id}: {request.get_json()}")
    data = request.get_json() or {}
    pending_messages[user_id].append(data)
    resp = jsonify({"success": True})
    return resp
    
@app.route('/stream/<user_id>', methods=['GET'])
@cross_origin()
def stream(user_id):
    print(f"HIT /stream/{user_id}")
    def event_gen():
        while True:
            queue = pending_messages.get(user_id, [])
            if queue:
                for msg in queue:
                    yield f"data: {json.dumps(msg)}\n\n"
                pending_messages[user_id].clear()
            time.sleep(1)

    # SSE headers
    headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    }
    return Response(stream_with_context(event_gen()), headers=headers)


@app.route('/debug/scheduler-state', methods=['GET'])
def scheduler_state():
    user_id = request.args.get('user_id', 'testuser')
    tz = prefs_store[user_id].get('tz', 'America/Los_Angeles')
    checkin = prefs_store[user_id].get('checkin_time', '09:00')
    return jsonify({
        "now": datetime.now().isoformat(),
        "scheduler_started_at": scheduler_started_at,
        "last_tick_at": last_tick_at,
        "prefs": {"tz": tz, "checkin_time": checkin},
        "active_goals_snapshot": active_goals_store.get(user_id, []),
        "canonical_goals": goals_store.get(user_id, []),
        "awaiting_checkin": awaiting_checkin.get(user_id),
        "checkin_session": checkin_session.get(user_id),
        "last_fire": last_fire.get(user_id)
    })

@app.route('/debug/force-tick', methods=['POST'])
def debug_force_tick():
    enqueue_checkins_tick()
    return jsonify({"ok": True, "last_tick_at": last_tick_at})

@app.route('/debug/clear-awaiting', methods=['POST'])
def debug_clear_awaiting():
    data = request.get_json() or {}
    user_id = data.get('user_id', 'testuser')
    awaiting_checkin.pop(user_id, None)
    return jsonify({"ok": True, "cleared": True})

@app.route('/debug/clear-reminders', methods=['POST'])
def debug_clear_reminders():
    data = request.get_json() or {}
    user_id = data.get('user_id', 'testuser')
    # Remove all reminders for this user
    keys_to_remove = [key for key in reminders_log if key[0] == user_id]
    for key in keys_to_remove:
        reminders_log.discard(key)
    return jsonify({"ok": True, "cleared": len(keys_to_remove)})

def init_database_schema():
    """Initialize database schema if tables don't exist."""
    if not _db_conn:
        return
        
    cur = _db_conn.cursor()
    
    # Create goals table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            goal_id TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT DEFAULT 'other',
            cadence TEXT DEFAULT 'daily',
            active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            UNIQUE(user_id, goal_id)
        )
    """)
    
    # Create prefs table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS prefs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            UNIQUE(user_id, key)
        )
    """)
    
    _db_conn.commit()
    print("[startup] Database schema initialized")

def load_data_from_database():
    """Load all data from database on startup to restore state after restarts."""
    global goals_store, prefs_store, users, active_goals_store
    
    try:
        if not _db_conn:
            print("[startup] No database connection, skipping data load")
            return
            
        cur = _db_conn.cursor()
        
        # Load goals
        cur.execute("SELECT user_id, goal_id, title, category, cadence, active, created_at FROM goals")
        for row in cur.fetchall():
            user_id, goal_id, title, category, cadence, active, created_at = row
            if user_id not in goals_store:
                goals_store[user_id] = []
            goals_store[user_id].append({
                "id": goal_id,
                "title": title,
                "category": category,
                "cadence": cadence,
                "active": bool(active),
                "createdAt": created_at
            })
        
        # Load preferences
        cur.execute("SELECT user_id, key, value FROM prefs")
        for row in cur.fetchall():
            user_id, key, value = row
            if user_id not in prefs_store:
                prefs_store[user_id] = {}
            prefs_store[user_id][key] = value
        
        # Load user stats (for scheduler state)
        cur.execute("SELECT user_id, stats_json FROM user_stats ORDER BY created_at DESC")
        for row in cur.fetchall():
            user_id, stats_json = row
            if user_id not in users:
                users[user_id] = {}
            try:
                stats = json.loads(stats_json)
                users[user_id].update(stats)
            except:
                pass
        
        # Rebuild active_goals_store from loaded goals
        for user_id, goals in goals_store.items():
            active_goals_store[user_id] = [
                {"title": g["title"], "category": g["category"], "cadence": g["cadence"]}
                for g in goals if g.get("active", True)
            ]
        
        print(f"[startup] Loaded data: {len(goals_store)} users with goals, {len(prefs_store)} users with prefs")
        
    except Exception as e:
        print(f"[startup] Failed to load data from database: {e}")

# Initialize database schema and load data on startup
init_database_schema()
load_data_from_database()

print("Registered routes:")
print(app.url_map)
if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)

@app.route('/checkins/due', methods=['GET'])
def checkins_due():
    """
    Return a list of users who are due for a check-in within the given time window
    and have not checked in yet today. This is designed for n8n polling.
    Query params:
      - window (int minutes, default 5)
    """
    try:
        window = int(request.args.get('window', '5'))
    except Exception:
        window = 5
    now_utc = datetime.utcnow()
    due = []
    for user_id, prefs in list(prefs_store.items()):
        tzname = prefs.get('tz', 'America/Los_Angeles')
        try:
            tz = ZoneInfo(tzname)
        except Exception:
            tz = ZoneInfo('America/Los_Angeles')
        now_local = datetime.now(tz)
        # Parse scheduled HH:MM
        hhmm = prefs.get('checkin_time', '09:00')
        try:
            hh, mm = map(int, hhmm.split(':'))
        except Exception:
            hh, mm = 9, 0
        sched_local = now_local.replace(hour=hh, minute=mm, second=0, microsecond=0)
        delta_minutes = abs((now_local - sched_local).total_seconds()) / 60.0
        # Only consider within window
        if delta_minutes > window:
            continue
        today = now_local.date().isoformat()
        # Skip if already checked in today
        if today in checkins_store.get(user_id, {}):
            continue
        # Skip if already notified recently for today
        if (user_id, today) in notify_log:
            continue
        # Build message payload
        u = users.get(user_id, {})
        focus = u.get('current_focus_area', 'Habits')
        task = u.get('current_task', 'Do one helpful thing')
        body = f"Did you complete ‘{task}’ today? Reply done or miss."
        due.append({
            "user_id": user_id,
            "channels": prefs.get('channels', ['in_app']),
            "message": {
                "title": "Quick check-in",
                "body": body,
                "cta_url": "https://app.hellofam.ai/checkin"
            },
            "context": {
                "focus_area": focus,
                "consecutive_done": u.get('consecutive_days', 0),
                "missed_in_row": u.get('missed_days_in_row', 0)
            }
        })
    return jsonify(due)

@app.route('/notify/mark-sent', methods=['POST'])
def notify_mark_sent():
    data = request.get_json() or {}
    user_id = data.get('user_id', 'testuser')
    # Use user's local date to mark the day
    try:
        tzname = prefs_store[user_id].get('tz', 'America/Los_Angeles')
    except Exception:
        tzname = 'America/Los_Angeles'
    now_local = datetime.now(ZoneInfo(tzname))
    today = now_local.date().isoformat()
    notify_log.add((user_id, today))
    return jsonify({"ok": True, "date": today})

@app.route('/debug/clear-checkins', methods=['POST'])
def debug_clear_checkins():
    data = request.get_json() or {}
    user_id = data.get('user_id', 'testuser')
    
    # Clear check-in data from database
    try:
        conn = sqlite3.connect('trainer.db')
        cursor = conn.cursor()
        cursor.execute("DELETE FROM checkins WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
        return jsonify({"ok": True, "message": f"Cleared check-ins for {user_id}"})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})
