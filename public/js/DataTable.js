module.exports = class DataTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }


    render() {
        let nodes = this.props.context.getNodes();

        const systemVars = ['x', 'y', 'vx', 'vy', 'index', 'fill', 'stroke-width', 'stroke-color', 'weight'];
        const nodeKeys = Object.keys(nodes[0]);

        const header = nodeKeys.map((nodeKey) => {
            if (systemVars.includes(nodeKey)) return;
            return <th key={nodeKey} scope="col">{nodeKey}</th>
        });

        const body = nodes.map((node) => {
            return <tr key={node.index}>
                {nodeKeys.map((key) => {
                    if (systemVars.includes(key)) return;
                    return <td key={key}>{node[key]}</td>
                })}
            </tr>
        });

        return <table className="table table-dark table-striped table-hover table-sm">
            <thead>
            <tr>{header}</tr>
            </thead>
            <tbody>{body}</tbody>
        </table>
    }
};