const Util = require('./util');

$(document).ready(() => {

    $(document).keydown((event) => {
        if (event.key === "Enter") {
            if (isTabActive('#sign-in-pill')) {
                $("#login-button").click();
            } else {
                $("#signup-button").click();
            }
        }
    });

    //Required to have same height for login and signup
    setLoginCardHeight();
});

function setLoginCardHeight() {
    const loginCard = $('#login-card');
    const height = loginCard.outerHeight();
    loginCard.css('height', height);
}

window.login = function () {
    let username = $('#login-username')[0].value;
    let password = $('#login-password')[0].value;

    let data = {username: username, password: password};

    $.ajax('/dologin', {
        data: JSON.stringify(data),
        contentType: 'application/json',
        type: 'POST'
    }).done((data) => {
        if (data.redirect) {
            return window.location.replace(data.redirect);
        }
        if (data.err) {
            Util.showAlert('login', data.err);
        } else {
            Util.showAlert('login', "Error while login.");
        }
    }).fail((xhr, status, error) => {
        Util.showAlert('login', status + ': ' + error);
    });
};

window.register = function () {
    const username = $('#signup-username').val();
    const password = $('#signup-password').val();

    const json = {username: username, password: password};
    $.ajax('/createUser', {
        data: JSON.stringify(json),
        contentType: 'application/json',
        type: 'POST',
    }).done((data) => {
        if (data) {
            Util.showAlert('login', data);
        }
    }).fail((data) => {
        Util.showAlert('login', data);
    });
};




