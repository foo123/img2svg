"use strict";

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

