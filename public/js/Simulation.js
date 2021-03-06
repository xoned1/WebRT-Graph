const lineTypeDropDown = $('#linkLineType');
const Graph = require('./Graph');
module.exports = {

    d3: d3.forceSimulation(),
    DOMNodes: new Map(),

    setItems: function (context, node, link, text, width, height, nodeColor) {
        module.context = context;
        module.node = node;
        module.link = link;
        module.text = text;
        module.width = width;
        module.height = height;
        module.nodeColor = nodeColor;

        module.exports.DOMNodes.clear();
        node.each((node) => {
            const id = node[context.getConfigNodeId()];
            this.DOMNodes.set(id, $('circle[nodeID=' + id + ']'));
        });
    },

    refresh: function () {
        //0.001 is smallest alpha target. 1 tick left.
        this.d3.alpha(0.002).restart();
    },

    reset: function () {
        this.d3.alpha(1).restart();
    },

    explode: function () {
        this.reset();
        const strength = $('#slider-manybody').val();
        this.d3
            .force('charge', d3.forceManyBody().strength(strength))
            .on('tick', ticked)
            .on('end', () => this.d3.force('charge', null));
    },

    linkforce: function () {
        this.reset();
        const strength = $('#slider-linkforce').val();
        this.d3
            .force('link', d3.forceLink().distance(0).id((d) => {
                if (d.id) {
                    return d.id;
                }
                return d[module.context.getConfigNodeId()];
            }))
            .on('tick', ticked);
    },

    bindSimulation: function () {
        this.d3.alpha(1);
        this.d3.restart();

        this.d3.nodes(module.context.getNodes())
        //.force('center', d3.forceCenter(module.width / 2, module.height / 2))
            .force('radius', d3.forceCollide().radius((d) => {
                return d.weight;
            }))
            .force('link', d3.forceLink().strength(0.000001)
                .id((d) => {
                    if (d.id) {
                        return d.id;
                    }
                    return d[module.context.getConfigNodeId()];
                })
                .links(module.context.getLinks()))
            .on('tick', ticked)
            .on('end', () => {
                module.exports.d3.force('charge', null);
            });
    },
};

var lineX2 = function (d) {
    const id = module.context.getConfigNodeId();
    let nodeRadius = parseInt(getGraphNodeById(d.target[id]).attr("r"));
    var length = Math.sqrt(Math.pow(d.target.y - d.source.y, 2) + Math.pow(d.target.x - d.source.x, 2));
    if (length === 0) length = 1; //TODO
    var scale = (length - nodeRadius) / length;
    var offset = (d.target.x - d.source.x) - (d.target.x - d.source.x) * scale;
    return d.target.x - offset;
};
var lineY2 = function (d) {
    const id = module.context.getConfigNodeId();
    let nodeRadius = parseInt(getGraphNodeById(d.target[id]).attr("r"));
    var length = Math.sqrt(Math.pow(d.target.y - d.source.y, 2) + Math.pow(d.target.x - d.source.x, 2));
    if (length === 0) length = 1; //TODO
    var scale = (length - nodeRadius) / length;
    var offset = (d.target.y - d.source.y) - (d.target.y - d.source.y) * scale;
    return d.target.y - offset;
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
        .attr("cx", (node) => {
            return node.x;
        })
        .attr("cy", (node) => {
            return node.y;
        })
        .attr("r", (node) => {
            return node.weight;
        })
        //muss das immer abgefragt werden?
        .attr("fill", (node) => {
            return Graph.getNodeFill(node, node[module.context.getConfigNodeId()]);
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


function getGraphNodeById(id) {
    return module.exports.DOMNodes.get(id);
}