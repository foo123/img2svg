var stdMath = Math,
    IMG = 'undefined' !== typeof Uint8Array ? Uint8Array : Array,
    F32 = 'undefined' !== typeof Float32Array ? Float32Array : Array;

function img2svg(imageData, options)
{
    options = options || {};
    var mode = options.mode || "color",
        img = imageData.data,
        w = imageData.width,
        h = imageData.height;
    return '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' + tosvg(img, w, h, options, {mode:mode}) + '</svg>';
}
img2svg.VERSION = "@@VERSION@@";

function tosvg(img, w, h, options, params)
{
    if (params && ("hue" === params.mode)) return tosvg_hue(img, w, h, options);
    var colors = {},
        i, j, k, p, l, size,
        ir, ig, ib, ia,
        rgba, imgq, paths = '';
    img = quantize(img, options, params);
    size = w*h;
    l = img.length;
    if (params && ("gray" === params.mode))
    {
        for (i=0,j=0; i<l; i+=4,++j)
        {
            if (0 < img[i+3])
            {
                ig = img[i+1];
                ia = img[i+3];
                rgba = String(ig);
                rgba += ','+rgba+','+rgba+','+String(ia);
                colors[rgba] = {j:j, next:colors[rgba] || null};
            }
        }
    }
    else
    {
        for (i=0,j=0; i<l; i+=4,++j)
        {
            if (0 < img[i+3])
            {
                ir = img[i  ];
                ig = img[i+1];
                ib = img[i+2];
                ia = img[i+3];
                rgba = String(ir)+','+String(ig)+','+String(ib)+','+String(ia);
                colors[rgba] = {j:j, next:colors[rgba] || null};
            }
        }
    }
    for (rgba in colors)
    {
        //if (!Object.prototype.hasOwnProperty.call(colors, rgba)) continue;
        if (p = colors[rgba])
        {
            imgq = new IMG(size);
            for (; p; p=p.next) imgq[p.j] = 255;
            options.color = 'rgb('+rgba.split(',').slice(0, 3).join(',')+')';
            options.opacity = String(((+(rgba.split(',').pop()))/255).toFixed(2));
            options.partial = true;
            paths += potrace.trace(imgq, w, h, options);
            imgq = null;
            colors[rgba] = null;
        }
    }
    colors = null;
    return paths;
}
function tosvg_hue(img, w, h, options)
{
    var size = w*h, l = img.length,
        depth = clamp(null == options.depth ? 6 : options.depth, 1, 360),
        depthHue = clamp(null == options.depthHue ? depth : options.depthHue, 1, 360),
        q, h, hR, hG, hB,
        ir, ig, ib, i, j, k, p,
        area, pos, imgq, paths = '';
    q = stdMath.floor(360 / depthHue);
    hR = new F32(depthHue);
    hG = new F32(depthHue);
    hB = new F32(depthHue);
    area = new F32(depthHue);
    pos = new Array(depthHue);
    for (i=0,j=0; i<l; i+=4,++j)
    {
        if (0 < img[i+3])
        {
            ir = img[i  ]/255;
            ig = img[i+1]/255;
            ib = img[i+2]/255;
            h = stdMath.floor(hue(ir, ig, ib) / q);
            hR[h] = (hR[h] || 0) + ir;
            hG[h] = (hG[h] || 0) + ig;
            hB[h] = (hB[h] || 0) + ib;
            area[h] = (area[h] || 0) + 1;
            pos[h] = {j:j, next:pos[h] || null};
        }
    }
    for (h=0; h<depthHue; ++h)
    {
        if (0 < area[h])
        {
            imgq = new IMG(size);
            for (p=pos[h]; p; p=p.next) imgq[p.j] = 255;
            options.color = hex(255*hR[h]/area[h], 255*hG[h]/area[h], 255*hB[h]/area[h]);
            options.partial = true;
            paths += potrace.trace(imgq, w, h, options);
            imgq = null;
            pos[h] = null;
        }
    }
    hR = null;
    hG = null;
    hB = null;
    area = null;
    pos = null;
    return paths;
}
function quantize(img, options, params)
{
    var i, l = img.length, imgq,
        depth = clamp(null == options.depth ? 2 : options.depth, 1, 256),
        depthR = clamp(null == options.depthR ? depth : options.depthR, 1, 256),
        depthG = clamp(null == options.depthG ? depth : options.depthG, 1, 256),
        depthB = clamp(null == options.depthB ? depth : options.depthB, 1, 256),
        depthA = clamp(null == options.depthA ? depth : options.depthA, 1, 256),
        qR, qG, qB, qA, qR2, qG2, qB2, qA2;
    if (params && ("gray" === params.mode))
    {
        if (256 === depthG && 256 === depthA) return img;
        qG = stdMath.floor(256 / depthG);
        qA = stdMath.floor(256 / depthA);
        qG2 = stdMath.floor(qG / 2);
        qA2 = stdMath.floor(qA / 2);
        imgq = new IMG(l);
        for (i=0; i<l; i+=4)
        {
            if (0 < img[i+3])
            {
                imgq[i+2] = imgq[i  ] = imgq[i+1] = clamp(stdMath.floor(img[i+1] / qG) * qG + qG2, 0, 255);
                imgq[i+3] = clamp(stdMath.floor(img[i+3] / qA) * qA + qA2, 0, 255);
            }
            else
            {
                imgq[i+3] = imgq[i+2] = imgq[i+1] = imgq[i  ] = 0;
            }
        }
    }
    else
    {
        if (256 === depthR && 256 === depthG && 256 === depthB && 256 === depthA) return img;
        qR = stdMath.floor(256 / depthR);
        qG = stdMath.floor(256 / depthG);
        qB = stdMath.floor(256 / depthB);
        qA = stdMath.floor(256 / depthA);
        qR2 = stdMath.floor(qR / 2);
        qG2 = stdMath.floor(qG / 2);
        qB2 = stdMath.floor(qB / 2);
        qA2 = stdMath.floor(qA / 2);
        imgq = new IMG(l);
        for (i=0; i<l; i+=4)
        {
            if (0 < img[i+3])
            {
                imgq[i  ] = clamp(stdMath.floor(img[i  ] / qR) * qR + qR2, 0, 255);
                imgq[i+1] = clamp(stdMath.floor(img[i+1] / qG) * qG + qG2, 0, 255);
                imgq[i+2] = clamp(stdMath.floor(img[i+2] / qB) * qB + qB2, 0, 255);
                imgq[i+3] = clamp(stdMath.floor(img[i+3] / qA) * qA + qA2, 0, 255);
            }
            else
            {
                imgq[i+3] = imgq[i+2] = imgq[i+1] = imgq[i  ] = 0;
            }
        }
    }
    return imgq;
}

