import json
import urllib.request
import urllib.error
import os
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        pass

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        api_key = os.environ.get("GEMINI_API_KEY", "")

        if not api_key:
            self._respond(500, {"error": "GEMINI_API_KEY no configurada en Vercel."})
            return

        length = int(self.headers.get("Content-Length", 0))
        body_raw = self.rfile.read(length)

        try:
            # Parse incoming request (Anthropic format from frontend)
            incoming = json.loads(body_raw)

            # Build Gemini request format
            contents = []

            # Add system prompt as first user message (Gemini doesn't have system role)
            system = incoming.get("system", "")
            messages = incoming.get("messages", [])

            # Combine system + first user message, or send system alone
            gemini_messages = []
            for i, msg in enumerate(messages):
                role = "user" if msg["role"] == "user" else "model"
                text = msg["content"]

                # Prepend system prompt to the first user message
                if i == 0 and system:
                    text = system + "\n\n---\n\n" + text

                gemini_messages.append({
                    "role": role,
                    "parts": [{"text": text}]
                })

            gemini_body = json.dumps({
                "contents": gemini_messages,
                "generationConfig": {
                    "maxOutputTokens": incoming.get("max_tokens", 1024),
                    "temperature": 0.3
                }
            }).encode()

            model = "gemini-1.5-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

            req = urllib.request.Request(
                url,
                data=gemini_body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )

            with urllib.request.urlopen(req, timeout=60) as resp:
                gemini_data = json.loads(resp.read())

            # Convert Gemini response → Anthropic-compatible format
            text_out = gemini_data["candidates"][0]["content"]["parts"][0]["text"]
            anthropic_format = {
                "content": [{"type": "text", "text": text_out}]
            }
            self._respond(200, anthropic_format)

        except urllib.error.HTTPError as e:
            err_body = e.read()
            try:
                err_json = json.loads(err_body)
                self._respond(e.code, {"error": err_json.get("error", {}).get("message", str(err_body))})
            except Exception:
                self._respond(e.code, {"error": err_body.decode(errors="replace")})
        except Exception as ex:
            self._respond(500, {"error": str(ex)})

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _respond(self, code, data):
        payload = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(payload)
