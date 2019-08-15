require('./SVG2Image');
const DataTable = require('./DataTable');
const Sources = require('./Sources');
const NodeInfo = require('./NodeInfo');
const NodeBar = require('./NodeBar');
const Graph = require('./Graph');
const GraphContext = require('./GraphContext');
const ZoomPane = require('./ZoomPane');
const Simulation = require('./Simulation');
const Images = require('./Images');
const Util = require('./Util');

const forbiddenNodeVars = ["id", "x", "y", "vx", "vy", "index"];
const none = "None";
const zoom = d3.zoom();


var context = null;
var isGraphInitialized = false;
var rootGroup;
var user;
var socket;
var beforeHoverNodeColor;

const FROM_SCRATCH = {nodes: [], links: []};

ZoomPane.setZoom(zoom);

window.explode = function () {
    Simulation.explode();
};

window.zoomFit = function () {
    ZoomPane.zoomFit(0.95, 500);
};

function getUserData() {
    return new Promise(function (resolve, reject) {
        $.getJSON("/getUserData", function (userData) {
            resolve(userData);
        });
    });
}

function loadSource(sourceName, owner) {

    var json = {sourceName: sourceName};
    if (owner) {
        json.sourceOwner = owner;
    }

    $.get("/getSource", json, (source) => {
        const namespace = '/' + source.name + ":" + source.sharedBy;
        if (!socket || !socket.connected) {
            socket = io(namespace);
            socket.on('source-changed', (triggeredBy) => {
                if (user !== triggeredBy) {
                    showSourceChangedNotification();
                }
            });
        }


        setSourceNameInHeader(source.name);
        const data = JSON.parse(source.data);
        setContext(source, data);
        if (IsGraphTabVisible()) {
            drawGraph();
        }
    });
}


$(document).ready(() => {

    Util.hookFormValidation();
    Util.hookModalFormReset();


    document.onkeydown = function (e) {
        if (e.ctrlKey && e.key === "s") {
            saveGraph();
            return false;
        } else if (e.key === "f") {
            ZoomPane.zoomFit(0.95, 500);
            return false;
        } else if (e.ctrlKey && e.key === "z") {
            resetGraph();
            return false;
        }
    };

    getUserData().then(userData => {
        updateLogoutText(userData);
        user = userData.name;
        ReactDOM.render(
            <Sources loadSource={loadSource}/>, document.getElementById('sources-container')
        );
        loadSource(userData.activeSource, userData.activeSourceOwner);
    });


    ReactDOM.render(
        <NodeInfo forbiddenVars={forbiddenNodeVars} ref={(nodeInfo) => {
            window.nodeInfo = nodeInfo
        }}/>, document.getElementById('info-container')
    );

    ReactDOM.render(
        <Images/>, document.getElementById('images-container')
    );
    /*
    Hide overlay on click
     */
    $('#overlay').hide().click(function () {
        $(this).hide(200);
    });

    /*
    Tab activation events
     */
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        let activatedTab = e.target.id;

        if (activatedTab === "graph-tab") {
            if (!isGraphInitialized && context != null) {
                drawGraph()
            }

            $('html, body').css("overflow-y", "hidden");
        } else if (activatedTab === "data-tab") {
            ReactDOM.render(
                <DataTable context={context}/>, document.getElementById('data-table-container')
            );

            $('html, body').css("overflow-y", "scroll");
        } else if (activatedTab === "sources-tab") {
            $('html, body').css("overflow-y", "scroll");
        } else if (activatedTab === 'config-tab') {
            initConfigBoxes();
        }

        if (activatedTab === "nav-link-from-scratch" ||
            activatedTab === "nav-link-from-file" ||
            activatedTab === "nav-link-from-text") {
            addSourceWindowOnChange();
        }
    });

    /*
    Settgings: Force slider
     */
    const manyBodySlider = document.getElementById("slider-manybody");
    manyBodySlider.oninput = function () {
        $('#value-manybody').text(this.value);
    };

    const forceLinkSlider = document.getElementById("slider-linkforce");
    forceLinkSlider.oninput = function () {
        $('#value-linkforce').text(this.value);
        Simulation.linkforce();
    };


    d3.select('svg').call(
        zoom.scaleExtent([0, 10])
            .on("zoom", ZoomPane.zoomed));
})
;

