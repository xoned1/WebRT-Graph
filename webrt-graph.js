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
const databaseConfig = getConfig('database.json');

//Load session config file
const sessionConfig = getConfig('session.json');

const LOGIN_REQ = 'Login required';

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
app.get('/', function (req, res) {
    if (!req.isAuthenticated()) {
        res.redirect('/login')
    } else {
        res.redirect('/WebRT-Graph')
    }
});


app.post('/dologin', (req, res, next) => {
    passport.authenticate('local', function (err, user, info) {
        if (logError(res, err)) { return res.end()}

        if (!user) {
            return res.send({err: 'Username or password invalid.'});
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

    if (!username || !password || !username.length > 0 || !password.length > 0) {
        return res.end('Missing username or password or empty parameter');
    }
    if (username.length < 4 || password.length < 4) {
        return res.end('The username and password should contain at least 4 character');
    }

    getUserTable().get(username).run(connection, (err, user) => {
        //Check if user already exists in database
        if (user) {
            const msg = `User ${username} already exists.`;
            console.log(msg);
            return res.end(msg);
        }

        const salt = bcrypt.genSaltSync();
        const hash = bcrypt.hashSync(password, salt);
        //Insert new user into users table
        getUserTable().insert({
            username: username,
            password: hash
        }).run(connection, function (err, result) {
            if (logError(res, err)) { return res.end()}

            console.log(`New user ${username} added`);

            //Create own table for user
            getDataDb().tableCreate(username, {primaryKey: "name"}).run(connection, function (err, result) {
                if (logError(res, err)) { return res.end()}
                console.log(`New table ${username} created`);

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
    if (!req.user) { return res.end(LOGIN_REQ); }

    getSource(req.user, req.user).run(connection, (err, result) => {
        if (logError(res, err)) { return res.end()}
        res.send(result);
    });
});


app.post('/setActiveSource', (req, res, next) => {
    if (!req.user) { return res.end(LOGIN_REQ); }

    const source = req.body.activeSource;
    const sourceOwner = req.body.activeSourceOwner ? req.body.activeSourceOwner : req.user;

    if (!source || !sourceOwner) {
        return res.end('Source required. If its a shared source the source owner is also required.')
    }

    getSource(req.user, req.user).update(
        {
            activeSource: source,
            activeSourceOwner: sourceOwner
        }).run(connection, (err, result) => {
        if (err) {
            return res.send(err);
        }
        res.end();
        io.emit("active-source-changed", source, sourceOwner);
    })
});

app.post('/saveGraph', (req, res, next) => {
    if (!req.user) { return res.end(LOGIN_REQ); }

    const selectedSource = req.body.source;
    const graphData = req.body.graphData;
    const lastModified = req.body.lastModified;
    const user = req.body.sourceOwner ? req.body.sourceOwner : req.user;
    const overwrite = req.body.overwrite;

    if (!selectedSource || !graphData || !lastModified || !user) {
        return res.end('Missing parameter.\nRequired=[source, graphData, lastModified].\n' +
            'Optional=[sourceOwner, overwrite].');
    }

    getSource(user, selectedSource).run(connection, (err, source) => {
        if (logError(res, err)) { return res.end()}

        if (!overwrite) {
            if (lastModified < source.lastModified) {
                return res.end('overwrite required');
            }
        }

        source.data = JSON.stringify(graphData);
        source.lastModified = new Date().getTime();
        getSource(user, selectedSource).update(source).run(connection, (err, result) => {
            if (logError(res, err)) { return res.end()}

            const nsp = io.of('/' + selectedSource + ':' + user);
            nsp.emit('source-changed', req.user);

            res.send({
                success: result.replaced === 1,
                lastModified: source.lastModified
            });
            return res.end();
        });
    });
});

app.post('/createSource', (req, res, next) => {
    if (!req.user) { return res.end(LOGIN_REQ); }

    const source = req.body.source;

    if (!source || !source.name.length > 0) {
        return res.end('Missing "source" parameter or source is empty')
    }

    getSources(req.user).insert(source)
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
    if (!req.user) { return res.end(LOGIN_REQ); }

    const sourceName = req.body.sourceName;

    if (!sourceName || !sourceName.length > 0) {
        return res.end('Missing "sourceName" parameter or the source name is empty')
    }

    getSource(req.user, sourceName).delete()
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
    if (!req.user) { return res.end(LOGIN_REQ); }

    getSources(req.user).orderBy(r.desc('lastModified')).run(connection, (err, ownSources) => {
        if (logError(res, err)) { return res.end()}

        getSharedSources(req.user).orderBy(r.desc('lastModified')).run(connection, (err, sharedSources) => {
            if (logError(res, err)) { return res.end()}
            new Promise((resolve, reject) => {
                let round = 0;
                sharedSources.forEach(sharedSource => {

                    getSource(sharedSource.sharedFrom, sharedSource.sourceName).run(connection, (err, source) => {
                        if (logError(res, err)) { return res.end()}
                        if (!source) { return res.end(); }

                        round++;
                        //make sure the user still shares source with him.
                        //source could be revoked and just remain in user_shared..
                        if (source.sharedWith.includes(req.user)) {
                            source.shared = true;
                            source.sharedBy = sharedSource.sharedFrom;
                            ownSources.push(source);
                        }
                        if (round === sharedSources.length) {
                            resolve(source);
                        }
                    });
                });
            }).then(source => {
                const response = {sources: ownSources.filter((source) => source.name !== req.user)};
                response['activeSource'] = ownSources.find((source) => source.name === req.user).activeSource;
                response['activeSourceOwner'] = ownSources.find((source) => source.name === req.user).activeSourceOwner;
                res.send(response);
            });
        });
    });
});

app.get('/getSource', (req, res, next) => {
    if (!req.user) { return res.end(LOGIN_REQ); }

    const sourceName = req.query.sourceName;
    if (!sourceName || !sourceName.length > 0) {
        return res.end('Missing "sourceName" parameter or the source name is empty');
    }

    const user = req.query.sourceOwner ? req.query.sourceOwner : req.user;
    if (!user || !user.length > 0) {
        return res.end('Missing "sourceOwner" parameter or the source owner is empty');
    }

    getSource(user, sourceName).run(connection, function (err, source) {
        if (logError(res, err)) { return res.end()}
        if (!source) { return }

        const nsp = io.of('/' + sourceName + ':' + user);

        source.shared = req.user !== user;
        source.sharedBy = user;
        return res.send(source);
    });
});

app.post('/addImage', (req, res, next) => {
    if (!req.user) { return res.end(LOGIN_REQ); }

    //base64 encoded
    const name = req.body.name;
    const image = req.body.image;

    if (!name || !image || !name.length > 0 || !image.length > 0) {
        return res.end('Missing parameter "name" or "image" or one of the parameter is empty.')
    }

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
    if (!req.user) { return res.end(LOGIN_REQ); }

    getUserImages(req.user).run(connection, (err, cursor) => {
        if (logError(res, err)) { return res.end()}

        cursor.toArray((err, result) => {
            if (logError(res, err)) { return res.end()}

            return res.send(result);
        })
    });
});

app.get('/getImage', (req, res, next) => {
    if (!req.user) { return res.end(LOGIN_REQ); }

    const name = req.query.name;
    if (!name || !name.length > 0) {
        return res.end('Missing parameter "name" or the name is empty.')
    }

    getUserImages(req.user).get(name).run(connection, (err, result) => {
        if (logError(res, err)) { return res.end()}

        return res.end(result.image);
    })
});

app.post('/removeImage', (req, res, next) => {
    if (!req.user) { return res.end(LOGIN_REQ); }

    const name = req.body.name;
    if (!name || !name.length > 0) {
        return res.end('Missing parameter "name" or the name is empty.')
    }

    getUserImages(req.user).get(name).delete().run(connection, (err, result) => {
        if (logError(res, err)) { return res.end()}

        return res.end()
    });
});

app.post('/shareWithUser', (req, res, next) => {
    if (!req.user) { return res.end(LOGIN_REQ); }

    const shareWithUser = req.body.shareWithUser;
    const sourceName = req.body.sourceName;
    if (!shareWithUser || !sourceName || !shareWithUser.length > 0 || !sourceName.length > 0) {
        return res.end('Missing parameter "shareWithUser" or "sourceName" or one of the parameter is empty.')
    }

    getSource(req.user, sourceName)('sharedWith').append(shareWithUser).default([]).run(connection, (err, result) => {
        if (logError(res, err)) { return res.end()}

        getSource(req.user, sourceName).update({sharedWith: result}).run(connection, (err, result) => {
            if (logError(res, err)) { return res.end()}

            getSharedSources(shareWithUser).insert({
                sourceName: sourceName,
                sharedFrom: req.user
            }).run(connection, (err, result) => {
                if (logError(res, err)) { return res.end()}

                res.send(shareWithUser);
            });
        });
    });
});

app.post('/unShareWithUser', (req, res, next) => {
    if (!req.user) { return res.end(LOGIN_REQ); }

    const unShareWithUser = req.body.unShareWithUser;
    const sourceName = req.body.sourceName;
    if (!unShareWithUser || !sourceName || !unShareWithUser.length > 0 || !sourceName.length > 0) {
        return res.end('Missing parameter "unShareWithUser" or "sourceName" or one of the parameter is empty.')
    }

    getSource(req.user, sourceName)('sharedWith').offsetsOf(unShareWithUser).run(connection, (err, index) => {
        if (logError(res, err)) { return res.end()}

        getSource(req.user, sourceName)('sharedWith').deleteAt(index[0]).run(connection, (err, result) => {
            if (logError(res, err)) { return res.end()}

            getSource(req.user, sourceName).update({sharedWith: result}).run(connection, (err, result) => {
                if (logError(res, err)) { return res.end()}

                res.send(unShareWithUser);
            });
        });
    });
});

app.post('/setSourceConfig', (req, res, next) => {
    if (!req.user) { return res.end(LOGIN_REQ); }

    const config = req.body.sourceConfig;
    if (!config) {
        return res.end('Missing parameter "config"')
    }

    getSource(req.user, req.user).run(connection, (err, userData) => {
        if (logError(res, err)) { return res.end()}
        if (!userData) { { return res.end()}}

        const user = getUserFromActiveSource(userData.activeSource, req);
        const source = getSourceFromActiveSource(userData.activeSource);

        getSource(user, source).update(config).run(connection, (err, result) => {
            if (logError(res, err)) { return res.end()}

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

function getSource(user, source) {
    return getDataDb().table(user).get(source);
}

function getUser(username) {
    return getUserTable().get(username);
}

function getSources(username) {
    return getDataDb().table(username);
}

function getSharedSources(user) {
    return getDataDb().table(user + "_shared");
}

function getUserImages(username) {
    return getDataDb().table(username + "_images");
}

function getConfig(fileName) {
    try {
        let configFile = fs.readFileSync(fileName);
        return JSON.parse(configFile);
    } catch (err) {
        console.log("Error while loading config file:" + err)
    }
}

function getUserFromActiveSource(sourceString, req) {
    return sourceString.includes(":") ? sourceString.split(":")[1] : req.user;
}

function getSourceFromActiveSource(sourceString) {
    return sourceString.includes(":") ? sourceString.split(":")[0] : sourceString;
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
        secret: sessionConfig.secret,
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