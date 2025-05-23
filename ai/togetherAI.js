// File: server/togetherAI.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function getTogetherReply(transcript, togetherApiKey) {
  try {
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${togetherApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3-70b-chat-hf",
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.9,
        messages: [
          { role: "system", content: "You are a helpful voice assistant." },
          { role: "user", content: transcript }
        ]
      })
    });

    const json = await response.json();
    console.log("TogetherAI response:", JSON.stringify(json));
    return json.choices?.[0]?.message?.content || "[No response from TogetherAI]";
  } catch (err) {
    console.error("TogetherAI error:", err);
    return "[Error contacting TogetherAI]";
  }
}

module.exports = { getTogetherReply };
