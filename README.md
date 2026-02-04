# 🤖 Twitter LLM Reply Bot (Local + OpenAI)

A Chrome / Brave extension that **automatically replies to selected threads on X (Twitter)** using a Large Language Model (LLM).

- 🧠 Uses **Ollama (local LLM)** via a lightweight proxy  
- ☁️ Optional **OpenAI fallback**
- 🛡️ Built with conservative anti-spam safeguards
- 🎯 Replies **only to threads matching a configurable topic**
- 🚫 Excludes sensitive or unwanted categories
- 🧩 Pure browser automation (no Twitter API)

---

## ✨ Features

- ✅ Detects the **thread author**
- ✅ Reads only the **root tweet** (not replies)
- ✅ Filters content by **{topic}**
- ✅ LLM-based topic classification
- ✅ Human-like reply posting
- ✅ Rate limiting & cooldowns
- ✅ Daily reply cap
- ✅ Memory of already-replied threads
- ✅ Random skips for natural behavior

---

## 🧠 Architecture

Chrome Content Script
↓
Chrome Background Service Worker (MV3)
↓
Local Node.js Proxy
↓
LLM (Ollama / OpenAI)


> ⚠️ A local proxy is required because Chrome MV3 service workers
> cannot reliably consume chunked HTTP responses from local LLM servers.


---

## 🚀 Setup Guide

### 1️⃣ Prerequisites

- Node.js **v18+**
- Ollama installed and running (optional but recommended)
- Chrome or Brave browser

If using Ollama:

```bash
ollama pull llama3.2
ollama run llama3.2
```
---

2️⃣ Start the Local LLM Proxy
cd proxy
node ollama-proxy.js


You should see:

✅ LLM proxy running on http://127.0.0.1:3333


Leave this terminal open.

-----------

3️⃣ Load the Chrome Extension

Open chrome://extensions

Enable Developer mode

Click Load unpacked

Select the extension/ folder

Reload the extension after any code change

4️⃣ Enable the Bot

Open X (Twitter)

Click the extension popup

Enable the bot

Open a single tweet thread

The bot will evaluate the thread and decide whether to reply

🛡️ Safety & Anti-Detection

The bot includes multiple safeguards to reduce automated behavior detection:

⏱️ Cooldown between replies

📆 Daily reply limits

🎲 Random skip probability

🧠 Topic classification via LLM

🧾 Memory of previously processed threads

Defaults are intentionally conservative.

⚙️ Configuration

Key configuration options live in content.js:

const DAILY_LIMIT = 5;
const MIN_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes


You can customize:

{topic} definition

Topic classification prompt

Blocked categories

Reply style and tone

Random skip probability

🔁 LLM Options
Local (Ollama)

Fully local

No API keys

Requires proxy due to Chrome MV3 limitations

Cloud (OpenAI)

Reliable and fast

Requires API key

Can be used as fallback

⚠️ Disclaimer

This project is for educational and experimental purposes only.

Automated interactions may violate platform terms

Use responsibly and at your own risk

Prefer secondary or test accounts

🧩 Future Improvements

Timeline auto-scanning

Multi-thread processing

Topic confidence scoring

Multiple personas

Streaming replies

Web dashboard

Dockerized proxy

📜 License

MIT — use responsibly.


---
