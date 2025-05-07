// NOTE: This script relies on the powerful chatgpt.js library @ https://chatgpt.js.org
//  © 2023–2025 KudoAI & contributors under the MIT license

(async () => {

    // Add WINDOW MSG listener for userscript request to self-disable
    addEventListener('message', event => {
        if (event.origin != location.origin || event.data.source != 'chatgpt-widescreen-mode.user.js') return
        postMessage({ source: 'chatgpt-widescreen/*/extension/content.js' }, location.origin)
    })

    chrome.runtime.onMessage.addListener(({ action, options }) => {
        ({
            notify: () => notify(...['msg', 'pos', 'notifDuration', 'shadow'].map(arg => options[arg])),
            alert: () => modals.alert(...['title', 'msg', 'btns', 'checkbox', 'width'].map(arg => options[arg])),
            showAbout: async () => { if (env.site == 'chatgpt') await chatgpt.isLoaded() ; modals.open('about') },
            syncConfigToUI: () => sync.configToUI(options)
        }[action]?.())
    })

    // Import JS resources
    for (const resource of [
        'lib/chatbar.js', 'lib/chatgpt.js', 'lib/dom.js', 'lib/settings.js', 'lib/styles.js', 'lib/ui.js',
        'components/buttons.js', 'components/icons.js', 'components/modals.js', 'components/tooltip.js'
    ]) await import(chrome.runtime.getURL(resource))

    // Init ENV context
    const env = {
        browser: { isFF: navigator.userAgent.includes('Firefox'), isMobile: chatgpt.browser.isMobile() },
        site: location.hostname.split('.').slice(-2, -1)[0], ui: {}
    }

    env.browser.isPortrait = env.browser.isMobile && (innerWidth < innerHeight)
    ui.import({ site: env.site }) ; ui.getScheme().then(scheme => env.ui.scheme = scheme)
    if (env.site == 'chatgpt') // store native chatbar width for Wider Chatbox style
        chatbar.nativeWidth = dom.get.computedWidth(document.querySelector('main form'))

    // Import DATA
    const { app } = await chrome.storage.local.get('app'),
          { sites } = await chrome.storage.local.get('sites')

    // Export DEPENDENCIES to imported resources
    chatbar.import({ site: env.site, sites }) // for conditional logic + sites.selectors
    dom.import({ scheme: env.ui.scheme }) // for dom.addRisingParticles()
    modals.import({ app, env }) // for app data + env['<browser|ui>'] flags
    settings.import({ site: env.site, sites }) // to load/save active tab's settings + `${site}Disabled`
    styles.import({ site: env.site, sites }) // for conditional logic + sites.selectors
    tooltip.import({ app, env, sites }) // for tooltip class + .update() position logic
    ui.import({ sites }) // for ui.isFullWin() sidebar selector/flag

    // Init SETTINGS
    const firstRunKey = `${env.site}_isFirstRun`
    if ((await chrome.storage.local.get(firstRunKey))[firstRunKey] == undefined) { // activate widescreen on install
        settings.save('widescreen', true) ; settings.save('isFirstRun', false) }
    settings.siteDisabledKeys = Object.keys(sites).map(site => `${site}Disabled`)
    await settings.load('extensionDisabled', ...settings.siteDisabledKeys, ...sites[env.site].availFeatures)

    // Define FUNCTIONS

    function getMsg(key) { return chrome.i18n.getMessage(key) }

    function notify(msg, pos = '', notifDuration = '', shadow = '') {
        if (config.notifDisabled && !msg.includes(getMsg('menuLabel_modeNotifs'))) return

        // Strip state word to append colored one later
        const foundState = [
            getMsg('state_on').toUpperCase(), getMsg('state_off').toUpperCase() ].find(word => msg.includes(word))
        if (foundState) msg = msg.replace(foundState, '')

        // Show notification
        chatgpt.notify(`${app.symbol} ${msg}`, pos, notifDuration, shadow || env.ui.scheme == 'dark' ? '' : 'shadow')
        const notif = document.querySelector('.chatgpt-notif:last-child')

        // Append styled state word
        if (foundState) {
            const stateStyles = {
                on: {
                    light: 'color: #5cef48 ; text-shadow: rgba(255,250,169,0.38) 2px 1px 5px',
                    dark:  'color: #5cef48 ; text-shadow: rgb(55,255,0) 3px 0 10px'
                },
                off: {
                    light: 'color: #ef4848 ; text-shadow: rgba(255,169,225,0.44) 2px 1px 5px',
                    dark:  'color: #ef4848 ; text-shadow: rgba(255, 116, 116, 0.87) 3px 0 9px'
                }
            }
            const styledStateSpan = dom.create.elem('span')
            styledStateSpan.style.cssText = stateStyles[
                foundState == getMsg('state_off').toUpperCase() ? 'off' : 'on'][env.ui.scheme]
            styledStateSpan.append(foundState) ; notif.append(styledStateSpan)
        }
    }

    async function toggleMode(mode, state = '') {
        switch (state.toUpperCase()) {
            case 'ON' : activateMode(mode) ; break
            case 'OFF' : deactivateMode(mode) ; break
            default : (
                mode == 'widescreen' ? styles.widescreen.node.isConnected
              : mode == 'fullWindow' ? await ui.isFullWin() : chatgpt.isFullScreen()
            ) ? deactivateMode(mode) : activateMode(mode)
        }

        async function activateMode(mode) {
            if (mode == 'widescreen') { document.head.append(styles.widescreen.node) ; sync.mode('widescreen') }
            else if (mode == 'fullWindow') {
                const { site } = env, { selectors } = sites[site],
                      sidebarToggle = document.querySelector(selectors.btns.sidebar)
                if (site == 'chatgpt') {
                    const sidebars = {
                        left: document.querySelector(selectors.sidebar),
                        right: document.querySelector(selectors.rightbar)
                    }
                    const sidebarsToHide = []
                    Object.entries(sidebars).forEach(([side, bar]) => // push fat/visible ones to hide
                        bar && dom.get.computedWidth(bar) > 100 && sidebarsToHide.push({ side, bar }))
                    sidebarsToHide.forEach(({ side, bar }) => { // hide'em
                        if (side == 'left') sidebarToggle.click() ; else bar.style.display = 'none' })
                } else if (site == 'perplexity') sidebarToggle.click()
                else /* poe */ document.head.append(styles.fullWin.node)
                if (site != 'chatgpt') sync.mode('fullWindow') // since they don't monitor sidebar
            } else if (mode == 'fullscreen') document.documentElement.requestFullscreen()
        }

        function deactivateMode(mode) {
            if (mode == 'widescreen') { styles.widescreen.node.remove() ; sync.mode('widescreen') }
            else if (mode == 'fullWindow') {
                const { site } = env, { selectors } = sites[site],
                      sidebarToggle = document.querySelector(selectors.btns.sidebar)
                if (sidebarToggle) {
                    sidebarToggle.click()
                    if (site == 'chatgpt') {
                        const rightbar = document.querySelector(selectors.rightbar)
                        if (rightbar) rightbar.style.display = ''
                    }
                } else styles.fullWin.node.remove()
                if (site != 'chatgpt') sync.mode('fullWindow') // since they don't monitor sidebar
            } else if (mode == 'fullscreen') {
                if (config.f11) modals.alert(getMsg('alert_pressF11'), `${getMsg('alert_f11reason')}.`)
                else document.exitFullscreen()
                    .catch(err => console.error(app.symbol + ' » Failed to exit fullscreen', err))
            }
        }
    }

    env.ui.hasTallChatbar = await chatbar.is.tall()
    buttons.import({ app, env, sites, toggleMode })

    const sync = {

        async configToUI(options) { // on toolbar popup toggles + AI tab activations
            const extensionWasDisabled = config.extensionDisabled || config[`${env.site}Disabled`]
            await settings.load('extensionDisabled', ...settings.siteDisabledKeys, ...sites[env.site].availFeatures)
            if (!extensionWasDisabled && ( config.extensionDisabled || config[`${env.site}Disabled`] )) { // reset UI
                [styles.tweaks.node, styles.widescreen.node, styles.fullWin.node, buttons]
                    .forEach(target => target.remove())
                chatbar.reset()
                if (/chatgpt|perplexity/.test(env.site))
                    document.body.removeEventListener('wheel', window.enableWheelScroll)
            } else if (!config.extensionDisabled && !config[`${env.site}Disabled`]) { // sync modes/tweaks/btns
                if (config.widescreen ^ styles.widescreen.node.isConnected) { // sync Widescreen
                    supressNotifs() ; toggleMode('widescreen') }
                if (sites[env.site].hasSidebar) {
                    if (config.fullWindow ^ await ui.isFullWin()) { // sync Full-Window
                        supressNotifs() ; toggleMode('fullWindow') }
                    sync.fullerWin() // sync Fuller Windows
                }
                styles.tweaks.update() // sync TCB/NCB/HH/HF/BA
                styles.chatbar.update() // sync WCB
                if (env.site != 'perplexity') chatbar.tweak() // update ChatGPT chatbar inner width or hack Poe btn pos
                buttons[config.btnsVisible ? 'insert' : 'remove']() // update button visibility
                if (options?.updatedKey == 'btnAnimationsDisabled' && !config.btnAnimationsDisabled) // apply/remove fx
                    // ...to visually signal location + preview fx applied by Button Animations toggle-on
                    buttons.animate()
                if (/chatgpt|perplexity/.test(env.site)) // toggle free wheel locked in some Spam blocks
                    document.body[`${ config.blockSpamDisabled ? 'remove' : 'add' }EventListener`](
                        'wheel', window.enableWheelScroll)
            }

            function supressNotifs() {
                if (config.notifiedDisabled) return
                settings.save('notifDisabled', true) // suppress notifs for cleaner UI
                setTimeout(() => settings.save('notifDisabled', false), 55) // ...temporarily
            }
        },

        fullerWin() {
            if (config.fullWindow && config.fullerWindows && !config.widescreen) { // activate fuller windows
                document.head.append(styles.widescreen.node) ; buttons.update.svg('widescreen', 'on')
            } else if (!config.fullWindow) { // de-activate fuller windows
                styles.fullWin.node.remove() // to remove style too so sidebar shows
                if (!config.widescreen) { // disable widescreen if result of fuller window
                    styles.widescreen.node.remove() ; buttons.update.svg('widescreen', 'off')
            }}
        },

        async mode(mode) { // setting + icon + chatbar
            const state = ( mode == 'widescreen' ? styles.widescreen.node.isConnected
                          : mode == 'fullWindow' ? await ui.isFullWin()
                                                 : chatgpt.isFullScreen() )
            settings.save(mode, state) ; buttons.update.svg(mode)
            if (!config.extensionDisabled && !config[`${env.site}Disabled`]) { // tweak UI
                if (mode == 'fullWindow') sync.fullerWin()
                if (env.site == 'chatgpt') setTimeout(() => chatbar.tweak(), // update inner width
                    mode == 'fullWindow' && ( config.widescreen || config.fullerWindows )
                        && config.widerChatbox ? 111 : 0) // delay if toggled to/from active WCB to avoid wrong width
                else if (env.site == 'perplexity' || env.site == 'poe' && config.widerChatbox)
                    styles.chatbar.update() // toggle full-width Perplexity chatbar or sync Poe WCB
                notify(`${getMsg('mode_' + mode)} ${getMsg(`state_${ state ? 'on' : 'off' }`).toUpperCase()}`)
            }
            config.modeSynced = true ; setTimeout(() => config.modeSynced = false, 100) // prevent repetition
        }
    }

    chatgpt.canvasIsOpen = function() {
        return document.querySelector('section.popover')?.getBoundingClientRect().top == 0 }

    // Run MAIN routine

    // Init UI props
    if (env.site == 'chatgpt') {
        sites.chatgpt.hasSidebar = !!await Promise.race([
            dom.get.loadedElem(sites.chatgpt.selectors.btns.sidebar), // DOM element if sidebar toggle loads
            dom.get.loadedElem(sites.chatgpt.selectors.btns.login).then(() => false), // null if login button loads
            new Promise(resolve => setTimeout(() => resolve(null), 3000)) // null if 3s passed
        ])
    }

    // Init FULL-MODE states
    config.fullscreen = chatgpt.isFullScreen()
    if (sites[env.site].selectors.btns.sidebar) // site has native FW state
         config.fullWindow = await ui.isFullWin() // ...so match it
    else await settings.load('fullWindow'); // otherwise load CWM's saved state

    // Create/append STYLES
    ['chatbar', 'fullWin', 'tweaks', 'widescreen'].forEach(style => styles[style].update());
    ['gray', 'white'].forEach(color => document.head.append( // Rising Particles styles
        dom.create.elem('link', { rel: 'stylesheet',
            href: `https://cdn.jsdelivr.net/gh/adamlui/ai-web-extensions@727feff/assets/styles/rising-particles/dist/${
                color}.min.css`
    })))

    // Restore PREV SESSION's state
    if (!config.extensionDisabled && !config[`${env.site}Disabled`]) {
        if (config.btnsVisible) buttons.insert()
        if (config.widescreen) toggleMode('widescreen', 'ON')
        if (config.fullWindow && sites[env.site].hasSidebar) {
            if (sites[env.site].selectors.btns.sidebar) // site has own FW config
                sync.mode('fullWindow') // ...so sync w/ it
            else toggleMode('fullWindow', 'on') // otherwise self-toggle
        }
        if (/chatgpt|perplexity/.test(env.site)) { // toggle free wheel locked in some Spam blocks
            window.enableWheelScroll = event => event.stopPropagation()
            document.body[`${ config.blockSpamDisabled ? 'remove' : 'add' }EventListener`](
                'wheel', window.enableWheelScroll)
        }
    }

    // Monitor NODE CHANGES to maintain button visibility + update colors
    let isTempChat = false, canvasWasOpen = chatgpt.canvasIsOpen()
    new MutationObserver(async () => {

        // Maintain button visibility on nav
        if (config.extensionDisabled || config[`${env.site}Disabled`] || !config.btnsVisible) return
        else if (!buttons.fullscreen?.isConnected && !chatgpt.canvasIsOpen()
            && await chatbar.get() && buttons.state.status != 'inserting'
        ) { buttons.state.status = 'missing' ; buttons.insert() }

        // Maintain button colors + Widescreen button visibility on snowflake chatgpt.com
        if (env.site == 'chatgpt') {

            // Update button colors on temp chat toggle
            const chatbarIsDark = await chatbar.is.dark()
            if (chatbarIsDark != isTempChat) { buttons.update.color() ; isTempChat = chatbarIsDark }

            // Remove buttons on Canvas mode toggle-on
            if (canvasWasOpen ^ chatgpt.canvasIsOpen()) { buttons.remove() ; canvasWasOpen = !canvasWasOpen }
        }
    }).observe(document[env.site == 'poe' ? 'head' : 'body'], { attributes: true, subtree: true })

    // Monitor SCHEME PREF changes to update sidebar toggle + modal colors
    new MutationObserver(handleSchemePrefChange).observe( // for site scheme pref changes
        document.documentElement, { attributes: true, attributeFilter: ['class', 'data-color-scheme'] })
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener( // for browser/system scheme pref changes
        'change', () => requestAnimationFrame(handleSchemePrefChange))
    async function handleSchemePrefChange() {
        const displayedScheme = await ui.getScheme()
        if (env.ui.scheme != displayedScheme) {
            env.ui.scheme = displayedScheme ; modals.stylize() ; buttons.update.color() }
    }

    // Monitor SIDEBARS to update config.fullWindow for sites w/ native toggle
    if (sites[env.site].selectors.btns.sidebar && sites[env.site].hasSidebar) {
        const sidebarObserver = new ResizeObserver( // sync config.fullWindow ⇆ sidebar width
            async () => (config.fullWindow ^ await ui.isFullWin()) && !config.modeSynced && sync.mode('fullWindow'))
        observeSidebars()
        new MutationObserver( // re-observeSidebars() on disconnect
            () => getSidebars().some(bar => !sidebarObserver.targets?.includes(bar)) && observeSidebars()
        ).observe(document.body, { childList: true, subtree: true })

        function getSidebars() {
            const site = env.site, selectors = sites[site].selectors,
                  sidebars = [document.querySelector(selectors.sidebar)]
            if (site == 'chatgpt') sidebars.push(document.querySelector(selectors.rightbar))
            return sidebars.filter(Boolean)
        }

        function observeSidebars() {
            const sidebars = getSidebars() ; if (!sidebars.length) return
            sidebarObserver.targets?.forEach(target => sidebarObserver.unobserve(target))
            sidebars.forEach(sidebar => sidebarObserver.observe(sidebar))
            sidebarObserver.targets = sidebars
        }
    }

    // Monitor PERPLEXITY NAV to update Attach File button alignment on delayed re-appearances
    if (env.site == 'perplexity') {
        let prevPath = location.pathname
        new MutationObserver(async () => { if (location.pathname != prevPath) {
            prevPath = location.pathname
            const attachFileBtn = await dom.get.loadedElem(sites.perplexity.selectors.btns.attachFile),
                  cwmActive = buttons.fullscreen?.isConnected
            if (attachFileBtn['data-left-aligned'] ^ cwmActive) chatbar[cwmActive ? 'tweak' : 'reset']()
        }}).observe(document.body, { childList: true, subtree: true })
    }

    // Add RESIZE LISTENER to update full screen setting/button + disable F11 flag
    addEventListener('resize', () => {
        const fullscreenState = chatgpt.isFullScreen()
        if (config.fullscreen && !fullscreenState) { // exiting full screen
            sync.mode('fullscreen') ; config.f11 = false }
        else if (!config.fullscreen && fullscreenState) // entering full screen
            sync.mode('fullscreen')
        if (env.site == 'chatgpt') chatbar.tweak() // update chatgpt.com chatbar inner width
    })

    // Add KEY LISTENER to enable flag on F11 + stop generating text on ESC
    document.addEventListener('keydown', event => {
        if ((event.key == 'F11' || event.keyCode == 122) && !config.fullscreen) config.f11 = true
        else if ((event.key.startsWith('Esc') || event.keyCode == 27) && chatgpt.isTyping())
            try { chatgpt.stop() ; requestAnimationFrame(() => !chatgpt.isTyping() &&
                    notify(getMsg('notif_chatStopped'), 'bottom-right')) } catch (err) {}
    })

})()
