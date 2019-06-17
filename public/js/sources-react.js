class SourcesReact extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sources: [],
        };

        socket.on('source-added', () => {
            this.getSources();
        });
        socket.on('source-removed', () => {
            this.getSources();
        });
        socket.on('active-source-changed', (msg) => {
            userData.activeSource = msg;
            this.setState({});
            setActiveSource();
        });
        this.getSources();
    }

    getSources() {
        $.get('/getSources', (data) => {
            this.setState({sources: data})
        });
    }

    static remove(name) {
        const json = {sourcename: name};
        postJSON('/removeSource', json);
    }

    static setActiveSource(name) {
        const source = {activeSource: name};
        postJSON('/setActiveSource', source)
    }


    render() {
        const sources = this.state.sources;
        const nosource =
            <div id='no-sources'>
                <div>no sources found! - q|o_O|p</div>
            </div>;

        if (sources.length !== 0) {
            {
                let activeSource = userData.activeSource;
                return sources.map((e, i) => {

                    const active = e.name === activeSource;
                    const btnActiveClass = active ? 'btn-primary' : 'btn-secondary';
                    const btnText = active ? 'Current' : 'Activate';


                    const result = <div key={e.name} className="card border shadow rounded source-card">
                        <div className="source-item">
                            <div className="source-item-left">
                                <div>
                                    <button type="button" onClick={() => SourcesReact.setActiveSource(e.name)}
                                            className={"btn " + btnActiveClass} disabled={active}>
                                        {btnText}
                                    </button>
                                </div>
                                <div id="main-desc-box">
                                    <div className="h3">
                                        {e.name}
                                    </div>
                                    <div className="h5">
                                        {e.description}
                                    </div>
                                </div>
                            </div>
                            <div className="source-item-right">
                                <div>
                                    <div>
                                        Last modified: {formatDate(new Date(e.lastModified))}
                                    </div>
                                    <div>
                                        Nodes: -
                                    </div>
                                    <div>
                                        Links: -
                                    </div>
                                </div>


                                <div id="source-item-options">
                                    <i className="fas fa-project-diagram" data-toggle="tooltip"
                                       title="View Source"/>
                                    <i value={e.name} onClick={() => SourcesReact.remove(e.name)}
                                       className="fas fa-trash-alt" data-toggle="tooltip"
                                       title="Delete Source"/>
                                </div>
                            </div>
                        </div>
                    </div>;

                    $(function () {
                        $('i[data-toggle="tooltip"]').tooltip()
                    });
                    return result;
                });
            }
        }
        return nosource;
    }
}