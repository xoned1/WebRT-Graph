module.exports = {

    showAlert: function (name, message) {
        let control = $('#' + name + '-message');
        $('#' + name + '-alert').addClass('show').css('z-index', '0');
        control.text(message);
    },

    uuidv4: function () {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        )
    },

    isFloat: function (n) {
        return Number(n) === n && n % 1 !== 0;
    },

    createOption: function (option) {
        return "<option>" + option + "</option>";
    },

    postJSON: function (url, json) {
        return $.ajax(url, {
            data: JSON.stringify(json),
            contentType: 'application/json',
            type: 'POST',
        });
    },

    formatDate: function (date) {
        return date.toLocaleDateString("de-de", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    },

    isTabActive: function (name) {
        return $(name).hasClass('active');
    },

    copyToClipBoard: function (text) {

        const dummy = $('<input>').val(text).appendTo('body').select();
        const result = document.execCommand('copy');
        dummy.remove();
        return result;
    },

    toDataURL: function (src, callback, outputFormat) {
        var img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function () {
            var canvas = document.createElement('CANVAS');
            var ctx = canvas.getContext('2d');
            var dataURL;
            canvas.height = this.naturalHeight;
            canvas.width = this.naturalWidth;
            ctx.drawImage(this, 0, 0);
            dataURL = canvas.toDataURL(outputFormat);
            callback(dataURL);
        };
        img.src = src;
        if (img.complete || img.complete === undefined) {
            img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
            img.src = src;
        }
    },

    hookFormValidation: function () {
        const forms = document.getElementsByClassName('needs-validation');
        Array.prototype.filter.call(forms, function (form) {
            form.addEventListener('submit', function (event) {
                if (form.checkValidity() === false) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            }, false);
        });
    },

    hookModalFormReset: function () {
        $('.modal').on('hidden.bs.modal', function (e) {
            $('.modal input.reset').val('');
            $('.modal .alert.reset').removeClass("show");

            if (e.currentTarget.id === "add-source-box") {
                addSourceWindowOnChange();
            } else if (e.currentTarget.id === "addImageWindow") {
                validateImageUpload();
            }
        });
    }


};

window.hideAlert = function (name) {
    $('#' + name + '-alert').removeClass('show').css('z-index', '-1');
};
