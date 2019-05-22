function calcNodeWeights(context) {
    let weights = [];

    if (!context.get_node_weight()) {
        context.get_nodes().forEach((node) => {
            node.weight = defaultNodeWeight;
        });
        return;
    }

    context.get_nodes().forEach((value) => {
        weights.push(value[context.get_node_weight()]);
    });
    let maxVal = Math.max.apply(null, weights);

    context.get_nodes().forEach((node) => {
        let x = maxVal / node[context.get_node_weight()];
        let weight = maxNodeWeight / x;
        if (weight < minNodeWeight) {
            weight = minNodeWeight;
        }
        node.weight = parseInt(weight);
    });
}