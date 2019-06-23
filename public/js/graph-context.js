class GraphContext {

    constructor(source, data) {
        this.source = source;
        this.data = data;
    }

    get_data() {
        return this.data;
    }

    get_nodes() {
        return this.data[this.get_config_node()];
    }

    get_node(nodeid) {

        const nodes = this.get_nodes();
        for (let key in nodes) {
            if (this.get_nodes()[key][this.getConfigNodeId()].toString() === nodeid.toString()) {
                return this.get_nodes()[key];
            }
        }
        return "error";
    }

    get_links() {
        if (this.get_config_link()) {
            return this.data[this.get_config_link()];
        }
        return [];
    }

    getConfigNodeId() {
        return this.source.configNodeId;
    }

    get_config_node() {
        return this.source.configNode;
    }

    setConfigNode(configNode) {
        this.source.configNode = configNode;
    }

    get_config_link() {
        return this.source.configLink;
    }

    setConfigLink(configLink) {
        this.source.configLink = configLink;
    }

    get_node_title() {
        return this.source.configNodeTitle;
    }

    set_node_title(title) {
        this.source.configNodeTitle = title;
    }

    get_node_weight() {
        return this.source.configNodeWeight;
    }

    getLinkLineType() {
        return this.source.configLinkLineType;
    }

    getNodeColorPalette() {
        return this.source.nodeColorPalette;
    }

    getNodeCount() {
        return this.get_nodes().length;
    }

    getLinkCount() {
        return this.get_links().length;
    }

}