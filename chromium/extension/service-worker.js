importScripts('lib/json5.min.js')

// Init DATA
const appReady = (async () => {

    // Init APP data
    const app = {
        version: chrome.runtime.getManifest().version,
        commitHashes: { app: '3fe1040' }, // for cached app.json + sites.json5
        runtime: (() => {
            return typeof chrome != 'undefined' && chrome.runtime ? (
                typeof browser != 'undefined' ? 'Firefox add-on'
                    : `Chromium ${ navigator.userAgent.includes('Edg') ? 'Edge add-on' : 'extension' }`
            ) : 'unknown'
        })()
    }
    app.urls = { resourceHost: `https://cdn.jsdelivr.net/gh/adamlui/chatgpt-widescreen@${app.commitHashes.app}` }
    const remoteAppData = await (await fetch(`${app.urls.resourceHost}/assets/data/app.json`)).json()
    Object.assign(app, { ...remoteAppData, urls: { ...app.urls, ...remoteAppData.urls }})
    chrome.storage.local.set({ app }) // save to browser storage
    chrome.runtime.setUninstallURL(app.urls.uninstall)

    // Init SITES data
    const sites = Object.assign(Object.create(null),
        JSON5.parse(await (await fetch(`${app.urls.resourceHost}/assets/data/sites.json5`)).text()))
    Object.keys(sites).forEach(site => { // strip protocol from homepage URL + add favicon URL for popup menu
        sites[site].urls.homepage = sites[site].urls.homepage.replace(/^https?:\/\//, '') // for cleaner tooltips/labels
        sites[site].urls.favicon = `https://www.google.com/s2/favicons?domain=${sites[site].urls.homepage}`
    })
    chrome.storage.local.set({ sites })

    return { app, sites } // to install listener
})()

// Launch WELCOME PAGE on install
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason == 'install') // to exclude updates
        appReady.then(({ app }) => chrome.tabs.create({ url: app.urls.welcome + '/chromium' }))
})

// Sync SETTINGS/MODES to activated tabs
chrome.tabs.onActivated.addListener(activeInfo =>
    chrome.tabs.sendMessage(activeInfo.tabId, { action: 'syncConfigToUI' }))

// Show ABOUT modal on AI site when toolbar button clicked
const aiHomeURLs = chrome.runtime.getManifest().content_scripts[0].matches.map(url => url.replace(/\*$/, ''))
chrome.runtime.onMessage.addListener(async req => {
    if (req.action == 'showAbout') {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        const aiTab = aiHomeURLs.some(aiURL =>
            new URL(activeTab.url).hostname == new URL(aiURL).hostname) ? activeTab // active tab is AI site, use it
                : // else use random enabled site or ChatGPT
                    await chrome.storage.local.get(['chatgptDisabled', 'poeDisabled'])
                        .then(({ chatgptDisabled, poeDisabled }) => {
                            const sitesEnabled = [!chatgptDisabled && aiHomeURLs[0], !poeDisabled && aiHomeURLs[1]]
                                .filter(Boolean)
                        return chrome.tabs.create({
                            url: sitesEnabled[Math.floor(Math.random() * sitesEnabled.length)] || aiHomeURLs[0] })
                    })
        if (activeTab != aiTab) await new Promise(resolve => // after new tab loads
            chrome.tabs.onUpdated.addListener(function loadedListener(tabId, info) {
                if (tabId == aiTab.id && info.status == 'complete') {
                    chrome.tabs.onUpdated.removeListener(loadedListener) ; setTimeout(resolve, 500)
        }}))
        chrome.tabs.sendMessage(aiTab.id, { action: 'showAbout' })
    }
})
