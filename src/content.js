import { marked } from 'marked';
import '../src/style.css';

(function() {
    // Ensure the script runs only once
    if (window.hasRunGeminiReviewInjector) {
        return;
    }
    window.hasRunGeminiReviewInjector = true;

    let loadingInterval;

    function initialize() {
        const form = document.getElementById('indexForm');
        if (!form) return;

        const textareas = form.querySelectorAll('textarea');

        textareas.forEach(textarea => {
            if (!textarea.id) return; // Skip textareas without an ID

            const label = form.querySelector(`label[for="${textarea.id}"]`);
            const question = label ? label.innerText.trim() : '不明な質問';

            // Add default text to the "Today's thoughts" textarea
            if (label && label.innerText.includes('今日の感想') && textarea.value === '') {
                textarea.value = 'やったこと：\n\n感想：\n';
            }

            // Create elements
            const reviewButton = document.createElement('button');
            reviewButton.textContent = 'この項目をレビュー';
            reviewButton.type = 'button';
            reviewButton.className = 'btn btn-sm btn-outline-secondary gemini-item-review-btn';

            const resultDiv = document.createElement('div');
            resultDiv.className = 'gemini-item-review-result';
            resultDiv.style.display = 'none'; // Initially hidden

            // Insert elements after the textarea's parent block for better layout
            const parentBlock = textarea.closest('.form-input-block');
            if (parentBlock) {
                parentBlock.appendChild(reviewButton);
                parentBlock.appendChild(resultDiv);
            }

            // Add click listener
            reviewButton.addEventListener('click', () => {
                const answer = textarea.value.trim();
                if (!answer) {
                    resultDiv.textContent = 'レビューする内容がありません。';
                    resultDiv.style.display = 'block';
                    return;
                }

                let dots = 0;
                resultDiv.textContent = 'Geminiにレビューをリクエスト中';
                resultDiv.style.display = 'block';

                loadingInterval = setInterval(() => {
                    dots = (dots + 1) % 4;
                    resultDiv.textContent = 'Geminiにレビューをリクエスト中' + '.'.repeat(dots);
                }, 300);

                chrome.runtime.sendMessage({
                    action: 'reviewItem',
                    payload: {
                        question: question,
                        answer: answer
                    }
                });
            });
        });
    }

    // Listen for results from the service worker
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (chrome.runtime.lastError) {
            // Context invalidated, do nothing.
            return;
        }
        if (message.action === 'displayItemReview') {
            // Clear loading animation
            if (loadingInterval) {
                clearInterval(loadingInterval);
            }

            // Find the correct result div to display the message
            const textareas = document.querySelectorAll('textarea');
            textareas.forEach(textarea => {
                const label = document.querySelector(`label[for="${textarea.id}"]`);
                if (label && label.innerText.trim() === message.payload.question) {
                    const parentBlock = textarea.closest('.form-input-block');
                    const resultDiv = parentBlock.querySelector('.gemini-item-review-result');
                    if (resultDiv) {
                        if (message.payload.error) {
                            resultDiv.textContent = `エラー: ${message.payload.error}`;
                        } else {
                            resultDiv.innerHTML = marked.parse(message.payload.result);
                        }
                        resultDiv.style.display = 'block';
                    }
                }
            });
        }
    });

    if (document.readyState === "complete" || document.readyState === "interactive") {
        initialize();
    } else {
        document.addEventListener("DOMContentLoaded", initialize);
    }
})();
