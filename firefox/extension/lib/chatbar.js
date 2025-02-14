// Requires site: env.site + sites

window.chatbar = {
    import(deps) { Object.assign(this.imports = this.imports || {}, deps) },

    get() {
        const site = this.imports.site
        let chatbar = document.querySelector(this.imports.sites[site].selectors.input)
        const lvlsToParent = site == 'chatgpt' ? 3 : 2
        for (let i = 0 ; i < lvlsToParent ; i++) chatbar = chatbar?.parentNode
        return chatbar
    },

    is: {
        dark() {
            return chatbar.imports.site != 'chatgpt' ? undefined
                : getComputedStyle(document.getElementById('composer-background') || document.documentElement)
                    .backgroundColor == 'rgb(48, 48, 48)'
        },

        tall() {
            const site = chatbar.imports.site
            return site == 'poe' ? true
                 : site == 'perplexity' ? chatbar.get()?.getBoundingClientRect().height > 60
                 : /* chatgpt */ !!chatbar.get()?.nextElementSibling
        }
    },

    reset() { // all tweaks for popup master toggle-off
        const site = this.imports.site ; if (!/chatgpt|perplexity/.test(site)) return
        const chatbarDiv = this.get() ; if (!chatbarDiv) return
        const selectors = this.imports.sites[site].selectors
        if (site == 'chatgpt') { // restore chatbar inner width
            const inputArea = chatbarDiv.querySelector(selectors.input)
            if (inputArea) inputArea.style.width = inputArea.parentNode.style.width = 'initial'
        } else if (site == 'perplexity') { // remove left-align Attach File button
            const attachFileBtn = chatbarDiv.querySelector(selectors.btns.attachFile)
            if (attachFileBtn?.getAttribute('left-aligned')) {
                const sendBtn = chatbarDiv.querySelector(selectors.btns.send) ; if (!sendBtn) return
                sendBtn.before(attachFileBtn.parentNode) ; attachFileBtn.removeAttribute('left-aligned')
                if (this.is.tall()) attachFileBtn.style.marginRight = ''
            }
        }
    },

    tweak() { // update ChatGPT chatbar inner width + left-align Perplexity Attach File button
        const site = this.imports.site ; if (!/chatgpt|perplexity/.test(site)) return
        const chatbarDiv = this.get() ; if (!chatbarDiv) return
        const selectors = this.imports.sites[site].selectors
        if (site == 'chatgpt') { // update chatbar inner width
            const inputArea = chatbarDiv.querySelector(selectors.input) ; if (!inputArea) return
            if (chatgpt.canvasIsOpen()) inputArea.parentNode.style.width = '100%'
            else if (!this.is.tall()) { // narrow it to not clash w/ buttons
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
        } else if (site == 'perplexity') { // left-align Attach File button
            const attachFileBtn = document.querySelector(selectors.btns.attachFile) ; if (!attachFileBtn) return
            let newParent = chatbarDiv
            if (this.is.tall()) { // select new newParent
                newParent = chatbarDiv.querySelector('div:has(> span > button)') // left button cluster
                attachFileBtn.style.marginRight = '-10px' // bring Search button closer
            }
            newParent?.insertBefore(attachFileBtn.parentNode, newParent.children[1])
            attachFileBtn.setAttribute('left-aligned', true)
        }
    }
};
