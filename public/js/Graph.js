module.exports = {

    defaultNodeWeight: 20,
    minNodeWeight: 5,
    maxNodeWeight: 50,

    setPalette: function (palette) {
        switch (palette) {
            case "BrBg":
                nodeColors = createPalette(d3.interpolateBrBG);
                break;
            case "PRGn":
                nodeColors = createPalette(d3.interpolatePRGn);
                break;
            case "PiYG":
                nodeColors = createPalette(d3.interpolatePiYG);
                break;
            case "PuoR":
                nodeColors = createPalette(d3.interpolatePuOr);
                break;
            case "RdBu":
                nodeColors = createPalette(d3.interpolateRdBu);
                break;
            case "RdYIBu":
                nodeColors = createPalette(d3.interpolateRdYlBu);
                break;
            case "Spectral":
                nodeColors = createPalette(d3.interpolateSpectral);
                break;
            case "Blues":
                nodeColors = createPalette(d3.interpolateBlues);
                break;
            case "Greens":
                nodeColors = createPalette(d3.interpolateGreens);
                break;
            case "Oranges":
                nodeColors = createPalette(d3.interpolateOranges);
                break;
            case "Reds":
                nodeColors = createPalette(d3.interpolateReds);
                break;
            case "Purples":
                nodeColors = createPalette(d3.interpolatePurples);
                break;
            case "Viridis":
                nodeColors = createPalette(d3.interpolateViridis);
                break;
            case "Inferno":
                nodeColors = createPalette(d3.interpolateInferno);
                break;
            case "Warm":
                nodeColors = createPalette(d3.interpolateWarm);
                break;
            case "Cool":
                nodeColors = createPalette(d3.interpolateCool);
                break;
            case "Rainbow":
                nodeColors = createPalette(d3.interpolateRainbow);
                break;
            case "Sinebow":
                nodeColors = createPalette(d3.interpolateSinebow);
                break;
        }
    },

    getNodeColor: function (node) {
        if (node.weight) {
            return nodeColors(node.weight)
        }
        return nodeColors(defaultNodeWeight);
    },

    calcNodeWeights: function (context) {
        let weights = [];

        //if weight config not defined apply default node weight to all nodes
        if (!context.getConfigNodeWeight()) {
            context.getNodes().forEach((node) => {
                node.weight = defaultNodeWeight;
            });
            return;
        }

        //collect all weights to calc the max value
        context.getNodes().forEach((node) => {
            let value = node[context.getConfigNodeWeight()];
            weights.push(parseWeight(value));
        });
        let maxVal = Math.max.apply(null, weights);


        context.getNodes().forEach((node) => {
            let x = maxVal / parseWeight(node[context.getConfigNodeWeight()]);
            let weight = this.maxNodeWeight / x;
            if (weight < this.minNodeWeight) {
                weight = this.minNodeWeight;
            }
            node.weight = parseInt(weight);
        });

        //Check if valid value otherwise return default value
        function parseWeight(value) {
            if (isNaN(value)) {
                return this.defaultNodeWeight;
            }
            return value;
        }
    },

    setNodeStrokeWidth: function (nodes, width) {
        nodes.style('stroke-width', width + "px");
        nodes.data().forEach(node => {
            node['stroke-width'] = width;
        });
    },

    setNodeColor: function (nodes, color) {
        nodes.style('fill', color);
        nodes.data().forEach(node => {
            node['fill'] = color;
        });
    },

    setNodeStrokeColor(nodes, color) {
        nodes.style('stroke', color);
        nodes.data().forEach(node => {
            node['stroke-color'] = color;
        });
    },

    setLinkWidth(links, width) {
        links.style('stroke-width', width + "px");
        links.data().forEach(link => {
            if (link['target']) {//warum ?
                link['stroke-width'] = width;
            }
        });
    },

    setLinkColor(links, color) {
        links.style('stroke', color);
        links.data().forEach(link => {
            if (link['target']) {
                link['stroke-color'] = color;
            }
        });
    },

};

var nodeColors = createPalette(d3.interpolateBrBG);

function createPalette(palette) {
    return d3.scaleSequential()
        .domain([module.exports.minNodeWeight, module.exports.maxNodeWeight])
        .interpolator(palette);
}



