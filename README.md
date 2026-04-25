# AtomChat Soporte AI

Chatbot interno de soporte para el equipo de AtomChat.
Consulta una base de conocimiento de + 260 casos reales y responde con causa probable y pasos de diagnóstico.

---

## Estructura del proyecto

```
atomchat-kb/
├── api/
│   └── chat.py              ← Función serverless (proxy seguro a Anthropic)
├── atomchat-kb/
│   ├── requerimientos.txt   ← Dependencias Python (vacío, solo stdlib)
│   └── versel.json          ← Configuración de rutas para Vercel
├── img/
│   └── logo.ico             ← icono de Atom
├── public/
│   ├── index.html           ← Estructura HTML del chatbot
│   ├── img/
│   │   ├── atom-logo.png    ← imagen de Atom
│   |   └── atom-logo.svg    ← imagen de Atom
│   ├── css/
│   │   └── styles.css       ← Todos los estilos visuales
│   └── js/
│       ├── chat.js          ← Convierte respuestas JSON en tarjetas visuales
│       └── renderer.js      ← Lógica del chat, llamadas API y eventos UI
├── pyproject.toml           ← Dependencias Python (vacío, solo stdlib)
├── pyhton-version           ← versión de python 3.12
├── vercel.json              ← Configuración de rutas para Vercel
├── requirements.txt         ← Dependencias Python (vacío, solo stdlib)
└── .gitignore
```

---

## Deploy en Vercel

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/atomchat-kb.git
git push -u origin main
```

### 2. Importar en Vercel

1. Ve a https://vercel.com → **New Project**
2. Importa el repositorio de GitHub
3. En **Environment Variables** agrega:
   - `ANTHROPIC_API_KEY` = `sk-ant-api03-...`
4. Haz clic en **Deploy**

### 3. Cada actualización

```bash
git add .
git commit -m "Actualizar KB"
git push
```
Vercel hace el redeploy automáticamente.

---

## Actualizar la base de conocimiento

La base de conocimiento vive en `api/chat.py/fetch_notion_kb`.

Para actualizarla se debe hacer desde la BD de notion no es necesario hacer un deploy adicional.

---

## Desarrollo local

Instala [Vercel CLI](https://vercel.com/docs/cli):

```bash
npm install -g vercel
```

Luego, en la carpeta del proyecto:

```bash
export modelousado= APIKEY-...   # Mac/Linux
# set modelousado= APIKEY-...    # Windows CMD

vercel dev
```

Abre http://localhost:3000

---

## Tecnologías

- **Frontend:** HTML, CSS, JavaScript vanilla (sin frameworks)
- **Backend:** Python 3 serverless (Vercel Functions)
- **AI:** Gemini gemini-3-flash-preview via Gemini API