function setContext(source, data) {
    context = new GraphContext(source, data);
    initConfigBoxes(); //machen wenn der tab geöffnet wird?
    updateNodeColorPalette();
    updateLinkLineType();
    isGraphInitialized = false;
}

function IsGraphTabVisible() {
    return $('#graph').is(':visible');
}

function updateLogoutText(data) {
    $('#logout').text('Logout (' + data.name + ')');
}

/*
    Config
 */
function updateGraphTabState() {
    if (!context.getConfigNode()) { //TODO || !context.getConfigNodeId()) {
        $('#graph-tab').addClass('disabled');
        $('#config-tab').addClass('primary-color')
    } else {
        $('#graph-tab').removeClass('disabled');
        $('#config-tab').removeClass('primary-color')
    }
}

function updateLinkLineType() {
    $('#linkLineType').val(context.getLinkLineType());
}

function updateNodeColorPalette() {
    const colorPalette = context.getNodeColorPalette();
    if (colorPalette) {
        $('#nodeColorPalettes').val(colorPalette);
        setNodeColorPalette(colorPalette);
    } else {
        $('#nodeColorPalettes').val("BrBg");
    }
}

function nodeConfigChanged() {
    updateNodeIDconfigBox();
    updateNodeTitleConfigBox();
    updateNodeWeightConfigBox();
}

function initConfigBoxes() {
    updateNodeConfigBox();
    updateNodeIDconfigBox();
    updateNodeTitleConfigBox();
    updateNodeWeightConfigBox();
    updateLinkConfigBox();
    updateGraphTabState();
}

function updateNodeConfigBox() {
    const nodeBox = $('#sourceConfigDropBoxNodes');
    nodeBox.empty();
    Object.keys(context.getData()).forEach((key) => {
        nodeBox.append(Util.createOption(key));
    });
    nodeBox.val(context.getConfigNode());
}

function updateNodeIDconfigBox() {
    const nodeIDBox = $('#sourceConfigDropBoxNodeID');
    nodeIDBox.empty();
    if (context.getConfigNode() && context.getNodes().length > 0) {
        Object.keys(context.getNodes()[0]).forEach((key) => { //TODO nur wenn node/links angeben sind.. graph nur anzeigenn wenn nodes/links defined?
            nodeIDBox.append(Util.createOption(key));
        });
    }
    nodeIDBox.val(context.getConfigNodeId());
}

function updateNodeTitleConfigBox() {
    const titleBox = $('#sourceConfigDropBoxNodeTitle');
    titleBox.empty();
    titleBox.append(Util.createOption(none));
    if (context.getConfigNode() && context.getNodes().length > 0) {
        Object.keys(context.getNodes()[0]).forEach((key) => {
            titleBox.append(Util.createOption(key));
        });
    }
    titleBox.val(context.getConfigNodeTitle());
}

function updateNodeWeightConfigBox() {
    const weightBox = $('#sourceConfigDropBoxNodeWeight');
    weightBox.empty();
    weightBox.append(Util.createOption(none));
    if (context.getConfigNode() && context.getNodes().length > 0) {
        Object.keys(context.getNodes()[0]).forEach((key) => {
            weightBox.append(Util.createOption(key));
        });
    }
    weightBox.val(context.getConfigNodeWeight());
}

function updateLinkConfigBox() {
    const linkBox = $('#sourceConfigDropBoxLinks');
    linkBox.empty();
    Object.keys(context.getData()).forEach((key) => {
        linkBox.append(Util.createOption(key));
    });
    linkBox.val(context.getConfigLink());
}

