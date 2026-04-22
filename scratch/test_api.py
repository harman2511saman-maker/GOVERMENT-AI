import requests
import json

url = "http://localhost:8000/api/chat"
payload = {
    "message": "کوردستان چییە؟",

    "session_id": "test-session-123",
    "user_id": "test-user-456"
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, data=json.dumps(payload), headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"Error: {e}")
