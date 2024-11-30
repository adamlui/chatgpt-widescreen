window.config = {}
window.settings = {
    browserwideKeys: [ 'extensionDisabled', 'fullScreen' ], // to not load/save per-site

    controls: { // displays top-to-bottom in toolbar menu
        get fullerWindows() { return { type: 'toggle',
            label: window.settings.getMsg('menuLabel_fullerWins'),
            helptip: window.settings.getMsg('helptip_fullerWins')
        }},
        get tcbDisabled() { return { type: 'toggle', symbol: '↕️',
            label: window.settings.getMsg('menuLabel_tallerChatbox'),
            helptip: window.settings.getMsg('helptip_tallerChatbox')
        }},
        get widerChatbox() { return { type: 'toggle', symbol: '↔️',
            label: window.settings.getMsg('menuLabel_widerChatbox'),
            helptip: window.settings.getMsg('helptip_widerChatbox')
        }},
        get ncbDisabled() { return { type: 'toggle',
            label: window.settings.getMsg('menuLabel_newChatBtn'),
            helptip: window.settings.getMsg('helptip_newChatBtn')
        }},
        get hiddenHeader() { return { type: 'toggle',
            label: window.settings.getMsg('menuLabel_hiddenHeader'),
            helptip: window.settings.getMsg('helptip_hiddenHeader')
        }},
        get hiddenFooter() { return { type: 'toggle',
            label: window.settings.getMsg('menuLabel_hiddenFooter'),
            helptip: window.settings.getMsg('helptip_hiddenFooter')
        }},
        get notifDisabled() { return { type: 'toggle',
            label: window.settings.getMsg('menuLabel_modeNotifs'),
            helptip: window.settings.getMsg('helptip_modeNotifs')
        }}
    },

    getMsg(key) {
        return typeof chrome != 'undefined' && chrome.runtime ? chrome.i18n.getMessage(key)
            : this.appProps.msgs[key] // assigned from app.msgs in userscript
    },

    load() {
        const keys = ( // original array if array, else new array from multiple args
            Array.isArray(arguments[0]) ? arguments[0] : Array.from(arguments))
        if (typeof chrome != 'undefined' && chrome.runtime) // asynchronously load from browser extension storage
            return Promise.all(keys.map(key => // resolve promise when all keys load
                new Promise(resolve => // resolve promise when single key value loads
                    chrome.storage.sync.get(!this.browserwideKeys.includes(key) ? `${this.site}_${key}` : key,
                        result => { window.config[key] = result[`${this.site}_${key}`] || result[key] || false ; resolve()
        })))) ; else // synchronously load from userscript manager storage
            keys.forEach(key => window.config[key] = GM_getValue(this.appProps.configKeyPrefix + '_' + key, false))
    },

    save(key, val) {
        if (typeof chrome != 'undefined' && chrome.runtime) // save to browser extension storage
            chrome.storage.sync.set({
                [ !this.browserwideKeys.includes(key) ? `${this.site}_${key}` : key ] : val })
        else // save to userscript manager storage
            GM_setValue(this.appProps.configKeyPrefix + '_' + key, val)
        window.config[key] = val // save to memory
    }
};
