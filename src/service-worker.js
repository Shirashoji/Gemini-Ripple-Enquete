const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

// Function to call the Gemini API
async function callGeminiApi(apiKey, question, answer) {
  // Base prompt applicable to all questions
  const basePrompt = `あなたはプロのプログラミングメンターです。
以下のアンケート内容は、プログラミングを学習している学生が書いたものです。
内容を分析し、アンケートをの記述を誰がみてもわかりやすくなるように、具体的で建設的なフィードバックを日本語で提供してください。
**フィードバックは、直接的かつ簡潔に、会話的な要素や呼びかけ（例：「〇〇さん」、「学習者さん」、「お疲れ様でした」など）を含めずに行ってください。**
特に、課題の解決方法、自己評価の観点から、改善点や次のステップに繋がるようなアドバイスをお願いします。
`;

  // Specific instructions based on the question
  let specificInstructions = "";
  if (question.includes("今日の感想")) {
    specificInstructions = `
---
# 追加の確認ルール
このアンケート項目では、「やったこと」と「感想」の両方を記述することがルールです。
回答にその両方が含まれているかを確認してください。もしどちらかが不足している場合は、その点を指摘してください。`;
  } else if (question.includes("次回の授業に来る時までに達成するゴール")) {
    specificInstructions = `
---
# 追加の確認ルール
この項目は目標設定についてです。
回答が、具体的で、測定可能で、達成可能な目標（SMARTゴールの観点など）になっているかを確認してください。
もし目標が曖昧な場合は、より具体的な目標にするためのアドバイスをしてください。`;
  }

  // NOTE: More 'else if' blocks can be added here for other questions.

  // Combine prompts and the user's text
  const prompt = `${basePrompt}
${specificInstructions}

---

# 質問
${question}

# 回答
${answer}
`;

  try {
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error.message || `HTTP error! status: ${response.status}`,
      );
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "reviewItem") {
    (async () => {
      try {
        const { geminiApiKey } = await chrome.storage.sync.get("geminiApiKey");
        if (!geminiApiKey) {
          throw new Error(
            "APIキーが設定されていません。拡張機能のポップアップから設定してください。",
          );
        }

        const result = await callGeminiApi(
          geminiApiKey,
          message.payload.question,
          message.payload.answer,
        );

        // Send result back to the content script
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "displayItemReview",
          payload: { question: message.payload.question, result: result },
        });
      } catch (error) {
        // Send error back to the content script
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "displayItemReview",
          payload: { question: message.payload.question, error: error.message },
        });
      }
    })();
    return true; // Indicates that the response is sent asynchronously
  }
});
