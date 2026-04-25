import json
import urllib.request
import urllib.error
import os
from http.server import BaseHTTPRequestHandler


def fetch_notion_kb():
    """Fetches all active cases from Notion database and formats them as KB text."""
    token = os.environ.get("NOTION_TOKEN", "")
    db_id = os.environ.get("NOTION_DATABASE_ID", "")

    if not token or not db_id:
        return None, "NOTION_TOKEN o NOTION_DATABASE_ID no configuradas en Vercel."

    url = f"https://api.notion.com/v1/databases/{db_id}/query"
    payload = json.dumps({
        "filter": {
            "property": "Activo",
            "checkbox": {"equals": True}
        },
        "page_size": 100
    }).encode()

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())

    cases = []
    for page in data.get("results", []):
        props = page.get("properties", {})

        def get_text(prop_name):
            prop = props.get(prop_name, {})
            ptype = prop.get("type", "")
            if ptype == "title":
                parts = prop.get("title", [])
            elif ptype == "rich_text":
                parts = prop.get("rich_text", [])
            else:
                return ""
            return "".join(p.get("plain_text", "") for p in parts).strip()

        def get_select(prop_name):
            prop = props.get(prop_name, {})
            sel = prop.get("select")
            return sel.get("name", "") if sel else ""

        def get_number(prop_name):
            prop = props.get(prop_name, {})
            return prop.get("number", "")

        case_id   = get_number("ID")
        sintomas  = get_text("Síntomas")
        categoria = get_select("Categoría")
        causa     = get_text("Causa")
        solucion  = get_text("Solución")

        if sintomas:
            cases.append(
                f"[#{case_id} | {categoria}]\n"
                f"Sintomas: {sintomas}\n"
                f"Causa: {causa}\n"
                f"Solucion: {solucion}"
            )

    return "\n---\n".join(cases), None


def build_system_prompt(kb_text):
    return "\n".join([
        "Eres un asistente de soporte interno para AtomChat.",
        "Ayudas a agentes NUEVOS a entender y resolver casos usando la base de conocimiento.",
        "",
        "BASE DE CONOCIMIENTO:",
        kb_text,
        "",
        "FORMATO DE RESPUESTA OBLIGATORIO:",
        "Responde SIEMPRE en este JSON exacto (sin markdown, sin texto fuera del JSON):",
        "{",
        '  "categoria": "nombre exacto de la categoria",',
        '  "sintomas": ["sintoma detectado 1", "sintoma detectado 2"],',
        '  "causa": "explicacion clara en 1-3 oraciones",',
        '  "pasos": ["paso 1 concreto", "paso 2", "paso 3"],',
        '  "followup": "pregunta corta de seguimiento",',
        '  "emoji_causa": "un emoji representativo",',
        '  "sin_resultado": false',
        "}",
        "",
        "Si no hay info relevante usa sin_resultado:true y en causa explica que no encontraste info.",
        "Los pasos deben ser concretos con rutas de menus si aplica.",
        "Usa emojis en los pasos para hacerlos mas visuales.",
        "CRITICO: Tu respuesta debe comenzar con { y terminar con }.",
        "NO uses bloques de codigo, NO uses ```json, NO uses ``` de ningun tipo.",
        "NO escribas texto antes ni despues del JSON.",
        "SOLO el objeto JSON puro. Si no lo haces, la respuesta fallara.",
    ])


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
        body = json.loads(self.rfile.read(length))

        # Fetch KB from Notion
        try:
            kb_text, err = fetch_notion_kb()
            if err:
                self._respond(500, {"error": f"Error al leer Notion: {err}"})
                return
        except Exception as ex:
            self._respond(500, {"error": f"Error al conectar con Notion: {str(ex)}"})
            return

        system_prompt = build_system_prompt(kb_text)
        messages      = body.get("messages", [])

        # Build Gemini request — inject system into first user message
        gemini_messages = []
        for i, msg in enumerate(messages):
            role = "user" if msg["role"] == "user" else "model"
            text = msg["content"]
            if i == 0:
                text = system_prompt + "\n\n---\n\n" + text
            gemini_messages.append({
                "role": role,
                "parts": [{"text": text}]
            })

        gemini_body = json.dumps({
            "contents": gemini_messages,
            "generationConfig": {
                "maxOutputTokens": body.get("max_tokens", 1024),
                "temperature": 0.3
            }
        }).encode()

        model = "gemini-3-flash-preview"
        url   = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        try:
            req = urllib.request.Request(
                url,
                data=gemini_body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                gemini_data = json.loads(resp.read())

            text_out = gemini_data["candidates"][0]["content"]["parts"][0]["text"]
            self._respond(200, {
                "content": [{"type": "text", "text": text_out}]
            })

        except urllib.error.HTTPError as e:
            err_body = e.read()
            try:
                err_json = json.loads(err_body)
                msg = err_json.get("error", {}).get("message", err_body.decode(errors="replace"))
            except Exception:
                msg = err_body.decode(errors="replace")
            self._respond(e.code, {"error": msg})
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
