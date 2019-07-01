$(document).ready(() => {

    $(document).keydown(() => {
        $("#login-button").click();
    });
    //TODO Abhängig ob register oder login

    //Required to have same height for login and signup
    setLoginCardHeight();

});

function setLoginCardHeight() {
    const loginCard = $('#login-card');
    const height = loginCard.outerHeight();
    loginCard.css('height', height);
}

function login() {
    let username = $('#login-username')[0].value;
    let password = $('#login-password')[0].value;

    let data = {username: username, password: password};

    $.ajax('/dologin', {
        data: JSON.stringify(data),
        contentType: 'application/json',
        type: 'POST',
    }).done((data) => {
        if (data.redirect) {
            return window.location.replace(data.redirect);
        }
        if (data.err) {
            showErrorMessage(data.err);
        } else {
            showErrorMessage("Error while login.");
        }
    }).fail((data) => {
        showErrorMessage(data);
    });
}

function register() {
    const json = {username: "ssss", password: "hansen"};
    $.ajax('/createUser', {
        data: JSON.stringify(json),
        contentType: 'application/json',
        type: 'POST',
    }).done((data) => {
        if (data) {
            showErrorMessage(data);
        }
    }).fail((data) => {
        showErrorMessage(data);
    });
}

function showErrorMessage(message) {
    let control = $('#login-message');
    $('#login-alert').addClass('show');
    control.text(message);
}

function hideAlert() {
    $('#login-alert').removeClass('show')
}


