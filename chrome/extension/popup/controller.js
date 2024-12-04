(async () => {

    // Import JS resources
    for (const resource of ['components/icons.js', 'lib/dom.js', 'lib/settings.js'])
        await import(chrome.runtime.getURL(resource))

    // Init ENV context
    const env = { site: /([^.]+)\.[^.]+$/.exec(new URL((await chrome.tabs.query(
        { active: true, currentWindow: true }))[0].url).hostname)?.[1] }
    settings.import({ env }) // to load/save active tab's settings using env.site

    // Import DATA
    const { app } = await chrome.storage.sync.get('app'),
          { sites } = await chrome.storage.sync.get('sites')
    icons.import({ app }) // for src's using app.urls.mediaHost

    // Define FUNCTIONS

    async function sendMsgToActiveTab(action, options) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        return await chrome.tabs.sendMessage(activeTab.id, { action: action, options: { ...options }})
    }

    function notify(msg, pos = 'bottom-right') { sendMsgToActiveTab('notify', { msg, pos }) }

    const sync = {
        fade() {

            // Update toolbar icon
            const iconDimensions = [16, 32, 48, 64, 128, 223], iconPaths = {}
            iconDimensions.forEach(dimension => iconPaths[dimension] = `../icons/${
                config.extensionDisabled ? 'faded/' : '' }icon${dimension}.png` )
            chrome.action.setIcon({ path: iconPaths })

            // Update menu contents
            document.querySelectorAll('div.logo, div.menu-title, div.menu')
                .forEach(elem => {
                    elem.classList.remove(masterToggle.checked ? 'disabled' : 'enabled')
                    elem.classList.add(masterToggle.checked ? 'enabled' : 'disabled')
                })
        },

        configToUI() { return sendMsgToActiveTab('syncConfigToUI') }
    }

    // Run MAIN routine

    // Init MASTER TOGGLE
    const masterToggle = document.querySelector('.main-toggle input')
    await settings.load('extensionDisabled')
    masterToggle.checked = !config.extensionDisabled ; sync.fade()
    masterToggle.onchange = () => {
        settings.save('extensionDisabled', !config.extensionDisabled)
        Object.keys(sync).forEach(key => sync[key]()) // sync fade + storage to UI
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
                    settings.save(key, !config[key]) ; sync.configToUI()
                    notify(`${settings.controls[key].label} ${chrome.i18n.getMessage(`state_${
                        /disabled/i.test(key) != config[key] ? 'on' : 'off' }`).toUpperCase()}`)
                }
            }
        })

        sync.fade() // in case master toggle off
    }

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

    // Create/append FOOTER container
    const footer = dom.create.elem('footer')
    document.body.append(footer)

    // Create/append CHATGPT.JS footer logo
    const cjsDiv = dom.create.elem('div', { class: 'chatgpt-js' })
    const cjsLogo = dom.create.elem('img', {
        title: `${chrome.i18n.getMessage('about_poweredBy')} chatgpt.js`,
        src: `${app.urls.cjsMediaHost}/images/badges/powered-by-chatgpt.js-faded.png` })
    cjsLogo.onmouseover = cjsLogo.onmouseout = event => cjsLogo.src = `${
        app.urls.cjsMediaHost}/images/badges/powered-by-chatgpt.js${ event.type == 'mouseover' ? '' : '-faded' }.png`
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

    // Hide loading spinner
    document.querySelectorAll('[class^="loading"]').forEach(elem => elem.style.display = 'none')

})()
