class NodeInfo extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            activeNode: {}
        }
    }

    setNode(node) {
        this.setState({activeNode: node});
    }

    render() {
        console.log("render");
        return Object.keys(this.state.activeNode).map((key) => {
            return <div key={key}>{key}: {this.state.activeNode[key]}</div>
        });
    }
}