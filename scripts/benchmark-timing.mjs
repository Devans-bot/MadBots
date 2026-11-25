import fs from "fs";
import path from "path";

// Read .env
const envPath = path.join(process.cwd(), ".env");
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      env[key] = val;
    }
  }
}

const GROQ_API_KEY = env.GROQ_API_KEY;
const GROQ_MODEL = env.GROQ_MODEL || "openai/gpt-oss-120b";

const GEMINI_API_KEY = env.GEMINI_API_KEY_BHIMA || env.GEMINI_API_KEY;
const GEMINI_MODEL = env.GEMINI_MODEL_BHIMA || env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Load prompts
function loadPrompt(botDir) {
  const soulPath = path.join(process.cwd(), "src/bots", botDir, "soul.md");
  if (fs.existsSync(soulPath)) return fs.readFileSync(soulPath, "utf-8");
  return "You are an AI assistant.";
}

const macroChiefPrompt = loadPrompt("madrix-macros");
const bhimaCoachPrompt = loadPrompt("bhima-coach");

/**
 * Benchmark Groq API (Macro-Chief)
 */
async function callGroq(userText, model = GROQ_MODEL) {
  const start = performance.now();
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: macroChiefPrompt },
          { role: "user", content: userText },
        ],
        temperature: 0.6,
      }),
    });

    const elapsed = performance.now() - start;
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, elapsed, error: data.error?.message || `HTTP ${res.status}` };
    }
    const reply = data.choices?.[0]?.message?.content || "";
    const usage = data.usage;
    return { ok: true, elapsed, reply, usage, model };
  } catch (err) {
    return { ok: false, elapsed: performance.now() - start, error: err.message };
  }
}

/**
 * Benchmark Gemini API (Bhima Coach)
 */
async function callGemini(userText, model = GEMINI_MODEL) {
  const start = performance.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: bhimaCoachPrompt }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
        }),
      }
    );

    const elapsed = performance.now() - start;
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, elapsed, error: data.error?.message || `HTTP ${res.status}` };
    }
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const usage = data.usageMetadata;
    return { ok: true, elapsed, reply, usage, model };
  } catch (err) {
    return { ok: false, elapsed: performance.now() - start, error: err.message };
  }
}

async function runBenchmark() {
  console.log("==================================================================");
  console.log("⚡ CHAT RESPONSE TIMING BENCHMARK");
  console.log(`🤖 Groq (Macro-Chief) Model : ${GROQ_MODEL}`);
  console.log(`🤖 Gemini (Bhima Coach) Model: ${GEMINI_MODEL}`);
  console.log("==================================================================\n");

  const testQueries = [
    {
      label: "Round 1: Quick Query",
      groqQuery: "What are the exact macros for 2 boiled eggs and 1 slice of brown bread?",
      geminiQuery: "What are 3 quick tips for squat depth and knee alignment?",
    },
    {
      label: "Round 2: Mid-Length Query",
      groqQuery: "Plan a 150g protein vegetarian meal day in 4 meals with exact calories.",
      geminiQuery: "Give me an effective 45-minute dumbbell-only upper body workout routine.",
    },
    {
      label: "Round 3: Direct Analysis",
      groqQuery: "Can I eat a Whopper burger on a cut? Analyze the nutritional trade-offs.",
      geminiQuery: "How many sets per muscle group per week should I do for optimal hypertrophy?",
    },
  ];

  const results = [];

  for (const t of testQueries) {
    console.log(`\n▶ [${t.label}]`);

    // Run Groq
    process.stdout.write(`  ⏳ Calling Groq (Macro-Chief)... `);
    const groqRes = await callGroq(t.groqQuery);
    if (groqRes.ok) {
      console.log(`✅ ${groqRes.elapsed.toFixed(0)} ms (${(groqRes.elapsed / 1000).toFixed(2)}s)`);
    } else {
      console.log(`❌ ${groqRes.elapsed.toFixed(0)} ms - Error: ${groqRes.error}`);
    }

    // Run Gemini
    process.stdout.write(`  ⏳ Calling Gemini (Bhima Coach)... `);
    const geminiRes = await callGemini(t.geminiQuery);
    if (geminiRes.ok) {
      console.log(`✅ ${geminiRes.elapsed.toFixed(0)} ms (${(geminiRes.elapsed / 1000).toFixed(2)}s)`);
    } else {
      console.log(`❌ ${geminiRes.elapsed.toFixed(0)} ms - Error: ${geminiRes.error}`);
    }

    results.push({
      round: t.label,
      groq: groqRes,
      gemini: geminiRes,
    });
  }

  console.log("\n==================================================================");
  console.log("📊 SUMMARY TABLE");
  console.log("==================================================================");
  console.log(JSON.stringify(
    results.map((r) => ({
      Round: r.round,
      "Groq (Macro-Chief)": r.groq.ok ? `${r.groq.elapsed.toFixed(0)} ms` : "FAILED",
      "Gemini (Bhima Coach)": r.gemini.ok ? `${r.gemini.elapsed.toFixed(0)} ms` : "FAILED",
      "Faster By": r.groq.ok && r.gemini.ok
        ? r.groq.elapsed < r.gemini.elapsed
          ? `Groq is ${(r.gemini.elapsed - r.groq.elapsed).toFixed(0)} ms faster (${(r.gemini.elapsed / r.groq.elapsed).toFixed(1)}x)`
          : `Gemini is ${(r.groq.elapsed - r.gemini.elapsed).toFixed(0)} ms faster (${(r.groq.elapsed / r.gemini.elapsed).toFixed(1)}x)`
        : "N/A",
    })),
    null,
    2
  ));
}

runBenchmark();
