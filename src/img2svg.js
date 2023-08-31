var stdMath = Math, IMG = 'undefined' !== typeof Uint8Array ? Uint8Array : Array;

function img2svg(imageData, options)
{
    options = options || {};
    var depth = stdMath.min(stdMath.max((null == options.depth ? 2 : options.depth), 1), 256),
        depthR = stdMath.min(stdMath.max((null == options.depthR ? depth : options.depthR), 1), 256),
        depthG = stdMath.min(stdMath.max((null == options.depthG ? depth : options.depthG), 1), 256),
        depthB = stdMath.min(stdMath.max((null == options.depthB ? depth : options.depthB), 1), 256),
        w = imageData.width, h = imageData.height,
        img = imageData.data, size = w*h, l = img.length,
        b, g, r, qR, qG, qB,
        bq, gq, rq, ir, ig, ib,
        i, j, area, imgq, svg = '';
    qR = stdMath.floor(256 / depthR);
    qG = stdMath.floor(256 / depthG);
    qB = stdMath.floor(256 / depthB);
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
                options.color = hex(gq, gq, gq);
                options.partial = true;
                svg += potrace.process(imgq, w, h, options);
            }
            imgq = null;
        }
    }
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
                        options.color = hex(rq, gq, bq);
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
img2svg.potrace = function() {
    return potrace;
};
function hex(r, g, b)
{
    var rh = r.toString(16), gh = g.toString(16), bh = b.toString(16);
    return '#'+(rh.length < 2 ? '0' : '')+rh+(gh.length < 2 ? '0' : '')+gh+(bh.length < 2 ? '0' : '')+bh;
}