const config = {}
const settings = {
    browserwideKeys: [ 'extensionDisabled', 'fullScreen' ], // to not load/save per-site

    controls: { // displays top-to-bottom in toolbar menu
        fullerWindows: { type: 'toggle',
            label: chrome.i18n.getMessage('menuLabel_fullerWins'),
            helptip: chrome.i18n.getMessage('helptip_fullerWins') },
        tcbDisabled: { type: 'toggle',
            label: chrome.i18n.getMessage('menuLabel_tallerChatbox'),
            helptip: chrome.i18n.getMessage('helptip_tallerChatbox') },
        widerChatbox: { type: 'toggle',
            label: chrome.i18n.getMessage('menuLabel_widerChatbox'),
            helptip: chrome.i18n.getMessage('helptip_widerChatbox') },
        ncbDisabled: { type: 'toggle',
            label: chrome.i18n.getMessage('menuLabel_newChatBtn'),
            helptip: chrome.i18n.getMessage('helptip_newChatBtn') },
        hiddenHeader: { type: 'toggle',
            label: chrome.i18n.getMessage('menuLabel_hiddenHeader'),
            helptip: chrome.i18n.getMessage('helptip_hiddenHeader') },
        hiddenFooter: { type: 'toggle',
            label: chrome.i18n.getMessage('menuLabel_hiddenFooter'),
            helptip: chrome.i18n.getMessage('helptip_hiddenFooter') },
        notifDisabled: { type: 'toggle',
            label: chrome.i18n.getMessage('menuLabel_modeNotifs'),
            helptip: chrome.i18n.getMessage('helptip_modeNotifs') }
    },

    load() {
        const keys = ( // original array if array, else new array from multiple args
            Array.isArray(arguments[0]) ? arguments[0] : Array.from(arguments))
        return Promise.all(keys.map(key => // resolve promise when all keys load
            new Promise(resolve => // resolve promise when single key value loads
                chrome.storage.sync.get( // load from Chrome
                    !this.browserwideKeys.includes(key) ? `${this.site}_${key}` : key,
                    result => { config[key] = result[`${this.site}_${key}`] || result[key] || false ; resolve() }
    ))))},

    save(key, val) {
        chrome.storage.sync.set({ // save to Chrome
            [ !this.browserwideKeys.includes(key) ? `${this.site}_${key}` : key ] : val })
        config[key] = val // save to memory
    }
}

window.config = config ; window.settings = settings;
