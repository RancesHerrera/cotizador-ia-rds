import os
import json
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables (.env)
load_dotenv()

def verify_connection():
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    print(f"DEBUG: Using Base URL: {base_url}")
    print(f"DEBUG: Using Model: {model}")
    print(f"DEBUG: API Key present: {'Yes' if api_key else 'No'}")

    if not api_key:
        print("ERROR: OPENAI_API_KEY is missing in .env")
        return

    client = OpenAI(
        api_key=api_key,
        base_url=base_url
    )

    try:
        print("DEBUG: Sending test request to OpenRouter...")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": "Say 'OK' if you are working."}
            ],
            max_tokens=5
        )
        print(f"SUCCESS: Response from AI: {response.choices[0].message.content}")
    except Exception as e:
        print(f"ERROR: Failed to connect to OpenRouter: {e}")

if __name__ == "__main__":
    verify_connection()
