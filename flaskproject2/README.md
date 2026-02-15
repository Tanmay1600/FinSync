# WhatsApp Bot Template

A clean, production-ready Flask template for building WhatsApp bots using the WhatsApp Cloud API.

## Features

- ✅ WhatsApp Cloud API integration
- ✅ Webhook verification and message handling
- ✅ Conversational state management
- ✅ Natural typing delays for human-like responses
- ✅ Read receipts (blue ticks) support
- ✅ Interaction capture pipeline (Cloudinary + CRM API)
- ✅ Environment-based configuration
- ✅ Mock mode for local testing without credentials

## Quick Start

### 1. Clone and Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env .env.local
```

### 2. Configure Credentials

Edit `.env` with your WhatsApp Cloud API credentials from [Meta Developer Portal](https://developers.facebook.com/):

```env
APP_ID=your_app_id
APP_SECRET=your_app_secret
ACCESS_TOKEN=your_access_token
PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
TEST_NUMBER=+1234567890
VERIFY_TOKEN=your_custom_verify_token
```

### 3. Run the Bot

```bash
python app.py
```

The server will start on `http://localhost:5000`

### 4. Test Locally

Send a test message:

```bash
python scripts/send_test_message.py --message "Hello Bot"
```

## Project Structure

```
├── app.py                    # Flask application entry point
├── webhook.py                # WhatsApp webhook handlers
├── conversation_engine.py    # Main conversation logic + canned responses
├── conversation.py           # Backward compatibility module
├── models.py                 # Data models (conversation state)
├── config.py                 # Configuration management
├── whatsapp_client.py        # WhatsApp API client
├── services/                 # External API integrations
│   └── __init__.py
└── scripts/
    └── send_test_message.py  # Testing utility
```

## Customization Guide

### 1. Modify Conversation Logic

Edit `conversation_engine.py`:

```python
def handle_incoming(self, user_id: str, message: str) -> str:
    # Add your custom logic here
    if message.lower() == "help":
        return "Here's how I can help you..."
    
    # Add more commands
    return "Thank you for your message!"
```

### 2. Customize Canned Responses

Edit the `RESPONSES` dictionary at the top of `conversation_engine.py`:

```python
RESPONSES = {
    "welcome": "Welcome to my bot!",
    "greeting": "Hey there!",
    "interaction_created": "Saved! (Ref: {reference})",
    # Add or adjust keys as needed
}
```

### 3. Integrate External APIs

Create service classes in `services/`:

```python
# services/my_service.py
class MyService:
    def __init__(self, api_url: str):
        self.api_url = api_url
    
    def fetch_data(self):
        # Your API logic
        pass
```

### 4. Add Conversation States

Extend `ConversationState` in `models.py`:

```python
@dataclass
class ConversationState:
    state: str = "IDLE"
    language: str = "en"
    context: Dict[str, Any] = field(default_factory=dict)
    # Add your custom fields
    user_name: str = ""
    user_age: int = 0
```

## Deployment

### Using Render/Heroku

1. Push your code to GitHub
2. Connect your repository to your deployment platform
3. Set environment variables in platform settings
4. Deploy!

### Webhook Configuration

1. Get your public URL (e.g., `https://your-app.com`)
2. In Meta Developer Portal, set webhook URL to: `https://your-app.com/webhook`
3. Set verify token to match your `VERIFY_TOKEN` in `.env`
4. Subscribe to `messages` webhook field

## Testing

### Mock Mode

Without credentials, the bot runs in mock mode and prints messages to console:

```python
python app.py
# Messages will print to console instead of sending via WhatsApp
```

### Send Test Messages

```bash
# Test with custom message
python scripts/send_test_message.py --message "Test message"

# Test with custom recipient
python scripts/send_test_message.py --to "+1234567890" --message "Hello"
```

## API Reference

### Conversation Engine

**`handle_incoming(user_id: str, message: str) -> str`**
- Main message handler
- Manages state per user
- Returns response text

### WhatsApp Client

**`send_text_message(to: str, body: str) -> Dict`**
- Send text message
- Returns API response

**`mark_as_read(message_id: str) -> Dict`**
- Mark message as read (blue ticks)
- Returns API response

## Common Use Cases

### 1. Multi-step Forms

```python
def handle_incoming(self, user_id: str, message: str) -> str:
    session = self.sessions.setdefault(user_id, ConversationState())
    
    if session.state == "ASK_NAME":
        session.context["name"] = message
        session.state = "ASK_AGE"
        return "Thanks! What's your age?"
    
    if session.state == "ASK_AGE":
        session.context["age"] = message
        return f"Got it! Name: {session.context['name']}, Age: {message}"
```

### 2. Menu-based Navigation

```python
if message == "1":
    return "You selected option 1"
elif message == "2":
    return "You selected option 2"
else:
    return "Please select 1 or 2"
```

### 3. External API Integration

```python
from services import MyService

def __post_init__(self):
    self.my_service = MyService(api_url="https://api.example.com")

def handle_incoming(self, user_id: str, message: str) -> str:
    data = self.my_service.fetch_data()
    return f"Result: {data}"
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `APP_ID` | WhatsApp App ID | Yes |
| `APP_SECRET` | WhatsApp App Secret | Yes |
| `ACCESS_TOKEN` | WhatsApp Access Token | Yes |
| `PHONE_NUMBER_ID` | WhatsApp Phone Number ID | Yes |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Business Account ID | Yes |
| `TEST_NUMBER` | Test recipient number | No |
| `VERIFY_TOKEN` | Webhook verify token | Yes |
| `BACKEND_BASE_URL` | Your backend API URL | No |

## Troubleshooting

### Webhook Verification Fails

- Check `VERIFY_TOKEN` matches in both `.env` and Meta Portal
- Ensure webhook URL is publicly accessible
- Check server logs for errors

### Messages Not Sending

- Verify `ACCESS_TOKEN` and `PHONE_NUMBER_ID` are correct
- Check phone number is registered in WhatsApp Business
- Review Meta API rate limits

### Local Testing Issues

- Use mock mode: messages print to console without credentials
- Test with `send_test_message.py` script
- Check Flask server logs

## Resources

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta Developer Portal](https://developers.facebook.com/)
- [Flask Documentation](https://flask.palletsprojects.com/)

## License

MIT License - feel free to use this template for your projects!

## Contributing

Contributions welcome! Feel free to open issues or submit pull requests.

---

**Built with ❤️ for WhatsApp bot developers**
