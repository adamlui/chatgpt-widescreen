// Requires site: env.site + sites

window.ui = {
    import(deps) { Object.assign(this.imports = this.imports || {}, deps) },

    getScheme() {
        const rootElem = document.documentElement
        return this.imports.site == 'perplexity' ? rootElem.dataset.colorScheme : rootElem.className
            || (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light')
    },

    isFullWin() {
        const site = this.imports.site, sites = this.imports.sites
        return site == 'poe' ? !!document.getElementById('fullWindow-mode')
            : !sites[site].hasSidebar // false if sidebar non-existent
           || /\d+/.exec(getComputedStyle(document.querySelector(
                  sites[site].selectors.sidebar))?.width || '')[0] < 100
    }
};
