window.dom = {

    imports: {
        import(deps) { // { env }
            for (const depName in deps) this[depName] = deps[depName] }
    },

    addRisingParticles(targetNode, { lightScheme = 'gray', darkScheme = 'white' } = {}) {
    // Requires https://assets.aiwebextensions.com/styles/rising-particles/dist/<lightScheme|darkScheme>.min.css

        if (targetNode.querySelector('[id*=particles]')) return
        const particlesDivsWrapper = document.createElement('div')
        particlesDivsWrapper.style.cssText = (
            'position: absolute ; top: 0 ; left: 0 ;' // hug targetNode's top-left corner
          + 'height: 100% ; width: 100% ; border-radius: 15px ; overflow: clip ;' // bound innards exactly by targetNode
          + 'z-index: -1' ); // allow interactive elems to be clicked
        ['sm', 'med', 'lg'].forEach(particleSize => {
            const particlesDiv = document.createElement('div')
            particlesDiv.id = `${ this.imports.env.ui.scheme == 'dark' ? darkScheme
                : lightScheme }-particles-${particleSize}`
            particlesDivsWrapper.append(particlesDiv)
        })
        targetNode.prepend(particlesDivsWrapper)
    },

    create: {
        elem(elemType, attrs = {}) {
            const elem = document.createElement(elemType)
            for (const attr in attrs) elem.setAttribute(attr, attrs[attr])
            return elem
        },

        style(content) {
            const style = document.createElement('style')
            if (content) style.innerText = content
            return style
        },

        svgElem(type, attrs) {
            const elem = document.createElementNS('http://www.w3.org/2000/svg', type)
            for (const attr in attrs) elem.setAttributeNS(null, attr, attrs[attr])
            return elem
        }
    },

    cssSelectorize(classList) {
        return classList.toString()
            .replace(/([:[\]\\])/g, '\\$1') // escape special chars :[]\
            .replace(/^| /g, '.') // prefix w/ dot, convert spaces to dots
    },

    getLoadedElem(selector, timeout = null) {
        const timeoutPromise = timeout ? new Promise(resolve => setTimeout(() => resolve(null), timeout)) : null
        const isLoadedPromise = new Promise(resolve => {
            const elem = document.querySelector(selector)
            if (elem) resolve(elem)
            else new MutationObserver((_, obs) => {
                const elem = document.querySelector(selector)
                if (elem) { obs.disconnect() ; resolve(elem) }
            }).observe(document.documentElement, { childList: true, subtree: true })
        })
        return ( timeoutPromise ? Promise.race([isLoadedPromise, timeoutPromise]) : isLoadedPromise )
    }
};
