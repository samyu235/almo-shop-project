export async function generateProductListing(category, audience, description) {

  const apiKey = process.env.REACT_APP_GROQ_KEY;

  const prompt = `You are a creative e-commerce product naming expert for an online store in India.

Category: "${category}"
Target Audience: "${audience}"
Product Description: "${description}"

Generate a compelling product listing. Reply ONLY with a raw JSON object — no markdown, no backticks, no explanation. Use exactly this format:
{"name":"catchy product name 4 to 6 words","tagline":"one punchy tagline 8 to 12 words","description":"2 sentence buyer facing description","price_inr":999}

Make the name creative and marketable. Price should be realistic for India.`;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error("Groq API error: " + err);
  }

  const data = await response.json();
  const rawText = data.choices[0].message.content;

  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response: " + rawText);

  return JSON.parse(match[0]);
}