# Local Setup Troubleshooting Guide

## Step-by-Step Setup

### 1. Prerequisites Check
```bash
# Check if Node.js is installed
node --version
npm --version

# Check if Python is installed
python3 --version
pip3 --version
```

### 2. Install Frontend Dependencies
```bash
# In the project root directory
npm install
```

### 3. Setup Python Backend
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### 4. Start Both Servers

**Terminal 1 - Frontend:**
```bash
npm run dev
```
*Should start on http://localhost:5173*

**Terminal 2 - Backend:**
```bash
# Activate virtual environment first
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Navigate to backend
cd src/backend

# Start Flask server
python main.py
```
*Should start on http://localhost:5000*

## Common Issues & Solutions

### Issue 1: "vite: not found"
**Solution:** Run `npm install` in the project root

### Issue 2: "python3: command not found"
**Solution:** Install Python 3.8+ from python.org

### Issue 3: "pip install fails"
**Solution:** Make sure virtual environment is activated

### Issue 4: "OpenAI API Error"
**Solution:** Set your OpenAI API key:
```bash
export OPENAI_API_KEY="your-key-here"
```

### Issue 5: "Port already in use"
**Solution:** Kill existing processes:
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

## Troubleshooting Commands

Check what's running on ports:
```bash
lsof -i :5173
lsof -i :5000
```

Check for errors in browser console:
1. Open http://localhost:5173
2. Press F12 (Developer Tools)
3. Go to Console tab
4. Look for red error messages

## Need Help?
Run these commands and share the output:
```bash
npm --version
python3 --version
npm run dev 2>&1 | head -10
```