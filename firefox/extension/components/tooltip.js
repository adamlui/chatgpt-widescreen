// Requires dom.js + env.site + sites

window.tooltip = {

    imports: {
        import(deps) { // { site: env.site, sites }
            for (const depName in deps) this[depName] = deps[depName] }
    },

    createDiv() { this.div = dom.create.elem('div', { class: 'cwm-tooltip' }) },

    toggle(event) {
        tooltip.update(event.currentTarget.id.replace(/-btn$/, ''))
        tooltip.div.style.opacity = event.type == 'mouseover' ? 1 : 0
    },

    stylize() {
        if (this.styles) return
        this.styles = dom.create.style(`.cwm-tooltip {
            background-color: rgba(0,0,0,0.71) ; padding: 5px 6px ; border-radius: 6px ; border: 1px solid #d9d9e3 ;
            font-size: 0.85rem ; color: white ; white-space: nowrap ; /* text style */
            --shadow: 4px 6px 16px 0 rgb(0 0 0 / 38%) ;
                box-shadow: var(--shadow) ; -webkit-box-shadow: var(--shadow) ; -moz-box-shadow: var(--shadow) ;
            position: absolute ; bottom: 58px ; opacity: 0 ; z-index: 9999 ; /* visibility */
            transition: opacity 0.1s ; -webkit-transition: opacity 0.1s ; -moz-transition: opacity 0.1s ;
                -ms-transition: opacity 0.1s ; -o-transition: opacity 0.1s ;
            user-select: none ; webkit-user-select: none ; -moz-user-select: none ; -ms-user-select: none }`
        )
        document.head.append(this.styles)
    },

    async update(btnType) { // text & position
        const site = this.imports.site, visibleBtnTypes = buttons.getTypes.visible()
        const ctrAddend = (await buttons.getRightBtn()).getBoundingClientRect().width
                        + ( site == 'perplexity' ? ( chatbar.is.tall() ? -1 : 8 )
                          : site == 'poe' ? 28 : 7 )
        const spreadFactor = site == 'perplexity' ? 27.5 : site == 'poe' ? 28 : 31
        const iniRoffset = spreadFactor * ( visibleBtnTypes.indexOf(btnType) +1 ) + ctrAddend
                         + ( site == 'chatgpt' && chatbar.is.tall() ? -2 : 4 )
        this.div.innerText = chrome.i18n.getMessage(`tooltip_${btnType}${
            !/full|wide/i.test(btnType) ? '' : (config[btnType] ? 'OFF' : 'ON')}`)
        this.div.style.right = `${ iniRoffset - this.div.getBoundingClientRect().width /2 }px` // x-pos
        this.div.style.bottom = ( // y-pos
            site == 'perplexity' ? (
                location.pathname != '/' ? '64px' // not homepage
                    : document.querySelector( // logged-in homepage
                        this.imports.sites.perplexity.selectors.btns.settings) ? 'revert-layer'
                                         : '50vh' // logged-out homepage
            ) : site == 'poe' ? '50px' : '59px'
        )
    }
};
