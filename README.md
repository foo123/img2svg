# img2svg

Vectorize Image Data to SVG using POTRACE  

Based on [multilabel-potrace by Hugo Raguet](https://gitlab.com/1a7r0ch3/multilabel-potrace), which is based on [potrace by Peter Selinger](https://potrace.sourceforge.net/)

**version 2.0.1** (25 kB minified)

**demo in nodejs with `CanvasLite`:**

```js
const CanvasLite = require('./CanvasLite.js');
const img2svg = require('../build/img2svg.js');
const img = new CanvasLite.Image(), canvas = new CanvasLite();
img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    const imgData = canvas.getContext('2d').getImageData(0, 0, img.width, img.height);
    console.log(img2svg(imgData, {depth:16}));
};
img.src = __dirname + '/test.jpeg';
```

**demo in browser:**

```js
function el(html)
{
    const container = document.createElement('div');
    container.innerHTML = html.trim();
    return container.firstChild;
}
const img = new Image(), canvas = document.createElement('canvas');
img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    const imgData = canvas.getContext('2d').getImageData(0, 0, img.width, img.height);
    const svg = img2svg(imgData, {depth:16});
    document.body.appendChild(img);
    document.body.appendChild(el(svg));
};
img.src = './test.jpeg';
```

**Result:**

![img2svg demo](./img2svg.png)


**Options:**

* `depth`: depth of color quantization for all channels (default `16`)
* `depthR`,`depthG`,`depthB`: depth of color quantization per separate image channel (default `depth`)
* `transparency`: level of ALPHA channel, from 0 to 100, under which area is considered transparent and is ignored (default `50`)
* `layered`: separate into layers of overlapping connected components instead of isolated connected components (default `false`)
* `outline`: line width to generate outline of image only (default `0`)
* `outlinecolor`: line color to generate outline of image if set, else the color of the area is used (default `null`)

**POTRACE Options:**

* `minpathsegments`: ignore areas with less number of segments than this (default `0`)
* `turdsize`: ignore areas with size smaller or equal to this (default `0`)
* `linetolerance`: straight line tolerance (default `0.5`)
* `alphamax`: balance between more smooth curves vs more lines and corners (default `1.0`)
* `opttolerance`: tolerance for generating optimum curves if > 0.0 (default `0.2`)

**see also:**

* [CanvasLite](https://github.com/foo123/CanvasLite) an html canvas implementation in pure JavaScript
* [Rasterizer](https://github.com/foo123/Rasterizer) stroke and fill lines, rectangles, curves and paths, without canvaσ
* [Gradient](https://github.com/foo123/Gradient) create linear, radial, conic and elliptic gradients and image patterns without canvas
* [Geometrize](https://github.com/foo123/Geometrize) Computational Geometry and Rendering Library for JavaScript
* [Plot.js](https://github.com/foo123/Plot.js) simple and small library which can plot graphs of functions and various simple charts and can render to Canvas, SVG and plain HTML
* [MOD3](https://github.com/foo123/MOD3) 3D Modifier Library in JavaScript
* [HAAR.js](https://github.com/foo123/HAAR.js) image feature detection based on Haar Cascades in JavaScript (Viola-Jones-Lienhart et al Algorithm)
* [HAARPHP](https://github.com/foo123/HAARPHP) image feature detection based on Haar Cascades in PHP (Viola-Jones-Lienhart et al Algorithm)
* [FILTER.js](https://github.com/foo123/FILTER.js) video and image processing and computer vision Library in pure JavaScript (browser and node)
* [css-color](https://github.com/foo123/css-color) simple class to parse and manipulate colors in various formats
* [img2svg](https://github.com/foo123/img2svg) vectorize image data to svg
* [svg2json](https://github.com/foo123/svg2json) parse svg to json

