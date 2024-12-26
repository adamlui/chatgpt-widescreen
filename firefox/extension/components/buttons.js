// Requires lib/chatgpt.js + lib/dom.js

window.buttons = {
    types: [ 'fullScreen', 'fullWindow', 'wideScreen', 'newChat' ], // right-to-left
    get class() { return `${this.imports.app.name.replace(/ /g, '-').toLowerCase()}-btn` },

    imports: {
        import(deps) { // { app, chatbar, env, sites, toggle, tooltipDiv, tweaksStyle }
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
        if (this.imports.env.site == 'chatgpt'
            && this.imports.chatbar.get()?.nextElementSibling
            && !this.imports.env.tallChatbar
        ) this.imports.env.tallChatbar = true
        const validBtnTypes = this.types.filter(type =>
                !(type == 'fullWindow' && !this.imports.sites[this.imports.env.site].hasSidebar)
             && !(type == 'wideScreen' && chatgpt.canvasIsOpen()))
        const bOffset = this.imports.env.site == 'poe' ? 1.1
                      : this.imports.env.site == 'perplexity' ? -13
                      : this.imports.env.tallChatbar ? 31 : -8.85
        const rOffset = this.imports.env.site == 'poe' ? -6.5
                      : this.imports.env.site == 'perplexity' ? -4
                      : this.imports.env.tallChatbar ? 48 : -0.25
        validBtnTypes.forEach(async (btnType, idx) => {
            this[btnType] = dom.create.elem('div')
            this[btnType].id = btnType + '-btn' // for toggle.tooltip()
            this[btnType].className = this.class // for update.style.tweaks()
            Object.assign(this[btnType].style, {
                position: this.imports.env.tallChatbar ? 'absolute' : 'relative', cursor: 'pointer',
                right: `${ rOffset + idx * bOffset }px`, // position left of prev button
                transition: 'transform 0.15s ease, opacity 0.5s ease' // for tweaksStyle's :hover + .insert()'s fade-in
            })
            if (this.imports.env.tallChatbar) this[btnType].style.bottom = '8.85px'
            else this[btnType].style.top = `${ this.imports.env.site == 'chatgpt' ? -3.25
                                             : this.imports.env.site == 'poe' ? ( btnType == 'newChat' ? 0.25 : 3 )
                                             : 0 }px`
            if (/chatgpt|perplexity/.test(this.imports.env.site)) { // assign classes + tweak styles
                const btnSelectors = this.imports.sites[this.imports.env.site].selectors.btns
                const rightBtnSelector = `${btnSelectors.send}, ${btnSelectors.voice}`
                const rightBtn = await new Promise(resolve => {
                    const rightBtn = document.querySelector(rightBtnSelector)
                    if (rightBtn) resolve(rightBtn)
                    else new MutationObserver((_, obs) => {
                        const rightBtn = document.querySelector(rightBtnSelector)
                        if (rightBtn) { obs.disconnect() ; resolve(rightBtn) }
                    }).observe(document.body, { childList: true, subtree: true })
                })
                this[btnType].classList.add(...(rightBtn?.classList || []))
                Object.assign(this[btnType].style, { // remove dark mode overlay
                    backgroundColor: 'transparent', borderColor: 'transparent' })
            }

            // Add hover/click listeners
            this[btnType].onmouseover = this[btnType].onmouseout = this.imports.toggle.tooltip
            this[btnType].onclick = () => {
                if (btnType == 'newChat') {
                    document.querySelector(
                        this.imports.sites[this.imports.env.site].selectors.btns.newChat)?.click()
                    this.imports.tooltipDiv.style.opacity = 0
                } else this.imports.toggle.mode(btnType)
            }
        })
    },

    insert() {
        if (this.status?.startsWith('insert') || document.getElementById('fullScreen-btn')) return
        this.status = 'inserting' ; if (!this.wideScreen) this.create()

        // Init elems
        const chatbarDiv = this.imports.chatbar.get() ; if (!chatbarDiv) return
        const btnTypesToInsert = this.types.slice().reverse() // to left-to-right for insertion order
            .filter(type => !(type == 'fullWindow' && !this.imports.sites[this.imports.env.site].hasSidebar)
                         && !(type == 'wideScreen' && chatgpt.canvasIsOpen()))
        const parentToInsertInto = this.imports.env.site == 'chatgpt' ? chatbarDiv.nextElementSibling || chatbarDiv
                                 : chatbarDiv.lastChild // (Perplexity Pro spam toggle or Poe Mic/Send btns) parent
        const elemToInsertBefore = this.imports.env.site == 'chatgpt' ? parentToInsertInto.lastChild
                                 : parentToInsertInto.firstChild // Pro spam toggle or Poe Mic btn
        // Insert buttons
        btnTypesToInsert.slice().reverse().forEach((btnType, idx) => {
            const btn = this[btnType]
            this.update.svg(btnType) // update icon
            btn.style.opacity = 0 // hide for fade-in
            parentToInsertInto.insertBefore(btn, elemToInsertBefore) // insert buttons
            setTimeout(() => btn.style.opacity = 1, (idx +1) *30) // fade-in
        })
        parentToInsertInto.insertBefore(this.imports.tooltipDiv, elemToInsertBefore) // add tooltips
        setTimeout(() => this.imports.chatbar.tweak(), 1) ; this.update.color()
        this.status = 'inserted'
    },

    remove() {
        if (!this.imports.chatbar.get() || !document.getElementById('fullScreen-btn')) return
        this.types.forEach(type => this[type]?.remove()) ; this.imports.tooltipDiv?.remove()
        this.status = 'missing' // ensure next buttons.insert() doesn't return early
    },

    update: {
        color() {
            buttons.color = (
                buttons.imports.env.site == 'chatgpt' ? (
                    document.querySelector('.dark.bg-black') || buttons.imports.env.ui.scheme == 'dark' ? 'white' : '#202123' )
              : buttons.imports.env.site == 'perplexity' ? (
                    document.documentElement.dataset.colorScheme == 'dark' ?
                        'oklch(var(--dark-text-color-100)/var(--tw-text-opacity))'
                      : 'oklch(var(--text-color-100)/var(--tw-text-opacity))' )
              : 'currentColor' )

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
                const btnSize = buttons.imports.env.site == 'chatgpt' ? 17 : 18
                btnSVG.setAttribute('height', btnSize) ; btnSVG.setAttribute('width', btnSize)
            }
            btnSVG.setAttribute('viewBox', (
                mode == 'newChat' ? '11 6 ' : mode == 'fullWindow' ? '-2 -0.5 ' : '8 8 ' )
            + ( mode == 'newChat' ? '13 13' : mode == 'fullWindow' ? '24 24' : '20 20' )
            )
            btnSVG.style.pointerEvents = 'none' // prevent triggering tooltips twice
            btnSVG.style.height = btnSVG.style.width = ( // override button resizing
                buttons.imports.env.site == 'chatgpt' ? '1.3rem' : 18 )

            // Update SVG elements
            btnSVG.textContent = ''
            const svgElems = config[mode] || state.toLowerCase() == 'on' ? ONelems : OFFelems
            svgElems.forEach(elem => btnSVG.append(elem))

            // Update SVG
            if (!btn.contains(btnSVG)) btn.append(btnSVG)
        }
    },

    getVisibleTypes() { // used in update.tooltip() + chatbar.tweak() for horizontal math
        return this.types.filter(type =>
            !(type == 'fullWindow' && !this.imports.sites[this.imports.env.site].hasSidebar)
         && !(type == 'wideScreen' && chatgpt.canvasIsOpen())
         && !(type == 'newChat' && config.ncbDisabled))
    },

    animate() { // used in buttons.insert() + sync.configToUI() on Button Animations toggle-on
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
