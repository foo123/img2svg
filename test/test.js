"use strict";

const img2svg = require('../build/img2svg.js');
const CanvasLite = require('./CanvasLite.js');
const img = new CanvasLite.Image();
img.onload = () => {
    const canvas = new CanvasLite(img.width, img.height);
    canvas.getContext('2d').drawImage(img, 0, 0);
    const imgData = canvas.getContext('2d').getImageData(0, 0, img.width, img.height);
    console.log(img2svg(imgData, {mode:"colored",depth:5,turdsize:0,minpathsegments:7}));
};
img.src = __dirname + '/test.jpeg';
//img.src = __dirname + '/peacecolor2.png';//'/../_notused/svgcode.png';

