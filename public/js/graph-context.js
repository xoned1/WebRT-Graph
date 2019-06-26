class GraphContext {

    constructor(source, data) {
        this.source = source;
        this.data = data;
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

    getNodeTitle() {
        return this.source.configNodeTitle;
    }

    setConfigNodeTitle(title) {
        this.source.configNodeTitle = title;
    }

    getNodeWeight() {
        return this.source.configNodeWeight;
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

}