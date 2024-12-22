// Launch CHATGPT on install
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason == 'install') // to exclude updates
        chrome.tabs.create({ url: 'https://chatgpt.com/' })
})

// Sync SETTINGS/MODES to activated tabs
chrome.tabs.onActivated.addListener(activeInfo =>
    chrome.tabs.sendMessage(activeInfo.tabId, { action: 'syncConfigToUI' }))

// Show ABOUT modal on AI site when toolbar button clicked
const aiHomeURLs = chrome.runtime.getManifest().content_scripts[0].matches.map(url => url.replace(/\*$/, ''))
chrome.runtime.onMessage.addListener(async req => {
    if (req.action == 'showAbout') {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        const aiTab = aiHomeURLs.some(aiURL => // check if active tab is AI site
            new URL(activeTab.url).hostname == new URL(aiURL).hostname) ? activeTab
                : await chrome.tabs.create({ url: aiHomeURLs[0] }) // ...if not, open AI site
        if (activeTab != aiTab) await new Promise(resolve => // after new tab loads
            chrome.tabs.onUpdated.addListener(function statusListener(tabId, info) {
                if (tabId == aiTab.id && info.status == 'complete') {
                    chrome.tabs.onUpdated.removeListener(statusListener)
                    setTimeout(resolve, 2500)
        }}))
        chrome.tabs.sendMessage(aiTab.id, { action: 'showAbout' })
    }
});

// Init DATA
(async () => {

    // Init APP data
    const app = {
        version: chrome.runtime.getManifest().version, latestAssetCommitHash: 'f452e1d', urls: {},
        chatgptJSver: /v(\d+\.\d+\.\d+)/.exec(await (await fetch(chrome.runtime.getURL('lib/chatgpt.js'))).text())[1]
    }
    app.urls.assetHost = `https://cdn.jsdelivr.net/gh/adamlui/chatgpt-widescreen@${app.latestAssetCommitHash}`
    const remoteAppData = await (await fetch(`${app.urls.assetHost}/data/app.json`)).json()
    Object.assign(app, { ...remoteAppData, urls: { ...app.urls, ...remoteAppData.urls }})
    chrome.storage.sync.set({ app }) // save to browser storage

    // Init SITES data
    const sites = Object.assign(Object.create(null),
        await (await fetch(`${app.urls.assetHost}/data/sites.json`)).json())
    chrome.storage.sync.set({ sites })

})()
