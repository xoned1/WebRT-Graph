function calcNodeWeights(context) {
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
        let weight = maxNodeWeight / x;
        if (weight < minNodeWeight) {
            weight = minNodeWeight;
        }
        node.weight = parseInt(weight);
    });

    //Check if valid value otherwise return default value
    function parseWeight(value) {
        if (isNaN(value)) {
            return defaultNodeWeight;
        }
        return value;
    }
}

