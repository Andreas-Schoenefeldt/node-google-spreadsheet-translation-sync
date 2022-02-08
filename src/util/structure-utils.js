module.exports.resolveStructureToTree = (originalTree, potentialTreeUpdates) => {

    Object.keys(potentialTreeUpdates).forEach((key) => {
        const parts = key.split('.');
        let tree = originalTree;

        // remove the full key, if present
        if (originalTree[key]) {
            delete originalTree[key];
        }

        // add it again in a clean fassion
        while (parts.length > 0) {
            const part = parts.shift();

            if (parts.length === 0) {
                tree[part] = potentialTreeUpdates[key];
            } else {
                if (!tree[part]) {
                    tree[part] = {}
                }

                tree = tree[part];
            }
        }
    })
}