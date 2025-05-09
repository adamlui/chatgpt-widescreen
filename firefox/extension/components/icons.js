// Requires lib/dom.js + app

window.icons = {

    create(name, { size = 16, width, height, ...additionalAttrs } = {}) {
        const iconData = icons[name],
              iconAttrs = { width: width || size, height: height || size, ...additionalAttrs }
        if (iconData.type == 'svg') {
            const svg = dom.create.svgElem('svg', { viewBox: iconData.viewBox, ...iconAttrs  })
            iconData.elems.forEach(([tag, attrs]) => svg.append(dom.create.svgElem(tag, attrs)))
            return svg
        } else // img w/ src
            return dom.create.elem('img', { src: iconData.src, ...iconAttrs })
    },

    caretDown: {
        type: 'svg', viewBox: '0 0 24 24',
        elems: [[ 'path', { d: 'm0 6.4 12 12 12-12z' }]]
    },

    open: {
        type: 'svg',  viewBox: '0 0 512 512',
        elems: [
            [ 'path', {
                transform: 'translate(85.333333, 64)',
                d: 'M128,63.999444 L128,106.666444 L42.6666667,106.666667 L42.6666667,320 L256,320 L256,234.666444 L298.666,234.666444 L298.666667,362.666667 L4.26325641e-14,362.666667 L4.26325641e-14,64 L128,63.999444 Z M362.666667,1.42108547e-14 L362.666667,170.666667 L320,170.666667 L320,72.835 L143.084945,249.751611 L112.915055,219.581722 L289.83,42.666 L192,42.6666667 L192,1.42108547e-14 L362.666667,1.42108547e-14 Z'
            }]
        ]
    },

    paperclip: {
        type: 'svg',  viewBox: '0 0 448 512',
        elems: [
            [ 'path', { d: 'M375 73c-26-26-68.1-26-94.1 0L89 265C45.3 308.6 45.3 379.4 89 423s114.4 43.6 158.1 0L399 271c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9L281 457c-62.4 62.4-163.5 62.4-225.9 0S-7.4 293.4 55 231L247 39C291.7-5.7 364.3-5.7 409 39s44.7 117.2 0 161.9L225.2 384.7c-31.6 31.6-83.6 28.7-111.5-6.2c-23.8-29.8-21.5-72.8 5.5-99.8L271 127c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9L153.2 312.7c-9.7 9.7-10.6 25.1-2 35.8c10 12.5 28.7 13.6 40 2.2L375 167c26-26 26-68.1 0-94.1z' }]
        ]
    },

    plus: {
        type: 'svg',  viewBox: '0 0 1024 1024',
        elems: [
            [ 'path', { d: 'M899.901 600.38H600.728v299.173c0 74.383-179.503 74.383-179.503 0V600.38H122.051c-74.384 0-74.384-179.503 0-179.503h299.173V121.703c0-74.384 179.503-74.384 179.503 0v299.174H899.9c74.385 0 74.385 179.503.001 179.503z' }]
        ]
    },

    questionMark: {
        type: 'png',
        get src() { return `${app.urls.assetHost}/images/icons/question-mark/icon16.png` }
    }
};
