// NOTE: This script relies on the powerful chatgpt.js library @ https://chatgpt.js.org
//  © 2023–2024 KudoAI & contributors under the MIT license

(async () => {

    document.documentElement.setAttribute('chatgpt-widescreen-extension-installed', true) // for userscript auto-disable

    // Import JS resources
    for (const resource of [
        'lib/chatgpt.js', 'lib/dom.js', 'lib/settings.js', 'components/buttons.js', 'components/modals.js'])
            await import(chrome.runtime.getURL(resource))

    // Init ENV context
    const env = {
        browser: { isMobile: chatgpt.browser.isMobile() }, site: /([^.]+)\.[^.]+$/.exec(location.hostname)[1], ui: {}}
    env.browser.isPortrait = env.browser.isMobile && (window.innerWidth < window.innerHeight)
    env.ui.scheme = getScheme()

    // Import DATA
    const { app } = await chrome.storage.sync.get('app'),
          { sites } = await chrome.storage.sync.get('sites')

    // Export DEPENDENCIES to imported resources
    dom.dependencies.import({ env }) // for env.ui.scheme
    modals.dependencies.import({ app, env }) // for app data + env.ui.scheme
    settings.dependencies.import({ env }) // to load/save active tab's settings using env.site

    // Init SETTINGS
    await settings.load('extensionDisabled', ...sites[env.site].availFeatures)

    // Add CHROME MSG listener for background/popup requests to sync modes/settings
    chrome.runtime.onMessage.addListener(async req => {
        if (req.action == 'notify')
            notify(...['msg', 'pos', 'notifDuration', 'shadow'].map(arg => req.options[arg]))
        else if (req.action == 'alert')
            modals.alert(...['title', 'msg', 'btns', 'checkbox', 'width'].map(arg => req.options[arg]))
        else if (req.action == 'showAbout') {
            if (env.site == 'chatgpt') await chatgpt.isLoaded()
            modals.open('about')
        } else if (req.action == 'syncConfigToUI') sync.configToUI(req.options)
    })

    // Define FUNCTIONS

    function notify(msg, pos = '', notifDuration = '', shadow = '') {
        if (config.notifDisabled && !msg.includes(chrome.i18n.getMessage('menuLabel_modeNotifs'))) return

        // Strip state word to append colored one later
        const foundState = [ chrome.i18n.getMessage('state_on').toUpperCase(),
                             chrome.i18n.getMessage('state_off').toUpperCase()
              ].find(word => msg.includes(word))
        if (foundState) msg = msg.replace(foundState, '')

        // Show notification
        chatgpt.notify(`${app.symbol} ${msg}`, pos, notifDuration, shadow || env.ui.scheme == 'dark' ? '' : 'shadow')
        const notif = document.querySelector('.chatgpt-notif:last-child')

        // Append styled state word
        if (foundState) {
            const styledStateSpan = dom.create.elem('span')
            styledStateSpan.style.cssText = `color: ${
                foundState == 'OFF' ? '#ef4848 ; text-shadow: rgba(255, 169, 225, 0.44) 2px 1px 5px'
                                    : '#5cef48 ; text-shadow: rgba(255, 250, 169, 0.38) 2px 1px 5px' }`
            styledStateSpan.append(foundState) ; notif.append(styledStateSpan)
        }
    }

    const chatbar = {

        get() {
            let chatbar = document.querySelector(sites[env.site].selectors.input)
            const lvlsToParent = env.site == 'chatgpt' ? 3 : 2
            for (let i = 0 ; i < lvlsToParent ; i++) chatbar = chatbar?.parentNode
            return chatbar
        },

        tweak() {
            if (env.site != 'chatgpt') return
            const chatbarDiv = chatbar.get() ; if (!chatbarDiv) return
            const inputArea = chatbarDiv.querySelector(sites[env.site].selectors.input) ; if (!inputArea) return
            if (chatgpt.canvasIsOpen()) inputArea.parentNode.style.width = '100%'
            else if (!env.tallChatbar) { // narrow it to not clash w/ buttons
                const widths = { chatbar: chatbarDiv.getBoundingClientRect().width }
                const visibleBtnTypes = [...buttons.getVisibleTypes(), 'send']
                visibleBtnTypes.forEach(type =>
                    widths[type] = buttons[type]?.getBoundingClientRect().width
                            || document.querySelector(`${sites.chatgpt.selectors.btns.send}, ${
                                sites.chatgpt.selectors.btns.stop}`)?.getBoundingClientRect().width || 0 )
                const totalBtnWidths = visibleBtnTypes.reduce((sum, btnType) => sum + widths[btnType], 0)
                inputArea.parentNode.style.width = `${ // expand to close gap w/ buttons
                    widths.chatbar - totalBtnWidths -43 }px`
                inputArea.style.width = '100%' // rid h-scrollbar
            }
        },

        reset() { // all tweaks for popup master toggle-off
            const chatbarDiv = chatbar.get() ; if (!chatbarDiv) return
            if (env.site == 'chatgpt') {
                const inputArea = chatbarDiv.querySelector(sites.chatgpt.selectors.input)
                if (inputArea) inputArea.style.width = inputArea.parentNode.style.width = 'initial'
            } else if (env.site == 'poe') {
                const attachFileBtn = chatbarDiv.querySelector(sites.poe.selectors.btns.attachFile)
                if (attachFileBtn) attachFileBtn.style.cssText = ''
            }
        }
    }

    const toggle = {

        mode(mode, state = '') {
            switch (state.toUpperCase()) {
                case 'ON' : activateMode(mode) ; break
                case 'OFF' : deactivateMode(mode) ; break
                default : ( mode == 'wideScreen' ? document.head.contains(wideScreenStyle)
                          : mode == 'fullWindow' ? isFullWin() : chatgpt.isFullScreen() ) ? deactivateMode(mode)
                                                                                          : activateMode(mode)
            }

            function activateMode(mode) {
                if (mode == 'wideScreen') { document.head.append(wideScreenStyle) ; sync.mode('wideScreen') }
                else if (mode == 'fullWindow') {
                    const sidebarToggle = document.querySelector(sites[env.site].selectors.btns.sidebarToggle)
                    if (sidebarToggle) sidebarToggle.click()
                    else { document.head.append(fullWinStyle) ; sync.mode('fullWindow') }
                } else if (mode == 'fullScreen') document.documentElement.requestFullscreen()
            }

            function deactivateMode(mode) {
                if (mode == 'wideScreen') {
                    wideScreenStyle.remove() ; sync.mode('wideScreen')
                } else if (mode == 'fullWindow') {
                    const sidebarToggle = document.querySelector(sites[env.site].selectors.btns.sidebarToggle)
                    if (sidebarToggle) sidebarToggle.click()
                    else { fullWinStyle.remove() ; sync.mode('fullWindow') }
                } else if (mode == 'fullScreen') {
                    if (config.f11) modals.alert(
                        chrome.i18n.getMessage('alert_pressF11'), `${chrome.i18n.getMessage('alert_f11reason')}.`)
                    else document.exitFullscreen().catch(
                        err => console.error(app.symbol + ' » Failed to exit fullscreen', err))
                }
            }
        },

        tooltip(event) {
            update.tooltip(event.currentTarget.id.replace(/-btn$/, ''))
            tooltipDiv.style.opacity = event.type == 'mouseover' ? 1 : 0
        }
    }

    // Export dependencies to BUTTONS
    const tooltipDiv = dom.create.elem('div', { class: 'cwm-tooltip' }),
          tweaksStyle = dom.create.style()
    buttons.dependencies.import({ app, chatbar, env, sites, toggle, tooltipDiv, tweaksStyle })

    const update = {

        style: {

            chatbar() {
                chatbarStyle.innerText = (
                    env.site == 'chatgpt' ? ( config.widerChatbox ? ''
                        : `main form { max-width: ${chatbar.nativeWidth}px !important ; margin: auto }` )
                  : env.site == 'poe' ? ( config.widerChatbox && config.wideScreen ?
                        '[class^=ChatPageMainFooter_footerInner] { width: 98% ; margin-right: 15px }' : '' )
                  : '' )
            },

            tweaks() {
                tweaksStyle.innerText = (
                    ( env.site == 'chatgpt' ? (
                            '[id$=-btn]:hover { opacity: 100% !important }' // prevent chatbar btn dim on hover
                          + 'main { overflow: clip !important }' // prevent h-scrollbar...
                                // ...on sync.mode('fullWindow) => delayed chatbar.tweak()
                          + '[class^="@lg/thread"]:has(button[data-testid=close-button]),' // hide Get Plus spam banner
                                + '[class*=bottom]:has(button[data-testid=close-button]) { display: none }'
                    ) : env.site == 'perplexity' ?
                        `.${buttons.class} { transition: none }` : '' )) // prevent chatbar btn animation on hover-off
                  + ( config.tcbDisabled == false ? tcbStyle : '' ) // expand text input vertically
                  + ( config.hiddenHeader ? hhStyle : '' ) // hide header
                  + ( config.hiddenFooter ? hfStyle : '' ) // hide footer
                  + `#newChat-btn { display: ${ config.ncbDisabled == true ? 'none' : 'flex' }}`
                  + ( !config.btnAnimationsDisabled ? // zoom chatbar buttons on hover
                        ( `.${buttons.class}:hover {`
                            + `transform: scale(${ env.site == 'poe' ? 1.15 : 1.285}) ;`
                            + 'transition: transform 0.15s ease }' ) : ''
                    )
            },

            wideScreen() {
                wideScreenStyle.innerText = (
                    env.site == 'chatgpt' ? (
                        '.text-base { max-width: 100% !important }' // widen outer container
                      + ( !env.tallChatbar ? '.text-base:nth-of-type(2) { max-width: 97% !important }' : '' )
                  ) : env.site == 'perplexity' ? (
                        `${sites.perplexity.selectors.header} ~ div,` // outer container
                      + `${sites.perplexity.selectors.header} ~ div > div` // inner container
                          + '{ max-width: 100% }' // ...widen them
                      + '.col-span-8 { width: 154% }' // widen inner-left container
                      + '.col-span-4 { width: 13.5% ; position: absolute ; right: 0 }' // narrow right-bar
                  ) : env.site == 'poe' ? (
                        '[class*=ChatMessagesView] { width: 100% !important }' // widen outer container
                      + '[class^=Message] { max-width: 100% !important }' ) // widen speech bubbles
                  : '' )
            }
        },

        tooltip(btnType) { // text & position
            const visibleBtnTypes = buttons.getVisibleTypes()
            const ctrAddend = ( env.site == 'perplexity' ? ( location.pathname == '/' ? 94 : 105 )
                              : env.site == 'poe' ? 35 : 13 ) +25
            const spreadFactor = env.site == 'perplexity' ? 26.5 : env.site == 'poe' ? 28 : 30.55
            const iniRoffset = spreadFactor * ( visibleBtnTypes.indexOf(btnType) +1 ) + ctrAddend
                             + ( env.tallChatbar ? -2 : 4 )
            tooltipDiv.innerText = chrome.i18n.getMessage('tooltip_' + btnType + (
                !/full|wide/i.test(btnType) ? '' : (config[btnType] ? 'OFF' : 'ON')))
            tooltipDiv.style.right = `${ // x-pos
                iniRoffset - tooltipDiv.getBoundingClientRect().width /2 }px`
            tooltipDiv.style.bottom = ( // y-pos
                env.site == 'perplexity' ? ( location.pathname != '/' ? '58px' :
                    ( document.querySelector(sites.perplexity.selectors.btns.settings) ? 'revert-layer' : '50.5vh' ))
                                         : '50px' )
        }
    }

    const sync = {

        async configToUI(options) { // on toolbar popup toggles + AI tab activations
            const extensionWasDisabled = config.extensionDisabled
            await settings.load('extensionDisabled', ...sites[env.site].availFeatures)
            if (!extensionWasDisabled && config.extensionDisabled) { // outright disable modes/tweaks/btns
                wideScreenStyle.remove() ; fullWinStyle.remove()
                tweaksStyle.innerText = '' ; buttons.remove() ; chatbar.reset()
            } else if (!config.extensionDisabled) { // sync modes/tweaks/btns
                if (config.wideScreen ^ document.head.contains(wideScreenStyle)) { // sync Widescreen
                    supressNotifs() ; toggle.mode('wideScreen') }
                if (sites[env.site].hasSidebar) {
                    if (config.fullWindow ^ isFullWin()) { // sync Full-Window
                        supressNotifs() ; toggle.mode('fullWindow') }
                    sync.fullerWin() // sync Fuller Windows
                }
                update.style.tweaks() // sync TCB/NCB/HH/HF/BA
                update.style.chatbar() // sync WCB
                chatbar.tweak() // update chatgpt.com chatbar inner width
                buttons.insert() // since .remove()'d when config.extensionDisabled
                if (options?.updatedKey == 'btnAnimationsDisabled' && !config.btnAnimationsDisabled) // apply/remove fx
                    // ...to visually signal location + preview fx applied by Button Animations toggle-on
                    buttons.animate()
            }

            function supressNotifs() {
                if (!config.notifDisabled) {
                    settings.save('notifDisabled', true) // suppress notifs for cleaner UI
                    setTimeout(() => settings.save('notifDisabled', false), 55) // ...temporarily
                }
            }
        },

        fullerWin() {
            if (config.fullWindow && config.fullerWindows && !config.wideScreen) { // activate fuller windows
                document.head.append(wideScreenStyle) ; buttons.update.svg('wideScreen', 'on')
            } else if (!config.fullWindow) { // de-activate fuller windows
                fullWinStyle.remove() // to remove style too so sidebar shows
                if (!config.wideScreen) { // disable widescreen if result of fuller window
                    wideScreenStyle.remove() ; buttons.update.svg('wideScreen', 'off')
            }}
        },

        async mode(mode) { // setting + icon + tooltip + chatbar
            const state = ( mode == 'wideScreen' ? !!document.getElementById('wideScreen-mode')
                          : mode == 'fullWindow' ? isFullWin()
                                                 : chatgpt.isFullScreen() )
            settings.save(mode, state) ; buttons.update.svg(mode) ; update.tooltip(mode)
            if (!config.extensionDisabled) { // tweak UI
                if (mode == 'fullWindow') sync.fullerWin()
                if (env.site == 'chatgpt') setTimeout(() => chatbar.tweak(), // update inner width
                    mode == 'fullWindow' && ( config.wideScreen || config.fullerWindows )
                        && config.widerChatbox ? 111 : 0) // delay if toggled to/from active WCB to avoid wrong width
                else if (env.site == 'poe' && config.widerChatbox) update.style.chatbar() // sync WCB
                notify(`${chrome.i18n.getMessage('mode_' + mode)} ${
                          chrome.i18n.getMessage(`state_${ state ? 'on' : 'off' }`).toUpperCase()}`)
            }
            config.modeSynced = true ; setTimeout(() => config.modeSynced = false, 100) // prevent repetition
        }
    }

    function getScheme() {
        const rootElem = document.documentElement
        return env.site == 'perplexity' ? rootElem.dataset.colorScheme : rootElem.className
            || (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light')
    }

    function isFullWin() {
        return env.site == 'poe' ? !!document.getElementById('fullWindow-mode')
            : !sites[env.site].hasSidebar // false if sidebar non-existent
           || /\d+/.exec(getComputedStyle(document.querySelector(
                  sites[env.site].selectors.sidebar))?.width || '')[0] < 100
    }

    chatgpt.canvasIsOpen = function() {
        return document.querySelector('section.popover')?.getBoundingClientRect().top == 0 }

    // Run MAIN routine

    // Init UI props
    if (env.site == 'chatgpt') {
        sites.chatgpt.hasSidebar = await Promise.race([
            dom.elemIsLoaded(sites.chatgpt.selectors.btns.sidebarToggle), // true if sidebar toggle loads
            dom.elemIsLoaded(sites.chatgpt.selectors.btns.login).then(() => false), // false if login button loads
            new Promise(resolve => setTimeout(() => resolve(null), 3000)) // null if 3s passed
        ])
    }

    // Init FULL-MODE states
    config.fullScreen = chatgpt.isFullScreen()
    if (sites[env.site].selectors.btns.sidebarToggle) // site has native FW state
         config.fullWindow = isFullWin() // ...so match it
    else await settings.load('fullWindow') // otherwise load CWM's saved state

    // Append/stylize TOOLTIP div
    document.head.append(dom.create.style('.cwm-tooltip {'
        + 'background-color: rgba(0, 0, 0, 0.71) ; padding: 5px ; border-radius: 6px ; border: 1px solid #d9d9e3 ;'
        + 'font-size: 0.85rem ; color: white ;' // font style
        + 'box-shadow: 4px 6px 16px 0 rgb(0 0 0 / 38%) ;' // drop shadow
        + 'position: absolute ; bottom: 58px ; opacity: 0 ; transition: opacity 0.1s ; z-index: 9999 ;' // visibility
        + '-webkit-user-select: none ; -moz-user-select: none ; -ms-user-select: none ; user-select: none }'
    ))

    // Apply general style TWEAKS
    const tcbStyle = ( // heighten chatbox
              env.site == 'chatgpt' ? `div[class*=prose]:has(${sites.chatgpt.selectors.input})`
                                    : sites[env.site].selectors.input )
                   + '{ max-height: 68vh }'
    const hhStyle = sites[env.site].selectors.header + '{ display: none !important }' // hide header
                  + ( env.site == 'chatgpt' ? 'main { padding-top: 12px }' : '' ) // increase top-padding
    const hfStyle = sites[env.site].selectors.footer + '{ display: none }' // hide footer

    update.style.tweaks() ; document.head.append(tweaksStyle);

    // Add STARS styles
    ['black', 'white'].forEach(color => document.head.append(
        dom.create.elem('link', { rel: 'stylesheet',
            href: `https://assets.aiwebextensions.com/styles/rising-stars/dist/${
                color}.min.css?v=0cde30f9ae3ce99ae998141f6e7a36de9b0cc2e7`
    })))

    // Create WIDESCREEN style
    const wideScreenStyle = dom.create.style()
    wideScreenStyle.id = 'wideScreen-mode' // for sync.mode()
    if (!chatbar.get()) await dom.elemIsLoaded(sites[env.site].selectors.input)
    if (env.site == 'chatgpt') // store native chatbar width for Wider Chatbox style
        chatbar.nativeWidth = /\d+/.exec(getComputedStyle(document.querySelector('main form')).width)[0]
    update.style.wideScreen()

    // Create FULL-WINDOW style
    const fullWinStyle = dom.create.style()
    fullWinStyle.id = 'fullWindow-mode' // for sync.mode()
    fullWinStyle.innerText = sites[env.site].selectors.sidebar + '{ display: none }'

    // Create/append CHATBAR style
    const chatbarStyle = dom.create.style()
    update.style.chatbar() ; document.head.append(chatbarStyle)

    // Insert BUTTONS
    if (!config.extensionDisabled) {
        buttons.insert()

    // Restore PREV SESSION's state
        if (config.wideScreen) toggle.mode('wideScreen', 'ON')
        if (config.fullWindow && sites[env.site].hasSidebar) {
            if (sites[env.site].selectors.btns.sidebarToggle) // site has own FW config
                sync.mode('fullWindow') // ...so sync w/ it
            else toggle.mode('fullWindow', 'on') // otherwise self-toggle
        }
    }

    // Monitor NODE CHANGES to maintain button visibility + update colors
    let isTempChat = false, canvasWasOpen = chatgpt.canvasIsOpen()
    new MutationObserver(() => {

        // Maintain button visibility on nav
        if (config.extensionDisabled) return
        else if (!document.getElementById('fullScreen-btn') && chatbar.get() && buttons.status != 'inserting') {
            buttons.status = 'missing' ; buttons.insert() }

        // Maintain button colors + Widescreen button visibility on snowflake chatgpt.com
        if (env.site == 'chatgpt') {

            // Update button colors on temp chat toggle
            const chatbarIsBlack = !!document.querySelector('div[class*=bg-black]:not([id$=-btn])')
            if (chatbarIsBlack != isTempChat) { buttons.update.color() ; isTempChat = chatbarIsBlack }

            // Add/remove Widescreen button on Canvas mode toggle
            if (canvasWasOpen ^ chatgpt.canvasIsOpen()) {
                buttons.remove() ; buttons.create() // again for new h-offsets
                buttons.insert() ; chatbar.tweak() ; canvasWasOpen = !canvasWasOpen
            }
        }
    }).observe(document[env.site == 'poe' ? 'head' : 'body'], { attributes: true, subtree: true })

    // Monitor SCHEME PREF changes to update sidebar toggle + modal colors
    new MutationObserver(handleSchemePrefChange).observe( // for site scheme pref changes
        document.documentElement, { attributes: true, attributeFilter: ['class', 'data-color-scheme'] })
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener( // for browser/system scheme pref changes
        'change', () => requestAnimationFrame(handleSchemePrefChange))
    function handleSchemePrefChange() {
        const displayedScheme = getScheme()
        if (env.ui.scheme != displayedScheme) {
            env.ui.scheme = displayedScheme ; modals.stylize() ; buttons.update.color() }
    }

    // Monitor SIDEBAR to update full-window setting for sites w/ native toggle
    if (sites[env.site].selectors.btns.sidebarToggle && sites[env.site].hasSidebar) {
        const sidebarObserver = new MutationObserver(async () => {
            await new Promise(resolve => setTimeout(resolve, env.site == 'perplexity' ? 500 : 0))
            if ((config.fullWindow ^ isFullWin()) && !config.modeSynced) sync.mode('fullWindow')
        })
        setTimeout(() => { // delay half-sec before observing to avoid repeated toggles from node observer
            let obsTarget = document.querySelector(sites[env.site].selectors.sidebar)
            if (env.site == 'perplexity') obsTarget = obsTarget.parentNode
            sidebarObserver.observe(obsTarget, { attributes: true })
        }, 500)
    }

    // Add RESIZE LISTENER to update full screen setting/button + disable F11 flag
    window.addEventListener('resize', () => {
        const fullScreenState = chatgpt.isFullScreen()
        if (config.fullScreen && !fullScreenState) { // exiting full screen
            sync.mode('fullScreen') ; config.f11 = false }
        else if (!config.fullScreen && fullScreenState) // entering full screen
            sync.mode('fullScreen')
        if (env.site == 'chatgpt') chatbar.tweak() // update chatgpt.com chatbar inner width
    })

    // Add KEY LISTENER to enable flag on F11 + stop generating text on ESC
    document.addEventListener('keydown', event => {
        if ((event.key == 'F11' || event.keyCode == 122) && !config.fullScreen) config.f11 = true
        else if ((event.key.startsWith('Esc') || event.keyCode == 27) && !chatgpt.isIdle()) chatgpt.stop()
    })

})()
