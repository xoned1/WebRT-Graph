class NodeInfo extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            activeNode: {}
        };

        this.handleChange = this.handleChange.bind(this);
    }

    setNode(node) {
        this.setState({activeNode: node});
    }

    handleChange(event, key) {
        //TODO "setActiveNode" the react way?
        this.state.activeNode[key] = event.target.value;
        this.setState({activeNode: this.state.activeNode});
        SIM.refresh();
    }

    render() {
        const node = this.state.activeNode;
        return Object.keys(node).map((key) => {
            const disabled = forbiddenNodeVars.includes(key);

            let value = forbiddenNodeVars.includes(key) && isFloat(node[key]) ?
                Number(node[key]).toFixed(3) :
                node[key];

            return <form key={key}>
                <div className="form-row nodes-value-row">
                    <div className="col col-md-4">
                        {key}
                    </div>
                    <div className="col col-md-8">
                        <input type="text" className="form-control form-control-sm"
                               onChange={(e) => this.handleChange(e, key)} value={value}
                               disabled={disabled}/>
                    </div>
                </div>
            </form>

        });
    }
}