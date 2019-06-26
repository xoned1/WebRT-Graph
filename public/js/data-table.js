class DataTable extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }


    render() {
        let nodes = context.getNodes();
        const nodeKeys = Object.keys(nodes[0]);

        const header = nodeKeys.map((nodeKey) => {
            return <th key={nodeKey} scope="col">{nodeKey}</th>
        });

        const body = nodes.map((node) => {
            return <tr key={node.id}>
                {nodeKeys.map((key) => {
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
}