"use strict";

const img2svg = require('../build/img2svg.js');
const CanvasLite = require('./CanvasLite.js');
const img = new CanvasLite.Image();
img.onload = () => {
    const canvas = new CanvasLite(img.width, img.height);
    canvas.getContext('2d').drawImage(img, 0, 0);
    const imgData = canvas.getContext('2d').getImageData(0, 0, img.width, img.height);
    console.log(img2svg(imgData, {depth:2}));
};
img.src = __dirname + '/test.jpeg';
