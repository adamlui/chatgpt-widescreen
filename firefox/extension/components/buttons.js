// Requires lib/chatgpt.js + lib/dom.js

window.buttons = {
    types: [ 'fullScreen', 'fullWindow', 'wideScreen', 'newChat' ], // right-to-left
    get class() { return `${this.imports.app.name.replace(/ /g, '-').toLowerCase()}-btn` },

    state: {
        status: 'missing', // or 'inserting', 'inserted'
        hasFadedIn: false // to prevent fade-in on subsequent .insert()s till .remove()
    },

    imports: {
        import(deps) { // { app, chatbar, env, getScheme, sites, toggle, tooltipDiv, tweaksStyle }
            for (const depName in deps) this[depName] = deps[depName] }
    },

    svgElems: {
        fullScreen: {
            off: [
                dom.create.svgElem('path', { stroke: 'none', d: 'm10,16 2,0 0,-4 4,0 0,-2 L 10,10 l 0,6 0,0 z' }),
                dom.create.svgElem('path', { stroke: 'none', d: 'm20,10 0,2 4,0 0,4 2,0 L 26,10 l -6,0 0,0 z' }),
                dom.create.svgElem('path', { stroke: 'none', d: 'm24,24 -4,0 0,2 L 26,26 l 0,-6 -2,0 0,4 0,0 z' }),
                dom.create.svgElem('path',
                    { stroke: 'none', d: 'M 12,20 10,20 10,26 l 6,0 0,-2 -4,0 0,-4 0,0 z' }) ],
            on: [
                dom.create.svgElem('path', { stroke: 'none', d: 'm14,14-4,0 0,2 6,0 0,-6 -2,0 0,4 0,0 z' }),
                dom.create.svgElem('path', { stroke: 'none', d: 'm22,14 0,-4 -2,0 0,6 6,0 0,-2 -4,0 0,0 z' }),
                dom.create.svgElem('path', { stroke: 'none', d: 'm20,26 2,0 0,-4 4,0 0,-2 -6,0 0,6 0,0 z' }),
                dom.create.svgElem('path', { stroke: 'none', d: 'm10,22 4,0 0,4 2,0 0,-6 -6,0 0,2 0,0 z' }) ]
        },

        fullWin: [
            dom.create.svgElem('rect',
                { fill: 'none', x: '3', y: '3', width: '17', height: '17', rx: '2', ry: '2' }),
            dom.create.svgElem('line', { x1: '9', y1: '3', x2: '9', y2: '21' })
        ],

        newChat: [ dom.create.svgElem('path', { stroke: 'none', d: 'M22,13h-4v4h-2v-4h-4v-2h4V7h2v4h4V13z' }) ],

        wideScreen: {
            off: [
                dom.create.svgElem('path', { stroke: 'none', 'fill-rule': 'evenodd',
                    d: 'm28,11 0,14 -20,0 0,-14 z m-18,2 16,0 0,10 -16,0 0,-10 z' }) ],
            on: [
                dom.create.svgElem('path', { stroke: 'none', 'fill-rule': 'evenodd',
                    d: 'm26,13 0,10 -16,0 0,-10 z m-14,2 12,0 0,6 -12,0 0,-6 z' }) ]
        }
    },

    create() {
        if (/chatgpt|openai/.test(this.imports.env.site)
            && this.imports.chatbar.get()?.nextElementSibling
            && !this.imports.env.tallChatbar
        ) this.imports.env.tallChatbar = true
        const validBtnTypes = this.getTypes.valid()
        const bOffset = this.imports.env.site == 'poe' ? 1.1
                      : this.imports.env.site == 'perplexity' ? -13
                      : this.imports.env.tallChatbar ? 31 : -8.85
        const rOffset = this.imports.env.site == 'poe' ? -6.5
                      : this.imports.env.site == 'perplexity' ? -4
                      : this.imports.env.tallChatbar ? 48 : -0.25
        validBtnTypes.forEach(async (btnType, idx) => {
            const btn = this[btnType] = dom.create.elem('div')
            btn.id = `${btnType}-btn` // for toggle.tooltip()
            btn.className = this.class // for update.style.tweaks()
            Object.assign(btn.style, {
                position: this.imports.env.tallChatbar ? 'absolute' : 'relative', cursor: 'pointer',
                right: `${ rOffset + idx * bOffset }px`, // position left of prev button
                transition: 'transform 0.15s ease, opacity 0.5s ease' // for tweaksStyle's :hover + .insert()'s fade-in
            })
            if (this.imports.env.tallChatbar) btn.style.bottom = '8.85px'
            else btn.style.top = `${ /chatgpt|openai/.test(this.imports.env.site) ? -3.25
                                   : this.imports.env.site == 'poe' ? ( btnType == 'newChat' ? 0.25 : 3 ) : 0 }px`
            if (/chatgpt|perplexity/.test(this.imports.env.site)) { // assign classes + tweak styles
                const btnSelectors = this.imports.sites[this.imports.env.site].selectors.btns,
                      rightBtnSelector = `${btnSelectors.send}, ${btnSelectors.voice}`,
                      rightBtn = await dom.getLoadedElem(rightBtnSelector)
                btn.classList.add(...(rightBtn?.classList || []))
                Object.assign(btn.style, { // remove dark mode overlay
                    backgroundColor: 'transparent', borderColor: 'transparent' })
            }

            // Add hover/click listeners
            btn.onmouseover = btn.onmouseout = this.imports.toggle.tooltip
            btn.onclick = () => {
                if (btnType == 'newChat') {
                    document.querySelector(this.imports.sites[this.imports.env.site].selectors.btns.newChat)?.click()
                    this.imports.tooltipDiv.style.opacity = 0
                } else this.imports.toggle.mode(btnType)
            }
        })
    },

    insert() {
        if (this.state.status?.startsWith('insert') || document.getElementById('fullScreen-btn')) return
        this.state.status = 'inserting' ; if (!this.wideScreen) this.create()

        // Init elems
        const chatbarDiv = this.imports.chatbar.get() ; if (!chatbarDiv) return
        const btnTypesToInsert = this.getTypes.valid()
        const parentToInsertInto = (
            /chatgpt|openai/.test(this.imports.env.site) ? chatbarDiv.nextElementSibling || chatbarDiv
          : chatbarDiv.lastChild ) // parent of (Perplexity Pro spam toggle or Poe Mic/Send btns)
        const elemToInsertBefore = parentToInsertInto[
            /chatgpt|openai/.test(this.imports.env.site) ? 'lastChild'
          : 'firstChild'] // Perplexity Pro spam toggle or Poe Mic btn

        // Insert buttons
        btnTypesToInsert.slice().reverse().forEach((btnType, idx) => {
            const btn = this[btnType]
            this.update.svg(btnType) // update icon
            parentToInsertInto.insertBefore(btn, elemToInsertBefore) // insert button
            if (!this.state.hasFadedIn) { // fade-in
                btn.style.opacity = 0 ; setTimeout(() => btn.style.opacity = 1, (idx +1) *30)
                if (idx == btnTypesToInsert.length -1) // final button scheduled for fade-in
                    this.state.hasFadedIn = true // ...so disable fade-in on subsequent .insert()s till .remove()
            }
        })
        parentToInsertInto.insertBefore(this.imports.tooltipDiv, elemToInsertBefore) // add tooltips
        setTimeout(() => this.imports.chatbar.tweak(), 1) ; this.update.color()
        this.state.status = 'inserted'
    },

    remove() {
        if (!this.imports.chatbar.get() || !document.getElementById('fullScreen-btn')) return
        this.types.forEach(type => this[type]?.remove()) ; this.imports.tooltipDiv?.remove()
        this.state.status = 'missing' // ensure next .insert() doesn't return early
        this.state.hasFadedIn = false // ensure next .insert() fades in buttons
    },

    update: {
        color() {
            buttons.color = (
                /chatgpt|openai/.test(buttons.imports.env.site) ? (
                    document.querySelector('.dark.bg-black')
                        || buttons.imports.env.ui.scheme == 'dark' ? 'white' : '#202123'
                ) : buttons.imports.env.site == 'perplexity' ? (
                    buttons.imports.getScheme() == 'dark' ?
                        'oklch(var(--dark-text-color-100)/var(--tw-text-opacity))'
                      : 'oklch(var(--text-color-100)/var(--tw-text-opacity))'
                ) : 'currentColor'
            )
            if (buttons.wideScreen?.style.fill != buttons.color)
                buttons.types.forEach(type => {
                    if (buttons[type]) buttons[type].style.fill = buttons[type].style.stroke = buttons.color })
        },

        svg(mode, state = '') {
            if (!buttons.wideScreen) buttons.create()

            // Pick appropriate button/elements
            const [btn, ONelems, OFFelems] = (
                mode == 'fullScreen' ? [
                    buttons.fullScreen, buttons.svgElems.fullScreen.on, buttons.svgElems.fullScreen.off]
              : mode == 'fullWindow' ? [buttons.fullWindow, buttons.svgElems.fullWin, buttons.svgElems.fullWin]
              : mode == 'wideScreen' ? [
                    buttons.wideScreen, buttons.svgElems.wideScreen.on, buttons.svgElems.wideScreen.off]
                                     : [buttons.newChat, buttons.svgElems.newChat, buttons.svgElems.newChat])
            if (!btn) return

            // Set SVG attributes
            const btnSVG = btn?.querySelector('svg') || dom.create.svgElem('svg')
            if (mode == 'fullWindow') { // stylize full-window button
                btnSVG.setAttribute('stroke-width', '2')
                const btnSize = /chatgpt|openai/.test(buttons.imports.env.site) ? 17 : 18
                btnSVG.setAttribute('height', btnSize) ; btnSVG.setAttribute('width', btnSize)
            }
            btnSVG.setAttribute('viewBox', (
                mode == 'newChat' ? '11 6 ' : mode == 'fullWindow' ? '-2 -0.5 ' : '8 8 ' )
            + ( mode == 'newChat' ? '13 13' : mode == 'fullWindow' ? '24 24' : '20 20' )
            )
            btnSVG.style.pointerEvents = 'none' // prevent triggering tooltips twice
            btnSVG.style.height = btnSVG.style.width = ( // override button resizing
                /chatgpt|openai/.test(buttons.imports.env.site) ? '1.3rem' : 18 )

            // Update SVG elements
            btnSVG.textContent = ''
            const svgElems = config[mode] || state.toLowerCase() == 'on' ? ONelems : OFFelems
            svgElems.forEach(elem => btnSVG.append(elem))

            // Update SVG
            if (!btn.contains(btnSVG)) btn.append(btnSVG)
        }
    },

    getTypes: {
        valid() { // used in buttons.create() + buttons.insert() + this.visible()
            return buttons.types.filter(type =>
                !(type == 'fullWindow' && !buttons.imports.sites[buttons.imports.env.site].hasSidebar)
             && !(type == 'wideScreen' && chatgpt.canvasIsOpen()))
        },

        visible() { // used in update.tooltip() + chatbar.tweak() for horizontal math
            return this.valid().filter(type => !(type == 'newChat' && config.ncbDisabled)) }
    },

    animate() { // used in sync.configToUI() on Button Animations toggle-on
        const btnHoverStyles = new RegExp(`.${this.class}:hover\\s*\\{([^}]*)\\}`, 'm')
            .exec(this.imports.tweaksStyle.innerText)?.[1].trim()
        this.types.slice().reverse().forEach((btnType, idx) => {
            const btn = this[btnType] ; if (!btn) return
            setTimeout(() => { // apply/remove fx
                btn.style.cssText += btnHoverStyles
                setTimeout(() => btn.style.cssText = btn.style.cssText.replace(btnHoverStyles, ''), 150)
            }, idx *75) // ...staggered @ 75ms interval
        })
    }
};
