const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const r = require('rethinkdb');
const fs = require('fs');
const RDBStore = require('./rethinkdb-session')(session);
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

//Port for HTTP Server
const httpPort = 8080;

//Connection to RethinkDB
var connection = null;

//Log from stdout & stderr
const log = new console.Console(process.stdout, process.stderr);

//Load database config file
const databaseConfig = getDatabaseConfig('database.json');

//Parse body content
app.use(bodyParser.urlencoded({extended: false}));

//Parse JSON from body content
app.use(express.json({limit: '5mb'}));

//Allow access to public files
app.use(express.static('public'));

//Check user credentials
passport.use(createLoginStrategy());

//Session handling
app.use(createSessionHandler());

app.use(passport.initialize());

//Allow passport access to sessions
app.use(passport.session());

function isAuth(req, res, next) {
    if (req.isAuthenticated()) {
        next();
        return
    }
    res.redirect('/login')
}

//Beautiful URLs
app.use('/login', express.static(path.join(__dirname, 'public/login.html')));
app.use('/WebRT-Graph', isAuth, express.static(path.join(__dirname, 'public/graph.html')));

//Start Server
http.listen(httpPort, () => console.log(`WebRT-Graph is listening on port ${httpPort}!`));

/*
    -----------------------------------------------------
    ------------------    Routes    ---------------------
    -----------------------------------------------------
 */
app.get("/", function (req, res) {
    if (!req.isAuthenticated()) {
        res.redirect("/login")
    } else {
        res.redirect("/WebRT-Graph")
    }
});


app.post('/dologin', (req, res, next) => {
    passport.authenticate('local', function (err, user, info) {
        if (logError(res, err)) { return res.end()}

        if (!user) {
            return res.send({err: "Username or password invalid."});
        }
        req.logIn(user, function (err) {
            if (logError(res, err)) { return res.end()}
            return res.send({redirect: '/WebRT-Graph'});
        });
    })(req, res, next);
});

//Creates new user in database if not exists
app.post('/createUser', (req, res, next) => {
    const username = req.body.username;
    const password = req.body.password;

    getUserTable().get(username).run(connection, (err, user) => {
        //Check if user already exists in database
        if (user) {
            console.log("User \"" + username + "\" already exists.");
            return res.end("User already exists!");
        }

        const salt = bcrypt.genSaltSync();
        const hash = bcrypt.hashSync(password, salt);
        //Insert new user into users table
        getUserTable().insert({
            username: username,
            password: hash
        }).run(connection, function (err, result) {
            if (logError(res, err)) { return res.end()}

            console.log("New user \"" + username + "\" added");

            //Create own table for user
            getDataDb().tableCreate(username, {primaryKey: "name"}).run(connection, function (err, result) {
                if (logError(res, err)) { return res.end()}
                console.log("New table \"" + username + "\" created");

                //Insert basic data in his own table
                getDataDb().table(username).insert({
                    "name": username,
                    "last_login": new Date().getTime(),
                }).run(connection, function (err, result) {
                    if (logError(res, err)) { return res.end()}

                    getDataDb().tableCreate(req.user + "_images").run(connection, function (err, result) {
                        if (logError(res, err)) { return res.end()}

                        getDataDb().tableCreate(req.user + "_shared").run(connection, function (err, result) {
                            if (logError(res, err)) { return res.end()}

                            res.end();
                        });
                    });
                });
            });
        });
    });
});


app.get('/logout', (req, res) => {
    req.logout();
    return res.redirect('/');
});


app.get('/getUserData', function (req, res) {
    getUserData(req.user).get(req.user).run(connection, (err, result) => {
        if (logError(res, err)) { return res.end()}
        res.send(result);
    });
});


app.post('/setActiveSource', (req, res, next) => {
    const source = req.body.activeSource;
    getUserData(req.user).get(req.user).update({activeSource: source}).run(connection, (err, result) => {
        if (err) {
            return res.send(err);
        }
        res.end();
        io.emit("active-source-changed", source);
    })
});

