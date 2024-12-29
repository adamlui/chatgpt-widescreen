window.config = {}
window.settings = {

    imports: {
        import(deps) { // { app (userscript only), env (extension only) }
            for (const depName in deps) this[depName] = deps[depName] }
    },

    browserwideKeys: [ 'extensionDisabled', 'fullScreen' ], // to not load/save per-site

    controls: { // displays top-to-bottom in toolbar menu
        get fullerWindows() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_fullerWins'),
            helptip: settings.getMsg('helptip_fullerWins')
        }},
        get tcbDisabled() { return { type: 'toggle', symbol: '↕️',
            label: settings.getMsg('menuLabel_tallerChatbox'),
            helptip: settings.getMsg('helptip_tallerChatbox')
        }},
        get widerChatbox() { return { type: 'toggle', symbol: '↔️',
            label: settings.getMsg('menuLabel_widerChatbox'),
            helptip: settings.getMsg('helptip_widerChatbox')
        }},
        get ncbDisabled() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_newChatBtn'),
            helptip: settings.getMsg('helptip_newChatBtn')
        }},
        get hiddenHeader() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_hiddenHeader'),
            helptip: settings.getMsg('helptip_hiddenHeader')
        }},
        get hiddenFooter() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_hiddenFooter'),
            helptip: settings.getMsg('helptip_hiddenFooter')
        }},
        get btnAnimationsDisabled() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_btnAnimations'),
            helptip: settings.getMsg('helptip_btnAnimations')
        }},
        get notifDisabled() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_modeNotifs'),
            helptip: settings.getMsg('helptip_modeNotifs')
        }},
        get blockSpamDisabled() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_blockSpam'),
            helptip: settings.getMsg('helptip_blockSpam')
        }}
    },

    getMsg(key) {
        return typeof GM_info != 'undefined' ? this.imports.app.msgs[key] : chrome.i18n.getMessage(key) },

    load() {
        const keys = ( // original array if array, else new array from multiple args
            Array.isArray(arguments[0]) ? arguments[0] : Array.from(arguments))
        if (typeof GM_info != 'undefined') // synchronously load from userscript manager storage
            keys.forEach(key => window.config[key] = GM_getValue(
                `${this.imports.app.configKeyPrefix}_${key}`, false))
        else // asynchronously load from browser extension storage
            return Promise.all(keys.map(key => // resolve promise when all keys load
                new Promise(resolve => // resolve promise when single key value loads
                    chrome.storage.sync.get(
                        !this.browserwideKeys.includes(key) ? `${this.imports.env.site}_${key}` : key,
                        result => { window.config[key] = result[`${this.imports.env.site}_${key}`]
                            || result[key] || false ; resolve()
        }))))
},

    save(key, val) {
        if (typeof GM_info != 'undefined') // save to userscript manager storage
            GM_setValue(`${this.imports.app.configKeyPrefix}_${key}`, val)
        else // save to browser extension storage
            chrome.storage.sync.set({
                [ !this.browserwideKeys.includes(key) ? `${this.imports.env.site}_${key}` : key ] : val })
        window.config[key] = val // save to memory
    }
};
