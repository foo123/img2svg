var stdMath = Math,
    IMG = 'undefined' !== typeof Uint8Array ? Uint8Array : Array,
    F32 = 'undefined' !== typeof Float32Array ? Float32Array : Array;

function img2svg(imageData, options)
{
    options = options || {};
    var depth = clamp(null == options.depth ? 2 : options.depth, 1, 256),
        depthR = clamp(null == options.depthR ? depth : options.depthR, 1, 256),
        depthG = clamp(null == options.depthG ? depth : options.depthG, 1, 256),
        depthB = clamp(null == options.depthB ? depth : options.depthB, 1, 256),
        depthHue = clamp(null == options.depthHue ? 12 : options.depthHue, 1, 360),
        w = imageData.width, h = imageData.height,
        img = imageData.data, size = w*h, l = img.length,
        b, g, r, h, q, qR, qG, qB, qR2, qG2, qB2, hR, hG, hB,
        bq, gq, rq, hq, ir, ig, ib, ih, i, j, area, cnt, imgq, svg = '';
    qR = stdMath.floor(256 / depthR);
    qG = stdMath.floor(256 / depthG);
    qB = stdMath.floor(256 / depthB);
    qR2 = stdMath.floor(qR/2);
    qG2 = stdMath.floor(qG/2);
    qB2 = stdMath.floor(qB/2);
    if (options.grayscale)
    {
        for (g=0,gq=0; g<depthG; ++g,gq+=qG)
        {
            imgq = new IMG(size);
            area = 0;
            for (i=0,j=0; i<l; i+=4,++j)
            {
                if (0 < img[i+3])
                {
                    ig = img[i+1];
                    if (
                        ig >= gq && ig < gq+qG
                    )
                    {
                        ++area;
                        imgq[j] = 255;
                    }
                    else
                    {
                        imgq[j] = 0;
                    }
                }
                else
                {
                    imgq[j] = 0;
                }
            }
            if (0 < area)
            {
                options.color = hex(gq+qG2, gq+qG2, gq+qG2);
                options.partial = true;
                svg += potrace.process(imgq, w, h, options);
            }
            imgq = null;
        }
    }
    /*else if (options.hue)
    {
        q = stdMath.floor(360 / depthHue);
        hR = new F32(360);
        hG = new F32(360);
        hB = new F32(360);
        cnt = new F32(360);
        for (i=0; i<l; i+=4)
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
            }
        }
        for (h=0,hq=0; h<depthHue; ++h,hq+=q)
        {
            imgq = new IMG(size);
            area = 0;
            for (i=0,j=0; i<l; i+=4,++j)
            {
                if (0 < img[i+3])
                {
                    ir = img[i  ];
                    ig = img[i+1];
                    ib = img[i+2];
                    ih = stdMath.floor(hue(ir, ig, ib) / q) * q;
                    if (ih >= hq && ih < hq + q)
                    {
                        ++area;
                        imgq[j] = 255;
                    }
                    else
                    {
                        imgq[j] = 0;
                    }
                }
                else
                {
                    imgq[j] = 0;
                }
            }
            if (0 < area)
            {
                options.color = hex(hR[hq]/cnt[hq], hG[hq]/cnt[hq], hB[hq]/cnt[hq]);
                options.partial = true;
                svg += potrace.process(imgq, w, h, options);
            }
            imgq = null;
        }
    }*/
    else
    {
        for (b=0,bq=0; b<depthB; ++b,bq+=qB)
        {
            for (g=0,gq=0; g<depthG; ++g,gq+=qG)
            {
                for (r=0,rq=0; r<depthR; ++r,rq+=qR)
                {
                    imgq = new IMG(size);
                    area = 0;
                    for (i=0,j=0; i<l; i+=4,++j)
                    {
                        if (0 < img[i+3])
                        {
                            ir = img[i  ];
                            ig = img[i+1];
                            ib = img[i+2];
                            if (
                                ir >= rq && ir < rq+qR &&
                                ig >= gq && ig < gq+qG &&
                                ib >= bq && ib < bq+qB
                            )
                            {
                                ++area;
                                imgq[j] = 255;
                            }
                            else
                            {
                                imgq[j] = 0;
                            }
                        }
                        else
                        {
                            imgq[j] = 0;
                        }
                    }
                    if (0 < area)
                    {
                        options.color = hex(rq+qR2, gq+qG2, bq+qB2);
                        options.partial = true;
                        svg += potrace.process(imgq, w, h, options);
                    }
                    imgq = null;
                }
            }
        }
    }
    return '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 '+w+' '+h+'">'+svg+'</svg>';
}
img2svg.VERSION = "@@VERSION@@";

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