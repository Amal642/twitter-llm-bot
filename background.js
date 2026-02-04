/**IF YOU ARE USING OPENAI API KEY**/

// // const API_KEY = "sk-xxxxx"
// // chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

// //   if (msg.type === "LLM_REQUEST") {
// //     fetch("https://api.openai.com/v1/chat/completions", {
// //       method: "POST",
// //       headers: {
// //         "Content-Type": "application/json",
// //         "Authorization": `Bearer ${API_KEY}`
// //       },
// //       body: JSON.stringify({
// //         model: "gpt-4o-mini", // or gpt-3.5-turbo, etc
// //         messages: [
// //           { role: "user", content: msg.prompt }
// //         ],
// //         temperature: 0.3
// //       })
// //     })
// //       .then(res => res.json())
// //       .then(data => {
// //         const text = data.choices?.[0]?.message?.content;
// //         if (!text) {
// //           sendResponse({ success: false, error: "Empty response" });
// //           return;
// //         }
// //         sendResponse({ success: true, response: text });
// //       })
// //       .catch(err => {
// //         sendResponse({ success: false, error: err.toString() });
// //       });

// //     return true; // keep worker alive
// //   }
// // });

/*  IF USING OLLAMA  */
console.log("🤖 BG | Ollama worker loaded");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "LLM_REQUEST") return;

  const prompt = msg.prompt; // ✅ THIS WAS MISSING

  console.log("🤖 BG | Sending prompt to Ollama proxy");

  fetch("http://127.0.0.1:3333", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.response) {
        console.error("🤖 BG | Empty proxy response", data);
        sendResponse({ success: false, error: "Empty proxy response" });
        return;
      }

      console.log("🤖 BG | Proxy responded successfully");
      sendResponse({
        success: true,
        response: data.response
      });
    })
    .catch(err => {
      console.error("🤖 BG | Proxy fetch error:", err.message);
      sendResponse({
        success: false,
        error: err.message
      });
    });

  return true; // 🔒 KEEP SERVICE WORKER ALIVE
});


