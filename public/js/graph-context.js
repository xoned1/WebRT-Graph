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
        return this.get_nodes()[nodeid]; //nodeid key != id value
    }

    get_links() {
        return this.data[this.get_config_link()];
    }

    get_config_node() {
        return this.source.configNode;
    }

    get_config_link() {
        return this.source.configLink;
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

}