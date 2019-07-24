const Util = require('./Util');
const SharedWith = require('./SharedWith');

module.exports = class Sources extends React.Component {

    constructor(props) {

        const socket = io.connect();
        super(props);
        this.state = {
            sourcesReq: null,
            shareModalSource: "",
            loadingCopyToClipBoard: false,
            loadingViewSource: false,
            loadingRemoveSource: false,
            loadingName: ""
        };

        this.capture = this.capture.bind(this);
        this.shareWithUser = this.shareWithUser.bind(this);
        this.unShareWithUser = this.unShareWithUser.bind(this);

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

    setShareModalSource(name) {
        this.state.sourcesReq.sources.forEach(source => {
            if (source.name === name) {
                this.setState({shareModalSource: source});
            }
        })
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

    getShareSourceButton(e) {
        return <i className="fas fa-share-alt"
                  data-toggle="modal" data-target="#share-source-modal"
                  title="Share Source" data-source={e.name} onClick={x => this.setShareModalSource(e.name)}/>
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

    static getSharedWithBlock(source) {
        if (source.sharedWith && source.sharedWith.length > 0) {
            return source.sharedWith.slice(0, 3).map(user => {
                return <div key={user}>{user}</div>
            });
        }
        return <div>-</div>
    }

    capture(e) {
        this.state.caption = e.target.value;
    }

    shareWithUser() {
        const json = {sourceName: this.state.shareModalSource.name, shareWithUser: this.state.caption};

        Util.postJSON('/shareWithUser', json).done(data => {
            const source = this.state.shareModalSource;
            source.sharedWith = [...source.sharedWith, data];
            this.setState({shareModalSource: source});
        });
    }

    unShareWithUser(userD) {
        const json = {sourceName: this.state.shareModalSource.name, unShareWithUser: userD};

        Util.postJSON('/unShareWithUser', json).done(data => {
            const source = this.state.shareModalSource;
            source.sharedWith = source.sharedWith.filter(user => user !== data);
            this.setState({shareModalSource: source});
        });
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

        var test = sourcesReq.sources.map((e, i) => {

            const active = e.name === sourcesReq.activeSource;
            const btnActiveClass = active ? 'btn-primary' : 'btn-secondary';
            const btnText = active ? 'Current' : 'Activate';

            const result = <div key={e.name} className="card border shadow rounded source-card">
                <div className="source-item">
                    <div className="source-item-left">
                        <div>
                            <button id={"btn-source-" + e.name} type="button"
                                    onClick={() => Sources.setActiveSource(e.name)}
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
                        <div id="shared-items">
                            <div><u>Shared with</u>{this.getShareSourceButton(e)}</div>
                            {Sources.getSharedWithBlock(e)}
                        </div>
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
                            {this.getViewSourceButton(e)}
                            {this.getCopyToClipBoardButton(e)}
                            {this.getRemoveSourceButton(e)}
                        </div>
                    </div>
                </div>
            </div>;

            $(function () {
                $('i[data-toggle="tooltip"]').tooltip()
            });
            return result;
        });

        return <><SharedWith
            sourceName={this.state.shareModalSource.name}
            sharedUsers={this.state.shareModalSource.sharedWith}
            shareWithUser={this.shareWithUser}
            unShareWithUser={this.unShareWithUser}
            shareUserInput={this.capture}/>{test}</>;
    }


};