window.sourceConfigNodeChanged = function (e) {
    context.setConfigNode(e.value);
    isGraphInitialized = false;
    //update nodeID, node title, node weight
    const json = {
        configNode: e.value,
        nodeCount: context.getNodeCount()
    };

    sendSourceConfig(json);
    nodeConfigChanged();
    updateGraphTabState();
};

window.sourceConfigNodeIdChanged = function (e) {
    context.setConfigNodeId(e.value);
    isGraphInitialized = false;
    const json = {
        configNodeId: e.value
    };

    sendSourceConfig(json);
    updateGraphTabState();
};

window.sourceConfigLinkChanged = function (e) {
    context.setConfigLink(e.value);
    isGraphInitialized = false;
    const json = {
        configLink: e.value,
        linkCount: context.getLinkCount()
    };
    sendSourceConfig(json);
    linkConfigChanged();
};

function linkConfigChanged() {
    //update depending config comboboxes if link config changed..
}

window.sourceConfigNodeTitleChanged = function (e) {
    const title = e.value === "None" ? null : e.value;
    const json = {configNodeTitle: title};
    context.setConfigNodeTitle(title);
    sendSourceConfig(json);
    Simulation.refresh();
};

window.sourceConfigNodeWeightChanged = function (e) {
    const weight = e.value === "None" ? null : e.value;
    const json = {configNodeWeight: weight};
    context.setConfigNodeWeight(e.value);
    sendSourceConfig(json);
    isGraphInitialized = false;
};

