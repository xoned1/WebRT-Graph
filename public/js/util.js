function showAlert(name, message) {
    let control = $('#' + name + '-message');
    $('#' + name + '-alert').addClass('show');
    control.text(message);
}

function hideAlert(name) {
    $('#' + name + '-alert').removeClass('show')
}

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}

function isFloat(n) {
    return Number(n) === n && n % 1 !== 0;
}

function createOption(option) {
    return "<option>" + option + "</option>";
}

function postJSON(url, json) {
    $.ajax(url, {
        data: JSON.stringify(json),
        contentType: 'application/json',
        type: 'POST',
    });
}

function formatDate(date) {
    return date.toLocaleDateString("de-de", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

function isTabActive(name) {
    return $(name).hasClass('active');
}