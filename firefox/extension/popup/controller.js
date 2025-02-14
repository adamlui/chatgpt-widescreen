(async () => {

    // Import JS resources
    for (const resource of ['components/icons.js', 'lib/dom.js', 'lib/settings.js'])
        await import(chrome.runtime.getURL(resource))

    // Init ENV context
    const env = { site: /([^.]+)\.[^.]+$/.exec(new URL((await chrome.tabs.query(
        { active: true, currentWindow: true }))[0].url).hostname)?.[1] }

    // Import DATA
    const { app } = await chrome.storage.sync.get('app'),
          { sites } = await chrome.storage.sync.get('sites')

    // Export DEPENDENCIES to imported resources
    icons.import({ app }) // for src's using app.urls.assetHost
    settings.import({ site: env.site, sites }) // to load/save active tab's settings + `${site}Disabled`

    // Define FUNCTIONS

    function notify(msg, pos = 'bottom-right') { sendMsgToActiveTab('notify', { msg, pos }) }

    async function sendMsgToActiveTab(action, options) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        return await chrome.tabs.sendMessage(activeTab.id, { action: action, options: { ...options }})
    }

    const sync = {
        fade() {

            // Update toolbar icon
            chrome.action.setIcon({ path: Object.fromEntries(
                Object.keys(chrome.runtime.getManifest().icons).map(dimension =>
                    [dimension, `../icons/${ config.extensionDisabled ? 'faded/' : '' }icon${dimension}.png`]
            ))})

            // Update menu contents
            const siteHomeURL = sites[env.site]?.urls?.homepage?.replace(/^https?:\/\//, ''),
                  siteToggle = document.querySelector(`div[title*="${siteHomeURL}"] input`),
                  extensionIsDisabled = !masterToggle.checked || ( siteToggle ? !siteToggle.checked : false )
            document.querySelectorAll('div.logo, div.menu-title, div.menu')
                .forEach(elem => elem.classList.toggle('disabled', extensionIsDisabled))
        },

        configToUI(options) { return sendMsgToActiveTab('syncConfigToUI', options) }
    }

    function toggleSiteSettingsVisibility() {
        Object.assign(siteSettingsTogglesDiv.style, siteSettingsTogglesDiv.style.opacity == 0 ?
            { position: '', left: '', opacity: 1 } // show
          : { position: 'absolute', left: '-9999px', opacity: 0 }) // hide using position to support transition
    }

    // Run MAIN routine

    // Init MASTER TOGGLE
    const masterToggle = document.querySelector('input')
    const appName = ( // for shorter notifs
        await chrome.i18n.getAcceptLanguages())[0].startsWith('en') ? app.name : chrome.i18n.getMessage('appName')
    await settings.load('extensionDisabled')
    masterToggle.checked = !config.extensionDisabled
    masterToggle.onchange = async () => {
        settings.save('extensionDisabled', !config.extensionDisabled)
        Object.keys(sync).forEach(key => sync[key]()) // sync fade + storage to UI
        if (!config.notifDisabled) notify(`${appName} 🧩 ${
            chrome.i18n.getMessage(`state_${ config.extensionDisabled ? 'off' : 'on' }`).toUpperCase()}`)
    }

    // Create CHILD menu entries on matched pages
    const matchHosts = chrome.runtime.getManifest().content_scripts[0].matches
        .map(url => url.replace(/^https?:\/\/|\/.*$/g, ''))
    if (matchHosts.some(host => host.includes(env.site))) {
        await settings.load(sites[env.site].availFeatures)

        // Create/insert child section
        const togglesDiv = dom.create.elem('div', { class: 'menu' })
        document.querySelector('.menu-header').insertAdjacentElement('afterend', togglesDiv)

        // Create/insert child entries
        Object.keys(settings.controls).forEach(key => {
            if (sites[env.site].availFeatures.includes(key)) {

                // Init elems
                const menuItemDiv = dom.create.elem('div', {
                    class: 'menu-item menu-area', title: settings.controls[key].helptip })
                const menuLabel = dom.create.elem('label', { class: 'toggle-switch menu-icon' }),
                      menuInput = dom.create.elem('input', { type: 'checkbox' }),
                      menuSlider = dom.create.elem('span', { class: 'slider' }),
                      menuLabelSpan = dom.create.elem('span')
                menuLabelSpan.textContent = settings.controls[key].label
                menuInput.checked = /disabled/i.test(key) ^ config[key]

                // Assemble/append elems
                menuLabel.append(menuInput, menuSlider)
                menuItemDiv.append(menuLabel, menuLabelSpan)
                togglesDiv.append(menuItemDiv)

                // Add listeners
                menuItemDiv.onclick = () => menuInput.click()
                menuInput.onclick = menuSlider.onclick = event => // prevent double toggle
                    event.stopImmediatePropagation()
                menuInput.onchange = () => {
                    settings.save(key, !config[key]) ; sync.configToUI({ updatedKey: key })
                    notify(`${settings.controls[key].label} ${chrome.i18n.getMessage(`state_${
                        /disabled/i.test(key) != config[key] ? 'on' : 'off' }`).toUpperCase()}`)
                }
            }
        })
    }

    // Create SITE SETTINGS
    const siteSettingsRow = dom.create.elem('div', {
        id: 'site-settings', class: 'menu-item menu-area',
        title: `${chrome.i18n.getMessage('helptip_enableDisable')} ${appName} ${
            chrome.i18n.getMessage('helptip_perSite')}`
    })
    const siteSettingsLabel = dom.create.elem('label', { class: 'menu-icon' })
    const siteSettingsLabelSpan = dom.create.elem('span')
    const siteSettingsTogglesDiv = dom.create.elem('div',
        { style: 'position: absolute ; left: -99px ; opacity: 0 ; padding-left: 15px ; transition: 0.35s ease-in-out' })
    siteSettingsLabel.innerText = '🌐'
    siteSettingsLabelSpan.textContent = chrome.i18n.getMessage('menuLabel_siteSettings')
    siteSettingsRow.append(siteSettingsLabel, siteSettingsLabelSpan)
    document.body.append(siteSettingsRow, siteSettingsTogglesDiv)
    for (const site of Object.keys(sites)) { // create toggle per site
        const siteHomeURL = sites[site].urls.homepage.replace(/^https?:\/\//, '')

        // Init elems
        const toggleDiv = dom.create.elem('div', {
            class: 'menu-item menu-area',
            title: `${chrome.i18n.getMessage('helptip_run')} ${appName} on ${siteHomeURL}`
        })
        const toggleLabel = dom.create.elem('label', { class: 'toggle-switch menu-icon' }),
              toggleInput = dom.create.elem('input', { type: 'checkbox' }),
              toggleSlider = dom.create.elem('span', { class: 'slider' }),
              toggleLabelSpan = dom.create.elem('span')
        toggleLabelSpan.textContent = siteHomeURL
        await settings.load(`${site}Disabled`) ; toggleInput.checked = !config[`${site}Disabled`]
        if (env.site == site) env.siteDisabled = config[`${site}Disabled`] // to auto-expand toggles later if true

        // Assemble/append elems
        toggleLabel.append(toggleInput, toggleSlider) ; toggleDiv.append(toggleLabel, toggleLabelSpan)
        siteSettingsTogglesDiv.append(toggleDiv)

        // Add listeners
        toggleDiv.onclick = () => toggleInput.click()
        toggleInput.onclick = toggleSlider.onclick = event => event.stopImmediatePropagation() // prevent double toggle
        toggleInput.onchange = () => {
            settings.save(`${site}Disabled`, !config[`${site}Disabled`]) ; sync.configToUI({ updatedKey: `${site}Disabled` })
            if (env.site == site) { // fade/notify if setting of active site toggled
                sync.fade()
                notify(`${appName} 🧩 ${
                    chrome.i18n.getMessage(`state_${config[`${site}Disabled`] ? 'off' : 'on' }`).toUpperCase()}`)
            }
        }
    }
    siteSettingsRow.onclick = toggleSiteSettingsVisibility
    if (env.siteDisabled) toggleSiteSettingsVisibility() // expand to signal how to ungray menu

    // LOCALIZE labels
    let translationOccurred = false
    document.querySelectorAll('[data-locale]').forEach(elem => {
        const localeKeys = elem.dataset.locale.split(' '),
              translatedText = localeKeys.map(key => chrome.i18n.getMessage(key)).join(' ')
        if (translatedText != elem.innerText) {
            elem.innerText = translatedText ; translationOccurred = true
    }})
    if (translationOccurred) // update <html lang> attr
        document.documentElement.lang = chrome.i18n.getUILanguage().split('-')[0]

    sync.fade() // based on master/site toggle

    // Create/append FOOTER container
    const footer = dom.create.elem('footer') ; document.body.append(footer)

    // Create/append CHATGPT.JS footer logo
    const cjsDiv = dom.create.elem('div', { class: 'chatgpt-js' })
    const cjsLogo = dom.create.elem('img', {
        title: `${chrome.i18n.getMessage('about_poweredBy')} chatgpt.js`,
        src: `${app.urls.cjsAssetHost}/images/badges/powered-by-chatgpt.js-faded.png?b2a1975` })
    cjsLogo.onmouseover = cjsLogo.onmouseout = event => cjsLogo.src = `${
        app.urls.cjsAssetHost}/images/badges/powered-by-chatgpt.js${
            event.type == 'mouseover' ? '' : '-faded' }.png?b2a1975`
    cjsLogo.onclick = () => { chrome.tabs.create({ url: app.urls.chatgptJS }) ; close() }
    cjsDiv.append(cjsLogo) ; footer.append(cjsDiv)

    // Create/append ABOUT footer button
    const aboutSpan = dom.create.elem('span', {
        title: `${chrome.i18n.getMessage('menuLabel_about')} ${chrome.i18n.getMessage('appName')}`,
        class: 'menu-icon menu-area', style: 'right:30px ; padding-top: 2px' })
    const aboutIcon = icons.create({ name: 'questionMark', width: 15, height: 13, style: 'margin-bottom: 0.04rem' })
    aboutSpan.onclick = () => { chrome.runtime.sendMessage({ action: 'showAbout' }) ; close() }
    aboutSpan.append(aboutIcon) ; footer.append(aboutSpan)

    // Create/append RELATED EXTENSIONS footer button
    const moreExtensionsSpan = dom.create.elem('span', {
        title:  chrome.i18n.getMessage('btnLabel_moreAIextensions'),
        class: 'menu-icon menu-area', style: 'right:2px ; padding-top: 2px' })
    const moreExtensionsIcon = icons.create({ name: 'plus', size: 16 })
    moreExtensionsSpan.onclick = () => { chrome.tabs.create({ url: app.urls.relatedExtensions }) ; close() }
    moreExtensionsSpan.append(moreExtensionsIcon) ; footer.append(moreExtensionsSpan)

    // Remove loading spinner
    document.querySelectorAll('[class^=loading]').forEach(elem => elem.remove())

})()
