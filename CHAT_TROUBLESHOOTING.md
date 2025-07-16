# Health Chat Troubleshooting Guide

## Issue: "Error connecting" bubbles instead of AI responses

### Quick Diagnostic Steps

**1. Check Backend Health:**
```bash
curl http://localhost:5000/health
```
*Expected: JSON response with `"status": "healthy"`*

**2. Check OpenAI API Key:**
```bash
echo $OPENAI_API_KEY
```
*Should show your OpenAI API key (starts with `sk-`)*

**3. Test Chat Endpoint:**
```bash
curl -X POST http://localhost:5000/generate-line \
  -H "Content-Type: application/json" \
  -d '{"user_id": "testuser", "message": "Hello", "thread_id": null}'
```

**4. Check Browser Console:**
1. Open http://localhost:5173
2. Press F12 → Console tab
3. Try sending a chat message
4. Look for red error messages

### Common Issues & Solutions

#### Issue 1: OpenAI API Key Not Set
**Symptoms:** Backend shows `"openai_available": false`

**Solution:**
```bash
# Set your OpenAI API key
export OPENAI_API_KEY="sk-your-key-here"

# Restart backend
cd src/backend
python main.py
```

#### Issue 2: Backend Endpoints Not Working
**Symptoms:** 404 errors in browser console

**Solution:** Make sure backend is running on port 5000:
```bash
lsof -i :5000
```

#### Issue 3: CORS Issues
**Symptoms:** Browser console shows CORS errors

**Solution:** Backend should allow `localhost:5173` - already configured in code.

#### Issue 4: SSE Stream Connection Issues
**Symptoms:** EventSource errors in console

**Check:** Stream endpoint health:
```bash
curl -N http://localhost:5000/stream/testuser
```
*This might hang - that's the problem we identified!*

### Manual Test Sequence

Run these commands in order and share results:

1. **Backend Health:**
   ```bash
   curl -s http://localhost:5000/health | python3 -m json.tool
   ```

2. **Generate Line Test:**
   ```bash
   curl -X POST http://localhost:5000/generate-line \
     -H "Content-Type: application/json" \
     -d '{"user_id": "testuser", "message": "test", "thread_id": null}' \
     -w "\nHTTP Status: %{http_code}\n"
   ```

3. **Check Browser Network Tab:**
   - Open DevTools → Network tab
   - Send a chat message
   - Look for failed requests (red entries)
   - Check response codes and error messages

### Quick Fix for SSE Issues

If the stream is causing problems, you can temporarily disable it:

1. Edit `src/ChatInterface.jsx`
2. Comment out the SSE useEffect (lines ~58-75)
3. The chat will work via polling instead

### What to Share for Help

If still having issues, please share:
- Output of `curl http://localhost:5000/health`
- Browser console errors (screenshot or copy-paste)
- Network tab showing failed requests
- Your operating system