function drawGraph() {

    if (rootGroup) {
        var transform = rootGroup.attr("transform")
    }

    isGraphInitialized = true;
    $("svg").empty();
    Simulation.reset();
    let graphContainer = $("#graph-container");

    let margin = {top: 20, right: 20, bottom: 20, left: 20};
    let width = graphContainer.width() - margin.left - margin.right;
    let height = graphContainer.height() - margin.top - margin.bottom;

    rootGroup = d3.select('svg')
        .attr("id", "graph-svg")
        .attr('background-color', 'red')
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", transform);

    ZoomPane.setElement(rootGroup);
    Graph.calcNodeWeights(context);


    let markerIDs = [];
    for (let i = 0; i <= 50; i++) {
        markerIDs[i] = i;
    }

    const defs = d3.select("#graph-svg").append("defs");

    defs.selectAll("marker")
        .data(markerIDs)
        .enter()
        .append("marker")
        .attr("id", (d) => {
            return "arrow" + d
        })
        .attr("viewBox", "0 0 10 10")
        .attr("refX", (d) => {
            return d
        })
        .attr("refY", 5)
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z");

    defs.selectAll('pattern')
        .data(context.getNodes().filter((node) => {
            return node['fill'] && Graph.isFillImage(node['fill']);
        }))
        .enter()
        .append('pattern')
        .attr('id', (node) => 'pattern' + node[context.getConfigNodeId()])
        .attr('x', "0%")
        .attr('y', "0%")
        .attr('height', "100%")
        .attr('width', "100%")
        .attr('viewBox', "0 0 512 512")
        .append('image')
        .attr('x', "0%")
        .attr('y', "0%")
        .attr('width', "512")
        .attr('height', "512")
        .attr('xlink:href', node => {
            return 'getImage?name=' + node.fill.substring(1, node.fill.length)
        });


    let nodeParents = rootGroup
        .selectAll("circle")
        .data(context.getNodes())
        .enter()
        .append("g")
        .attr("data-node-id", (node) => {
            return node[context.getConfigNodeId()];
        });

    let node = createNode(nodeParents);

    let link = rootGroup
        .selectAll("path")
        .data(context.getLinks())
        .enter()
        .append("path")
        .attr('class', 'link')
        .attr("marker-end", (link) => {
            //let r = parseInt($('#node-' + link.target.id).attr("r")) + 11;
            return "url(#arrow" + "10" + ")";
        })
        .attr("data-source", (link) => {
            return link.source;
        })
        .attr("data-target", (link) => {
            return link.target
        });


    let text = nodeParents
        .append("text")
        .attr("id", (d) => {
            return "node-text-" + d.id;
        })
        .text((d) => {
            return d[context.getConfigNodeTitle()]
        });
    d3.selectAll("g").raise();

    ReactDOM.render(
        <NodeBar context={context}/>, document.getElementById('nodes')
    );

    $('.node-checkbox').click(function () {
        const nodeId = $(this).parent().attr('data-node-id');
        const checked = $('.styled-checkbox[id=node-checkbox-' + nodeId + ']')[0].checked;
        hideNode(nodeId, checked);
    });


    function createNode(parent) {
        return parent
            .append("circle")
            .attr("nodeID", (node) => {
                return String(node[context.getConfigNodeId()]).replace(/\s/g, '');
            })
            .attr("r", (node) => {
                return node.weight;
            })
            .style("fill", (node) => {
                return Graph.getNodeFill(node, node[context.getConfigNodeId()]);
            })
            .style("stroke", (node) => {
                if (node['stroke-color']) {
                    return node['stroke-color'];
                }
            })
            .style("stroke-width", (node) => {
                if (node['stroke-width']) {
                    return node['stroke-width']
                }
            })
            .on("click", clickNode)
            .on("mouseover", handleMouseOver)
            .on("mouseout", handleMouseExit)
            .call(ZoomPane.nodeDragHandler)
    }


    function handleMouseOver(d, i) {
        const color = d3.color(d3.select(this).style('fill'));
        const nodeDOM = d3.select(this);
        beforeHoverNodeColor = color;
        if (color) {
            nodeDOM.style('fill', color.brighter(1));
        }
        nodeDOM.style('stroke-width', '4px')
    }

    function handleMouseExit(node, i) {

        const nodeDOM = d3.select(this);
        var width = '2px';
        if (node['stroke-width']) {
            width = node['stroke-width'] + 'px';
        }

        if (beforeHoverNodeColor) {
            nodeDOM.style('fill', beforeHoverNodeColor);
        }
        nodeDOM.style('stroke-width', width);
    }

    /*
    Sets colors of circles in navigation bar nodes
     */
    $('circle[nodeID]').each((i, e) => {
        let color = $(e).css('fill');
        let id = $(e).attr('nodeID');
        $('.circle[data-node-id=' + id + ']').each((i, k) => {
            $(k).css('background', color)
        });
    });


    /*
    Hovering events on nodes in navigation
     */
    $('[id=node]').hover(function () {
        let nodeId = $(this).attr('data-node-id');
        $('circle[nodeID=' + nodeId + ']').each((i, e) => {
            let color = d3.color(d3.select(e).style('fill'));
            color = color.brighter(1);
            $(e).css('stroke-width', '4px')
                .attr('fill', color);
        });
    }, function () {
        let nodeId = $(this).attr('data-node-id');
        $('circle[nodeID=' + nodeId + ']').each((i, e) => {
            let color = d3.color(d3.select(e).style('fill'));
            color = color.darker(1);
            $(e).css('stroke-width', '2px')
                .attr('fill', color);
        });
    });

    Simulation.setItems(context, node, link, text, width, height, Graph.getNodeColor);
    Simulation.bindSimulation();
}

window.addNode = function () {
    enableAddNodeMode();

    const keyEvent = event => {
        if (event.key === "Escape") {
            cancelNodeAddMode(keyEvent);
        }
    };
    document.addEventListener("keydown", keyEvent);

    d3.select('svg').on('click', () => {
        cancelNodeAddMode();

        const mouse = d3.mouse(rootGroup.node());
        const uuid = Util.uuidv4();
        const newNode = {};

        var id = context.getConfigNodeId();
        if (!id) {
            id = "ID";
        }

        newNode[id] = uuid;
        newNode[id] = uuid;
        newNode.x = mouse[0];
        newNode.y = mouse[1];
        context.getNodes().push(newNode);

        drawGraph();
        d3.select('svg').on('click', null)
    });
};


