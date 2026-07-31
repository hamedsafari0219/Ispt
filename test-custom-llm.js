async function run() {
  const apiKey = "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";
  const baseUrl = "https://openrouter.ai/api/v1";
  const model = "nvidia/nemotron-3-ultra-550b-a55b:free";
  
  try {
    console.log("Fetching...");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'hello' },
          { role: 'user', content: 'test' }
        ],
        temperature: 0.2
      })
    });
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Response:", text.substring(0, 200));
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}
run();
