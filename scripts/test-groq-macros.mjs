import fs from "fs";
import path from "path";

// Read .env manually
const envPath = path.join(process.cwd(), ".env");
let apiKey = process.env.GROQ_API_KEY;

if (!apiKey && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^GROQ_API_KEY\s*=\s*(.*)$/);
    if (match) {
      apiKey = match[1].trim();
      break;
    }
  }
}

if (!apiKey) {
  console.error("GROQ_API_KEY not found in process.env or .env");
  process.exit(1);
}

const testModels = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

async function testModel(model) {
  console.log(`\nTesting Groq model: ${model}...`);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are Macro-Chief, an expert nutritionist and fitness diet assistant. Keep answers brief and punchy.",
          },
          {
            role: "user",
            content: "What are the macros for 100g oats and 300ml whole milk?",
          },
        ],
        temperature: 0.5,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.log(`❌ Failed (${res.status}):`, data.error?.message || JSON.stringify(data));
      return false;
    }

    console.log(`✅ Success! Response from ${model}:`);
    console.log("-----------------------------------------");
    console.log(data.choices?.[0]?.message?.content);
    console.log("-----------------------------------------");
    return true;
  } catch (err) {
    console.log(`❌ Network / Fetch error:`, err.message);
    return false;
  }
}

async function run() {
  console.log("=== Testing Groq Models for Macro-Chief ===");
  for (const model of testModels) {
    const ok = await testModel(model);
    if (ok) {
      console.log(`🎉 Model ${model} is working perfectly on your Groq key!`);
      break;
    }
  }
}

run();
