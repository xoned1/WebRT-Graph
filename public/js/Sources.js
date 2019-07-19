const Util = require('./Util');

module.exports = class SourcesReact extends React.Component {

    constructor(props) {

        const socket = io.connect();
        super(props);
        this.state = {
            sourcesReq: null,
            loadingCopyToClipBoard: false,
            loadingViewSource: false,
            loadingRemoveSource: false,
            loadingName: ""
        };

        socket.on('source-added', () => {
            this.getSources();
        });
        socket.on('source-removed', () => {
            this.getSources();
        });
        socket.on('active-source-changed', (msg) => {
            this.getSources();
            this.props.loadSource(msg);
        });
        this.getSources();
    }

    getSources() {
        $.get('/getAllSources', (data) => {
            this.setState({sourcesReq: data})
        });
    }

    remove(name) {
        this.setState({loadingRemoveSource: true, loadingName: name});
        const json = {sourceName: name};
        Util.postJSON('/removeSource', json).always(() => {
            this.setState({loadingRemoveSource: false, loadingName: name});
        });
    }

    static setActiveSource(name) {
        const source = {activeSource: name};
        Util.postJSON('/setActiveSource', source)
    }

    showSourceData(name) {
        this.setState({loadingViewSource: true, loadingName: name});
        $.get("/getSource", {sourceName: name}, (source) => {
            $('#source-view-header').text('Source:' + source.name);
            $('#source-view-body').text(source.data);
            this.setState({loadingViewSource: false, loadingName: name});
        });
    }

    copyToClipboard(name) {
        this.setState({loadingCopyToClipBoard: true, loadingName: name});
        $.get("/getSource", {sourceName: name}, (source) => {
            Util.copyToClipBoard(source.data);
            this.setState({loadingCopyToClipBoard: false, loadingName: name});
        });
    }

    getCopyToClipBoardButton(e) {
        if (this.state.loadingCopyToClipBoard && this.state.loadingName === e.name) {
            return <span className="spinner-border spinner-border-sm" role="status">
                <span className="sr-only">Loading...</span>
            </span>
        }
        return <i className="fas fa-clipboard-list"
                  onClick={() => this.copyToClipboard(e.name)}
                  title="Copy Source to Clipboard"/>
    }

    getViewSourceButton(e) {
        if (this.state.loadingViewSource && this.state.loadingName === e.name) {
            return <span className="spinner-border spinner-border-sm" role="status">
                <span className="sr-only">Loading...</span>
            </span>
        }
        return <i className="fas fa-eye"
                  onClick={() => this.showSourceData(e.name)}
                  data-toggle="modal" data-target="#source-view-modal"
                  title="View Source"/>
    }

    getRemoveSourceButton(e) {
        if (this.state.loadingRemoveSource && this.state.loadingName === e.name) {
            return <span className="spinner-border spinner-border-sm" role="status">
                <span className="sr-only">Loading...</span>
            </span>
        }
        return <i className="fas fa-trash-alt"
                  onClick={() => this.remove(e.name)}
                  title="Delete Source"/>
    }

    render() {
        const sourcesReq = this.state.sourcesReq;

        //Isn't loaded
        if (!sourcesReq) {
            return <div className="d-flex justify-content-center align-items-center h-100 ">
                <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        }

        //Is empty
        if (sourcesReq.sources.length === 0) {
            return <div id='no-sources'>
                <div>no sources found! - q|o_O|p</div>
            </div>;
        }

        return sourcesReq.sources.map((e, i) => {

            const active = e.name === sourcesReq.activeSource;
            const btnActiveClass = active ? 'btn-primary' : 'btn-secondary';
            const btnText = active ? 'Current' : 'Activate';
            const viewSourceButton = this.getViewSourceButton(e);
            const copyToClipBoardButton = this.getCopyToClipBoardButton(e);
            const removeSourceButton = this.getRemoveSourceButton(e);

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
                                Last modified: {Util.formatDate(new Date(e.lastModified))}
                            </div>
                            <div>
                                Nodes: {e.nodeCount}
                            </div>
                            <div>
                                Links: {e.linkCount}
                            </div>
                        </div>


                        <div id="source-item-options">
                            {viewSourceButton}
                            {copyToClipBoardButton}
                            {removeSourceButton}
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
};