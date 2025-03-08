// Requires dom.js + site: env.site + sites

window.chatbar = {
    import(deps) { Object.assign(this.imports = this.imports || {}, deps) },

    async get() {
        const site = this.imports.site
        return site == 'chatgpt' ? document.querySelector('[id^=composer]')
             : (await dom.get.loadedElem(this.imports.sites[site].selectors.input)).parentNode.parentNode
    },

    is: {
        dark() {
            return chatbar.imports.site != 'chatgpt' ? undefined
                : getComputedStyle(document.getElementById('composer-background') || document.documentElement)
                    .backgroundColor == 'rgb(48, 48, 48)'
        },

        async tall() { return (await chatbar.get())?.getBoundingClientRect().height > 60 }
    },

    async reset() { // all tweaks for popup master toggle-off
        const site = this.imports.site
        const chatbarDiv = await this.get() ; if (!chatbarDiv) return
        const selectors = this.imports.sites[site].selectors
        if (site == 'chatgpt') { // restore chatbar inner width
            const inputArea = chatbarDiv.querySelector(selectors.input)
            if (inputArea) inputArea.style.width = inputArea.parentNode.style.width = 'initial'
        } else if (site == 'perplexity') { // remove left-align Attach File + Search buttons
            const leftAlignedBtns = chatbarDiv.querySelectorAll('[left-aligned]')
            if (leftAlignedBtns.length) {
                const sendBtn = chatbarDiv.querySelector(selectors.btns.send) ; if (!sendBtn) return
                leftAlignedBtns.forEach(btn => {
                    sendBtn.parentNode.before(btn.parentNode) // restore to left of Send
                    btn.style.margin = '' ; btn.removeAttribute('left-aligned') // reset margins/attr
                })
                chatbarDiv.querySelector('button').closest('div').style.marginRight = '' // reset gap
            }
        } else if (site == 'poe') { // restore Poe Mic button position
            const micBtn = chatbarDiv.querySelector(selectors.btns.mic) ; if (!micBtn) return
            micBtn.style.marginRight = ''
        }
    },

    async tweak() { // update ChatGPT chatbar inner width or left-align Perplexity btns or move Poe Mic btn right
        const site = this.imports.site
        const chatbarDiv = await this.get() ; if (!chatbarDiv) return
        const selectors = this.imports.sites[site].selectors
        if (site == 'chatgpt') { // update chatbar inner width
            const inputArea = chatbarDiv.querySelector(selectors.input) ; if (!inputArea) return
            if (chatgpt.canvasIsOpen()) inputArea.parentNode.style.width = '100%'
            else if (!await this.is.tall()) { // narrow it to not clash w/ buttons
                const widths = { chatbar: chatbarDiv.getBoundingClientRect().width }
                const visibleBtnTypes = [...buttons.getTypes.visible(), 'end']
                visibleBtnTypes.forEach(type => widths[type] = buttons[type]?.getBoundingClientRect().width
                  || document.querySelector(`${selectors.btns.send}, ${selectors.btns.stop}, ${selectors.btns.voice}`)
                        ?.getBoundingClientRect().width || 0 )
                const totalBtnWidths = visibleBtnTypes.reduce((sum, btnType) => sum + widths[btnType], 0)
                inputArea.parentNode.style.width = `${ // expand to close gap w/ buttons
                    widths.chatbar - totalBtnWidths -43 }px`
                inputArea.style.width = '100%' // rid h-scrollbar
            }
        } else if (site == 'perplexity') { // left-align Attach File + Search buttons
            const rightBtns = {} ; ['attachFile', 'search'].forEach(btnType =>
                rightBtns[btnType] = chatbarDiv.querySelector(selectors.btns[btnType]))
            const modelSelectorDiv = chatbarDiv.querySelector('button').closest('div')
            if (!modelSelectorDiv) return // in case of breaking DOM update
            Object.values(rightBtns).forEach(btn => {
                if (!btn) return
                modelSelectorDiv.after(btn.parentNode) // move to right of selector
                btn.style.margin = '0 -5px' // close x-gap
                btn.setAttribute('left-aligned', true) // for this.reset()
            })
            if (chatbarDiv.querySelector('[left-aligned]')) modelSelectorDiv.style.marginRight = '3px' // close gap
        } else if (site == 'poe') // move Mic btn closer to Send
            dom.get.loadedElem(selectors.btns.mic, { timeout: 5000 })
                .then(btn => { if (btn) btn.style.marginRight = '-7px' })
    }
};
