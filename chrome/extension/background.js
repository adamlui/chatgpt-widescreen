/* Monitor active tab URL to toggle extension on matches */

// Extract content script matches from manifest
var matches = chrome.runtime.getManifest().content_scripts.map(
    (contentScript) => contentScript.matches.map(
        (match) => match.replace(/\*$/, ''))).flat()

// Add listener
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (matches.some((url) => tab.url.includes(url))) toggleExtension()
})})

function toggleExtension() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'toggleExtension' }
)})}
