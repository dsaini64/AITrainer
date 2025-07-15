import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask import Response, stream_with_context, make_response


import os
import openai
openai.api_key = os.getenv("OPENAI_API_KEY")
import re
from openai import OpenAI
import time
import random
from datetime import datetime
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
         "https://64c2e388b6a8.ngrok-free.app"
     ]}},
     supports_credentials=True,
     allow_headers=["Content-Type"]
)

from collections import defaultdict
pending_messages = defaultdict(list)

# Hold the thread across sessions
saved_thread = None
thread_cache = {}

@app.route('/prepare-thread', methods=['POST'])
def prepare_thread():
    data = request.get_json() or {}
    user_id = data.get('user_id', 'testuser')
    health_data = data.get('health_data', {})

    # Create or reuse a conversation thread
    if user_id in thread_cache:
        thread_id = thread_cache[user_id]
    else:
        thread = client.beta.threads.create()
        thread_id = thread.id
        thread_cache[user_id] = thread_id

    # Inject existing user facts if any
    user_facts = get_user_facts(user_id)
    if user_facts:
        facts_summary = "\n".join(f"{fact['topic'].capitalize()}: {fact['fact']}" for fact in user_facts)
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content="Here are some things I know about you:\n" + facts_summary
        )

    # Inject health profile data
    client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content="User health data (for reference): " + json.dumps(health_data)
    )

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
    "Stretch every morning": [
        "Stretch every morning for 5 minutes",
        "Stretch every morning and do 5 pushups",
        "Stretch and short walk every morning"
    ],
    "Eat one extra vegetable": [
        "Eat two extra vegetables",
        "Eat one salad per day",
        "Eat plant-based for one meal per day"
    ],
    "Sleep 7+ hours": [
        "Sleep 8+ hours",
        "Sleep 8 hours and wake up consistently",
        "No screens 1 hour before bed"
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
    # Using hardcoded scores for now
    scores = {
        "Physical Health": 5,
    "Nutrition": 7,
    "Sleep & Recovery": 8,
    "Emotional Health": 9,
    "Social Connection": 4,
    "Habits": 3,
    "Medical History": 10
    }

    # Map focus areas to possible habits
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
        ordered_areas = sorted(scores, key=scores.get)
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

@app.route('/check-in', methods=['POST'])
def check_in():
    data = request.json
    user_id = data.get('user_id')
    status = data.get('status')

    user = users.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

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

        # Rotate to next task at same difficulty if available, else repeat
        current_focus = user["current_focus_area"]
        difficulty = user["difficulty"]
        focus_areas_ordered = user["focus_areas_ordered"]
        task_options = habit_map.get(current_focus, [])
        # Only rotate if not promoting difficulty/focus area
        if user["total_days_completed"] % 3 == 0:
            if difficulty < 3:
                # Promote difficulty level
                user["difficulty"] += 1
                task_options = habit_map[current_focus]
                if user["difficulty"] - 1 < len(task_options):
                    user["current_task"] = task_options[user["difficulty"] - 1]
                else:
                    user["current_task"] = get_next_task(user["current_task"], current_focus, user["difficulty"])
                message = f"You've advanced to difficulty level {user['difficulty']} in {current_focus}: {user['current_task']}"
            else:
                # Move to next focus area
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
                        # Restart from first focus area if all completed
                        new_focus = focus_areas_ordered[0]
                        user["current_focus_area"] = new_focus
                        user["difficulty"] = 1
                        user["current_task"] = habit_map[new_focus][0]
                        message = f"You've mastered all focus areas! Restarting with: {new_focus} - {user['current_task']}"
                except ValueError:
                    # If current_focus_area not in list, reset
                    new_focus = focus_areas_ordered[0]
                    user["current_focus_area"] = new_focus
                    user["difficulty"] = 1
                    user["current_task"] = habit_map[new_focus][0]
                    message = f"Resetting focus area to: {new_focus} - {user['current_task']}"
        else:
            # Rotate within same difficulty (if possible)
            if user["difficulty"] - 1 < len(task_options):
                # Rotate among tasks at this difficulty if available (simulate rotation)
                # Only rotate if there are multiple tasks at this level
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
        # Make task easier if not already at easiest, or switch to another task in same tier
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
    # New logic: generate monthly report every 30 days
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

    return jsonify({
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
    })

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
    local_id = data.get("thread_id")  # rename so we don’t shadow
    user_id = data.get("user_id", "testuser")

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
        # Send the health profile once
        client.beta.threads.messages.create(
            thread_id=thread_id, role="user",
            content="this is the users health data (for reference, if helpful in answering questions): " + health_data
        )

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
            "'Yes, this works! How can I assist you today?' and do not include any health context. "
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
            # Enqueue the main response
            pending_messages[user_id].append({
                "role": "assistant",
                "text": payload.get("main", "")
            })
            # Enqueue the follow-up question if present
            question_text = payload.get("question", "").strip()
            if question_text:
                pending_messages[user_id].append({
                    "role": "assistant",
                    "text": question_text
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
    # Enqueue the main response
    pending_messages[user_id].append({
        "role": "assistant",
        "text": resp_payload["main"]
    })
    # Enqueue the follow-up question from fallback if present
    question_text = resp_payload.get("question", "").strip()
    if question_text:
        pending_messages[user_id].append({
            "role": "assistant",
            "text": question_text
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

@app.route('/prepare-plan-discussion', methods=['POST'])
def prepare_plan_discussion():
    """Prepare a conversation thread specifically for plan discussion"""
    data = request.get_json() or {}
    user_id = data.get('user_id', 'testuser')
    plan = data.get('plan', {})
    health_data = data.get('health_data', {})

    # Create or reuse a conversation thread
    if user_id in thread_cache:
        thread_id = thread_cache[user_id]
    else:
        thread = client.beta.threads.create()
        thread_id = thread.id
        thread_cache[user_id] = thread_id

    # Set up the discussion context
    system_context = f"""
    You are a supportive health coach helping a user discuss their personalized plan. Your goal is to:
    1. Present the plan clearly and engagingly
    2. Listen to the user's questions, concerns, and feedback
    3. Adapt the plan based on their needs and preferences
    4. Guide them through a structured discussion process
    5. Ensure they feel confident and motivated about their plan

    User's plan: {json.dumps(plan)}
    User's health data: {json.dumps(health_data)}
    
    Discussion stages:
    - Introduction: Present the plan warmly and explain each component
    - Exploration: Encourage questions and gather feedback
    - Concerns: Address any worries or obstacles they mention
    - Refinement: Suggest modifications based on their input
    - Finalization: Confirm the final plan and next steps

    Be conversational, supportive, and flexible. Ask follow-up questions to understand their lifestyle, preferences, and constraints.
    """

    # Inject the system context
    client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=system_context
    )

    return jsonify({"thread_id": thread_id})

@app.route('/start-plan-discussion', methods=['POST'])
def start_plan_discussion():
    """Start the plan discussion with an introduction"""
    data = request.get_json() or {}
    thread_id = data.get('thread_id')
    plan = data.get('plan', {})
    stage = data.get('stage', 'introduction')

    if not thread_id:
        return jsonify({"error": "Thread ID required"}), 400

    try:
        # Create the introduction using chat completion
        intro_prompt = f"""
        You are a supportive health coach introducing a personalized plan to a user. 
        Present this plan warmly and engagingly, explaining each component and why it was chosen for them.
        Ask them what they think and if they have any initial questions.
        
        Plan to discuss: {json.dumps(plan, indent=2)}
        
        Keep it conversational, encouraging, and end by asking for their thoughts.
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an enthusiastic and supportive health coach who helps users understand and discuss their personalized health plans."},
                {"role": "user", "content": intro_prompt}
            ],
            max_tokens=400,
            temperature=0.7
        )

        ai_message = response.choices[0].message.content
        return jsonify({"message": ai_message, "stage": "exploration"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/discuss-plan', methods=['POST'])
def discuss_plan():
    """Handle ongoing plan discussion"""
    data = request.get_json() or {}
    thread_id = data.get('thread_id')
    message = data.get('message')
    current_stage = data.get('current_stage', 'exploration')
    plan = data.get('plan', {})
    concerns = data.get('concerns', [])
    additional_info = data.get('additional_info', {})

    if not thread_id or not message:
        return jsonify({"error": "Thread ID and message required"}), 400

    try:
        # Analyze the user's message to extract insights
        analysis_prompt = f"""
        The user said: "{message}"
        Current discussion stage: {current_stage}
        Current plan: {json.dumps(plan)}
        Previous concerns: {concerns}
        
        Please:
        1. Respond to their message thoughtfully
        2. Identify any new concerns or preferences they've shared
        3. Suggest plan modifications if needed
        4. Determine the next appropriate discussion stage
        5. Extract any additional relevant information about their lifestyle or preferences
        
        Be empathetic, practical, and solution-focused. If they express concerns, acknowledge them and offer alternatives.
        """

        # Add the user's message and analysis request to the thread
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=f"User's response: {message}\n\n{analysis_prompt}"
        )

        # Use a simpler approach with chat completion for now
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": f"""You are a supportive health coach discussing a personalized plan. 
                Current stage: {current_stage}
                User's plan: {json.dumps(plan)}
                Previous concerns: {concerns}
                
                Respond to the user's message and guide the conversation naturally. Be supportive and adaptive."""},
                {"role": "user", "content": message}
            ],
            max_tokens=300,
            temperature=0.7
        )

        ai_response = response.choices[0].message.content

        # Simple logic to determine next stage and extract concerns
        new_concerns = []
        next_stage = current_stage
        plan_modifications = []
        updated_plan = plan

        # Basic keyword detection for concerns and stage progression
        concern_keywords = ['worried', 'concern', 'difficult', 'hard', 'problem', 'can\'t', 'unable', 'challenge']
        positive_keywords = ['good', 'great', 'like', 'works', 'fine', 'ready', 'sounds good']

        message_lower = message.lower()
        
        if any(word in message_lower for word in concern_keywords):
            if current_stage == 'exploration':
                next_stage = 'concerns'
            new_concerns.append(message)
        elif any(word in message_lower for word in positive_keywords):
            if current_stage == 'concerns':
                next_stage = 'refinement'
            elif current_stage == 'refinement':
                next_stage = 'finalization'

        # Extract additional info (simplified)
        additional_extracted = {}
        if 'time' in message_lower or 'schedule' in message_lower:
            additional_extracted['time_constraints'] = message
        if 'prefer' in message_lower:
            additional_extracted['preferences'] = message

        return jsonify({
            "message": ai_response,
            "stage": next_stage,
            "concerns": new_concerns,
            "additional_info": additional_extracted,
            "plan_modifications": plan_modifications,
            "updated_plan": updated_plan
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/finalize-plan-discussion', methods=['POST'])
def finalize_plan_discussion():
    """Finalize the plan discussion and prepare for implementation"""
    data = request.get_json() or {}
    thread_id = data.get('thread_id')
    final_plan = data.get('final_plan', {})
    user_id = data.get('user_id', 'testuser')

    try:
        # Store the finalized plan
        # You can add logic here to save the plan to a database or user profile
        
        # Generate a motivational closing message
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a supportive health coach concluding a plan discussion. Be encouraging and provide clear next steps."},
                {"role": "user", "content": f"Please provide an encouraging conclusion for this finalized plan: {json.dumps(final_plan)}. Include next steps and motivation."}
            ],
            max_tokens=200,
            temperature=0.7
        )

        closing_message = response.choices[0].message.content

        return jsonify({
            "message": closing_message,
            "final_plan": final_plan,
            "status": "completed"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


print("Registered routes:")
print(app.url_map)
if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)
    
    