window.removeNode = function () {
    enableSelectNodeMode();
    $('#btn-toolbar-remove-node').popover('show');
    const keyEvent = event => {
        if (event.key === "Escape") {
            cancelNodeRemoveMode(keyEvent);
        }
    };
    document.addEventListener("keydown", keyEvent);

    d3.selectAll('circle').on('click', node => {
        $('#btn-toolbar-remove-node').popover('hide');
        const nodeId = node[context.getConfigNodeId()];
        context.getNodes().splice(node.index, 1);

        let indexes = [];
        $.each(context.getLinks(), (index, link) => {
            if (link.target.id === nodeId || link.source.id === nodeId) {
                indexes.push(index);
            }
        });

        indexes.reverse().forEach(index => {
            context.getLinks().splice(index, 1);
        });
        drawGraph();
    });
};

window.addLink = function () {
    enableSelectNodeMode();
    $('#btn-toolbar-add-link').popover({content: "Step 1: Click on the source node"}).popover('show');
    const keyEvent = event => {
        if (event.key === "Escape") {
            cancelNodeRemoveMode(keyEvent); //TODO name unpassend.. remove node..
            $('#btn-toolbar-add-link').popover('dispose');
            d3.selectAll('circle').on('click', null);
        }
    };
    document.addEventListener("keydown", keyEvent);

    d3.selectAll('circle').on('click', node => {
        let sourceNode = node;
        $('#btn-toolbar-add-link').popover('dispose');
        $('#btn-toolbar-add-link').popover({content: 'Step 2: Select the target node'}).popover('show');
        d3.selectAll('circle').on('click', node => {
            $('#btn-toolbar-add-link').popover('dispose');
            d3.selectAll('circle').on('click', null);
            context.getLinks().push({source: sourceNode, target: node});
            drawGraph();
        });
    });
};

window.removeLink = function () {
    enableSelectLinkMode();
    $('#btn-toolbar-remove-link').popover('show');
    const keyEvent = event => {
        if (event.key === "Escape") {
            stopSelectLinkMode();
        }
    };
    document.addEventListener("keydown", keyEvent);

    d3.selectAll('path').on('click', function (link) {
        context.getLinks().splice(link.index, 1);
        drawGraph();
        $('#btn-toolbar-remove-link').popover('hide');
        d3.selectAll('path').on('click', null);
    });
};

//TODO element to cross.. use one function and make element as paramter
function enableSelectNodeMode() {
    $('circle').css('cursor', 'crosshair');
}

function enableAddNodeMode() {
    $('svg').css('cursor', 'crosshair');
    $('#btn-toolbar-add-node').popover('show');
}

function cancelNodeAddMode(keyEvent) {
    $('svg').css('cursor', 'auto').unbind();
    document.removeEventListener("keydown", keyEvent);
    $('#btn-toolbar-add-node').popover('hide');
    d3.select('svg').on('click', null);
}

function cancelNodeRemoveMode(keyEvent) {
    $('circle').css('cursor', 'auto').unbind();
    document.removeEventListener("keydown", keyEvent);
    $('#btn-toolbar-remove-node').popover('hide');
    d3.selectAll('circle').on('click', clickNode);
}

function enableSelectLinkMode() {
    $('path').css('cursor', 'crosshair');
}

function stopSelectLinkMode() {
    $('path').css('cursor', 'auto');
    $('#btn-toolbar-remove-link').popover('hide');
     d3.selectAll('path').on('click', null);
}

function pulse() {
    $('#save-icon').fadeOut(1000).fadeIn(1000);
}

function startSaveAnimation() {
    $('#save-icon').css("color", "#00AAFF").css('visibility', 'visible');
    return setInterval(pulse, 1000);
}

function stopSaveAnimation(animation, success) {
    clearInterval(animation);
    const color = success ? "green" : "red";
    const time = success ? 2000 : 5000;
    $("#save-icon").animate({
        color: color
    }, time, function () {
        $('#save-icon').css('visibility', 'hidden');
    });
}

