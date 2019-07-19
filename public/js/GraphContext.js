module.exports = class GraphContext {

    constructor(source, data) {
        this.source = source;
        this.data = data;
        this.origin = JSON.parse(JSON.stringify(data)); //deep copy
    }

    getName() {
        return this.source.name;
    }

    getData() {
        return this.data;
    }

    getNodes() {
        return this.data[this.getConfigNode()];
    }

    getNode(nodeid) {

        const nodes = this.getNodes();
        for (let key in nodes) {
            if (this.getNodes()[key][this.getConfigNodeId()].toString() === nodeid.toString()) {
                return this.getNodes()[key];
            }
        }
        return "error";
    }

    getLinks() {
        if (this.getConfigLink()) {
            return this.data[this.getConfigLink()];
        }
        return [];
    }

    getConfigNodeId() {
        return this.source.configNodeId;
    }

    setConfigNodeId(configNodeId) {
        this.source.configNodeId = configNodeId;
    }

    getConfigNode() {
        return this.source.configNode;
    }

    setConfigNode(configNode) {
        this.source.configNode = configNode;
    }

    getConfigLink() {
        return this.source.configLink;
    }

    setConfigLink(configLink) {
        this.source.configLink = configLink;
    }

    getConfigNodeTitle() {
        return this.source.configNodeTitle;
    }

    setConfigNodeTitle(configTitle) {
        this.source.configNodeTitle = configTitle;
    }

    getConfigNodeWeight() {
        return this.source.configNodeWeight;
    }

    setConfigNodeWeight(configNodeWeight) {
        this.source.configNodeWeight = configNodeWeight;
    }

    getLinkLineType() {
        return this.source.configLinkLineType;
    }

    getNodeColorPalette() {
        return this.source.nodeColorPalette;
    }

    getNodeCount() {
        return this.getNodes().length;
    }

    getLinkCount() {
        return this.getLinks().length;
    }

    getOrigin() {
        return this.origin;
    }

    getSource() {
        return this.source;
    }

    getCompressedData() {
        if (this.getLinks() && this.getLinks().length > 0 && this.getLinks()[0].target.id) {
            for (let key in this.getLinks()) {
                this.getLinks()[key]['stroke-width'] = this.getLinks()[key]['stroke-width'];
                this.getLinks()[key]['stroke-color'] = this.getLinks()[key]['stroke-color'];
                this.getLinks()[key].source = this.getLinks()[key].source.id;
                this.getLinks()[key].target = this.getLinks()[key].target.id;
            }
        }
        return this.data;
    }

};