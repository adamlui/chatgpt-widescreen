// Launch CHATGPT on install
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason == 'install') // to exclude updates
        chrome.tabs.create({ url: 'https://chatgpt.com/' })
})

// Sync SETTINGS/MODES to activated tabs
chrome.tabs.onActivated.addListener(activeInfo =>
    chrome.tabs.sendMessage(activeInfo.tabId, { action: 'syncConfigToUI' }));

// Init DATA
(async () => {

    // Init APP data
    const app = { latestAssetCommitHash: '861a313', urls: {} }
    app.urls.assetHost = `https://cdn.jsdelivr.net/gh/adamlui/chatgpt-widescreen@${app.latestAssetCommitHash}`
    const remoteAppData = await (await fetch(`${app.urls.assetHost}/data/app.json`)).json()
    Object.assign(app, { ...remoteAppData, urls: { ...app.urls, ...remoteAppData.urls }})
    chrome.storage.sync.set({ app }) // save to browser storage

    // Init SITES data
    const sites = Object.assign(Object.create(null),
        await (await fetch(`${app.urls.assetHost}/data/sites.json`)).json())
    chrome.storage.sync.set({ sites })

})()
