const Buffer = require('buffer/').Buffer;
const Util = require('./Util');

module.exports = class Images extends React.Component {


    constructor(props) {
        super(props);
        this.state = {
            images: null
        };

        const socket = io.connect(); //TODO doppelt in sources (connect())..
        this.getImages();
        socket.on('image-added', () => {
            this.getImages();
        });
        socket.on('image-removed', () => {
            this.getImages();
        });
        socket.on('image-changed', () => {
            this.getImages();
        });
    }

    getImages() {
        $.get('/getImages', (images) => {
            this.setState({images: images});
            //todo refactor in own function..
            const combobox = $('#nodeImageComboBox');
            combobox.empty();
            for (let key in images) {
                combobox.append(Util.createOption(images[key].name));
            }
        })
    }

    removeImage(name) {
        const promise = Util.postJSON('/removeImage', {name: name});
        promise.done(() => {
            this.getImages();
        });
    }

    getRemoveSourceButton(e) {
        if (this.state.loadingRemoveSource && this.state.loadingName === e.name) {
            return <span className="spinner-border spinner-border-sm" role="status">
                <span className="sr-only">Loading...</span>
            </span>
        }
        return <i className="fas fa-trash-alt"
                  onClick={() => this.removeImage(e.name)}
                  title="Delete Image"/>
    }


    render() {

        if (!this.state.images) {
            return <div className="d-flex justify-content-center align-items-center h-100 ">
                <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        }

        const images = this.state.images.map(image => {

            const buffer = Buffer.from(image.image);
            const base = "data:image/png;base64," + buffer.toString('base64');
            const removeButton = this.getRemoveSourceButton(image);

            return <div className="image card shadow rounded" key={image.name}>
                <h5 className="card-header">{image.name}</h5>
                <img className="card-img-top" src={base}/>
                {removeButton}
            </div>

        });
        return images;
    }

};