window.saveGraph = function (overwrite) {
    const animation = startSaveAnimation();
    const json = {
        source: context.getName(),
        sourceOwner: context.isShared() ? context.getSharedBy() : null,
        graphData: context.getCompressedData(),
        lastModified: context.getLastModifiedDate(),
        overwrite: overwrite
    };

    $.ajax('/saveGraph', {
        data: JSON.stringify(json),
        contentType: 'application/json',
        type: 'POST',
    })
        .done((data) => {
            stopSaveAnimation(animation, data.success);
            context.setLastModifiedDate(data.lastModified);
            if (data === "overwrite required") {
                showSourceOverwriteNotification();
            }
        }).fail((jqXHR, textStatus, errorThrown) => {
        stopSaveAnimation(animation, false);
        Util.showAlert('graph', textStatus);
    });
};

function isValidJSON(json) {
    try {
        JSON.parse(json);
        return true
    } catch (e) {
    }
    return false;
}


function parseCSV(csv) {
    const result = Papa.parse(csv, {header: true});
    return {"Nodes": result.data};
}


function clickNode(node) {
    nodeInfo.setNode(node);
    $('#info-tab').tab('show');
    //showNodeContent(d);
}

/*
Opens overlay and shows content of node
 */
function showNodeContent(node) {
    //TODO: Wenn zu weit rechts geklickt wird,
    //TODO: geht der Overlay zu weit raus..
    $('#overlay').show(200)
        .css("left", d3.event.x + 20 + "px")
        .css("top", d3.event.y + 20 + "px");

    $("#card-header").text(node.country);
    $("#card-title").text("Projects where participant: " + node.count);
}


/*
"Select All" button in nodes navigation
 */
window.selectAllNodes = function (select) {
    $('.node-input-checkbox').each(function () {
        let nodeID = $(this).parent().attr('data-node-id');
        hideNode(nodeID, !select);
        $(this).prop('checked', select);
    });
};

function hideNode(nodeid, hide) {
    //TODO die source target nur anzeigen, wenn BEIDE nodes angezeigt werden
    let nodeG = $('g[data-node-id="' + nodeid + '"]');
    let source = $('path[data-source="' + nodeid + '"]');
    let target = $('path[data-target="' + nodeid + '"]');
    if (hide) {
        nodeG.hide();
        source.hide();
        target.hide();
    } else {
        nodeG.show();
        source.show();
        target.show();
    }
}

window.addSourceWindowOnChange = function () {
    const name = $('#create-source-name').val();

    var disable = false;
    if (Util.isTabActive('#nav-link-from-scratch')) {
        disable = false;
    } else if (Util.isTabActive('#nav-link-from-file')) {
        disable = $('#create-source-file-button')[0].files.length === 0;
    } else if (Util.isTabActive('#nav-link-from-text')) {
        const source = $('#create-source-area').val();
        disable = source.trim() === "";
    }

    disable = (name.trim() === "") || disable;
    $('#create-source-create-btn').prop("disabled", disable)
};

window.createSource = function () {

    const name = $('#create-source-name').val().trim();
    const desc = $('#create-source-description').val().trim();

    // if (!isValidJSON(data)) { //TODO zerstört das json
    //     data = JSON.stringify(parseCSV(data));
    //     //TODO Wenn kein CSV, dann XML testen.
    // }

    if (Util.isTabActive('#nav-link-from-scratch')) {
        const data = JSON.stringify(FROM_SCRATCH);
        postGraph(name, desc, data);
    } else if (Util.isTabActive('#nav-link-from-file')) {
        const fileReader = new FileReader();
        fileReader.readAsText($('#create-source-file-button').prop('files')[0]);
        fileReader.onload = function () {
            const data = fileReader.result;
            postGraph(name, desc, data);
        }
    } else if (Util.isTabActive('#nav-link-from-text')) {
        const data = $('#create-source-area').val().trim();
        postGraph(name, desc, data);
    }
};

