export async function fetchFromChatGPT(prompt: string, max_tokens: number) {
    const myHeaders = new Headers();
    myHeaders.append(
      "Authorization",
      "Bearer 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",
    );
    myHeaders.append("Content-Type", "application/json");
    const raw = JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
      temperature: 0.5,
      max_tokens: max_tokens,
      
    });
    const response = fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    })
      .then((response) => response.json())
      .then((response) => response.choices[0].message.content);
      
  
    return response;
    
  }