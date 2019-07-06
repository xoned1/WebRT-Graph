class SourcesReact extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sourcesReq: null,
        };

        socket.on('source-added', () => {
            this.getSources();
        });
        socket.on('source-removed', () => {
            this.getSources();
        });
        socket.on('active-source-changed', (msg) => {
            this.getSources();
            setActiveSource(msg);
        });
        this.getSources();
    }

    getSources() {
        $.get('/getAllSources', (data) => {
            this.setState({sourcesReq: data})
        });
    }

    static remove(name) {
        const json = {sourceName: name};
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
        }

        return sourcesReq.sources.map((e, i) => {

            const active = e.name === sourcesReq.activeSource;
            const btnActiveClass = active ? 'btn-primary' : 'btn-secondary';
            const btnText = active ? 'Current' : 'Activate';


            const result = <div key={e.name} className="card border shadow rounded source-card">
                <div className="source-item">
                    <div className="source-item-left">
                        <div>
                            <button id={"btn-source-" + e.name} type="button"
                                    onClick={() => SourcesReact.setActiveSource(e.name)}
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
                                Nodes: {e.nodeCount}
                            </div>
                            <div>
                                Links: {e.linkCount}
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