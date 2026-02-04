/***********************
 * LOGGING
 ***********************/
const LOG_PREFIX = "🤖 BOT";

function log(msg) {
  console.log(`${LOG_PREFIX} | ${msg}`);
}

function warn(msg) {
  console.warn(`${LOG_PREFIX} | ${msg}`);
}

log("Content script loaded");

/***********************
 * HELPERS
 ***********************/
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function isEnabled() {
  return new Promise(resolve => {
    chrome.storage.local.get(["enabled"], data => {
      resolve(data.enabled === true);
    });
  });
}

/***********************
 * THREAD / AUTHOR
 ***********************/
function getThreadId() {
  const match = window.location.href.match(/status\/(\d+)/);
  if (!match) {
    warn("No thread ID found");
    return null;
  }
  log(`Thread ID: ${match[1]}`);
  return match[1];
}

function getThreadAuthor() {
  const article = document.querySelector("article");
  if (!article) {
    warn("No root article found");
    return null;
  }

  const links = article.querySelectorAll('a[href^="/"]');
  for (const link of links) {
    const href = link.getAttribute("href");
    if (!href || href.includes("/status/")) continue;

    const username = href.replace("/", "").trim();
    if (username) {
      log(`Author detected: ${username}`);
      return username;
    }
  }

  warn("Author not detected");
  return null;
}

function getRootTweet(author) {
  const article = document.querySelector("article");
  if (!article) return null;

  return article.querySelector(`a[href="/${author}"]`)
    ? article
    : null;
}

/***********************
 * MEMORY / LIMITS
 ***********************/
const MIN_COOLDOWN_MS = 10*60*1000;
const DAILY_LIMIT = 5;

function hasRepliedToThread(threadId) {
  return new Promise(resolve => {
    chrome.storage.local.get(["repliedThreads"], data => {
      resolve(!!data.repliedThreads?.[threadId]);
    });
  });
}

function markThreadAsReplied(threadId) {
  chrome.storage.local.get(["repliedThreads"], data => {
    const replied = data.repliedThreads || {};
    replied[threadId] = Date.now();
    chrome.storage.local.set({ repliedThreads: replied });
  });
}

function canReplyNow() {
  return new Promise(resolve => {
    chrome.storage.local.get(["lastReplyTime"], data => {
      resolve(Date.now() - (data.lastReplyTime || 0) > MIN_COOLDOWN_MS);
    });
  });
}

function updateLastReplyTime() {
  chrome.storage.local.set({ lastReplyTime: Date.now() });
}

function canReplyToday() {
  return new Promise(resolve => {
    chrome.storage.local.get(["dailyCount", "dailyDate"], data => {
      const today = new Date().toDateString();

      if (data.dailyDate !== today) {
        chrome.storage.local.set({ dailyDate: today, dailyCount: 0 });
        resolve(true);
        return;
      }

      resolve((data.dailyCount || 0) < DAILY_LIMIT);
    });
  });
}

function incrementDailyCount() {
  chrome.storage.local.get(["dailyCount"], data => {
    chrome.storage.local.set({
      dailyCount: (data.dailyCount || 0) + 1
    });
  });
}

/***********************
 * TOPIC FILTERING
 ***********************/
const TOPIC_KEYWORDS = [
  //add topic keywords here
];

const BLOCK_KEYWORDS = [
  //add topics to be blocked here
];

function keywordGate(text) {
  const t = text.toLowerCase();

  if (BLOCK_KEYWORDS.some(k => t.includes(k))) {
    warn("Blocked keyword detected");
    return false;
  }

  const pass = TOPIC_KEYWORDS.some(k => t.includes(k));
  log(`Keyword gate: ${pass ? "PASS" : "FAIL"}`);
  return pass;
}

/***********************
 * LLM (API VIA BACKGROUND)
 ***********************/
// async function askLLM(prompt, retry = true) {
//   log("Sending prompt to LLM");

//   return new Promise(resolve => {
//     chrome.runtime.sendMessage(
//       {
//         type: "LLM_REQUEST",
//         prompt
//       },
//       async response => {
//         if (chrome.runtime.lastError) {
//           warn(`LLM runtime error: ${chrome.runtime.lastError.message}`);
//           resolve(null);
//           return;
//         }

//         if (!response || !response.success || !response.response) {
//           warn("LLM returned empty/failed response");

//           if (retry) {
//             warn("Retrying LLM once...");
//             await sleep(800);
//             resolve(await askLLM(prompt, false));
//             return;
//           }

