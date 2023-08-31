/**
*
*   img2svg.js
*   @version: @@VERSION@@
*   @built on @@DATE@@
*
*   Vectorize image data based on potrace algorithm with color
*   https://github.com/foo123/img2svg.js
*
**/
!function(root, name, factory) {
"use strict";
if (('object' === typeof module) && module.exports) /* CommonJS */
    (module.$deps = module.$deps||{}) && (module.exports = module.$deps[name] = factory.call(root));
else if (('function' === typeof define) && define.amd && ('function' === typeof require) && ('function' === typeof require.specified) && require.specified(name) /*&& !require.defined(name)*/ ) /* AMD */
    define(name, ['module'], function(module) {factory.moduleUri = module.uri; return factory.call(root);});
else if (!(name in root)) /* Browser/WebWorker/.. */
    (root[name] = factory.call(root)||1) && ('function' ===typeof define) && define.amd && define(function() {return root[name];});
}(  /* current root */          'undefined' !== typeof self ? self : this, 
    /* module name */           "img2svg",
    /* module factory */        function ModuleFactory__img2svg() {
/* main code starts here */
"use strict";