function postGraph(name, desc, data) {
    data = data.replace(/\r?\n|\r/g, "");
    const json = {
        source:
            {
                name: name,
                description: desc,
                lastModified: new Date().getTime(),
                sharedUsers: [],
                data: data,
                configNode: "",
                configLink: ""
            }
    };

    Util.postJSON('/createSource', json).fail(msg => {
        Util.showAlert('create-source', msg);
    }).done(msg => {
        if (msg) {
            return Util.showAlert('create-source', msg);
        }
        $('#add-source-box').modal('hide');
    });

    Sources.postActiveSource(name)
}

// var force = d3.layout.force()
//     .gravity(.05)
//     .distance(100)
//     .charge(-100)
//     .size([width, height]);

window.setLinkLineType = function (e) {
    const config = {configLinkLineType: e.value};
    sendSourceConfig(config);
    Simulation.refresh();
};

function sendSourceConfig(config) {
    const data = {sourceConfig: config};
    Util.postJSON('/setSourceConfig', data);
}

$('#sources-tab').tab('show');
$('#node-settings-tab').tab('show');


window.setNodeColorPalette = function (e) {

    const palette = $('#nodeColorPalettes').val();
    Graph.setPalette(palette);


    d3.selectAll('circle').data().forEach(node => {
        node['fill'] = Graph.getNodeColor(node);
    });
    d3.selectAll('circle').style('fill', (node) => {
        return Graph.getNodeColor(node)
    });

    $('svg circle').each((index, node) => {
        const nodeId = parseInt(node.getAttribute('nodeID'));
        node.style.fill = Graph.getNodeColor(context.getNode(nodeId));
    });

    const config = {nodeColorPalette: palette};
    sendSourceConfig(config);
};

window.setNodesStrokeWidth = function () {
    const value = $('#txtBox-node-stroke-width').val();
    Graph.setNodeStrokeWidth(d3.selectAll('circle'), value);
};


window.setNodeStrokeWidth = function () {
    d3.selectAll('circle').on('click', function (node) {
        const value = $('#txtBox-node-stroke-width').val();
        Graph.setNodeStrokeWidth(d3.select(this), value);
        d3.selectAll('circle').on('click', clickNode)
    });
};

window.setNodeColor = function () {
    d3.selectAll('circle').on('click', function (node) {
        beforeHoverNodeColor = null;
        const value = $('#node-colorBox').val();
        Graph.setNodeColor(d3.select(this), value);
        d3.selectAll('circle').on('click', clickNode)
    });
};

window.setNodesColor = function () {
    const value = $('#node-colorBox').val();
    Graph.setNodeColor(d3.selectAll('circle'), value);
};

window.setNodeStrokeColor = function () {
    d3.selectAll('circle').on('click', function (node) {
        const value = $('#txtBox-node-stroke-color').val();
        Graph.setNodeStrokeColor(d3.select(this), value);
        d3.selectAll('circle').on('click', clickNode)
    });
};

window.setNodesStrokeColor = function () {
    const value = $('#txtBox-node-stroke-color').val();
    Graph.setNodeStrokeColor(d3.selectAll('circle'), value);
};

window.setLinksColor = function () {
    const value = $('#txtBox-link-color').val();
    Graph.setLinkColor(d3.selectAll('path'), value);
};

window.setLinkColor = function () {
    d3.selectAll('path').on('click', function (link) {
        const value = $('#txtBox-link-color').val();
        Graph.setLinkColor(d3.select(this), value);
        d3.selectAll('path').on('click', null)
    });
};

window.setLinksWidth = function () {
    const value = $('#txtBox-link-width').val();
    Graph.setLinkWidth(d3.selectAll('path'), value);
};

window.setLinkWidth = function () {
    d3.selectAll('path').on('click', function (link) {
        const value = $('#txtBox-link-width').val();
        Graph.setLinkWidth(d3.select(this), value);
        d3.selectAll('path').on('click', null)
    });
};


