// File: server/openAI.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function getOpenAIReply(transcript, openApiKey) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
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
    console.log("OpenAI response:", JSON.stringify(json));
    return json.choices?.[0]?.message?.content || "[No response from OpenAI]";
  } catch (err) {
    console.error("OpenAI error:", err);
    return "[Error contacting OpenAI]";
  }
}

module.exports = { getOpenAIReply };