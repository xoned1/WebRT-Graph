module.exports = class SharedWith extends React.Component {

    constructor(props) {
        super(props);
    }

    getCurrentSharedUsers() {
        if (!this.props.sharedUsers || this.props.sharedUsers.length === 0) {
            return <div>You haven't shared this source yet!</div>
        } else {
            return this.props.sharedUsers.map(user => {
                return <h5 className="shared-user" key={user}><span className="badge badge-primary">
                {user}
                    <i className="fas fa-user-times" title="Unshare" onClick={e => this.props.unShareWithUser(user)}></i>
            </span>
                </h5>
            });
        }
    }

    render() {
        return <div className="modal fade" id="share-source-modal" tabIndex="-1" role="dialog"
                    aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 id="share-with-modal-header" className="modal-title">{this.props.sourceName}</h5>
                        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div className="modal-body">
                        <form className="form-inline">
                            <div className="form-group mx-sm-3 mb-2">
                                <input type="text" className="form-control reset" id="inputShareUser" placeholder="User"
                                       onChange={this.props.shareUserInput}/>
                            </div>
                            <button type="button" className="btn btn-primary mb-2" onClick={this.props.shareWithUser}>
                                Share with User
                            </button>
                        </form>
                        <form className="form-group">
                            <label>Shared with</label>
                            <div>
                                {this.getCurrentSharedUsers()}
                            </div>
                        </form>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>;
    }
};