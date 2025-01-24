window.config = {}
window.settings = {

    imports: {
        import(deps) { // { app (userscript only), env (extension only) }
            for (const depName in deps) this[depName] = deps[depName] }
    },

    browserwideKeys: [ 'extensionDisabled', 'fullScreen' ], // to not load/save per-site

    controls: { // displays top-to-bottom in toolbar menu
        get fullerWindows() { return { type: 'toggle', defaultVal: false,
            label: settings.getMsg('menuLabel_fullerWins'),
            helptip: settings.getMsg('helptip_fullerWins')
        }},
        get tcbDisabled() { return { type: 'toggle', symbol: '↕️', defaultVal: false,
            label: settings.getMsg('menuLabel_tallerChatbox'),
            helptip: settings.getMsg('helptip_tallerChatbox')
        }},
        get widerChatbox() { return { type: 'toggle', symbol: '↔️', defaultVal: false,
            label: settings.getMsg('menuLabel_widerChatbox'),
            helptip: settings.getMsg('helptip_widerChatbox')
        }},
        get ncbDisabled() { return { type: 'toggle', defaultVal: false,
            label: settings.getMsg('menuLabel_newChatBtn'),
            helptip: settings.getMsg('helptip_newChatBtn')
        }},
        get hiddenHeader() { return { type: 'toggle', defaultVal: false,
            label: settings.getMsg('menuLabel_hiddenHeader'),
            helptip: settings.getMsg('helptip_hiddenHeader')
        }},
        get hiddenFooter() { return { type: 'toggle', defaultVal: false,
            label: settings.getMsg('menuLabel_hiddenFooter'),
            helptip: settings.getMsg('helptip_hiddenFooter')
        }},
        get btnAnimationsDisabled() { return { type: 'toggle', defaultVal: false,
            label: settings.getMsg('menuLabel_btnAnimations'),
            helptip: settings.getMsg('helptip_btnAnimations')
        }},
        get notifDisabled() { return { type: 'toggle', defaultVal: false,
            label: settings.getMsg('menuLabel_modeNotifs'),
            helptip: settings.getMsg('helptip_modeNotifs')
        }},
        get blockSpamDisabled() { return { type: 'toggle', defaultVal: false,
            label: settings.getMsg('menuLabel_blockSpam'),
            helptip: settings.getMsg('helptip_blockSpam')
        }}
    },

    getMsg(key) {
        return typeof GM_info != 'undefined' ? this.imports.app.msgs[key] : chrome.i18n.getMessage(key) },

    load(...keys) {
        keys = keys.flat() // flatten array args nested by spread operator
        if (typeof GM_info != 'undefined') // synchronously load from userscript manager storage
            keys.forEach(key => {
                config[key] = GM_getValue(`${this.imports.app.configKeyPrefix}_${key}`,
                    this.controls[key]?.defaultVal ?? this.controls[key]?.type == 'toggle')
            })
        else // asynchronously load from browser extension storage
            return Promise.all(keys.map(async key => { // resolve promise when all keys load
                const result = await chrome.storage.sync.get(
                    !this.browserwideKeys.includes(key) ? `${this.imports.env.site}_${key}` : key )
                window.config[key] = result[`${this.imports.env.site}_${key}`] ?? result[key]
                    ?? this.controls[key]?.defaultVal ?? this.controls[key]?.type == 'toggle'
        }))
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