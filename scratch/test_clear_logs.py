import requests

url = "http://localhost:8000/api/logs/clear" # Wait, I forgot the /api/admin/ prefix
# Actually, I added it as @app.delete("/api/admin/logs/clear")

admin_token = "..." # I need to get a token or skip auth for test

def test_clear_logs():
    # This script is just for reference, I'll use a more direct way if possible or just check logs
    pass
