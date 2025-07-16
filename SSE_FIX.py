# Fixed SSE Stream Endpoint
# Replace the stream function in src/backend/main.py with this version

import time
import json
from flask import Response, stream_with_context, request

@app.route('/stream/<user_id>', methods=['GET'])
def stream(user_id):
    print(f"HIT /stream/{user_id}")
    
    def event_gen():
        timeout_count = 0
        max_timeout = 300  # 5 minutes timeout
        
        try:
            while timeout_count < max_timeout:
                queue = pending_messages.get(user_id, [])
                if queue:
                    for msg in queue:
                        yield f"data: {json.dumps(msg)}\n\n"
                    pending_messages[user_id].clear()
                    timeout_count = 0  # Reset timeout when we send data
                else:
                    # Send heartbeat to keep connection alive
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
                    timeout_count += 1
                
                time.sleep(1)
                
        except GeneratorExit:
            print(f"SSE connection closed for user {user_id}")
        except Exception as e:
            print(f"SSE error for user {user_id}: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Connection error'})}\n\n"

    # SSE headers
    headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    }
    return Response(stream_with_context(event_gen()), headers=headers)