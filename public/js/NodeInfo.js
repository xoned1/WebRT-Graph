const Simulation = require('./Simulation');
const Util = require('./Util');

module.exports = class NodeInfo extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            activeNode: null
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
        Simulation.refresh();
    }

    render() {

        function addLockSymbol(disabled) {
            if (disabled) {
                return <div className="input-group-append">
                    <span className="input-group-text "><li className="fa fa-lock"/></span>
                </div>
            }
            return null;
        }

        const node = this.state.activeNode;

        if (!node) { return <div>No Node Selected.<br/> Click on a Node to see details.</div>; }

        return Object.keys(node).map((key) => {
            const disabled = this.props.forbiddenVars.includes(key);

            let value = this.props.forbiddenVars.includes(key) && Util.isFloat(node[key]) ?
                Number(node[key]).toFixed(3) :
                node[key];

            return <form key={key}>
                <div className="form-row nodes-value-row">
                    <div className="col col-md-4">
                        {key}
                    </div>
                    <div className="input-group col col-md-8">
                        <input type="text" className="form-control form-control-sm graph-settings"
                               onChange={(e) => this.handleChange(e, key)} value={value}
                               disabled={disabled}/>
                        {addLockSymbol(disabled)}
                    </div>
                </div>
            </form>;
        });
    }
};
