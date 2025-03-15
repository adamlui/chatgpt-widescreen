// Init DATA
(async () => {

    // Init APP data
    const app = {
        version: chrome.runtime.getManifest().version,
        latestResourceCommitHash: '7fb1782', // for cached app.json + sites.json5 + icons.questionMark.src
        urls: {},
        chatgptJSver: /v(\d+\.\d+\.\d+)/.exec(await (await fetch(chrome.runtime.getURL('lib/chatgpt.js'))).text())[1]
    }
    app.urls.resourceHost = `https://cdn.jsdelivr.net/gh/adamlui/chatgpt-widescreen@${app.latestResourceCommitHash}`
    const remoteAppData = await (await fetch(`${app.urls.resourceHost}/assets/data/app.json`)).json()
    Object.assign(app, { ...remoteAppData, urls: { ...app.urls, ...remoteAppData.urls }})
    chrome.storage.local.set({ app }) // save to browser storage

    // Init SITES data
    const sites = Object.assign(Object.create(null),
        JSON5.parse(await (await fetch(`${app.urls.resourceHost}/assets/data/sites.json5`)).text()))
    Object.keys(sites).forEach(site => { // strip protocol from homepage URL + add favicon URL for popup menu
        sites[site].urls.homepage = sites[site].urls.homepage.replace(/^https?:\/\//, '') // for cleaner tooltips/labels
        sites[site].urls.favicon = `https://www.google.com/s2/favicons?domain=${sites[site].urls.homepage}`
    })
    chrome.storage.local.set({ sites })

})()

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
            chrome.tabs.onUpdated.addListener(function loadedListener(tabId, info) {
                if (tabId == aiTab.id && info.status == 'complete') {
                    chrome.tabs.onUpdated.removeListener(loadedListener) ; setTimeout(resolve, 500)
        }}))
        chrome.tabs.sendMessage(aiTab.id, { action: 'showAbout' })
    }
})