app.post('/setGraphData', (req, res, next) => {
    const selectedSource = req.body.source;
    const graphData = req.body.graphData;
    getUserData(req.user).get(selectedSource).run(connection, (err, source) => {
        if (logError(res, err)) { return res.end()}

        source.data = JSON.stringify(graphData);
        source.lastModified = new Date().getTime();
        getUserData(req.user).get(selectedSource).update(source).run(connection, (err, result) => {
            if (logError(res, err)) { return res.end()}
            res.end();
            //TODO return SAVED or something to make it sure
        });
    });
});

app.post('/createSource', (req, res, next) => {
    const source = req.body.source;

    getUserData(req.user).insert(source)
        .run(connection, (err, cursor) => {
            if (err || cursor.first_error) {
                const errorMsg = err ? err : cursor.first_error.substring(0, cursor.first_error.indexOf(':'));
                console.log(errorMsg);
                return res.end(translateErrorMessage('Source', errorMsg))
            }
            res.end();
        });

    io.emit('source-added');
});

app.post('/removeSource', (req, res, next) => {

    const sourceName = req.body.sourceName;
    getUserData(req.user).get(sourceName).delete()
        .run(connection, (err, result) => {
            if (err) {
                console.log(err);
                return res.end(err)
            }

            res.end();
        });
    io.emit('source-removed');
});

app.get('/getAllSources', (req, res, next) => {
    getUserData(req.user).orderBy(r.desc('lastModified')).run(connection, function (err, cursor) {
        if (logError(res, err)) { return res.end()}

        cursor.toArray(function (err, results) {
            if (logError(res, err)) { return res.end()}

            const response = {sources: results.filter((source) => source.name !== req.user)};
            response["activeSource"] = results.find((source) => source.name === req.user).activeSource;
            res.send(response);
        });
    });
});

app.get('/getSource', (req, res, next) => {

    const sourceName = req.query.sourceName;
    if (!sourceName) {
        return res.end();
    }
    getUserData(req.user).get(sourceName).run(connection, function (err, result) {
        if (logError(res, err)) { return res.end()}

        return res.send(result);
    });
});

app.post('/addImage', (req, res, next) => {

    //base64 encoded
    const name = req.body.name;
    const image = req.body.image;

    const contents = new Buffer(image, 'base64');
    getUserImages(req.user).insert({name: name, image: r.binary(contents)}).run(connection, (err, result) => {
        if (err || result.first_error) {
            const errorMsg = err ? err : result.first_error.substring(0, result.first_error.indexOf(':'));
            console.log(errorMsg);
            return res.end(translateErrorMessage('Image', errorMsg))
        }
        io.emit('image-added');
        return res.end()
    });
});

app.get('/getImages', (req, res, next) => {

    getUserImages(req.user).run(connection, (err, cursor) => {
        if (logError(res, err)) { return res.end()}

        cursor.toArray((err, result) => {
            if (logError(res, err)) { return res.end()}

            return res.send(result);
        })
    });
});

app.get('/getImage', (req, res, next) => {

    const name = req.query.name;
    getUserImages(req.user).get(name).run(connection, (err, result) => {
        if (logError(res, err)) { return res.end()}

        return res.end(result.image);
    })
});

app.post('/removeImage', (req, res, next) => {

    //base64 encoded
    const name = req.body.name;
    getUserImages(req.user).get(name).delete().run(connection, (err, result) => {
        if (logError(res, err)) { return res.end()}

        return res.end()
    });
});

app.post('/shareWithUser', (req, res, next) => {

    const shareWithUser = req.body.shareWithUser;
    const sourceName = req.body.sourceName;

    getUserData(req.user).get(sourceName)('sharedWith').append(shareWithUser).default([]).run(connection, (err, result) => {
        if (logError(res, err)) { return res.end()}

        getUserData(req.user).get(sourceName).update({sharedWith: result}).run(connection, (err, result) => {
            if (logError(res, err)) { return res.end()}

            res.send(shareWithUser);
        });
    });
});

