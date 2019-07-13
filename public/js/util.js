module.exports = {

    showAlert: function (name, message) {
        let control = $('#' + name + '-message');
        $('#' + name + '-alert').addClass('show');
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
        $.ajax(url, {
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
    }
};

window.hideAlert = function (name) {
    $('#' + name + '-alert').removeClass('show')
};
