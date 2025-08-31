const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

// Function to call the Gemini API
async function callGeminiApi(apiKey, question, answer) {
  // Base prompt applicable to all questions
  const basePrompt = `あなたはプロのプログラミングメンターです。
以下のアンケート内容は、プログラミングを学習している学生が書いたものです。
内容を分析し、以下の指示に従って、詳細かつ具体的なフィードバックを日本語で提供してください。
**フィードバックは、直接的かつ簡潔に、会話的な要素や呼びかけ（例：「〇〇さん」、「学習者さん」、「お疲れ様でした」など）を含めずに行ってください。**

### 指示

1.  **文章の詳細なレビュー:**
    *   文章を編集するサポートとして、一文ごとに文法、誤字脱字、表現、語調、構成について詳細かつ明確なフィードバックを提供してください。
    *   変更提案は箇条書きで分かりやすくまとめてください。
    *   各提案に対して、その理由を必ず説明してください。

2.  **フィードバックの構成:**
    *   **表記の編集:** 誤字脱字について、項目ごとにわかりやすいフィードバックを提供し、各変更について説明します。
    *   **文法の編集:** 文法のミスについて、項目ごとにわかりやすいフィードバックを提供し、各変更について説明します。
    *   **構成に関する提案:** 必要に応じて、文章の構成について変更を提案し、その理由を説明します。
    *   **改善できる点:** その他、文章をさらにレベルアップさせられる点を示します。
    *   **書式に関するアドバイス:** 文章の種類に応じて、適切な書式についてアドバイスを提供します。
`;

  // Specific instructions based on the question
  let specificInstructions = "";
  if (question.includes("今日の感想")) {
    specificInstructions = `
---
# 追加の確認ルール
このアンケート項目では、「やったこと」と「感想」の両方を記述することがルールです。
回答にその両方が含まれているかを確認し、もしどちらかが不足している場合はその点を指摘してください。
さらに、「やったこと」と「感想」が明確に区別して記述されているかを確認し、そうなっていない場合は改善を提案してください。`;
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
