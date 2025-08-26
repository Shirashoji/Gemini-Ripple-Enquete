import { marked } from 'marked';
import '../src/style.css';

(function() {
    // Ensure the script runs only once
    if (window.hasRunGeminiReviewInjector) {
        return;
    }
    window.hasRunGeminiReviewInjector = true;

    // Constants
    const LABEL_TEXT_INCLUDES = '今日の感想';
    const DEFAULT_TEXTAREA_VALUE = 'やったこと：\n\n感想：\n';
    const REVIEW_BUTTON_TEXT = 'この項目をレビュー';
    const EMPTY_CONTENT_MESSAGE = 'レビューする内容がありません。';
    const LOADING_MESSAGE = 'Geminiにレビューをリクエスト中';
    const ERROR_PREFIX = 'エラー: ';
    const UNKNOWN_QUESTION_TEXT = '不明な質問';

    let loadingInterval;

    function initialize() {
        const form = document.getElementById('indexForm');
        if (!form) return;

        const textareas = form.querySelectorAll('textarea');

        textareas.forEach(textarea => {
            if (!textarea.id) return; // Skip textareas without an ID

            const label = form.querySelector(`label[for="${textarea.id}"]`);
            const question = label ? label.innerText.trim() : UNKNOWN_QUESTION_TEXT;

            // Add default text to the "Today's thoughts" textarea
            if (label && label.innerText.includes(LABEL_TEXT_INCLUDES) && textarea.value === '') {
                textarea.value = DEFAULT_TEXTAREA_VALUE;
            }

            // Create elements
            const reviewButton = document.createElement('button');
            reviewButton.textContent = REVIEW_BUTTON_TEXT;
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
                    resultDiv.textContent = EMPTY_CONTENT_MESSAGE;
                    resultDiv.style.display = 'block';
                    return;
                }

                let dots = 0;
                resultDiv.textContent = LOADING_MESSAGE;
                resultDiv.style.display = 'block';

                loadingInterval = setInterval(() => {
                    dots = (dots + 1) % 4;
                    resultDiv.textContent = LOADING_MESSAGE + '.'.repeat(dots);
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
                            resultDiv.textContent = `${ERROR_PREFIX}${message.payload.error}`;
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