// utilities
function clamp(x, min, max)
{
    return stdMath.min(stdMath.max(x, min), max);
}
function hex(r, g, b)
{
    var rh = clamp(stdMath.round(r), 0, 255).toString(16),
        gh = clamp(stdMath.round(g), 0, 255).toString(16),
        bh = clamp(stdMath.round(b), 0, 255).toString(16);
    return '#'+(rh.length < 2 ? '0' : '')+rh+(gh.length < 2 ? '0' : '')+gh+(bh.length < 2 ? '0' : '')+bh;
}
function rgb(r, g, b)
{
    var rs = String(clamp(stdMath.round(r), 0, 255)),
        gs = String(clamp(stdMath.round(g), 0, 255)),
        bs = String(clamp(stdMath.round(b), 0, 255));
    return 'rgb('+rs+','+gs+','+bs+')';
}
function hue(r, g, b)
{
    var h, c, xmax, xmin;
    /*r /= 255;
    g /= 255;
    b /= 255;*/
    xmax = stdMath.max(r, g, b);
    xmin = stdMath.min(r, g, b);
    c = xmax - xmin;
    if (0 === c)
    {
        h = 0;
    }
    else if (xmax === r)
    {
        h = 60*(0 + (g - b)/c);
    }
    else if (xmax === g)
    {
        h = 60*(2 + (b - r)/c);
    }
    else //if (xmax === b)
    {
        h = 60*(4 + (r - g)/c);
    }
    h = stdMath.round(h);
    if (h < 0) h += 360;
    if (h >= 360) h -= 360;
    return clamp(h, 0, 360);
}

