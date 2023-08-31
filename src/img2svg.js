var stdMath = Math, IMG = 'undefined' !== typeof Uint8Array ? Uint8Array : Array;

function img2svg(imageData, options)
{
    options = options || {};
    var colorDepth = stdMath.min(stdMath.max((null == options.colorDepth ? 2 : options.colorDepth), 1), 256),
        w = imageData.width, h = imageData.height,
        img = imageData.data, size = w*h, l = img.length,
        b, g, r, i, q, bq, gq, rq, ir, ig, ib, imgq, area, svg = '';
    q = stdMath.floor(256 / colorDepth);
    for (b=0,bq=0; b<colorDepth; ++b,bq+=q)
    {
        for (g=0,gq=0; g<colorDepth; ++g,gq+=q)
        {
            for (r=0,rq=0; r<colorDepth; ++r,rq+=q)
            {
                imgq = new IMG(size);
                area = 0;
                for (i=0; i<l; i+=4)
                {
                    if (0 < img[i+3])
                    {
                        ir = img[i  ];
                        ig = img[i+1];
                        ib = img[i+2];
                        if (
                            ir >= rq && ir < rq+q &&
                            ig >= gq && ig < gq+q &&
                            ib >= bq && ib < bq+q
                        )
                        {
                            ++area;
                            imgq[i >>> 2] = 255;
                        }
                        else
                        {
                            imgq[i >>> 2] = 0;
                        }
                    }
                    else
                    {
                        imgq[i >>> 2] = 0;
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