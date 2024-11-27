const config = {}
const settings = {
    browserwideKeys: [ 'extensionDisabled', 'fullScreen' ], // to not load/save per-site

    controls: { // displays top-to-bottom in toolbar menu
        get fullerWindows() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_fullerWins'),
            helptip: settings.getMsg('helptip_fullerWins') }},
        get tcbDisabled() { return { type: 'toggle', symbol: '↕️',
            label: settings.getMsg('menuLabel_tallerChatbox'),
            helptip: settings.getMsg('helptip_tallerChatbox') }},
        get widerChatbox() { return { type: 'toggle', symbol: '↔️',
            label: settings.getMsg('menuLabel_widerChatbox'),
            helptip: settings.getMsg('helptip_widerChatbox') }},
        get ncbDisabled() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_newChatBtn'),
            helptip: settings.getMsg('helptip_newChatBtn') }},
        get hiddenHeader() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_hiddenHeader'),
            helptip: settings.getMsg('helptip_hiddenHeader') }},
        get hiddenFooter() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_hiddenFooter'),
            helptip: settings.getMsg('helptip_hiddenFooter') }},
        get notifDisabled() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_modeNotifs'),
            helptip: settings.getMsg('helptip_modeNotifs') }}
    },

    getMsg(key) {
        return typeof chrome != 'undefined' && chrome.runtime ? chrome.i18n.getMessage(key)
            : settings.appProps.msgs[key] // assigned from app.msgs in userscript
    },

    load() {
        const keys = ( // original array if array, else new array from multiple args
            Array.isArray(arguments[0]) ? arguments[0] : Array.from(arguments))
        if (!chrome.runtime) // synchronously load from userscript manager storage
            keys.forEach(key => config[key] = GM_getValue(settings.appProps.configKeyPrefix + '_' + key, false))
        else return Promise.all(keys.map(key => // resolve promise when all keys load from Chrome storage
            new Promise(resolve => // resolve promise when single key value loads
                chrome.storage.sync.get( // load from Chrome
                    !settings.browserwideKeys.includes(key) ? `${settings.site}_${key}` : key,
                    result => { config[key] = result[`${settings.site}_${key}`] || result[key] || false ; resolve() }
    ))))},

    save(key, val) {
        if (!chrome.runtime) // save to userscript manager storage
            GM_setValue(settings.appProps.configKeyPrefix + '_' + key, val)
        else chrome.storage.sync.set({ // save to Chrome storage
            [ !settings.browserwideKeys.includes(key) ? `${settings.site}_${key}` : key ] : val })
        config[key] = val // save to memory
    }
}

window.config = config ; window.settings = settings;
