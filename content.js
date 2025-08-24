

// This script runs automatically on the target page, as defined in manifest.json

(function() {
    // Wait for the DOM to be fully loaded
    if (document.readyState === "complete" || document.readyState === "interactive") {
        initializeApp();
    } else {
        document.addEventListener("DOMContentLoaded", initializeApp);
    }

    function initializeApp() {
        // Guard clause: If the button already exists, don't run the script again.
        if (document.getElementById('gemini-review-btn')) {
            return;
        }
        const submitButton = document.querySelector('input.btn-add[type="submit"]');
        const form = document.getElementById('indexForm');

        if (!submitButton || !form) {
            console.log("Required form elements not found.");
            return;
        }

        // 1. Create the new elements
        const geminiButton = document.createElement('button');
        geminiButton.id = 'gemini-review-btn';
        geminiButton.textContent = 'Geminiレビュー';
        geminiButton.type = 'button'; // Prevent form submission
        geminiButton.className = 'btn btn-secondary'; // Use similar button style

        const resultContainer = document.createElement('div');
        resultContainer.id = 'gemini-review-result-container';
        resultContainer.textContent = 'レビュー結果はここに表示されます。';

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'gemini-review-button-container';

        const originalParent = submitButton.parentNode;

        // 2. Inject elements into the DOM

        // Add the new button and the original submit button to the container
        buttonContainer.appendChild(geminiButton);
        buttonContainer.appendChild(submitButton); // This moves the submit button

        // Add the new container to the original parent of the submit button
        originalParent.appendChild(buttonContainer);

        // Insert the result container after the form element
        form.parentNode.appendChild(resultContainer);

        // 3. Add click listener for the Gemini button
        geminiButton.addEventListener('click', () => {
            resultContainer.textContent = 'Geminiにレビューをリクエスト中...';

            const textareas = form.querySelectorAll('textarea');
            let extractedContent = '';
            textareas.forEach(textarea => {
                const label = document.querySelector(`label[for="${textarea.id}"]`);
                const question = label ? label.innerText.trim() : '不明な質問';
                const answer = textarea.value.trim();
                if (answer) {
                    extractedContent += `[質問]: ${question}\n[回答]:\n${answer}\n\n---\n\n`;
                }
            });

            if (!extractedContent) {
                resultContainer.textContent = 'レビューするテキストが見つかりませんでした。アンケートに記入してください。';
                return;
            }

            // Send the content to the service worker for review
            chrome.runtime.sendMessage(
                { action: 'startReviewOnPage', content: extractedContent },
                (response) => {
                    if (chrome.runtime.lastError) {
                        resultContainer.textContent = `エラー: ${chrome.runtime.lastError.message}`;
                    }
                    // Response will be handled by the listener below
                }
            );
        });

        // 4. Listen for the result from the service worker
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'displayReviewOnPage') {
                if (message.error) {
                    resultContainer.textContent = `エラー: ${message.error}`;
                } else {
                    resultContainer.textContent = message.result;
                }
            }
        });
    }
})();
