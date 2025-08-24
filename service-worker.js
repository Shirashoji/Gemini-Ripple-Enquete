// Listens for the message from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startReviewOnPage') {
    // The content script now sends the text directly
    const text = request.content;
    const tabId = sender.tab.id;

    // Get the saved API key
    chrome.storage.sync.get(['apiKey'], (storageResult) => {
      if (!storageResult.apiKey) {
        sendMessageToContentScript(tabId, { error: 'Gemini APIキーが設定されていません。ポップアップから設定してください。' });
        return;
      }
      // Call the Gemini API with the new prompt
      callGeminiApi(text, storageResult.apiKey, tabId);
    });

    return true; // Indicates that the response is sent asynchronously
  }
});

async function callGeminiApi(text, apiKey, tabId) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // The new, more detailed prompt from the user
  const prompt = `
    あなたはプロのプログラミングメンターです。
    教室の授業の最後に受講生から「やったこと」と「感想」を聞き出す役割を担っています。

    以下のテキストは、受講生が記述したその日の「やったこと」と「感想」です。
    内容を分析してください。

    もし、やったことの説明が要領を得なかったり、高校までの教科書に出てこないような専門用語が説明なしで使われていたりした場合は、「これはどういう意味ですか？」といった形で、具体的な質問を生成してください。

    内容が明確で問題ない場合は、記述内容を肯定的に要約し、次の学習への意欲を高めるような短いコメントを生成してください。

    ---

    ${text}
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`APIエラー: ${response.status} - ${errorData.error.message}`);
    }

    const data = await response.json();
    // Handle cases where the model returns no candidates
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('APIから有効な応答が返されませんでした。');
    }
    const reviewResult = data.candidates[0].content.parts[0].text;
    sendMessageToContentScript(tabId, { result: reviewResult });

  } catch (error) {
    sendMessageToContentScript(tabId, { error: error.message });
  }
}

// Function to send a message back to the content script in a specific tab
function sendMessageToContentScript(tabId, message) {
  chrome.tabs.sendMessage(tabId, {
    action: 'displayReviewOnPage',
    ...message
  });
}