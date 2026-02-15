# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 2: Setup Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your credentials
# Get credentials from: https://developers.facebook.com/
```

### Step 3: Run the Bot

```bash
python app.py
```

The bot will start on `http://localhost:5000`

### Step 4: Test Locally

```bash
# Send a test message
python scripts/send_test_message.py --message "Hello Bot"
```

## 🔧 Customize Your Bot

### 1. Add Custom Commands

Edit `conversation_engine.py`:

```python
def handle_incoming(self, user_id: str, message: str) -> str:
    normalized = (message or "").strip().lower()
    session = self.sessions.setdefault(user_id, ConversationState())

    # Add your custom command
    if normalized == "weather":
        return "The weather is sunny! ☀️"
    
    # Add more commands here
    
    return f"You said: {message}"
```

### 2. Modify Built-in Responses

Edit the `RESPONSES` dictionary at the top of `conversation_engine.py`:

```python
RESPONSES = {
    "welcome": "Welcome to MyBot!",
    "help": "Here's what I can do...",
    # Add more messages
}
```

### 3. Add Conversation States

Edit `models.py`:

```python
@dataclass
class ConversationState:
    state: str = "START"
    language: str = "en"
    context: Dict[str, Any] = field(default_factory=dict)
    # Add custom fields
    user_name: str = ""
```

Then use in `conversation_engine.py`:

```python
if session.state == "ASK_NAME":
    session.context["name"] = message
    session.state = "ASK_AGE"
    return "Thanks! What's your age?"
```

## 🌐 Deploy to Production

### Option 1: Render

1. Push code to GitHub
2. Go to [Render.com](https://render.com)
3. Create new Web Service
4. Connect your repository
5. Add environment variables
6. Deploy!

### Option 2: Heroku

```bash
# Install Heroku CLI
heroku create your-bot-name
heroku config:set APP_ID=your_app_id
heroku config:set ACCESS_TOKEN=your_token
# ... set other environment variables
git push heroku main
```

### Setup Webhook

1. Get your deployment URL (e.g., `https://your-bot.onrender.com`)
2. Go to [Meta Developer Portal](https://developers.facebook.com/)
3. Navigate to WhatsApp > Configuration
4. Set Callback URL: `https://your-bot.onrender.com/webhook`
5. Set Verify Token: (same as your `VERIFY_TOKEN` in `.env`)
6. Subscribe to `messages` webhook field
7. Click "Verify and Save"

## 📚 Learn More

- Full documentation: See [README.md](README.md)
- Architecture: See [ARCHITECTURE.txt](ARCHITECTURE.txt)
- WhatsApp API Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

## 💡 Common Patterns

### Multi-step Forms

```python
# Ask for name
if session.state == "START":
    session.state = "ASK_NAME"
    return "What's your name?"

# Save name, ask for age
if session.state == "ASK_NAME":
    session.context["name"] = message
    session.state = "ASK_AGE"
    return "Thanks! What's your age?"

# Process complete form
if session.state == "ASK_AGE":
    name = session.context["name"]
    age = message
    session.reset()
    return f"Nice to meet you {name}, age {age}!"
```

### Menu Navigation

```python
if message == "menu":
    return (
        "📋 Main Menu:\n\n"
        "1️⃣ Option 1\n"
        "2️⃣ Option 2\n"
        "3️⃣ Option 3"
    )

if message == "1":
    return "You selected Option 1"

if message == "2":
    return "You selected Option 2"
```

### API Integration

```python
# In services/weather_service.py
import requests

class WeatherService:
    def get_weather(self, city: str) -> str:
        response = requests.get(f"https://api.weather.com/{city}")
        data = response.json()
        return f"Weather in {city}: {data['temp']}°C"

# In conversation_engine.py
from services.weather_service import WeatherService

def __post_init__(self):
    self.weather = WeatherService()

def handle_incoming(self, user_id: str, message: str) -> str:
    if message.startswith("weather"):
        city = message.replace("weather", "").strip()
        return self.weather.get_weather(city)
```

## 🎯 Next Steps

1. ✅ Customize conversation flow
2. ✅ Add your business logic
3. ✅ Test with test script
4. ✅ Deploy to production
5. ✅ Setup webhook
6. ✅ Test with real WhatsApp messages!

Happy bot building! 🚀