app.post('/unShareWithUser', (req, res, next) => {

    const unShareWithUser = req.body.unShareWithUser;
    const sourceName = req.body.sourceName;
    getUserData(req.user).get(sourceName)('sharedWith').offsetsOf(unShareWithUser).run(connection, (err, index) => {
        if (logError(res, err)) { return res.end()}

        getUserData(req.user).get(sourceName)('sharedWith').deleteAt(index[0]).run(connection, (err, result) => {
            if (logError(res, err)) { return res.end()}

            getUserData(req.user).get(sourceName).update({sharedWith: result}).run(connection, (err, result) => {
                if (logError(res, err)) { return res.end()}

                res.send(unShareWithUser);
            });
        });
    });
});

app.post('/setSourceConfig', (req, res, next) => {

    const config = req.body.sourceConfig;

    getUserData(req.user).get(config.name).run(connection, (err, source) => {
        if (logError(res, err)) { return res.end()}

        if (config.hasOwnProperty("configNode")) {
            source.configNode = config.configNode;
        }
        if (config.hasOwnProperty("configNodeId")) {
            source.configNodeId = config.configNodeId;
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
        if (config.hasOwnProperty("nodeCount")) {
            source.nodeCount = config.nodeCount;
            console.log("Set node count: " + source.nodeCount)
        }
        if (config.hasOwnProperty("linkCount")) {
            source.linkCount = config.linkCount;
            console.log("Set link count: " + source.linkCount)
        }

        getUserData(req.user).get(config.name).update(source).run(connection, (err, result) => {
            res.end();
        })
    });
});

function logError(res, err) {
    if (err) { 
        console.log(err);
        return res.send(err);
    }
}


/*
    -----------------------------------------------------
    ------------------    Socket IO    ---------------------
    -----------------------------------------------------
 */
io.on('connection', function (socket) {
    console.log('an user connected');
});

/*
    -----------------------------------------------------
    ------------------    Passport.JS    ---------------------
    -----------------------------------------------------
 */
passport.serializeUser((user, done) => {
    done(null, user.username);
});

passport.deserializeUser(function (id, done) {
    const user = getUser(id).run(connection);
    user.then(
        success => done(null, success.username),
        fail => console.log(fail));
});

/*
    -----------------------------------------------------
    ------------------    Functions    ---------------------
    -----------------------------------------------------
 */
function getDataDb() {
    return r.db("test");
}

function getUserTable() {
    return getDataDb().table("users");
}

function getUser(username) {
    return getUserTable().get(username);
}

function getUserData(username) {
    return getDataDb().table(username);
}

function getUserImages(username) {
    return getDataDb().table(username + "_images");
}

function getDatabaseConfig(fileName) {
    try {
        let databaseFile = fs.readFileSync(fileName);
        return JSON.parse(databaseFile);
    } catch (err) {
        console.log("Error while loading database config file:" + err)
    }
}


function createLoginStrategy() {
    return new LocalStrategy(
        (id, password, done) => {
            getUserTable().get(id).run(connection, (err, user) => {

                if (err) {
                    done(err);
                }
                if (user && bcrypt.compareSync(password, user.password)) {
                    done(null, user)
                } else {
                    //Incorrect password
                    done(null, false, {message: "Incorrect credentials"});
                }
            });
        }
    )
}

//Create Database Connection
function createDatabaseConnection(resolve, reject) {

    r.connect({
        host: databaseConfig.host,
        port: databaseConfig.port,
        user: databaseConfig.user,
        password: databaseConfig.password
    }, function (err, conn) {
        if (err) {
            reject(Error(err));
        }

        console.log("Connection to RethinkDB established");
        connection = conn;
        resolve(conn)
    });
}

function createSessionHandler() {
    return session({
        key: 'sid',
        secret: 'dasndjansjdnaj3!dd(key)!',
        store: createSessionStore(),
        resave: false,
        saveUninitialized: true
    })
}

function createSessionStore() {
    return new RDBStore({
        connection: new Promise(createDatabaseConnection),
        database: 'sessions',
        table: 'sessions',
        instance: r,
        sessionTimeout: 86400000,
        flushInterval: 240000, //Clear all 4 minutes the expired sessions
    });
}

function translateErrorMessage(type, message) {
    message = message.toLowerCase();
    if (message.includes('duplicate') && message.includes('primary key')) {
        return type + ' already exists';
    }
    return message;
}