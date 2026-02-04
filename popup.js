document.addEventListener("DOMContentLoaded", () => {
  const checkbox = document.getElementById("enabled");
  const statusEl = document.getElementById("llm-status");

  // Load enabled state
  chrome.storage.local.get(["enabled"], data => {
    checkbox.checked = data.enabled === true;
  });

  checkbox.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: checkbox.checked });
  });

  // Check LLM status
  chrome.runtime.sendMessage({ type: "OLLAMA_STATUS" }, res => {
    if (!res || !res.status) {
      statusEl.textContent = "❌ error";
      statusEl.style.color = "red";
      return;
    }

    if (res.status === "WARM") {
      statusEl.textContent = "✅ warm";
      statusEl.style.color = "green";
    } else if (res.status === "COLD") {
      statusEl.textContent = "⚠️ cold";
      statusEl.style.color = "orange";
    } else {
      statusEl.textContent = "❌ error";
      statusEl.style.color = "red";
    }
  });
});
