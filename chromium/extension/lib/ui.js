// Requires site: env.site + sites

window.ui = {
    import(deps) { Object.assign(this.imports = this.imports || {}, deps) },

    getScheme() {
        const rootElem = document.documentElement
        return this.imports.site == 'perplexity' ? rootElem.dataset.colorScheme
            : /light|dark/.test(rootElem.className) && rootElem.className
            || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    },

    isFullWin() {
        const site = this.imports.site, sites = this.imports.sites
        if (site === 'poe') return !!document.getElementById('fullWindow-mode')
        else if (!sites[site].hasSidebar) return true
        else { // calc widths to determine on sites w/ native toggle
            const barWidths = {} ; ['left', 'right'].forEach(side => {
                const barSelector = sites[site].selectors[`${side === 'left' ? 'side' : 'right'}bar`],
                    barElem = document.querySelector(barSelector)
                barWidths[side] = barElem ? parseInt(getComputedStyle(barElem).width) : 0
            })
            return barWidths.left < 100 && barWidths.right < 100 // true if both bars skinny/hidden
        }
    }
};
