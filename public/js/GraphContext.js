module.exports = class GraphContext {

    constructor(source, data) {
        this.source = source;
        this.data = data;
        this.setOrigin(data);
    }

    getName() {
        return this.source.name;
    }

    getData() {
        return this.data;
    }

    getNodes() {
        return this.findNode(this.data, this.getConfigNode());
    }

    findNode(nodes, key) {
        for (var nkey in nodes) {
            if (nkey === key) {
                return nodes[key];
            }
            return this.findNode(nodes[nkey], key);
        }
    }

    getNode(nodeId) {

        const nodes = this.getNodes();
        for (let key in nodes) {
            if (this.getNodes()[key][this.getConfigNodeId()].toString() === nodeId.toString()) {
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
        if (!this.source.configNodeId) {
            //default value applied by d3.js
            return 'index';
        }
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

    getLinkLineDirected() {
        return this.source.configLinkLineDirected;
    }

    getLinkLineDirection() {
        return this.source.configLinkLineDirection;
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

    isShared() {
        return this.source.shared;
    }

    getSharedBy() {
        return this.source.sharedBy;
    }

    getLastModifiedDate() {
        return this.source.lastModified;
    }

    setLastModifiedDate(date) {
        this.source.lastModified = date;
    }

    getCompressedData() {
        const copy = JSON.parse(JSON.stringify(this.data)); //deep copy
        const links = copy[this.getConfigLink()];
        if (links && links.length > 0 &&
            (links[0].target.id || links[0].target[this.getConfigNodeId()])) {
            for (let key in links) {
                links[key]['stroke-width'] = links[key]['stroke-width'];
                links[key]['stroke-color'] = links[key]['stroke-color'];

                const id = links[0].target.id ? 'id' : this.getConfigNodeId();

                links[key].source = links[key].source[id];
                links[key].target = links[key].target[id];
            }
        }
        return copy;
    }

    setOrigin(data) {
        this.origin = JSON.parse(JSON.stringify(data)); //deep copy
    }


};