window.setNodeImage = function () {
    d3.selectAll('circle').on('click', function (node) {
        const value = $('#nodeImageComboBox').val();
        Graph.setNodeImage(d3.select(this), value);
        d3.selectAll('circle').on('click', clickNode)
    });
};

window.setNodesImage = function () {
    const value = $('#nodeImageComboBox').val();
    Graph.setNodeImage(d3.selectAll('circle'), value);
};

window.resetGraph = function () {
    context = new GraphContext(context.getSource(), context.getOrigin());
    drawGraph();
};

window.saveImage = function () {

    const fileReader = new FileReader();
    fileReader.onload = function () {
        const data = fileReader.result.split(',')[1];
        const name = $('#add-image-name').val();

        const json = {name: name, image: data};
        Util.postJSON('/addImage', json).done(msg => {
            if (msg) {
                return Util.showAlert('create-image', msg);
            }
            $('#addImageWindow').modal('hide');
        });
    };
    fileReader.readAsDataURL($('#fileChooser-addImage').prop('files')[0]);

};

function setSourceNameInHeader(sourceName) {
    $('#header-source-name').text(sourceName.substring(0, 25));
}

function showSourceChangedNotification() {
    return $.notify({
        icon: 'fa fa-sync',
        title: 'Source changed',
        message: 'Fetch an update? Your current changes will be lost.',

    }, {
        type: 'minimalist',
        delay: 0,
        allow_dismiss: false,
        placement: {
            from: "bottom",
            align: "right"
        },
        template:
            '<div data-notify="container" class="col-xs-11 col-sm-3 alert alert-{0}" role="alert">' +
            '<i data-notify="icon" class="img-circle pull-left" />' +
            '<span data-notify="title">{1}</span>' +
            '<span data-notify="message">{2}</span>' +
            '<div data-notify="buttons"><button type="button" class="btn btn-primary" onclick="fetchSource()">Update</button>' +
            '<button id="dismiss-button" type="button" class="btn btn-danger" data-notify="dismiss">Dismiss</button>' +
            '<button type="button" class="btn btn-danger" onclick="closeNotify()">Dismiss</button></div>' +
            '</div>'
    });
}

function showSourceOverwriteNotification() {
    return $.notify({
        icon: 'fa fa-exclamation-triangle',
        title: 'Overwrite Source',
        message: 'There is already a newer version of the source.' +
            ' Are you sure you want to overwrite the current version? ' +
            'The version on the server will be lost. Overwrite?',

    }, {
        type: 'minimalist',
        delay: 0,
        allow_dismiss: false,
        placement: {
            from: "bottom",
            align: "right"
        },
        template:
            '<div data-notify="container" class="col-xs-11 col-sm-3 alert alert-{0}" role="alert">' +
            '<i data-notify="icon" class="img-circle pull-left" />' +
            '<span data-notify="title">{1}</span>' +
            '<span data-notify="message">{2}</span>' +
            '<div data-notify="buttons">' +
            '<button type="button" class="btn btn-warning" onclick="overwriteSource()">Overwrite</button>' +
            '<button type="button" class="btn btn-success" onclick="fetchSource()">Update</button>' +
            '<button id="dismiss-button" type="button" class="btn btn-light" data-notify="dismiss">Dismiss</button>' +
            '<button type="button" class="btn btn-light" onclick="closeNotify()">Dismiss</button>' +
            '</div>' +
            '</div>'
    });
}

window.overwriteSource = function () {
    saveGraph(true);
    $('#dismiss-button').click();
};

window.fetchSource = function () {
    loadSource(context.getName(), context.getSharedBy());
    $('#dismiss-button').click();
};

window.closeNotify = function () {
    $("#dismiss-button").click();
};

window.validateImageUpload = function () {
    const valid = $('#imageUploadForm')[0].checkValidity();
    $('#btnUploadImage').attr('disabled', !valid);
};