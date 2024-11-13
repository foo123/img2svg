function img2svg(imageData, options)
{
    return multilabel_potrace.trace(imageData.data, imageData.width, imageData.height, options || {});
}
img2svg.VERSION = "@@VERSION@@";
