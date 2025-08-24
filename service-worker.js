
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reviewItem') {
    const { question, answer } = request.payload;
    const tabId = sender.tab.id;

    chrome.storage.sync.get(['apiKey'], (storageResult) => {
      if (!storageResult.apiKey) {
        sendResponseToContentScript(tabId, {
          question: question, // Include original question for identification
          error: 'Gemini APIキーが設定されていません。ポップアップから設定してください。'
        });
        return;
      }
      callGeminiApiForItem(question, answer, storageResult.apiKey, tabId);
    });

    return true; // Indicates that the response is sent asynchronously
  }
});

async function callGeminiApiForItem(question, answer, apiKey, tabId) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `
    あなたはプロのプログラミングメンターです。
    プログラミングを学習している学生が、以下の質問に対して回答しました。
    この回答内容を分析し、具体的で、建設的なフィードバックを日本語で簡潔に提供してください。
    回答内容が良い場合は、その点を褒め、さらに良くするための視点を提供してください。
    回答内容に改善点がある場合は、その点を優しく指摘し、具体的な改善案や考え方のヒントを示してください。

    --- 
    [質問]: ${question}
    --- 
    [学生の回答]:
    ${answer}
    ---
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`APIエラー: ${response.status} - ${errorData.error.message}`);
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('APIから有効な応答が返されませんでした。');
    }
    const reviewResult = data.candidates[0].content.parts[0].text;
    sendResponseToContentScript(tabId, { question: question, result: reviewResult });

  } catch (error) {
    sendResponseToContentScript(tabId, { question: question, error: error.message });
  }
}

function sendResponseToContentScript(tabId, payload) {
  chrome.tabs.sendMessage(tabId, {
    action: 'displayItemReview',
    payload: payload
  });
}
