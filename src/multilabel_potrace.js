var multilabel_potrace = (function() {
// adapted from:
// multilabel-potrace 2020 https://gitlab.com/1a7r0ch3/multilabel-potrace
// potrace v.1.16 https://potrace.sourceforge.net/potrace.html
var multilabel_potrace = {MULTILABEL_POTRACE_VERSION: "2020", POTRACE_VERSION: "1.16"};
multilabel_potrace.defaultOptions = function() {
    return {
    outline: 0,
    outlinecolor: null,
    depth: 16,
    transparency: 50,
    layered: false,
    minpathsegments: 0,
    turdsize: 0,
    linetolerance: 0.5,
    alphamax: 1.0,
    opttolerance: 0.2
    };
};
multilabel_potrace.trace = function(im, width, height, options) {
    options = extend(options || {}, multilabel_potrace.defaultOptions());
    options.depth = clamp(options.depth || 0, 2, 256);
    options.transparency = clamp(options.transparency || 0, 0, 100);
    options.layered = !!options.layered;
    options.minpathsegments = clamp(options.minpathsegments || 0, 0, MAX);
    options.turdsize = clamp(options.turdsize || 0, 0, MAX);
    options.linetolerance = clamp(options.linetolerance || 0.0, 0.0, 10.0);
    if (0.5 > options.linetolerance) options.linetolerance = 0.0;
    options.alphamax = clamp(options.alphamax || 0.0, 0.0, 10.0);
    options.opttolerance = clamp(options.opttolerance || 0.0, 0.0, 10.0);
    var cc = connected_components(im, width, height, options.depthR || options.depth, options.depthG || options.depth, options.depthB || options.depth, 255*options.transparency/100, options.turdsize, options.layered);
    if (cc.components > 1) trace(cc, options);
    return svg(cc, (options.alphamax ? cc.smoothed_contours : cc.simplified_contours) || cc.raw_contours, options);
};

//---- custom code (v.2.0.0)
var PROTO = 'prototype',
    stdMath = Math,
    hasOwnProperty = Object[PROTO].hasOwnProperty,
    MAX = Number.MAX_SAFE_INTEGER,
    MIN = Number.MIN_SAFE_INTEGER;
function clamp(x, m, M)
{
    return stdMath.min(stdMath.max(x, m), M);
}
function extend(obj, defaults)
{
    for (var k in defaults)
    {
        if (hasOwnProperty.call(defaults, k) && !hasOwnProperty.call(obj, k))
        {
            obj[k] = defaults[k];
        }
    }
    return obj;
}
function connected_components(im, w, h, r_levels, g_levels, b_levels, a_level, turdsize, layered)
{
    var size = w*h, c, r, c2, r2,
        a, b, d, e, f, g, h, x, y,
        i, j, k, l, n, m, mylab,
        numlabels, label, component;

    function compute_labels()
    {
        var R = 0, G = 1, B = 2, A = 3,
            qR = stdMath.ceil(255 / (clamp(r_levels || 0, 2, 256) - 1)),
            qG = stdMath.ceil(255 / (clamp(g_levels || 0, 2, 256) - 1)),
            qB = stdMath.ceil(255 / (clamp(b_levels || 0, 2, 256) - 1));

        function uint24(r, g, b)
        {
            return ((clamp(r, 0, 255)|0) << 16) + ((clamp(g, 0, 255)|0) << 8) + (clamp(b, 0, 255)|0);
        }
        function quantized_color(j)
        {
            var i = j << 2;
            // ignore transparent areas
            return a_level >= im[i+A] ? -1 : uint24(stdMath.round(im[i+R] / qR) * qR, stdMath.round(im[i+G] / qG) * qG, stdMath.round(im[i+B] / qB) * qB);
        }
        function root_of(label)
        {
            while (label !== label.root) label = label.root;
            return label;
        }
        function merge(label1, label2)
        {
            label1 = root_of(label1); label2 = root_of(label2);
            if (label1 !== label2) label1.root = label2;
        }

        var color = new Array(size), i, x, y, yw, mylab;

        for (i=0; i<size; ++i) color[i] = quantized_color(i);

        label = new Array(size);

        // label the first pixel.
        label[0] = new Label(0, 0);

        // label the remaining first row.
        for (y=0,yw=0,x=1; x<w; ++x)
        {
            label[x] = color[x] === color[x-1] ? label[x-1] : new Label(x, 0);
        }

        // label subsequent rows.
        for (y=1,yw=y*w; y<h; ++y,yw+=w)
        {
            // label the first pixel on this row.
            label[yw] = color[yw] === color[yw-w] ? label[yw-w] : new Label(0, y);

            // label subsequent pixels on this row.
            for (x=1; x<w; ++x)
            {
                mylab = color[x+yw] === color[x-1+yw] ? label[x-1+yw] : null;

                if (color[x+yw] === color[x-1+yw-w])
                {
                    if (null != mylab) merge(mylab, label[x-1+yw-w]);
                    else mylab = label[x-1+yw-w];
                }
                if (color[x+yw] === color[x+yw-w])
                {
                    if (null != mylab) merge(mylab, label[x+yw-w]);
                    else mylab = label[x+yw-w];
                }

                label[x+yw] = null != mylab ? mylab : new Label(x, y);

                if (color[x-1+yw] === color[x+yw-w])
                {
                    merge(label[x-1+yw], label[x+yw-w]);
                }
            }
        }
        numlabels = 0;
        for (i=0,y=0,x=0; i<size; ++i,++x)
        {
            if (x >= w) {x=0; ++y;}
            mylab = root_of(label[i]);
            if (0 > mylab.id)
            {
                // set id
                mylab.id = numlabels++;
                // set color
                mylab.color = color[i];
            }
            // update area
            ++mylab.area;
            // update bounding box
            update_bbox(mylab, x, y);
            label[i] = mylab;
        }
        component = new Array(numlabels);
        for (i=0; i<size; ++i) component[label[i].id] = label[i];
    }
    function surrounding_labels()
    {
        for (var i=0,y=0,x=0,c=null; i<size; ++i,++x)
        {
            if (x >= w) {x=0; y+=w;}
            c = label[i];
            if (null == c.surround) c.surround = [];
            if (x > 0 && c.id !== label[x-1+y].id) check_and_add(c.surround, label[x-1+y]);
            if (y > 0 && c.id !== label[x+y-w].id) check_and_add(c.surround, label[x+y-w]);
            if (x > 0 && y > 0 && c.id !== label[x-1+y-w].id) check_and_add(c.surround, label[x-1+y-w]);
            if (x+1 < w && c.id !== label[x+1+y].id) check_and_add(c.surround, label[x+1+y]);
            if (y+w < size && c.id !== label[x+y+w].id) check_and_add(c.surround, label[x+y+w]);
            if (x+1 < w && y+w < size && c.id !== label[x+1+y+w].id) check_and_add(c.surround, label[x+1+y+w]);
            if (x > 0 && y+w < size && c.id !== label[x-1+y+w].id) check_and_add(c.surround, label[x-1+y+w]);
            if (x+1 < w && y > 0 && c.id !== label[x+1+y-w].id) check_and_add(c.surround, label[x+1+y-w]);
        }
    }
    function color(uint24, format)
    {
        var r = ((uint24 >>> 16) & 255),
            g = ((uint24 >>> 8) & 255),
            b = ((uint24) & 255);
        if ('rgb' === format)
        {
            return 'rgb(' + r.toString() + ',' + g.toString() + ',' + b.toString() + ')';
        }
        else
        {
            r = r.toString(16);
            g = g.toString(16);
            b = b.toString(16);
            if (2 > r.length) r = '0' + r;
            if (2 > g.length) g = '0' + g;
            if (2 > b.length) b = '0' + b;
            if (r.charAt(0) === r.charAt(1) && g.charAt(0) === g.charAt(1) && b.charAt(0) === b.charAt(1))
                return '#' + r.charAt(1) + g.charAt(1) + b.charAt(1);
            return '#' + r + g + b;
        }
    }

    if (turdsize >= size)
    {
        numlabels = 1;
        mylab = new Label(0,0);
        mylab.id = 0;
        mylab.color = -1;
        mylab.cover = mylab.area = size;
        mylab.xm = 0; mylab.xM = w-1;
        mylab.ym = 0; mylab.yM = h-1;
        if (layered) mylab.surround = [];
        label = (new Array(size)).fill(mylab);
        component = [mylab];
    }
    else
    {
        compute_labels();
        if (0 < turdsize)
        {
            // filter out small areas
            do
            {
                a = 0; b = 0;
                for (i=0,y=0,x=0; i<size; ++i,++x)
                {
                    if (x >= w) {x=0; ++y};
                    l = label[i];
                    if (l.area > turdsize || l.area <= 0) continue;
                    a = 1;
                    j = w*stdMath.max(y-2, 0);
                    k = stdMath.max(x-2, 0);
                    n = w*stdMath.min(y+2, h-1);
                    m = stdMath.min(x+2, w-1);
                    e = 0; f = null; g = {};
                    for (r2=n,c=k,c2=m; r2>=j; ++c,--c2)
                    {
                        if (c > c2) {c=k; c2=m; r2-=w; if (r2<j) break;}
                        mylab = label[c2+r2];
                        if (l.id !== mylab.id && mylab.area > turdsize)
                        {
                            g[mylab.id] = (g[mylab.id] || 0) + 1;
                            if (g[mylab.id] >= e) {e = g[mylab.id]; f = mylab;}
                        }
                        if (c < c2)
                        {
                            mylab = label[c+r2];
                            if (l.id !== mylab.id && mylab.area > turdsize)
                            {
                                g[mylab.id] = (g[mylab.id] || 0) + 1;
                                if (g[mylab.id] >= e) {e = g[mylab.id]; f = mylab;}
                            }
                        }
                    }
                    if (f)
                    {
                        --l.area;
                        ++f.area;
                        update_bbox(f, x, y);
                        label[i] = f;
                        b = 1;
                    }
                }
            } while (a && b);
        }
        // filter out empty, sort by size and relabel
        numlabels = 0;
        component = component.filter(function(label) {
            if (turdsize < label.area)
            {
                label.cover = (label.yM - label.ym + 1)*(label.xM - label.xm + 1);
                return true;
            }
            return false;
        }).map(function(label, index) {
            return [label, index];
        }).sort(function(a, b) {
            return b[0].cover === a[0].cover ? (a[1] - b[1]) : (b[0].cover - a[0].cover);
        }).map(function(label) {
            label = label[0];
            label.id = numlabels++;
            return label;
        });
        if (layered) surrounding_labels();
    }

    // generate component colors
    for (i=0; i<numlabels; ++i) component[i].color = -1 === component[i].color ? false : color(component[i].color, 'hex');

    return {
    width: w,
    height: h,
    components: numlabels,
    component: component,
    data: label,
    bboxes: null,
    border_statuses: null,
    raw_contours: null,
    simplified_contours: null,
    smoothed_contours: null
    };
}
function Label(x, y, root)
{
    var self = this;
    self.id = -1;
    self.xm = self.xM = x;
    self.ym = self.yM = y;
    self.area = 0;
    self.cover = 0;
    self.color = 0;
    self.root = root || self;
}
Label[PROTO] = {
    constructor: Label,
    id: 0,
    root: null,
    xm: 0,
    ym: 0,
    xM: 0,
    yM: 0,
    area: 0,
    cover: 0,
    surround: null,
    color: 0
};
function Point(x, y)
{
    var self = this;
    self.x = x;
    self.y = y;
}
Point[PROTO] = {
    constructor: Point,
    x: 0,
    y: 0,
    copy: function() {
        return new Point(this.x, this.y);
    }
};
function peq(p1, p2)
{
    return p1 && p2 ? (p1.x === p2.x) && (p1.y === p2.y) : false;
}
function update_bbox(bbox, x, y)
{
    if (bbox)
    {
        bbox.xm = stdMath.min(bbox.xm, x);
        bbox.xM = stdMath.max(bbox.xM, x);
        bbox.ym = stdMath.min(bbox.ym, y);
        bbox.yM = stdMath.max(bbox.yM, y);
    }
}
function check_and_add(a, i, check_only)
{
    var l = 0, r = a.length-1, m, j;
    if (l > r)
    {
        if (!check_only) a.push(i);
        return -1;
    }
    else if (l === r)
    {
        j = a[0];
        if (i.id === j.id)
        {
            return 0;
        }
        else
        {
            if (!check_only) a[i.id > j.id ? 'push' : 'unshift'](i);
            return -1;
        }
    }
    else
    {
        for (;;)
        {
            m = (l + r) >>> 1;
            j = a[m];
            if (i.id === j.id)
            {
                return m;
            }
            else if (l === m)
            {
                if (!check_only) a.splice(i.id < j.id ? m : (m+1), 0, i);
                return -1;
            }
            else if (i.id < j.id)
            {
                r = m;
            }
            else
            {
                l = m;
            }
        }
    }
}
function is_surrounded_by(c1, c0, already_checked)
{
    if (!(c0.xm < c1.xm && c1.xM < c0.xM && c0.ym < c1.ym && c1.yM < c0.yM)) return false;
    already_checked = already_checked || [];
    check_and_add(already_checked, c1);
    for (var surround=c1.surround,c2=null,i=0,il=surround.length; i<il; ++i)
    {
        c2 = surround[i];
        if ((c2.id === c0.id) || (-1 !== check_and_add(already_checked, c2, true))) continue;
        if (!is_surrounded_by(c2, c0, already_checked)) return false;
    }
    return true;
}
function allocate_contours(contours)
{
    /* allocate the contours array only for requested information */
    var number_of_components = contours.length,
        comp, contour, new_contour, border, i, il,
        new_contours = new Array(number_of_components);
    for (var comp = 0; comp < number_of_components; ++comp)
    {
        contour = contours[comp];
        new_contours[comp] = new_contour = {number_of_borders:contour.number_of_borders, borders:new Array(contour.number_of_borders)};
        for (i = 0, il = contour.number_of_borders; i < il; ++i)
        {
            border = contour.borders[i];
            new_contour.borders[i] = {number_of_paths:border.number_of_paths, paths:border.paths.map(function(path) {return {length:0,segments:null,other_comp:path.other_comp,others:path.others};})};
        }
    }
    return new_contours;
}
//---- adapted from multilabel-potrace (v.2020)
function trace(bm, params)
{
    compute_raw_contours(bm, params.layered);
    bm.simplified_contours = null;
    bm.smoothed_contours = null;

    if (!params.linetolerance)
    {
        get_paths_from_lower_comp(bm);
        return;
    }

    /* allocate the contours array only for requested information */
    if (!params.alphamax)
    {
        bm.simplified_contours = allocate_contours(bm.raw_contours);
    }
    else //if (params.alphamax)
    {
        bm.smoothed_contours = allocate_contours(bm.raw_contours);
    }

    var number_of_components = bm.components;
    for (var comp = 0; comp < number_of_components; ++comp)
    {
        var contour = bm.raw_contours[comp];
        for (var i = 0, il = contour.number_of_borders; i < il; ++i)
        {
            var border = contour.borders[i];
            for (var j = 0, jl = border.number_of_paths; j < jl; ++j)
            {
                trace_path(bm, comp, i, j, params);
            }
        }
    }

    get_paths_from_lower_comp(bm);
}
function svg(bm, contours, params)
{
    var svg = '<svg width="' + String(bm.width) + '" height="' + String(bm.height) + '" viewBox="0 0 '+String(bm.width-1)+' '+String(bm.height-1)+'" xmlns="http://www.w3.org/2000/svg\">',
        number_of_components = bm.components, component = bm.component,
        o = {bm:bm, width:bm.width, height:bm.height,
            layered:params.layered, minpathsegments:params.minpathsegments,
            is_first_segment:true, is_correct_order:true,
            points:0, z:0};
    for (var c = 0; c < number_of_components; ++c)
    {
        var comp = component[c].id, color = component[c].color;
        if (color)
        {
            if (contours)
            {
                o.thiscomponent = component[c];
                if (params.outline)
                {
                    svg += draw_contour(contours[comp], comp, o, 'none', params.outlinecolor || color, params.outline);
                }
                else
                {
                    svg += draw_contour(contours[comp], comp, o, color, color, 0.5);
                }
            }
            else
            {
                if (params.outline)
                {
                    svg += "\n" + '<rect x="0" y="0" width="' + String(bm.width) + '" height="' + String(bm.height) + '" stroke="'+color+'" stroke-width="'+String(params.outline)+'"/>';
                }
                else
                {
                    svg += "\n" + '<rect x="0" y="0" width="' + String(bm.width) + '" height="' + String(bm.height) + '" fill="'+color+'"/>';
                }
            }
        }
    }
    svg += "\n" + '</svg>';
    return svg;
}
var UP = 0, DOWN = 1, LEFT = 2, RIGHT = 3;
function out_comp()
{
    return MAX;
}
function not_a_point()
{
    return new Point(MIN, MIN);
}
function curve(u, v, b)
{
    if (1 === arguments.length)
    {
        this.control_points = [not_a_point(),u,not_a_point()];
    }
    else if (2 === arguments.length)
    {
        this.control_points = [not_a_point(),u,v];
    }
    else
    {
        this.control_points = [u,v,b];
    }
}
curve[PROTO] = {
    constructor: curve,
    control_points: null,
    is_vertex: function() {
        return ((MIN === this.control_points[0].x) || !isFinite(this.control_points[0].x)) && ((MIN === this.control_points[0].y) || !isFinite(this.control_points[0].y));
    }
};
function insert_point(point, o)
{
    ++o.points;
    return String((point.x).toFixed(2)) + ' ' + String((o.height - 1 - point.y).toFixed(2));
}
function insert_path_segment(segment, o)
{
    var out = '';
    if (segment instanceof curve)
    {
        if (segment.is_vertex())
        {
            if (o.is_correct_order) out += insert_path_segment(segment.control_points[1], o);
            if (segment.control_points[2] && !peq(segment.control_points[2], not_a_point())) out += insert_path_segment(segment.control_points[2], o);
            if (!o.is_correct_order) out += insert_path_segment(segment.control_points[1], o);
        }
        else
        {
            if (o.is_correct_order)
            {
                if (o.is_first_segment)
                {
                    /* opening with Bézier curve (the border is one cycle path) */
                    out += insert_path_segment(segment.control_points[2], o);
                }
                else
                {
                    out += 'C'; out += insert_point(segment.control_points[0], o);
                    out += ','; out += insert_point(segment.control_points[1], o);
                    out += ','; out += insert_point(segment.control_points[2], o);
                }
            }
            else
            {
                out += insert_point(segment.control_points[2], o); out += 'C';
                out += insert_point(segment.control_points[1], o); out += ',';
                out += insert_point(segment.control_points[0], o); out += ',';
                o.is_first_segment = false;
            }
        }
    }
    else
    {

        if (o.is_correct_order && !o.is_first_segment) out += 'L';
        out += insert_point(segment, o);
        if (!o.is_correct_order) out += 'L';
        o.is_first_segment = false;
    }
    return out;
}
function close_border(out, last, end, o)
{
    o.z = 0;
    if (last instanceof curve)
    {
        if (last.is_vertex())
        {
            if (end.is_vertex())
            {
                if (!o.is_correct_order)
                {
                    // point - point - reverse
                    out = out.slice(0,-1); // erase last "L"
                }
            }
            else
            {
                if (o.is_correct_order)
                {
                    // point - curve - direct
                    /* only last control point of end was inserted at first */
                    out += insert_path_segment(end, o);
                }
                else
                {
                    // point - curve - reverse
                    /* close the curve to the first control point of end */
                    out += 'z';
                    o.z = 1;
                    ++o.points;
                }
            }
        }
        else
        {
            if (!o.is_correct_order)
            {
                // curve - any - reverse
                /* last control points of the curve must be given; the end
                 * vertex or curve necessarily specifies it */
                out += insert_point(end.control_points[2], o);
            }
            else
            {
                if (!end.is_vertex())
                {
                    // curve - curve - direct
                    /* only last control point of end was inserted at first */
                    out += insert_path_segment(end, o);
                }
            }
        }

        if (end.is_vertex())
        {
            out += 'z';
            o.z = 1;
            ++o.points;
        }
    }
    else
    {
        if (!o.is_correct_order)
        {
            // point - point - reverse
            out = out.slice(0,-1); // erase last "L"
        }
        out += 'z';
        o.z = 1;
        ++o.points;
    }
    return out;
}
function draw_contour(contour, comp, o, fill_color, stroke_color, stroke_width)
{
    var out = '';
    o.points = 0;
    for (var i = 0, il = contour.number_of_borders; i < il; ++i)
    {
        out += draw_border(contour.borders[i], comp, o);
    }
    if (o.points < 1+o.minpathsegments) return '';

    out = "\n" + '<path d="' + out + '" fill="'+(fill_color||'#000')+'" fill-rule="nonzero"';
    out += stroke_width && (0 < stroke_width) ? (' stroke="'+(stroke_color||'#000')+'" stroke-width="'+String(stroke_width)+'"') : ' stroke="none"';
    out += '/>';
    return out;
}
function is_interior(path, thiscomponent, bm)
{
    if (path.other_comp >= bm.components) return false;
    var othercomponent = bm.component[path.other_comp];
    return (othercomponent.id !== thiscomponent.id) && ((!!othercomponent.color) && is_surrounded_by(othercomponent, thiscomponent));
    /*return (0 < path.others.length) && (path.others.filter(function(othercomponent) {
        return (othercomponent.id !== thiscomponent.id) && ((!!othercomponent.color) && is_surrounded_by(othercomponent, thiscomponent));
    }).length === path.others.length);*/
}
function draw_border(border, comp, o)
{
    var out = '', path, lastpath, was_correct_order;
    o.is_first_segment = true;
    for (var j = 0, jl = border.number_of_paths; j < jl; ++j)
    {
        /* the SVG convention is to leave the interior of the shape
         * on the right, which is the opposite of our convention */
        path = border.paths[jl - 1 - j];
        if (o.layered && is_interior(path, o.thiscomponent, o.bm)) continue;
        /* if the list of point is taken from the other component, it is
         * given in reverse order; but here "reverse" is correct order! */
        was_correct_order = o.is_correct_order;
        o.is_correct_order = (comp > path.other_comp);
        out += draw_path(path, o, was_correct_order);
        lastpath = path;
    }
    if (lastpath)
    {
        path = lastpath;//border.paths[0];
        out = close_border(out, path.segments[o.is_correct_order ? path.length - 1 : 1],
                   path.segments[o.is_correct_order ? path.length : 0], o);
    }
   return out;
}
function draw_path(path, o, was_correct_order)
{
    var out = '';
    if (o.is_first_segment)
    {
        out += 'M';
    }
    else if (was_correct_order && !o.is_correct_order)
    {
        out += 'L';
    }
    else if (!was_correct_order && o.is_correct_order)
    {
        o.is_first_segment = true;
    }
    for (var k = 0, kl = path.length; k < kl; ++k)
    {
        out += insert_path_segment(o.is_correct_order ? path.segments[k] : path.segments[kl - k], o);
    }
    return out;
}
function trace_path(bm, comp, border_num, path_num, params)
{
    /* get borders and paths */
    var raw_path = bm.raw_contours[comp].borders[border_num].paths[path_num];

    /* process only from the component with lowest identifier */
    if (comp > raw_path.other_comp)
    {
        return;
    }

    /* convert to the potrace path structure */
    var potrace_path = new Path(),
        raw_path_length = raw_path.length,
        raw_path_segments = raw_path.segments,
        is_cycle = peq(raw_path_segments[0], raw_path_segments[raw_path_segments.length-1]);
    potrace_path.len = is_cycle ? raw_path_length : (raw_path_length + 1);
    potrace_path.pt = new Array(potrace_path.len);
    for (var i = 0, il = potrace_path.len; i < il; ++i)
    {
        potrace_path.pt[i] = new Point(clamp(raw_path_segments[i].x, 0, bm.width-1),clamp(raw_path_segments[i].y, 0, bm.height-1));
    }

    /* trace the path with potrace */
    process_path(potrace_path, params, is_cycle);

    /* copy result into multilabel potrace data structure */
    var potrace_curve = potrace_path.curve;
    //raw_path.is_cycle = is_cycle;
    if (bm.simplified_contours)
    {
        var simplified_path = bm.simplified_contours[comp].borders[border_num].paths[path_num];
        simplified_path.length = potrace_curve.n - (is_cycle ? 0 : 1);
        simplified_path.segments = new Array(simplified_path.length + 1);
        var v = potrace_curve.vertex;
        for (var i = 0, il = simplified_path.length; i < il; ++i)
        {
            simplified_path.segments[i] = v[i].copy();
        }
        simplified_path.segments[simplified_path.length] = (is_cycle ?
            simplified_path.segments[0] : raw_path_segments[raw_path_segments.length-1]).copy();
        //simplified_path.is_cycle = is_cycle;
    }

    if (bm.smoothed_contours)
    {
        var smoothed_path = bm.smoothed_contours[comp].borders[border_num].paths[path_num];
        smoothed_path.length = potrace_curve.n - (is_cycle ? 0 : 1);
        smoothed_path.segments = new Array(smoothed_path.length + 1);
        var c =  potrace_curve.c;
        for (var i = 0, il = smoothed_path.length; i < il; ++i)
        {
            if (potrace_curve.tag[i] === "CORNER")
            {
                /* only one vertex; if next segment is a Bézier curve,
                 * add its first control point */
                var j = i + 1 < potrace_curve.n ? i + 1 : 0;
                smoothed_path.segments[i] =
                    potrace_curve.tag[j] === "CORNER" ?
                    new curve(c[3 * i + 1].copy()) :
                    new curve(c[3 * i + 1].copy(), c[3 * i + 2].copy());
            }
            else
            {
                smoothed_path.segments[i] =
                    new curve(c[3 * i + 0].copy(), c[3 * i + 1].copy(), c[3 * i + 2].copy());
            }
        }
        smoothed_path.segments[smoothed_path.length] = is_cycle ?
            smoothed_path.segments[0] : new curve(raw_path_segments[raw_path_segments.length-1].copy());
        //smoothed_path.is_cycle = is_cycle;
    }
}
function coor_to_index(bm, x, y)
{
    return x + (bm.height - 1 - y) * bm.width;
}
function ul(bm, index)
{
    return index - 1;
}
function ur(bm, index)
{
    return index;
}
function dl(bm, index)
{
    return index + bm.width - 1;
}
function dr(bm, index)
{
    return index + bm.width;
}
function move_up(bm, index)
{
    index -= bm.width;
    return index;
}
function move_down(bm, index)
{
    index += bm.width;
    return index;
}
function move_left(bm, index)
{
    index -= 1;
    return index;
}
function move_right(bm, index)
{
    index += 1;
    return index;
}
function turn_right(d)
{
    return d === UP ? RIGHT : (d === RIGHT ? DOWN : (d === DOWN ? LEFT : UP));
}
function turn_left(d)
{
    return d === UP ? LEFT : (d === LEFT ? DOWN : (d === DOWN ? RIGHT : UP));
}
function in_limit(bm, p)
{
    return 0 <= p.x && 0 <= p.y && p.x < bm.width && p.y < bm.height;
}
function is_border_pixel(bm, p, d)
{
    if (d === UP) return in_limit(bm, p) && p.x > 0;
    if (d === DOWN) return in_limit(bm, p) && p.y > 0;
    if (d === LEFT) return in_limit(bm, p) && p.y > 0 && p.x > 0;
    return in_limit(bm, p);
}
function get_border_pixel(bm, index, d)
{
    return  d === UP   ?   ul(bm, index) :
           (d === DOWN ?   dr(bm, index) :
           (d === LEFT ?   dl(bm, index) :
        /*  d === RIGHT */ ur(bm, index)));
}
function is_border(bm, index, d)
{
    return (bm.border_statuses[get_border_pixel(bm, index, d)] || 0) & (1 << d);
}
function set_border(bm, index, d)
{
    bm.border_statuses[get_border_pixel(bm, index, d)] |= (1 << d);
}
function compute_bounding_boxes(bm)
{
    bm.bboxes = bm.component.reduce(function(bboxes, c) {
        bboxes[c.id] = {lower_left:new Point(c.xm, bm.height-1-c.yM), upper_right:new Point(c.xM+1, bm.height-1-c.ym+1)};
        return bboxes;
    }, new Array(bm.components));
    /*var number_of_components = bm.components, bboxes = new Array(number_of_components);
    bm.bboxes = bboxes;
    for (var comp=0; comp<number_of_components; ++comp)
    {
        bboxes[comp] = {lower_left:new Point(MAX, MAX), upper_right:new Point(MIN, MIN)};
    }
    for (var x = 0, w = bm.width; x<w; ++x)
    {
        var index = coor_to_index(bm, x, 0);
        for (var y = 0, h = bm.height; y < h; ++y)
        {
            var comp = bm.data[index].id;
            if (x < bboxes[comp].lower_left.x)
            {
                bboxes[comp].lower_left.x = x;
            }
            if (y < bboxes[comp].lower_left.y)
            {
                bboxes[comp].lower_left.y = y;
            }
            if (x + 1 > bboxes[comp].upper_right.x)
            {
                bboxes[comp].upper_right.x = x + 1;
            }
            if (y + 1 > bboxes[comp].upper_right.y)
            {
                bboxes[comp].upper_right.y = y + 1;
            }
            index = move_up(bm, index); // y is incremented
        }
    }*/
}
function find_next_border(bm, comp, p)
{
    var bbox = bm.bboxes[comp],
        x_min = bbox.lower_left.x,
        x_max = bbox.upper_right.x,
        y_max = bbox.upper_right.y;

    for (; p.y < y_max; ++p.y)
    {
        var index = coor_to_index(bm, p.x, p.y);
        for (; p.x < x_max; ++p.x)
        {
            if (bm.data[ur(bm, index)].id === comp)
            {
                if ((p.y <= 0 || bm.data[dr(bm, index)].id !== comp) && is_border_pixel(bm, p, RIGHT) && !is_border(bm, index, RIGHT))
                {
                    return RIGHT;
                }
            }
            else if (p.x > 0 && p.y > 0)
            {
                if ((bm.data[ul(bm, index)].id === comp) && is_border_pixel(bm, p, UP) && !is_border(bm, index, UP))
                {
                    return UP;
                }
            }
            index = move_right(bm, index); // x is incremented
        }
        p.x = x_min;
    }
    return DOWN;
}
function smallest_comp(bm, p, comp, other)
{
    /* ensure no weird configuration */
    var LOCAL_RADIUS = 3, radius = LOCAL_RADIUS;
    if (radius > bm.width) {radius = bm.width;}
    if (radius > bm.height) {radius = bm.height;}

    var n_comp = 0, n_other = 0, radius_square = radius*radius;

    /* a. local size: count pixels witin a radius of LOCAL_RADIUS pixel */
    var x_min = p.x > radius ? p.x - radius : 0,
        x_max = p.x < bm.width - radius ? p.x + radius : (bm.width - 1),
        y_min = p.y > radius ? p.y - radius : 0,
        y_max = p.y < bm.height - radius ? p.y + radius : (bm.height - 1);
    n_comp = 0;
    n_other = 0;
    for (var x = x_min; x < x_max; ++x)
    {
        var index = coor_to_index(bm, x, y_min);
        for (var y = y_min; y < y_max; ++y)
        {
            var x_d = x + 0.5 - p.x, y_d = y + 0.5 - p.y;
            if (x_d*x_d + y_d*y_d < radius_square)
            {
                if (bm.data[index].id === comp) {++n_comp;}
                else if (bm.data[index].id === other) {++n_other;}
            }
            index = move_up(bm, index); // y is incremented
        }
    }
    if (n_comp < n_other) {return comp;}
    else if (n_other < n_comp) {return other;}

    /* b. global size: check with bounding boxes */
    n_comp = (bm.bboxes[comp].upper_right.x - bm.bboxes[comp].lower_left.x)*
            (bm.bboxes[comp].upper_right.y - bm.bboxes[comp].lower_left.y);
    n_other = (bm.bboxes[other].upper_right.x - bm.bboxes[other].lower_left.x)*
            (bm.bboxes[other].upper_right.y - bm.bboxes[other].lower_left.y);
    if (n_comp < n_other) {return comp;}
    else if (n_other < n_comp) {return other;}

    /* c. decide arbitrary but consistently from components identifiers */
    if (comp < other) {return comp;}
    else {return other;}
}
function compute_raw_path(bm, p, dir, p0, path, layered)
{
    var d = dir[0], index = coor_to_index(bm, p.x, p.y);

    /* determine the components on both sides of the path */
    var comp, _out_comp = out_comp();
    if (d === UP)
    {
        comp = bm.data[ul(bm, index)].id;
        path.other_comp = p.x > bm.width-1 ? _out_comp : bm.data[ur(bm, index)].id;
    }
    else if (d === DOWN)
    {
        comp = bm.data[dr(bm, index)].id;
        path.other_comp = p.x <= 0? _out_comp : bm.data[dl(bm, index)].id;
    }
    else if (d === LEFT)
    {
        comp = bm.data[dl(bm, index)].id;
        path.other_comp = p.y > bm.height-1 ? _out_comp : bm.data[ul(bm, index)].id;
    }
    else
    { // d == RIGHT
        comp = bm.data[ur(bm, index)].id;
        path.other_comp = p.y <= 0 ? _out_comp : bm.data[dr(bm, index)].id;
    }

    var number_of_points = 0;
    path.segments = [];
    /*var q = new Point(0,0);
    if (layered) path.others = path.other_comp !== comp && path.other_comp !== _out_comp ? [bm.component[path.other_comp]] : [];
    function find_others(p)
    {
        //if (!in_limit(bm, p)) return;
        for (var i=-1; i<=1; ++i)
        {
            for (var j=-1; j<=1; ++j)
            {
                q.x = p.x + j;
                q.y = p.y + i;
                if (!in_limit(bm, q)) continue;
                var c = bm.data[coor_to_index(bm, q.x, q.y)].id;
                if (c !== comp && c !== path.other_comp) check_and_add(path.others, bm.component[c]);
            }
        }
    }*/

    /* record the first point of the path for later identification */
    if (comp > path.other_comp)
    {
        path.segments.push(p.copy());
    }

    var is_triple_point = false, is_first_point = true;

    while (true)
    { /* construct path */

        /* add point to path */
        if (comp < path.other_comp)
        { // only comp with lowest id records path
            if (path.segments.length > number_of_points)
            {
                path.segments[number_of_points] = p.copy();
            }
            else
            {
                path.segments.push(p.copy());
            }
            //if (layered) find_others(p.x, p.y);
            ++number_of_points;
        }

        /* check if triple point reached or if border is closed */
        if (is_triple_point || (peq(p, p0) && !is_first_point)) {break;}

        /* flag border */
        if (is_border_pixel(bm, p, d)) set_border(bm, index, d);

        /* move to next point and check surrounding pixels */
        var on_left, on_right;
        if (d === UP)
        { // x cannot be 0
            p.y++;
            index = move_up(bm, index);
            if (p.y > bm.height-1)
            {
                on_left = on_right = _out_comp;
            }
            else
            {
                on_left = bm.data[ul(bm, index)].id;
                on_right = p.x > bm.width-1 ? _out_comp : bm.data[ur(bm, index)].id;
            }
        }
        else if (d === DOWN)
        { // x cannot be width
            p.y--;
            index = move_down(bm, index);
            if (p.y <= 0)
            {
                on_left = on_right = _out_comp;
            }
            else
            {
                on_left = bm.data[dr(bm, index)].id;
                on_right = p.x <= 0 ? _out_comp : bm.data[dl(bm, index)].id;
            }
        }
        else if (d === LEFT)
        { // y cannot be 0
            p.x--;
            index = move_left(bm, index);
            if (p.x <= 0)
            {
                on_left = on_right = _out_comp;
            }
            else
            {
                on_left = bm.data[dl(bm, index)].id;
                on_right = p.y > bm.height-1 ? _out_comp : bm.data[ul(bm, index)].id;
            }
        }
        else
        { // d == RIGHT // y cannot be height
            p.x++;
            index = move_right(bm, index);
            if (p.x > bm.width-1)
            {
                on_left = on_right = _out_comp;
            }
            else
            {
                on_left = bm.data[ur(bm, index)].id;
                on_right = p.y <= 0 ? _out_comp : bm.data[dr(bm, index)].id;
            }
        }

        if (is_first_point)
        {
            /* record the second point of the path for later identification */
            if (comp > path.other_comp)
            {
                path.segments.push(p.copy());
            }
            is_first_point = false;
        }

        /* determine next direction and check for triple point */

/* for diagonal connection to be processed consistently, one must ensure that
 * the path of the two components involved turn to opposite directions (since
 * they visit the point of connection coming from opposite directions);
 * but left or right is not completely arbitrary: given our convention to
 * follow the borders by keeping the component on the left, turning right would
 * connect the pieces connected by diagonal into the same object, whereas
 * turning left would separate them;
 * we use the following heuristics:
 *  1. if the components in the other diagonal are different, we consider the
 *     current component as a continuous object which separates two other
 *     objects; we thus turn right for connexity, and do not regard this point
 *     as a triple point (care must be taken when encountering it when
 *     computing the path for the other involved components)
 *  2. if the pixels of the other diagonal belongs to the same component, we
 *  consider the smallest object to be in front of the biggest: turn right for
 *  the former and left for the latter; smallest is determined by the first of
 *  the following criteria that discriminates the components:
 *      a. local size, by counting pixels around the point (within a radius of
 *      LOCAL_RADIUS pixel sides)
 *      b. if same local size, use global size, roughly determined by bounding
 *      boxes
 *      c. if still equal, choose arbitrarily the component with lowest
 *      component identifier as the smallest
 *
 * WARNING: in case 2., the biggest component might end up being disconnected;
 * moreover, the point of diagonal connection is not processed as a triple
 * point, and thus can move freely when tracing each side: this might, in
 * theory, lead to borders crossing each others; this is rarely happening in
 * practice; TODO: can we ensure that this does not happen at all? */
        if (on_left === comp)
        {
            if (on_right === comp)
            { /* simple corner */
                d = turn_right(d);
            }
            else if (on_right !== path.other_comp)
            {
                is_triple_point = true;
            }/* else continue straight ahead */
        }
        else if (on_left === path.other_comp)
        {
            if (on_right === comp)
            { /* connected by diagonal, case 2. */
                d = comp === smallest_comp(bm, p, comp, path.other_comp) ? turn_right(d) : turn_left(d);
            }
            else
            { /* either corner, or other comp diagonal, case 1. */
                d = turn_left(d);
            }
        }
        else if (on_right === comp)
        { /* connected by diagonal, case 1. */
            d = turn_right(d);
        }
        else
        { /* corner and triple point */
            d = turn_left(d);
            is_triple_point = true;
        }
    } /* path is complete */

    if (comp < path.other_comp)
    {
        path.length = number_of_points - 1;
    }
    else
    {
        path.length = 0; /* flag path recorded by other component */
    }
    dir[0] = d;

    return is_triple_point;
}
function compute_raw_border(bm, p, d, layered)
{
    var number_of_paths = 0, paths = [], path,
        p0 = p.copy(), dir = [d], is_triple_point = false;

    do
    {
        path = {length:0,segments:null,other_comp:MAX,others:null};
        is_triple_point = compute_raw_path(bm, p, dir, p0, path, layered);
        paths.push(path); ++number_of_paths;
    } while (!peq(p, p0));

    /* if the border contains more than one path and the origin was not a
     * triple point, the last path is in fact the begining of the first path */
    if ((number_of_paths > 1) && !is_triple_point)
    {
        --number_of_paths;
        var first_path = paths[0], last_path = paths[number_of_paths];
        if (first_path.length)
        { /* paths recorded; append first to last */
            for (var i = 1, il = first_path.length; i <= il; ++i)
            {
                last_path.segments.push(first_path.segments[i]);
            }
            if (last_path.others) last_path.others.push.apply(last_path.others, first_path.others.filter(function(c) {return -1 === last_path.others.indexOf(c);}));
            first_path.length += last_path.length;
        } /* else keep only two first points of the last in the first */
        first_path.segments = last_path.segments;
        first_path.others = last_path.others;
        last_path.others = last_path.segments = null;
    }

    return {number_of_paths:number_of_paths, paths:paths};
}
function compute_raw_contour(bm, comp, layered)
{
    var number_of_borders = 0, borders = [];

    /* start at lower left corner of bounding box */
    var p = bm.bboxes[comp].lower_left.copy(), d = find_next_border(bm, comp, p);

    while (d !== DOWN)
    {
        ++number_of_borders;
        borders.push(compute_raw_border(bm, p.copy(), d, layered));
        d = find_next_border(bm, comp, p);
    }

    return {number_of_borders:number_of_borders, borders:borders};
}
function compute_raw_contours(bm, layered)
{
    compute_bounding_boxes(bm);

    /* boolean map indicating the pixels which have been visited */
    bm.border_statuses = (new Array(bm.data.length)).fill(0);
    bm.raw_contours = new Array(bm.components);

    for (var comp = 0, comps = bm.components; comp < comps; ++comp)
    {
        bm.raw_contours[comp] = compute_raw_contour(bm, comp, layered);
    }
}
function get_paths_from_lower_comp(bm)
{
    var path_found = 0, number_of_components = bm.components;
    for (var comp = 0; comp < number_of_components; ++comp)
    {
        /* iterate over each path and find components with highest id */
        var contour = bm.raw_contours[comp];
        for (var i = 0, il = contour.number_of_borders; i < il; ++i)
        {
            var border = contour.borders[i];
            for (var j = 0, jl = border.number_of_paths; j < jl; ++j)
            {
                path_found = 0;
                var path = border.paths[j];
                if (comp < path.other_comp) {continue;}

        /* find the correct path in the other component */
        var other_contour = bm.raw_contours[path.other_comp];
        for (var k = 0, kl = other_contour.number_of_borders; k < kl; ++k)
        {
            var other_border = other_contour.borders[k];
            for (var l = 0, ll = other_border.number_of_paths; l < ll; ++l)
            {
                var other_path = other_border.paths[l];
                if (other_path.other_comp !== comp) {continue;}

        /* path uniquely characterized by first and second points */
        if (peq(path.segments[0], other_path.segments[other_path.segments.length-1]) &&
            peq(path.segments[1], other_path.segments[other_path.segments.length-2]))
        {
            path.length = other_path.length;
            path.segments = other_path.segments;
            if (other_path.others) path.others = other_path.others.filter(function(c) {return c.id !== comp && c.id !== path.other_comp;}).concat([bm.component[path.other_comp]]);
            //path.is_cycle = other_path.is_cycle;
            if (bm.simplified_contours)
            {
                var simplified_path = bm.simplified_contours[comp].borders[i].paths[j];
                var other_simplified_path = bm.simplified_contours[path.other_comp].borders[k].paths[l]
                simplified_path.length = other_simplified_path.length;
                simplified_path.segments = other_simplified_path.segments;
                simplified_path.others = path.others;
                //simplified_path.is_cycle = other_simplified_path.is_cycle;
            }
            if (bm.smoothed_contours)
            {
                var smoothed_path = bm.smoothed_contours[comp].borders[i].paths[j];
                var other_smoothed_path = bm.smoothed_contours[path.other_comp].borders[k].paths[l];
                smoothed_path.length = other_smoothed_path.length;
                smoothed_path.segments = other_smoothed_path.segments;
                smoothed_path.others = path.others;
                //smoothed_path.is_cycle = other_smoothed_path.is_cycle;
            }
            path_found = 1; // break two loops
            break;
        }
        if (path_found) break;

            } // end for other paths
        if (path_found) break;
        } // end for other borders

            if (!path_found) return false;

            } // end for paths
        } // end for borders

    } // end for components
    return true;
}

//---- adapted from potrace code (v.1.16)
function process_path(path, params, is_cycle)
{
    calc_sums(path);
    calc_lon(path, params.linetolerance, is_cycle);
    bestpolygon(path, is_cycle);
    adjust_vertices(path, is_cycle);
    if (path.sign === '-') reverse(path);
    if (params.alphamax)
    {
        smooth(path, params.alphamax, is_cycle);
        if (params.opttolerance) opticurve(path, params.opttolerance, is_cycle);
    }
    return path;
}
function Path()
{
    var self = this;
    self.len = 0;
}
Path[PROTO] = {
    constructor: Path,
    len: 0,
    sign: '',
    lon: null,
    curve: null,
    pt: null,
    x0: 0,
    y0: 0,
    po: null,
    m: 0,
    sums: null,
    lon: null
};
function Curve(n)
{
    var self = this;
    self.n = n;
    self.tag = new Array(n);
    self.c = new Array(n * 3);
    self.alphaCurve = 0;
    self.vertex = new Array(n);
    self.alpha = new Array(n);
    self.alpha0 = new Array(n);
    self.beta = new Array(n);
}
Curve[PROTO] = {
    constructor: Curve,
    n: 0,
    tag: null,
    c: null,
    alphaCurve: 0,
    vertex: null,
    alpha: null,
    alpha0: null,
    beta: null
};
function Quad()
{
    this.data = [0,0,0,0,0,0,0,0,0];
}
Quad[PROTO] = {
    constructor: Quad,
    data: null,
    at: function(x, y) {
        return this.data[x * 3 + y];
    }
};
function Sum(x, y, xy, x2, y2)
{
    var self = this;
    self.x = x;
    self.y = y;
    self.xy = xy;
    self.x2 = x2;
    self.y2 = y2;
}
Sum[PROTO] = {
    constructor: Sum,
    x : 0,
    y : 0,
    xy: 0,
    x2: 0,
    y2: 0
};
function Opti()
{
    var self = this;
    self.pen = 0;
    self.c = [new Point(0,0), new Point(0,0)];
    self.t = 0;
    self.s = 0;
    self.alpha = 0;
}
Opti[PROTO] = {
    constructor: Opti,
    pen: 0,
    c: null,
    t: 0,
    s: 0,
    alpha: 0
};
function calc_sums(path)
{
    var i, x, y, pt = path.pt;
    path.x0 = pt[0].x;
    path.y0 = pt[0].y;

    path.sums = [];
    var s = path.sums;
    s.push(new Sum(0, 0, 0, 0, 0));
    for (i=0; i<path.len; ++i)
    {
        x = pt[i].x - path.x0;
        y = pt[i].y - path.y0;
        s.push(new Sum(s[i].x + x, s[i].y + y, s[i].xy + x * y,
        s[i].x2 + x * x, s[i].y2 + y * y));
    }
}
function calc_lon(path, linetolerance/*=1*/, is_cycle)
{
    var n = path.len, pt = path.pt, dir,
        pivk = new Array(n),
        nc = new Array(n),
        ct = new Array(4),

        constraint = [new Point(0,0), new Point(0,0)],
        cur = new Point(0,0),
        off = new Point(0,0),
        dk = new Point(0,0),
        foundk,

        i, j, k1, a, b, c, d, k = is_cycle ? 0 : (n - 1);

    path.lon = new Array(n);
    for (i=n-1; i>=0; --i)
    {
        if (pt[i].x !== pt[k].x && pt[i].y !== pt[k].y) k = i + 1;
        nc[i] = k;
    }

    for (i=n-1; i>=0; --i)
    {
        if (!is_cycle && i === n - 1)
        {
            pivk[i] = n - 1;
            continue;
        }
        ct[0] = ct[1] = ct[2] = ct[3] = 0;
        dir = (3 + 3 * (pt[MOD(i + 1, n, is_cycle)].x - pt[i].x) + (pt[MOD(i + 1, n, is_cycle)].y - pt[i].y)) >>> 1;
        ++ct[dir];

        constraint[0].x = 0;
        constraint[0].y = 0;
        constraint[1].x = 0;
        constraint[1].y = 0;

        k = nc[i];
        k1 = i;
        while (1)
        {
            foundk = 0;
            dir = (3 + 3 * sign(pt[k].x - pt[k1].x) + sign(pt[k].y - pt[k1].y)) >>> 1;
            ++ct[dir];

            if (ct[0] && ct[1] && ct[2] && ct[3])
            {
                pivk[i] = k1;
                foundk = 1;
                break;
            }

            cur.x = pt[k].x - pt[i].x;
            cur.y = pt[k].y - pt[i].y;

            if (xprod(constraint[0], cur) < 0 || xprod(constraint[1], cur) > 0) break;

            if (stdMath.abs(cur.x) <= linetolerance && stdMath.abs(cur.y) <= linetolerance)
            {
                /* nothing */
            }
            else
            {
                off.x = cur.x + ((cur.y >= 0 && (cur.y > 0 || cur.x < 0)) ? linetolerance : -linetolerance);
                off.y = cur.y + ((cur.x <= 0 && (cur.x < 0 || cur.y < 0)) ? linetolerance : -linetolerance);
                if (xprod(constraint[0], off) >= 0)
                {
                    constraint[0].x = off.x;
                    constraint[0].y = off.y;
                }
                off.x = cur.x + ((cur.y <= 0 && (cur.y < 0 || cur.x < 0)) ? linetolerance : -linetolerance);
                off.y = cur.y + ((cur.x >= 0 && (cur.x > 0 || cur.y < 0)) ? linetolerance : -linetolerance);
                if (xprod(constraint[1], off) <= 0)
                {
                    constraint[1].x = off.x;
                    constraint[1].y = off.y;
                }
            }
            k1 = k;
            if (!is_cycle && k1 === n - 1)
            {
                pivk[i] = k1;
                foundk = 1;
                break;
            }
            k = nc[k1];
            if (!cyclic(k, i, k1)) break;
        }
        if (foundk === 0)
        {
            dk.x = sign(pt[k].x-pt[k1].x);
            dk.y = sign(pt[k].y-pt[k1].y);
            cur.x = pt[k1].x - pt[i].x;
            cur.y = pt[k1].y - pt[i].y;

            a = xprod(constraint[0], cur);
            b = xprod(constraint[0], dk);
            c = xprod(constraint[1], cur);
            d = xprod(constraint[1], dk);

            j = MAX;
            if (b < 0) j = stdMath.floor(a / -b);
            if (d > 0) j = stdMath.min(j, stdMath.floor(-c / d));
            pivk[i] = MOD(k1+j,n,is_cycle);
        }
    }

    j = pivk[n-1];
    path.lon[n-1] = j;
    for (i=n-2; i>=0; --i)
    {
        if (cyclic(i+1,pivk[i],j)) j = pivk[i];
        path.lon[i] = j;
    }

    if (is_cycle)
    {
        for (i=n-1; cyclic(mod(i+1,n,is_cycle),j,path.lon[i]); --i) path.lon[i] = j;
    }
}
function bestpolygon(path, is_cycle)
{
    var i, j, m, k,
        n = path.len,
        pen = new Array(n + 1),
        prev = new Array(n + 1),
        clip0 = new Array(n),
        clip1 = new Array(n + 1),
        seg0 = new Array (n + 1),
        seg1 = new Array(n + 1),
        thispen, best, c;

    for (i=0; i<n; ++i)
    {
        if (is_cycle)
        {
            c = mod(path.lon[mod(i-1,n)]-1,n);
            if (c == i) c = mod(i+1,n);
            if (c < i) clip0[i] = n;
            else clip0[i] = c;
        }
        else
        {
            if (i === 0) c = path.lon[i] - 1;
            else c = path.lon[i - 1] - 1;
            if (c === i) c = i + 1;
            if (c >= n - 2) clip0[i] = n;
            else clip0[i] = c;
        }
    }

    j = 1;
    for (i=0; i<n; ++i)
    {
        while (j <= clip0[i])
        {
            clip1[j] = i;
            j++;
        }
    }

    i = 0;
    for (j=0; i<n; ++j)
    {
        seg0[j] = i;
        i = clip0[i];
    }
    seg0[j] = n;
    m = j;

    i = n;
    for (j=m; j>0; --j)
    {
        seg1[j] = i;
        i = clip1[i];
    }
    seg1[0] = 0;

    pen[0]=0;
    for (j=1; j<=m; ++j)
    {
        for (i=seg1[j]; i<=seg0[j]; ++i)
        {
            best = -1;
            for (k=seg0[j-1]; k>=clip1[i]; --k)
            {
                thispen = penalty3(path, k, i) + pen[k];
                if (best < 0 || thispen < best)
                {
                    prev[i] = k;
                    best = thispen;
                }
            }
            pen[i] = best;
        }
    }
    path.m = is_cycle ? m : m + 1;
    path.po = new Array(path.m);

    for (i=n, j=m-1; i>0; --j)
    {
        i = prev[i];
        path.po[j] = i;
    }
    if (!is_cycle) path.po[m] = path.len - 1;
}
function adjust_vertices(path, is_cycle)
{
    var m = path.m, po = path.po, n = path.len, pt = path.pt,
        x0 = path.x0, y0 = path.y0,
        ctr = new Array(m), dir = new Array(m),
        q = new Array(m),
        v = new Array(3), d, i, j, k, l, mm = is_cycle ? m : m-1,
        s = new Point(0,0),
        Q, w, dx, dy, det, min, cand, xmin, ymin, z;

    path.curve = new Curve(m);

    for (i=0; i<mm; ++i)
    {
        if (is_cycle)
        {
            j = po[mod(i+1,m)];
            j = mod(j-po[i],n)+po[i];
        }
        else
        {
            j = po[i + 1];
        }
        ctr[i] = new Point(0,0);
        dir[i] = new Point(0,0);
        pointslope(path, po[i], j, ctr[i], dir[i], is_cycle);
    }

    for (i=0; i<mm; ++i)
    {
        q[i] = new Quad();
        d = dir[i].x * dir[i].x + dir[i].y * dir[i].y;
        if (d === 0.0)
        {
            for (j=0; j<3; ++j)
            {
                for (k=0; k<3; ++k)
                {
                    q[i].data[j * 3 + k] = 0;
                }
            }
        }
        else
        {
            v[0] = dir[i].y;
            v[1] = -dir[i].x;
            v[2] = - v[1] * ctr[i].y - v[0] * ctr[i].x;
            for (l=0; l<3; ++l)
            {
                for (k=0; k<3; ++k)
                {
                    q[i].data[l * 3 + k] = v[l] * v[k] / d;
                }
            }
        }
    }

    for (i=0; i<m; ++i)
    {
        if (!is_cycle && (i === 0 || i === m - 1))
        {
            path.curve.vertex[i] = pt[po[i]].copy();
            continue;
        }
        Q = new Quad();
        w = new Point(0,0);

        s.x = pt[po[i]].x-x0;
        s.y = pt[po[i]].y-y0;

        j = MOD(i-1,m,is_cycle);

        for (l=0; l<3; ++l)
        {
            for (k=0; k<3; ++k)
            {
                Q.data[l * 3 + k] = q[j].at(l, k) + q[i].at(l, k);
            }
        }

        while(1)
        {
            det = Q.at(0, 0)*Q.at(1, 1) - Q.at(0, 1)*Q.at(1, 0);
            if (det !== 0.0)
            {
                w.x = (-Q.at(0, 2)*Q.at(1, 1) + Q.at(1, 2)*Q.at(0, 1)) / det;
                w.y = ( Q.at(0, 2)*Q.at(1, 0) - Q.at(1, 2)*Q.at(0, 0)) / det;
                break;
            }

            if (Q.at(0, 0)>Q.at(1, 1))
            {
                v[0] = -Q.at(0, 1);
                v[1] = Q.at(0, 0);
            }
            else if (Q.at(1, 1))
            {
                v[0] = -Q.at(1, 1);
                v[1] = Q.at(1, 0);
            }
            else
            {
                v[0] = 1;
                v[1] = 0;
            }
            d = v[0] * v[0] + v[1] * v[1];
            v[2] = - v[1] * s.y - v[0] * s.x;
            for (l=0; l<3; ++l)
            {
                for (k=0; k<3; ++k)
                {
                    Q.data[l * 3 + k] += v[l] * v[k] / d;
                }
            }
        }
        dx = stdMath.abs(w.x-s.x);
        dy = stdMath.abs(w.y-s.y);
        if (dx <= 0.5 && dy <= 0.5)
        {
            path.curve.vertex[i] = new Point(w.x+x0, w.y+y0);
            continue;
        }

        min = quadform(Q, s);
        xmin = s.x;
        ymin = s.y;

        if (Q.at(0, 0) !== 0.0)
        {
            for (z=0; z<2; ++z)
            {
                w.y = s.y-0.5+z;
                w.x = - (Q.at(0, 1) * w.y + Q.at(0, 2)) / Q.at(0, 0);
                dx = stdMath.abs(w.x-s.x);
                cand = quadform(Q, w);
                if (dx <= 0.5 && cand < min)
                {
                    min = cand;
                    xmin = w.x;
                    ymin = w.y;
                }
            }
        }

        if (Q.at(1, 1) !== 0.0)
        {
            for (z=0; z<2; ++z)
            {
                w.x = s.x-0.5+z;
                w.y = - (Q.at(1, 0) * w.x + Q.at(1, 2)) / Q.at(1, 1);
                dy = stdMath.abs(w.y-s.y);
                cand = quadform(Q, w);
                if (dy <= 0.5 && cand < min)
                {
                    min = cand;
                    xmin = w.x;
                    ymin = w.y;
                }
            }
        }

        for (l=0; l<2; ++l)
        {
            for (k=0; k<2; ++k)
            {
                w.x = s.x-0.5+l;
                w.y = s.y-0.5+k;
                cand = quadform(Q, w);
                if (cand < min)
                {
                    min = cand;
                    xmin = w.x;
                    ymin = w.y;
                }
            }
        }

        path.curve.vertex[i] = new Point(xmin + x0, ymin + y0);
    }
}
function reverse(path)
{
    var curve = path.curve, m = curve.n, v = curve.vertex, i, j, tmp;
    for (i=0, j=m-1; i<j; ++i, --j)
    {
        tmp = v[i];
        v[i] = v[j];
        v[j] = tmp;
    }
}
function smooth(path, alphamax, is_cycle)
{
    var m = path.curve.n, mm = is_cycle ? m : m - 2, curve = path.curve;

    var i, j, k, dd, denom, alpha,
        p2, p3, p4;

    for (i=0; i<mm; ++i)
    {
        j = MOD(i+1, m, is_cycle);
        k = MOD(i+2, m, is_cycle);
        p4 = interval(1/2.0, curve.vertex[k], curve.vertex[j]);

        denom = ddenom(curve.vertex[i], curve.vertex[k]);
        if (denom !== 0.0)
        {
            dd = dpara(curve.vertex[i], curve.vertex[j], curve.vertex[k]) / denom;
            dd = stdMath.abs(dd);
            alpha = dd>1 ? (1 - 1.0/dd) : 0;
            alpha = alpha / 0.75;
        }
        else
        {
            alpha = 4/3.0;
        }
        curve.alpha0[j] = alpha;

        if (alpha >= alphamax)
        {
            curve.tag[j] = "CORNER";
            curve.c[3 * j + 1] = curve.vertex[j];
            curve.c[3 * j + 2] = p4;
        }
        else
        {
            if (alpha < 0.55) alpha = 0.55;
            else if (alpha > 1) alpha = 1;
            p2 = interval(0.5+0.5*alpha, curve.vertex[i], curve.vertex[j]);
            p3 = interval(0.5+0.5*alpha, curve.vertex[k], curve.vertex[j]);
            curve.tag[j] = "CURVETO";
            curve.c[3 * j + 0] = p2;
            curve.c[3 * j + 1] = p3;
            curve.c[3 * j + 2] = p4;
        }
        curve.alpha[j] = alpha;
        curve.beta[j] = 0.5;
    }
    if (!is_cycle)
    {
        curve.tag[0] = "CORNER";
        curve.c[3 * 0 + 1] = curve.vertex[0];
        curve.c[3 * 0 + 2] = interval(1/2.0, curve.vertex[1], curve.vertex[0]);
        curve.tag[m-1] = "CORNER";
        curve.c[3 * (m-1) + 1] = curve.vertex[m-1];
    }
}
function opticurve(path, opttolerance, is_cycle)
{
    var curve = path.curve, m = curve.n, vert = curve.vertex,
        pt = new Array(m + 1),
        pen = new Array(m + 1),
        len = new Array(m + 1),
        opt = new Array(m + 1),
        om, i,j,r,
        o = new Opti(), p0,
        i1, area, alpha, ocurve,
        s, t, mm = is_cycle ? m : m - 1;

    var convc = new Array(m), areac = new Array(m + 1);

    for (i=0; i<mm; ++i)
    {
        if (curve.tag[i] === "CURVETO") convc[i] = sign(dpara(vert[MOD(i-1,m,is_cycle)], vert[i], vert[MOD(i+1,m,is_cycle)]));
        else convc[i] = 0;
    }

    area = 0.0;
    areac[0] = 0.0;
    p0 = curve.vertex[0];
    for (i=0; i<mm; ++i)
    {
        i1 = MOD(i+1, m, is_cycle);
        if (curve.tag[i1] === "CURVETO")
        {
            alpha = curve.alpha[i1];
            area += 0.3 * alpha * (4-alpha) * dpara(curve.c[i * 3 + 2], vert[i1], curve.c[i1 * 3 + 2])/2;
            area += dpara(p0, curve.c[i * 3 + 2], curve.c[i1 * 3 + 2])/2;
        }
        areac[i+1] = area;
    }

    pt[0] = -1;
    pen[0] = 0;
    len[0] = 0;


    for (j=1; j<=m; ++j)
    {
        pt[j] = j-1;
        pen[j] = pen[j-1];
        len[j] = len[j-1]+1;

        if (/*is_cycle && */j >= m - 1) continue;

        for (i=j-2; i>=0; --i)
        {
            r = opti_penalty(path, i, MOD(j,m,is_cycle), o, opttolerance, convc, areac, is_cycle);
            if (r) break;
            if (
            len[j] > len[i]+1 ||
            (len[j] == len[i]+1 && pen[j] > pen[i] + o.pen)
            )
            {
                pt[j] = i;
                pen[j] = pen[i] + o.pen;
                len[j] = len[i] + 1;
                opt[j] = o;
                o = new Opti();
            }
        }
    }
    om = len[m];
    ocurve = new Curve(om);
    s = new Array(om);
    t = new Array(om);

    j = is_cycle ? m : m - 1;
    for (i=om-1; i>=0; --i)
    {
        if (pt[j]===j-1)
        {
            ocurve.tag[i]     = curve.tag[MOD(j,m,is_cycle)];
            ocurve.c[i * 3 + 0]    = curve.c[MOD(j,m,is_cycle) * 3 + 0];
            ocurve.c[i * 3 + 1]    = curve.c[MOD(j,m,is_cycle) * 3 + 1];
            ocurve.c[i * 3 + 2]    = curve.c[MOD(j,m,is_cycle) * 3 + 2];
            ocurve.vertex[i]  = curve.vertex[MOD(j,m,is_cycle)];
            ocurve.alpha[i]   = curve.alpha[MOD(j,m,is_cycle)];
            ocurve.alpha0[i]  = curve.alpha0[MOD(j,m,is_cycle)];
            ocurve.beta[i]    = curve.beta[MOD(j,m,is_cycle)];
            s[i] = t[i] = 1.0;
        }
        else
        {
            ocurve.tag[i] = "CURVETO";
            ocurve.c[i * 3 + 0] = opt[j].c[0];
            ocurve.c[i * 3 + 1] = opt[j].c[1];
            ocurve.c[i * 3 + 2] = curve.c[MOD(j,m,is_cycle) * 3 + 2];
            ocurve.vertex[i] = interval(opt[j].s, curve.c[MOD(j,m,is_cycle) * 3 + 2],
            vert[MOD(j,m,is_cycle)]);
            ocurve.alpha[i] = opt[j].alpha;
            ocurve.alpha0[i] = opt[j].alpha;
            s[i] = opt[j].s;
            t[i] = opt[j].t;
        }
        j = pt[j];
    }

    for (i=0; i<om; ++i)
    {
        i1 = mod(i+1,om);
        ocurve.beta[i] = s[i] / (s[i] + t[i1]);
    }
    path.curve = ocurve;
}
function penalty3(path, i, j)
{
    var n = path.len, pt = path.pt, sums = path.sums;
    var x, y, xy, x2, y2,
        k, a, b, c, s,
        px, py, ex, ey,
        r = 0;
    if (j>=n)
    {
        j -= n;
        r = 1;
    }
    if (r === 0)
    {
        x = sums[j+1].x - sums[i].x;
        y = sums[j+1].y - sums[i].y;
        x2 = sums[j+1].x2 - sums[i].x2;
        xy = sums[j+1].xy - sums[i].xy;
        y2 = sums[j+1].y2 - sums[i].y2;
        k = j+1 - i;
    }
    else
    {
        x = sums[j+1].x - sums[i].x + sums[n].x;
        y = sums[j+1].y - sums[i].y + sums[n].y;
        x2 = sums[j+1].x2 - sums[i].x2 + sums[n].x2;
        xy = sums[j+1].xy - sums[i].xy + sums[n].xy;
        y2 = sums[j+1].y2 - sums[i].y2 + sums[n].y2;
        k = j+1 - i + n;
    }
    px = (pt[i].x + pt[j].x) / 2.0 - pt[0].x;
    py = (pt[i].y + pt[j].y) / 2.0 - pt[0].y;
    ey = (pt[j].x - pt[i].x);
    ex = -(pt[j].y - pt[i].y);
    a = ((x2 - 2*x*px) / k + px*px);
    b = ((xy - x*py - y*px) / k + px*py);
    c = ((y2 - 2*y*py) / k + py*py);
    s = ex*ex*a + 2*ex*ey*b + ey*ey*c;
    return stdMath.sqrt(s);
}
function pointslope(path, i, j, ctr, dir, is_cycle)
{
    var n = path.len, sums = path.sums,
        x, y, x2, xy, y2,
        k, a, b, c, lambda2, l, r=0;

    while (j>=n)
    {
        j-=n;
        r+=1;
    }
    while (i>=n)
    {
        i-=n;
        r-=1;
    }
    while (j<0)
    {
        j+=n;
        r-=1;
    }
    while (i<0)
    {
        i+=n;
        r+=1;
    }

    x = sums[j+1].x-sums[i].x+r*sums[n].x;
    y = sums[j+1].y-sums[i].y+r*sums[n].y;
    x2 = sums[j+1].x2-sums[i].x2+r*sums[n].x2;
    xy = sums[j+1].xy-sums[i].xy+r*sums[n].xy;
    y2 = sums[j+1].y2-sums[i].y2+r*sums[n].y2;
    k = j+1-i+r*n;

    if (i === 0)
    {
        ctr.x = path.pt[i].x - path.x0; // should be zero
        ctr.y = path.pt[i].y - path.y0; // should be zero
    }
    else if (j === 0 || !is_cycle && j === n - 1)
    {
        ctr.x = path.pt[j].x - path.x0;
        ctr.y = path.pt[j].y - path.y0;
    }
    else
    {
        ctr.x = x/k;
        ctr.y = y/k;
    }

    /*a = (x2-x*x/k)/k;
    b = (xy-x*y/k)/k;
    c = (y2-y*y/k)/k;*/
    a = (x2 - 2.0*x*ctr.x)/k + ctr.x*ctr.x;
    b = (xy - x*ctr.y - y*ctr.x)/k + ctr.x*ctr.y;
    c = (y2 - 2.0*y*ctr.y)/k + ctr.y*ctr.y;

    lambda2 = (a+c+stdMath.sqrt((a-c)*(a-c)+4*b*b))/2;

    a -= lambda2;
    c -= lambda2;

    if (stdMath.abs(a) >= stdMath.abs(c))
    {
        l = hypot(a, b);
        if (l!==0)
        {
            dir.x = -b/l;
            dir.y = a/l;
        }
    }
    else
    {
        l = hypot(c, b);
        if (l!==0)
        {
            dir.x = -c/l;
            dir.y = b/l;
        }
    }
    if (l===0)
    {
        dir.x = dir.y = 0;
    }
}
function opti_penalty(path, i, j, res, opttolerance, convc, areac, is_cycle)
{
    var m = path.curve.n, curve = path.curve, vertex = curve.vertex,
        k, k1, k2, conv, i1,
        area, alpha, d, d1, d2,
        p0, p1, p2, p3, pt,
        A, R, A1, A2, A3, A4,
        s, t;

    if (i===j) return 1;

    k = i;
    i1 = MOD(i+1, m, is_cycle);
    k1 = MOD(k+1, m, is_cycle);
    conv = convc[k1];
    if (conv === 0) return 1;
    d = ddist(vertex[i], vertex[i1]);
    for (k=k1; k!==j; k=k1)
    {
        k1 = MOD(k+1, m, is_cycle);
        k2 = MOD(k+2, m, is_cycle);
        if (convc[k1] !== conv) return 1;
        if (sign(cprod(vertex[i], vertex[i1], vertex[k1], vertex[k2])) !== conv) return 1;
        if (iprod1(vertex[i], vertex[i1], vertex[k1], vertex[k2]) < d * ddist(vertex[k1], vertex[k2]) * (-0.999847695156/*COS179*/)) return 1;
    }

    p0 = curve.c[MOD(i,m,is_cycle) * 3 + 2].copy();
    p1 = vertex[MOD(i+1,m,is_cycle)].copy();
    p2 = vertex[MOD(j,m,is_cycle)].copy();
    p3 = curve.c[MOD(j,m,is_cycle) * 3 + 2].copy();

    area = areac[j] - areac[i];
    area -= dpara(vertex[0], curve.c[i * 3 + 2], curve.c[j * 3 + 2])/2;
    if (i>=j) area += areac[m];

    A1 = dpara(p0, p1, p2);
    A2 = dpara(p0, p1, p3);
    A3 = dpara(p0, p2, p3);

    A4 = A1+A3-A2;

    if (A2 === A1) return 1;

    t = A3/(A3-A4);
    s = A2/(A2-A1);
    A = A2 * t / 2.0;

    if (A === 0.0) return 1;

    R = area / A;
    alpha = 2 - stdMath.sqrt(4 - R / 0.3);

    res.c[0] = interval(t * alpha, p0, p1);
    res.c[1] = interval(s * alpha, p3, p2);
    res.alpha = alpha;
    res.t = t;
    res.s = s;

    p1 = res.c[0].copy();
    p2 = res.c[1].copy();

    res.pen = 0;

    for (k=MOD(i+1,m,is_cycle); k!=j; k=k1)
    {
        k1 = MOD(k+1,m,is_cycle);
        t = tangent(p0, p1, p2, p3, vertex[k], vertex[k1]);
        if (t<-0.5) return 1;
        pt = bezier(t, p0, p1, p2, p3);
        d = ddist(vertex[k], vertex[k1]);
        if (d === 0.0) return 1;
        d1 = dpara(vertex[k], vertex[k1], pt) / d;
        if (stdMath.abs(d1) > opttolerance) return 1;
        if (iprod(vertex[k], vertex[k1], pt) < 0 || iprod(vertex[k1], vertex[k], pt) < 0) return 1;
        res.pen += d1 * d1;
    }

    for (k=i; k!=j; k=k1)
    {
        k1 = MOD(k+1,m,is_cycle);
        t = tangent(p0, p1, p2, p3, curve.c[k * 3 + 2], curve.c[k1 * 3 + 2]);
        if (t<-0.5) return 1;
        pt = bezier(t, p0, p1, p2, p3);
        d = ddist(curve.c[k * 3 + 2], curve.c[k1 * 3 + 2]);
        if (d === 0.0) return 1;
        d1 = dpara(curve.c[k * 3 + 2], curve.c[k1 * 3 + 2], pt) / d;
        d2 = dpara(curve.c[k * 3 + 2], curve.c[k1 * 3 + 2], vertex[k1]) / d;
        d2 *= 0.75 * curve.alpha[k1];
        if (d2 < 0)
        {
            d1 = -d1;
            d2 = -d2;
        }
        if (d1 < d2 - opttolerance) return 1;
        if (d1 < d2) res.pen += (d1 - d2) * (d1 - d2);
    }
    return 0;
}
function mod(a, n)
{
    return a>=n ? (a % n) : (a>=0 ? a : (n-1-(-1-a) % n));
}
function MOD(i, n, is_cycle)
{
    return is_cycle ? mod(i, n) : i;
}
function xprod(p1, p2)
{
    return p1.x*p2.y - p1.y*p2.x;
}
function cyclic(a, b, c)
{
    return a <= c ? (a <= b && b < c) : (a <= b || b < c);
}
function sign(i)
{
    return i > 0 ? 1 : (i < 0 ? -1 : 0);
}
function quadform(Q, w)
{
    var v = [w.x, w.y, 1], i, j, sum = 0.0;

    for (i=0; i<3; ++i)
    {
        for (j=0; j<3; ++j)
        {
            sum += v[i] * Q.at(i, j) * v[j];
        }
    }
    return sum;
}
function interval(lambda, a, b)
{
    return new Point(a.x + lambda * (b.x - a.x), a.y + lambda * (b.y - a.y));
}
function dorth_infty(p0, p2)
{
    return new Point(-sign(p2.y - p0.y), sign(p2.x - p0.x));
}
function ddenom(p0, p2)
{
    var r = dorth_infty(p0, p2);
    return r.y * (p2.x - p0.x) - r.x * (p2.y - p0.y);
}
function dpara(p0, p1, p2)
{
    var x1, y1, x2, y2;
    x1 = p1.x - p0.x;
    y1 = p1.y - p0.y;
    x2 = p2.x - p0.x;
    y2 = p2.y - p0.y;
    return x1*y2 - x2*y1;
}
function cprod(p0, p1, p2, p3)
{
    var x1, y1, x2, y2;
    x1 = p1.x - p0.x;
    y1 = p1.y - p0.y;
    x2 = p3.x - p2.x;
    y2 = p3.y - p2.y;
    return x1*y2 - x2*y1;
}
function iprod(p0, p1, p2)
{
    var x1, y1, x2, y2;
    x1 = p1.x - p0.x;
    y1 = p1.y - p0.y;
    x2 = p2.x - p0.x;
    y2 = p2.y - p0.y;
    return x1*x2 + y1*y2;
}
function iprod1(p0, p1, p2, p3)
{
    var x1, y1, x2, y2;
    x1 = p1.x - p0.x;
    y1 = p1.y - p0.y;
    x2 = p3.x - p2.x;
    y2 = p3.y - p2.y;
    return x1 * x2 + y1 * y2;
}
function hypot(dx, dy)
{
    dx = stdMath.abs(dx);
    dy = stdMath.abs(dy);
    var m = stdMath.max(dx, dy);
    if (0 === m) return 0;
    dx /= m;
    dy /= m;
    return m*stdMath.sqrt(dx*dx + dy*dy);
}
function ddist(p, q)
{
    return hypot(p.x - q.x, p.y - q.y);
}
function bezier(t, p0, p1, p2, p3)
{
    var s = 1-t, t2 = t*t, s2 = s*s,
        s3 = s2*s, t3 = t2*t,
        s2t = 3*s2*t, t2s = 3*t2*s;
    return new Point(
        s3*p0.x + s2t*p1.x + t2s*p2.x + t3*p3.x,
        s3*p0.y + s2t*p1.y + t2s*p2.y + t3*p3.y
    );
}
function tangent(p0, p1, p2, p3, q0, q1)
{
    var A, B, C, a, b, c, d, s, r1, r2;

    A = cprod(p0, p1, q0, q1);
    B = cprod(p1, p2, q0, q1);
    C = cprod(p2, p3, q0, q1);

    a = A - 2 * B + C;
    b = -2 * A + 2 * B;
    c = A;

    d = b * b - 4 * a * c;

    if (a === 0 || d < 0) return -1.0;

    s = stdMath.sqrt(d);

    r1 = (-b + s) / (2 * a);
    r2 = (-b - s) / (2 * a);

    if (r1 >= 0 && r1 <= 1) return r1;
    else if (r2 >= 0 && r2 <= 1) return r2;
    else return -1.0;
}

return multilabel_potrace;
})();
