function calcNodeWeights(context) {
    let weights = [];

    if (!context.getNodeWeight()) {
        context.getNodes().forEach((node) => {
            node.weight = defaultNodeWeight;
        });
        return;
    }

    context.getNodes().forEach((value) => {
        weights.push(value[context.getNodeWeight()]);
    });
    let maxVal = Math.max.apply(null, weights);

    context.getNodes().forEach((node) => {
        let x = maxVal / node[context.getNodeWeight()];
        let weight = maxNodeWeight / x;
        if (weight < minNodeWeight) {
            weight = minNodeWeight;
        }
        node.weight = parseInt(weight);
    });
}