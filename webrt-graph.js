const express = require('express');
const uuid = require('uuid/v4');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const r = require('rethinkdb');


const app = express();
const port = 3000;
const rethinkHost = "192.168.178.57";
const rethinkPort = 28015;

const http = require('http').Server(app);
const io = require('socket.io')(http);
const log = new console.Console(process.stdout, process.stderr);

const users = [
    {id: 'Timo', password: 'test'},
    {id: 'Test', password: 'test'}
];

var connection = null;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.json());
app.use('/login', express.static('public/login.html'));


passport.use(new LocalStrategy(
    (id, password, done) => {
        const user = users[0];
        if (id === user.id && password === user.password) {
            return done(null, user);
        }
        return done(null, false);
    }
));


app.use(session({
    genid: (req) => {
        return uuid();
    },
    store: new FileStore(),
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());


function isAuth(req, res, next) {
    if (req.isAuthenticated()) {
        next();
        return
    }
    res.redirect('/login')
}

app.use('/webwork', isAuth, express.static('public/graph.html'));


app.get("/", function (req, res) {
    if (!req.isAuthenticated()) {
        res.redirect("/login")
    } else {
        res.redirect("/webwork")
    }
});


app.get('/logout', (req, res) => {
    req.logout();
    return res.redirect('/');
});

app.get('/getUserData', function (req, res) {

    r.table(req.user).get(req.user).without('sources').run(connection, (err, result) => {
        if (err) {
            return res.send(err);
        }
        res.send(result);
    });
});

app.post('/setActiveSource', (req, res, next) => {
    const source = req.body.activeSource;
    r.table(req.user).update({activeSource: source}).run(connection, (err, result) => {
        if (err) {
            return res.send(err);
        }
        res.end();
        io.emit("active-source-changed", source);
    })
});

app.post('/dologin', (req, res, next) => {

    passport.authenticate('local', function (err, user, info) {
        if (err) {
            return res.write(err);
        }
        if (!user) {
            return res.send({err: "Username or password invalid."});
        }
        req.logIn(user, function (err) {
            if (err) {
                return res.write(err);
            }
            return res.send({redirect: '/webwork'});
        });
    })(req, res, next);
});


passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    done(null, users[0].id);
});

http.listen(port, () => console.log(`Example app listening on port ${port}!`));


r.connect({host: rethinkHost, port: rethinkPort}, function (err, conn) {
    if (err) {
        throw err;
    }

    console.log("Connection to reThinkDB established");
    connection = conn;
});

app.get("/test", (req, res, next) => {

    res.send();

});

app.get('/createUser', (req, res, next) => {
    r.tableCreate(req.user, {primaryKey: "name"}).run(connection, function (err, result) {
        if (err) console.log(err);
        r.table(req.user).insert({
            "name": req.user,
            "last_login": new Date().getTime(),
            "sources": []
        }).run(connection, function (err, result) {
            if (err) console.log(err);
            console.log(JSON.stringify(result, null, 2));
        });
    });
    res.end();
});

app.post('/createSource', (req, res, next) => {
    var source = req.body.source;

    r.table(req.user).get(req.user)
        .update({sources: r.row("sources").append(source)})
        .run(connection, (err, cursor) => {
            console.log(cursor)
        });

    io.emit('source-added');
    res.end();
});

app.post('/removeSource', (req, res, next) => {

    var sourcename = req.body.sourcename;
    r.table(req.user).get(req.user)
        .update({
            sources: r.row('sources').filter(function (row) {
                return row('name').ne(sourcename)
            })
        })
        .run(connection, (err, result) => {
            if (err) console.log(err);
            console.log(JSON.stringify(result, null, 2));
        });
    io.emit('source-removed');
    res.end();
});

app.get('/getSources', (req, res, next) => {

    r.table(req.user)('sources').run(connection, function (err, cursor) {
        if (err) {
            log.log(err);
        }
        cursor.toArray(function (err, result) {
            res.send(result[0]);
        });
    });
});

app.post('/setSourceConfig', (req, res, next) => {

    const config = req.body.sourceConfig;
    r.table(req.user).get(req.user).run(connection, (err, result) => {
        if (err) {
            res.send(err);
        }

        result.sources.forEach((source) => {
            if (source.name === result.activeSource) {

                if (config.hasOwnProperty("configNode")) {
                    source.configNode = config.configNode;
                }
                if (config.hasOwnProperty("configLink")) {
                    source.configLink = config.configLink;
                    console.log("Set config link: " + source.configLink)
                }
                if (config.hasOwnProperty("configNodeTitle")) {
                    source.configNodeTitle = config.configNodeTitle;
                    console.log("Set config node title: " + source.configNodeTitle)
                }
                if (config.hasOwnProperty("configNodeWeight")) {
                    source.configNodeWeight = config.configNodeWeight;
                    console.log("Set config node weight: " + source.configNodeWeight)
                }
                if (config.hasOwnProperty("configLinkLineType")) {
                    source.configLinkLineType = config.configLinkLineType;
                    console.log("Set link line type: " + source.configLinkLineType)
                }
                if (config.hasOwnProperty("nodeColorPalette")) {
                    source.nodeColorPalette = config.nodeColorPalette;
                    console.log("Set node color palette: " + source.nodeColorPalette)
                }
            }
        });

        r.table(req.user).get(req.user).update(result).run(connection, (err, result) => {
            res.end();
        })

    });

});

io.on('connection', function (socket) {
    console.log('an user connected');
});
