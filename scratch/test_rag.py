import requests
import json

url = "http://localhost:8000/api/chat"
data = {"message": "نرخی مۆڵەتی چەک بۆ یەکەمجار چەندە؟"}
response = requests.post(url, json=data)

print(f"Status Code: {response.status_code}")
print(f"Response: {response.json()}")
