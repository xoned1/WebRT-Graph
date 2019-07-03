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
    svgG.attr("transform", d3.event.transform);
}

function zoomFit(paddingPercent, transitionDuration) {
    var bounds = svgG.node().getBBox();
    var parent = svgG.node().parentElement;
    var fullWidth = parent.clientWidth || parent.parentNode.clientWidth,
        fullHeight = parent.clientHeight || parent.parentNode.clientHeight;
    var width = bounds.width,
        height = bounds.height;
    var midX = bounds.x + width / 2,
        midY = bounds.y + height / 2;
    if (width == 0 || height == 0) return; // nothing to fit
    var scale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
    var translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

    var transform = d3.zoomIdentity
        .translate(translate[0], translate[1])
        .scale(scale);

    d3.select("svg")
        .transition()
        .duration(transitionDuration || 0) // milliseconds
        .call(zoom.transform, transform);
}