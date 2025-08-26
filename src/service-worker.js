const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

// Function to call the Gemini API
async function callGeminiApi(apiKey, question, answer) {
  const prompt = `あなたはプロのプログラミングメンターです。
以下のアンケート内容は、プログラミングを学習している学生が書いたものです。
内容を分析し、学習の進め方や考え方について、具体的で建設的なフィードバックを日本語で提供してください。
**フィードバックは、直接的かつ簡潔に、会話的な要素や呼びかけ（例：「〇〇さん」、「学習者さん」、「お疲れ様でした」など）を含めずに行ってください。**
特に、目標設定、課題の解決方法、自己評価の観点から、改善点や次のステップに繋がるようなアドバイスをお願いします。

---

# 質問
${question}

# 回答
${answer}
`;

  try {
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'reviewItem') {
    (async () => {
      try {
        const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
        if (!geminiApiKey) {
          throw new Error('APIキーが設定されていません。拡張機能のポップアップから設定してください。');
        }

        const result = await callGeminiApi(geminiApiKey, message.payload.question, message.payload.answer);

        // Send result back to the content script
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'displayItemReview',
          payload: { question: message.payload.question, result: result },
        });

      } catch (error) {
        // Send error back to the content script
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'displayItemReview',
          payload: { question: message.payload.question, error: error.message },
        });
      }
    })();
    return true; // Indicates that the response is sent asynchronously
  }
});