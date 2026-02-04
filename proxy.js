import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

app.post("/llm", async (req, res) => {
  try {
    const r = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2:latest",
        messages: [{ role: "user", content: req.body.prompt }],
        stream: false
      })
    });

    const data = await r.json();
    res.json({ response: data.message.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3333, () => {
  console.log("✅ Ollama proxy running on http://127.0.0.1:3333");
});
