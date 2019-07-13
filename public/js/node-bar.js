module.exports = class NodeBar extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            context: props.context,
        };

        this.handleClick = this.handleClick.bind(this);
    }

    handleClick(id, e) {
        this.setState(state => ({
            context: state.context
        }));
    }


    render() {
        let context = this.state.context;
        let nodes = this.state.context.getNodes();
        let node =
            Object.keys(nodes).map((key, index) => (
                <div id="node" className="shadow rounded" data-node-id={nodes[key].id} key={key}
                     onClick={() => this.handleClick(key, this.state.context.getNodes())}>
                    <input className="node-input-checkbox styled-checkbox" id={"node-checkbox-" + nodes[key].id}
                           type="checkbox" value="" defaultChecked/>
                    <label className="node-checkbox" htmlFor={"node-checkbox-" + nodes[key].id}/>
                    <div id="data-node">
                        <p>ID: {nodes[key].id}</p>
                        <p>Title: {nodes[key][context.getConfigNodeTitle()]}</p>
                    </div>
                    <div id="circle-container">
                        <div className="circle" data-node-id={nodes[key].id}></div>
                    </div>
                </div>
            ));

        return (node);
    }
};