//           resolve(null);
//           return;
//         }

//         log("LLM response received");
//         resolve(response.response.trim());
//       }
//     );
//   });
// }

//LLM using ollama
async function askLLM(prompt, retry = true) {
  log("Sending prompt to LLM (llama3)");

  return new Promise(resolve => {
    let finished = false;

    // ⏱ HARD TIMEOUT (10s)
    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      warn("LLM timeout — no response from background");
      resolve(null);
    }, 10000);

    chrome.runtime.sendMessage(
      {
        type: "LLM_REQUEST",
        model: "llama3.2:latest",//your model
        prompt
      },
      async response => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);

        if (chrome.runtime.lastError) {
          warn("LLM runtime error: " + chrome.runtime.lastError.message);
          resolve(null);
          return;
        }

        if (!response || !response.success || !response.response) {
          warn("LLM returned empty/failed response");
          resolve(null);
          return;
        }

        log("LLM response received");
        resolve(response.response.trim());
      }
    );
  });
}



/***********************
 * LLM TASKS
 ***********************/
async function isTradingTopic(text) {
  log("Running LLM topic classification");

  const ans = await askLLM(`
Is the following tweet about {whatever you want according to topic}
Answer ONLY with YES or NO.

Tweet:
"${text}"
`);

  if (!ans) return false;

  const ok = ans.toUpperCase().startsWith("YES");
  log(`LLM topic result: ${ok ? "YES" : "NO"}`);
  return ok;
}

async function generateReply(text) {
  log("Generating reply via LLM");

  const reply = await askLLM(`
You are a professional retail trader.

Write a short, neutral reply (max 2 sentences).
No financial advice.
No politics.
No questions.

Tweet:
"${text}"
`);

  if (!reply || reply.length < 5) {
    warn("Generated reply too short or empty");
    return null;
  }

  log(`Reply generated: "${reply}"`);
  return reply;
}

/***********************
 * POSTING
 ***********************/
async function humanType(el, text) {
  el.focus();

  // Create a DataTransfer (clipboard simulation)
  const data = new DataTransfer();
  data.setData("text/plain", text);

  const pasteEvent = new ClipboardEvent("paste", {
    bubbles: true,
    cancelable: true,
    clipboardData: data
  });

  el.dispatchEvent(pasteEvent);

  // Draft.js sometimes needs a tiny delay to update state
  await sleep(300);
}


async function replyToTweet(tweet, replyText) {
  log("Opening reply box");
  tweet.querySelector('[data-testid="reply"]').click();

  await sleep(1500);

  const modal = document.querySelector('[role="dialog"]');
  if (!modal) {
    warn("Reply modal not found");
    return;
  }

  const box = modal.querySelector(
    '[contenteditable="true"][data-testid^="tweetTextarea"]'
  );

  if (!box) {
    warn("Draft.js textbox not found");
    return;
  }

  log("Pasting reply text");
  await humanType(box, replyText);

  await sleep(600);

  const replyButton = modal.querySelector(
    '[data-testid="tweetButton"]:not([aria-disabled="true"])'
  );

  if (!replyButton) {
    warn("Reply button still disabled");
    return;
  }

  log("Posting reply");
  await sleep(300 + Math.random() * 500);

  replyButton.click();
}


/***********************
 * MAIN RUNNER
 ***********************/
(async () => {
  log("BOT STARTED");

  if (!(await isEnabled())) {
    warn("Bot disabled");
    return;
  }

  await sleep(4000);

  const threadId = getThreadId();
  if (!threadId) return;

  if (await hasRepliedToThread(threadId)) {
    warn("Already replied to this thread");
    return;
  }

  if (!(await canReplyNow())) {
    warn("Cooldown active");
    return;
  }

  if (!(await canReplyToday())) {
    warn("Daily limit reached");
    return;
  }

  const author = getThreadAuthor();
  if (!author) return;

  const rootTweet = getRootTweet(author);
  if (!rootTweet) {
    warn("Root tweet not found");
    return;
  }

  log("Root tweet read");

  const text = rootTweet.innerText;

  if (!keywordGate(text)) return;
  if (!(await isTradingTopic(text))) return;

  if (Math.random() > 0.6) {
    warn("Random skip triggered");
    return;
  }

  const reply = await generateReply(text);
  if (!reply) return;

  await replyToTweet(rootTweet, reply);

  markThreadAsReplied(threadId);
  updateLastReplyTime();
  incrementDailyCount();

  log("BOT FINISHED SUCCESSFULLY");
})();
