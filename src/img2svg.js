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
    return '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' + process(img, w, h, options, {mode:mode})/*.sort(function(a, b) {return -(a[1] - b[1]);}).map(function(p) {return p[0];}).join('')*/ + '</svg>';
}
img2svg.VERSION = "@@VERSION@@";

function process(img, w, h, options, params)
{
    if (params && ("hue" === params.mode)) return process_hue(img, w, h, options);
    var colorMap = {},
        i, j, k, l, size,
        ir, ig, ib, ia,
        rgba, pos, imgq, paths = '';
    img = quantize(img, options, params);
    size = w*h;
    l = img.length;
    if (params && ("grayscale" === params.mode))
    {
        for (i=0,j=0; i<l; i+=4,++j)
        {
            if (0 < img[i+3])
            {
                ig = img[i+1];
                ia = img[i+3];
                rgba = String(ig)
                rgba += ','+rgba+','+rgba+','+String(ia);
                if (!colorMap[rgba]) colorMap[rgba] = [j];
                else colorMap[rgba].push(j);
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
                if (!colorMap[rgba]) colorMap[rgba] = [j];
                else colorMap[rgba].push(j);
            }
        }
    }
    for (rgba in colorMap)
    {
        //if (!Object.prototype.hasOwnProperty.call(colorMap, rgba)) continue;
        pos = colorMap[rgba];
        if (pos && (0 < pos.length))
        {
            imgq = new IMG(size);
            for (i=0,k=pos.length; i<k; ++i) imgq[pos[i]] = 255;
            options.color = 'rgb('+rgba.split(',').slice(0, 3).join(',')+')';
            options.opacity = String(((+(rgba.split(',').pop()))/255).toFixed(2));
            options.partial = true;
            paths/*.push(*/ += /*[*/potrace.process(imgq, w, h, options)/*, k])*/;
            imgq = null;
        }
    }
    colorMap = null;
    return paths;
}
function process_hue(img, w, h, options)
{
    var size = w*h, l = img.length,
        depth = clamp(null == options.depth ? 6 : options.depth, 1, 360),
        depthHue = clamp(null == options.depthHue ? depth : options.depthHue, 1, 360),
        q, h, hq, hR, hG, hB,
        ir, ig, ib, ih, i, j, k,
        cnt, pos, p, imgq, paths = '';
    q = stdMath.floor(360 / depthHue);
    hR = new F32(360);
    hG = new F32(360);
    hB = new F32(360);
    cnt = new F32(360);
    pos = new Array(360);
    for (i=0,j=0; i<l; i+=4,++j)
    {
        if (0 < img[i+3])
        {
            ir = img[i  ];
            ig = img[i+1];
            ib = img[i+2];
            ih = stdMath.floor(hue(ir, ig, ib) / q) * q;
            hR[ih] = (hR[ih] || 0) + ir;
            hG[ih] = (hG[ih] || 0) + ig;
            hB[ih] = (hB[ih] || 0) + ib;
            cnt[ih] = (cnt[ih] || 0) + 1;
            pos[ih] = pos[ih] || [];
            pos[ih].push(j);
        }
    }
    for (h=0,hq=0; h<depthHue; ++h,hq+=q)
    {
        if (0 < cnt[hq])
        {
            imgq = new IMG(size);
            p = pos[hq];
            for (i=0,k=p.length; i<k; ++i) imgq[p[i]] = 255;
            options.color = hex(hR[hq]/cnt[hq], hG[hq]/cnt[hq], hB[hq]/cnt[hq]);
            options.partial = true;
            paths/*.push(*/ += /*[*/potrace.process(imgq, w, h, options)/*, area])*/;
            imgq = null;
            pos[hq] = null;
        }
    }
    hR = null;
    hG = null;
    hB = null;
    cnt = null;
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
    if (params && ("grayscale" === params.mode))
    {
        if (256 === depthG && 256 === depthA) return img;
        qG = stdMath.floor(256 / depthG);
        qA = stdMath.floor(256 / depthA);
        qG2 = stdMath.floor(qG / 2);
        qA2 = stdMath.floor(qA / 2);
        imgq = new IMG(l);
        for (i=0; i<l; i+=4)
        {
            imgq[i+2] = imgq[i  ] = imgq[i+1] = clamp(stdMath.floor(img[i+1] / qG) * qG /*+ qG2*/, 0, 255);
            imgq[i+3] = clamp(stdMath.floor(img[i+3] / qA) * qA /*+ qA2*/, 0, 255);
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
            imgq[i  ] = clamp(stdMath.floor(img[i  ] / qR) * qR /*+ qR2*/, 0, 255);
            imgq[i+1] = clamp(stdMath.floor(img[i+1] / qG) * qG /*+ qG2*/, 0, 255);
            imgq[i+2] = clamp(stdMath.floor(img[i+2] / qB) * qB /*+ qB2*/, 0, 255);
            imgq[i+3] = clamp(stdMath.floor(img[i+3] / qA) * qA /*+ qA2*/, 0, 255);
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
    r /= 255;
    g /= 255;
    b /= 255;
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
    return clamp(stdMath.round(h), 0, 360) % 360;
}

