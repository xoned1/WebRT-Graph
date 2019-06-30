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
    svg.attr("transform", d3.event.transform);
}

