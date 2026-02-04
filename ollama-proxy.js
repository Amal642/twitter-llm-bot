import http from "http";

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(404);
    return res.end();
  }

  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", async () => {
    try {
      const { prompt } = JSON.parse(body);

      const r = await fetch("http://127.0.0.1:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2:latest",
          messages: [{ role: "user", content: prompt }],
          stream: false
        })
      });

      const data = await r.json();
      const text = data?.message?.content;

      if (!text) throw new Error("Empty LLM response");

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ response: text }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(3333, () => {
  console.log("✅ Ollama proxy running on http://127.0.0.1:3333");
});
