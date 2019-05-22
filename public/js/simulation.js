var SIM = (function (module) {

    module.simulation = d3.forceSimulation();
    const lineTypeDropDown = $('#linkLineType');

    module.refresh = function () {
        //smalltest alpha target. 1 tick left.
        module.simulation.alpha(0.001).restart();
    };

    module.bindSimulation = function (context, node, link, text, width, height) {

        module.simulation.alpha(1);
        module.simulation.restart();

        module.simulation.nodes(context.get_nodes())
            .force('charge', d3.forceManyBody().strength(-30))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('radius', d3.forceCollide().radius((d) => {
                return d.weight;
            }))
            .force('link', d3.forceLink().strength(0.0001)
                .id((d) => {
                    return d.id;
                })
                .links(context.get_links()))
            .on('tick', ticked)
            .on('end', () => module.simulation.force('charge', null));


        function getLinkLine(link) {
            if (lineTypeDropDown.find('option:selected').text() === "Linear") {
                return "M" + link.source.x + "," + link.source.y + " L" + link.target.x + "," + link.target.y;
            } else {
                const dx = link.target.x - link.source.x,
                    dy = link.target.y - link.source.y,
                    dr = Math.sqrt(dx * dx + dy * dy);

                return "M" + link.source.x + "," + link.source.y
                    + "A" + dr + "," + dr + " 0 0,1 " + lineX2(link) + "," + lineY2(link);
            }
        }

        function ticked() {
            link
                .attr("d", (link) => {
                    return getLinkLine(link);
                });

            node
                .attr("cx", (d) => {
                    return d.x;
                })
                .attr("cy", (d) => {
                    return d.y;
                });

            text
                .attr("x", function (d) {
                    let circle = d3.select(this.parentNode).select("circle");
                    let cx = circle.attr("cx");
                    return parseInt(cx) + parseInt(d.weight) + 5;
                })
                .attr("y", (d) => {
                    return d.y + 5;
                })
                .text(d => {
                    return d[context.get_node_title()];
                });
        }
    };

    var lineX2 = function (d) {

        let nodeRadius = parseInt(getGraphNodeById(d.target.id).attr("r"));
        var length = Math.sqrt(Math.pow(d.target.y - d.source.y, 2) + Math.pow(d.target.x - d.source.x, 2));
        var scale = (length - nodeRadius) / length;
        var offset = (d.target.x - d.source.x) - (d.target.x - d.source.x) * scale;
        return d.target.x - offset;
    };
    var lineY2 = function (d) {

        let nodeRadius = parseInt(getGraphNodeById(d.target.id).attr("r"));
        var length = Math.sqrt(Math.pow(d.target.y - d.source.y, 2) + Math.pow(d.target.x - d.source.x, 2));
        var scale = (length - nodeRadius) / length;
        var offset = (d.target.y - d.source.y) - (d.target.y - d.source.y) * scale;
        return d.target.y - offset;
    };

    return module;


}(SIM || {}));