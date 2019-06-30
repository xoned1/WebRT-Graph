var SIM = (function (module) {

    module.simulation = d3.forceSimulation();
    const lineTypeDropDown = $('#linkLineType');

    module.setItems = function (context, node, link, text, width, height) {
        module.context = context;
        module.node = node;
        module.link = link;
        module.text = text;
        module.width = width;
        module.height = height;
    };

    module.refresh = function () {
        //smallest alpha target. 1 tick left.
        module.simulation.alpha(0.001).restart();
    };

    module.reset = function () {
        module.simulation.alpha(1).restart();
    };

    module.explode = function () {
        module.reset();
        const strength = $('#slider-manybody').val();
        console.log(strength)
        module.simulation.nodes(module.context.getNodes())
            .force('charge', d3.forceManyBody().strength(strength))
            .on('tick', ticked)
            .on('end', () => module.simulation.force('charge', null));
    };

    module.bindSimulation = function () {

        module.simulation.alpha(1);
        module.simulation.restart();

        module.simulation.nodes(module.context.getNodes())
        // .force('charge', d3.forceManyBody().strength(-30))
            .force('center', d3.forceCenter(module.width / 2, module.height / 2))
            .force('radius', d3.forceCollide().radius((d) => {
                return d.weight;
            }))
            .force('link', d3.forceLink().strength(0.000001)
                .id((d) => {
                    return d.id;
                })
                .links(module.context.getLinks()))
            .on('tick', ticked)
            .on('end', () => module.simulation.force('charge', null));


    };

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
        module.link
            .attr("d", (link) => {
                return getLinkLine(link);
            });

        module.node
            .attr("cx", (d) => {
                return d.x;
            })
            .attr("cy", (d) => {
                return d.y;
            });

        module.text
            .attr("x", function (d) {
                let circle = d3.select(this.parentNode).select("circle");
                let cx = circle.attr("cx");
                return parseInt(cx) + parseInt(d.weight) + 5;
            })
            .attr("y", (d) => {
                return d.y + 5;
            })
            .text(d => {
                return d[module.context.getConfigNodeTitle()];
            });
    }

    var lineX2 = function (d) {

        let nodeRadius = parseInt(getGraphNodeById(d.target.id).attr("r"));
        var length = Math.sqrt(Math.pow(d.target.y - d.source.y, 2) + Math.pow(d.target.x - d.source.x, 2));
        if (length === 0) length = 1; //TODO
        var scale = (length - nodeRadius) / length;
        var offset = (d.target.x - d.source.x) - (d.target.x - d.source.x) * scale;
        return d.target.x - offset;
    };
    var lineY2 = function (d) {

        let nodeRadius = parseInt(getGraphNodeById(d.target.id).attr("r"));
        var length = Math.sqrt(Math.pow(d.target.y - d.source.y, 2) + Math.pow(d.target.x - d.source.x, 2));
        if (length === 0) length = 1; //TODO
        var scale = (length - nodeRadius) / length;
        var offset = (d.target.y - d.source.y) - (d.target.y - d.source.y) * scale;
        return d.target.y - offset;
    };

    return module;


}(SIM || {}));