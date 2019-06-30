var deltaX, deltaY;


var nodeDragHandler = d3.drag()
    .on("start", startDragNode)
    .on("drag", dragNode)
    .on("end", endDragNode);


function startDragNode(d) {
    if (!d3.event.active) {
        SIM.simulation.alphaTarget(0.01).restart();
    }

    const current = d3.select(this);
    deltaX = current.attr("cx") - d3.event.x;
    deltaY = current.attr("cy") - d3.event.y;
}

function dragNode(d) {
    d.x = d3.event.x + deltaX;
    d.y = d3.event.y + deltaY;
    d3.select(this)
        .attr("cx", d.x)
        .attr("cy", d.y);

    d3.select(this.parentNode).select("text")
        .attr("x", parseInt(d.x) + parseInt(d.weight) + 10)
        .attr("y", d.y)
}

function endDragNode(d) {
    if (!d3.event.active) SIM.simulation.alphaTarget(0.0001);
    d.x = d3.event.x + deltaX;
    d.y = d3.event.y + deltaY;

    d3.select(this)
        .attr("cx", d.x)
        .attr("cy", d.y);
}

function zoomed() {
    // console.log(d3.event.transform)
    //d3.select("svg").translate(d3.event.transform.x, d3.event.transform.y);
    svg.attr("transform", d3.event.transform);
}

function zoomFit(paddingPercent, transitionDuration) {
    var root = svg;
    var bounds = root.node().getBBox();
    var parent = root.node().parentElement;
    var fullWidth = parent.clientWidth,
        fullHeight = parent.clientHeight;
    var width = bounds.width,
        height = bounds.height;
    var midX = bounds.x + width / 2,
        midY = bounds.y + height / 2;
    if (width == 0 || height == 0) return; // nothing to fit
    var scale = (paddingPercent || 0.75) / Math.max(width / fullWidth, height / fullHeight);
    var translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

    console.log("zoomFit", translate, scale);

    var zoom = d3.zoom();

    var transform = d3.zoomTransform(root.node());
    transform = transform.translate(100, 0); //TODO
    transform = transform.scale(scale);
    svg.attr("transform", transform);

    // root
    // 	.transition()
    // 	.duration(transitionDuration || 0) // milliseconds
    // 	.call(zoom.translate(translate).scale(scale).event);
}

function bla() {
    console.log(bla)
}
