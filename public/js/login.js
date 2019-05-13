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

        let message = $('#login-message');
        $('#login-alert').addClass('show');
        if (data.err) {
            message.text(data.err);
        }
        message.text("Error while login.");
    }).fail((data) => {
        let message = $('#login-message');
        $('#login-alert').addClass('show');
        message.text(data);
    });

}

function hideAlert() {
    $('#login-alert').removeClass('show')
}


