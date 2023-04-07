// Monitor active tab URL to toggle extension on matches

var matches = [ 'chat.openai.com', 'freegpt.one' ]

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (matches.some((url) => tab.url.includes(url))) toggleExtension()
})})

function toggleExtension() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'toggleExtension' }
)})}
