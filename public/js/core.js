var context = null;
var isGraphInitialized = false;
var socket = io.connect();
var userData;
var svgG;
const forbiddenNodeVars = ["id", "x", "y", "vx", "vy", "index"];
const defaultNodeWeight = 20;
const minNodeWeight = 5;
const maxNodeWeight = 50;
const none = "None";
const zoom = d3.zoom();

var nodeMap = {};

var nodeColors = createPalette(d3.interpolateBrBG);

function setActiveSource() {
    $.getJSON("/getUserData", function (data) {
        userData = data;
        updateLogoutText(data); //TODO warum wird hier eigl der name gesetzt bei jeder source änderung? müsste beim einloggen passieren
        $.get("/getSources", (data) => {
            data.forEach((source) => {
                //TODO Nur die sources datas laden, die auch gebraucht werden.. traffic!
                if (source.name === userData.activeSource) {
                    $('#header-source-name').text(source.name.substring(0, 25));
                    const data = JSON.parse(source.data);
                    setContext(source, data);
                    if (IsGraphTabVisible()) {
                        drawGraph();
                    }
                }
            });
        });
    });
}

$(document).ready(() => {
        document.onkeydown = function (e) {
            if (e.ctrlKey && e.key == "s") {
                saveGraph();
                return false;
            } else if (e.key == "f") {
                zoomFit(0.95, 500);
                return false;
            }
        };
        setActiveSource();
        ReactDOM.render(
            <SourcesReact/>, document.getElementById('sources-container')
        );
        ReactDOM.render(
            <NodeInfo ref={(nodeInfo) => {
                window.nodeInfo = nodeInfo
            }}/>, document.getElementById('info-container')
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
                    <DataTable/>, document.getElementById('data-table-container')
                );

                $('html, body').css("overflow-y", "scroll");
            } else if (activatedTab === "sources-tab") {
                $('html, body').css("overflow-y", "scroll");
            }
        });

        /*
        Settgings: Force slider
         */
        const manybodySlider = document.getElementById("slider-manybody");
        manybodySlider.oninput = function () {
            $('#value-manybody').text(this.value);
        };

        const forceLinkSlider = document.getElementById("slider-linkforce");
        forceLinkSlider.oninput = function () {
            $('#value-linkforce').text(this.value);
            SIM.linkforce();
        };


        d3.select('svg').call(
            zoom.scaleExtent([0, 10])
                .on("zoom", zoomed));
    }
);

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
    if (!context.getConfigNode() || !context.getConfigNodeId()) {
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
        nodeBox.append(createOption(key));
    });
    nodeBox.val(context.getConfigNode());
}

function updateNodeIDconfigBox() {
    const nodeIDBox = $('#sourceConfigDropBoxNodeID');
    nodeIDBox.empty();
    if (context.getConfigNode()) {
        Object.keys(context.getNodes()[0]).forEach((key) => { //TODO nur wenn node/links angeben sind.. graph nur anzeigenn wenn nodes/links defined?
            nodeIDBox.append(createOption(key));
        });
    }
    nodeIDBox.val(context.getConfigNodeId());
}

function updateNodeTitleConfigBox() {
    const titleBox = $('#sourceConfigDropBoxNodeTitle');
    titleBox.empty();
    titleBox.append(createOption(none));
    if (context.getConfigNode()) {
        Object.keys(context.getNodes()[0]).forEach((key) => {
            titleBox.append(createOption(key));
        });
    }
    titleBox.val(context.getConfigNodeTitle());
}

function updateNodeWeightConfigBox() {
    const weightBox = $('#sourceConfigDropBoxNodeWeight');
    weightBox.empty();
    weightBox.append(createOption(none));
    if (context.getConfigNode()) {
        Object.keys(context.getNodes()[0]).forEach((key) => {
            weightBox.append(createOption(key));
        });
    }
    weightBox.val(context.getConfigNodeWeight());
}

function updateLinkConfigBox() {
    const linkBox = $('#sourceConfigDropBoxLinks');
    linkBox.empty();
    Object.keys(context.getData()).forEach((key) => {
        linkBox.append(createOption(key));
    });
    linkBox.val(context.getConfigLink());
}

function sourceConfigNodeChanged(e) {
    context.setConfigNode(e.value);
    isGraphInitialized = false;
    //update nodeID, node title, node weight
    const json = {
        sourceConfig:
            {
                configNode: e.value,
                nodeCount: context.getNodeCount()
            }
    };

    postJSON('/setSourceConfig', json);
    nodeConfigChanged();
    updateGraphTabState();
}

function sourceConfigNodeIdChanged(e) {
    context.setConfigNodeId(e.value);
    isGraphInitialized = false;
    const json = {sourceConfig: {configNodeId: e.value}};
    postJSON('/setSourceConfig', json);
    updateGraphTabState();
}

function sourceConfigLinkChanged(e) {
    context.setConfigLink(e.value);
    isGraphInitialized = false;
    const json = {
        sourceConfig:
            {
                configLink: e.value,
                linkCount: context.getLinkCount()
            }
    };
    postJSON('/setSourceConfig', json);
    linkConfigChanged();
}

function linkConfigChanged() {
    //update depending config comboboxes if link config changed..
}

function sourceConfigNodeTitleChanged(e) {
    const title = e.value === "None" ? null : e.value;
    const json = {sourceConfig: {configNodeTitle: title}};
    context.setConfigNodeTitle(title);
    postJSON('/setSourceConfig', json);
    SIM.refresh();
}

function sourceConfigNodeWeightChanged(e) {
    const weight = e.value === "None" ? null : e.value;
    const json = {sourceConfig: {configNodeWeight: weight}};
    context.setConfigNodeWeight(e.value);
    postJSON('/setSourceConfig', json);
    isGraphInitialized = false;
}

function drawGraph() {

    if (svgG) {
        var transform = svgG.attr("transform")
    }

    isGraphInitialized = true;
    $("svg").empty();
    SIM.reset();
    let graphContainer = $("#graph-container");

    let margin = {top: 20, right: 20, bottom: 20, left: 20};
    let width = graphContainer.width() - margin.left - margin.right;
    let height = graphContainer.height() - margin.top - margin.bottom;

    svgG = d3.select('svg')
        .attr("id", "graph-svg")
        .attr('background-color', 'red')
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", transform);

    calcNodeWeights(context);


    let markerIDs = [];
    for (let i = 0; i <= 50; i++) {
        markerIDs[i] = i;
    }

    d3.select("#graph-svg").append("defs").selectAll("marker")
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


    let nodeParents = svgG
        .selectAll("circle")
        .data(context.getNodes())
        .enter()
        .append("g")
        .attr("data-node-id", (node) => {
            return node[context.getConfigNodeId()];
        });


    let node = createNode(nodeParents);

    nodeMap = {};
    node.each((node) => {
        nodeMap[node.id] = $('circle[nodeID=' + node.id + ']');
    });

    let link = svgG
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
        <NodeBar/>, document.getElementById('nodes')
    );

    $('.node-checkbox').click(function () {
        let nodeid = $(this).parent().attr('data-node-id');
        let checked = $('.styled-checkbox[id=node-checkbox-' + nodeid + ']')[0].checked;

        hideNode(nodeid, checked);
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
                return getNodeColor(node)
            })
            .on("click", clickNode)
            .on("mouseover", handleMouseOver)
            .on("mouseout", handleMouseExit)
            .call(nodeDragHandler)
    }


    function handleMouseOver(d, i) {
        let color = d3.color(d3.select(this).style('fill'));
        color = color.brighter(1);
        d3.select(this)
            .style('stroke-width', '4px')
            .style('fill', color);
    }

    function handleMouseExit(node, i) {
        d3.select(this)
            .style('stroke-width', '2px')
            .style('fill', getNodeColor(node));
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

    SIM.setItems(context, node, link, text, width, height);
    SIM.bindSimulation();
}

function addNode() {
    $('#graph-container').css('cursor', 'crosshair');

    const keyEvent = function (e) {
        if (e.key === "Escape") {
            cancelNodeAddMode(keyEvent);
        }
    };
    document.addEventListener("keydown", keyEvent);

    d3.select('svg').on('click', function () {
        cancelNodeAddMode();

        const mouse = d3.mouse(svgG.node());
        const uuid = uuidv4();
        const newNode =
            {
                x: mouse[0],
                y: mouse[1]
            };

        newNode[context.getConfigNodeId()] = uuid;
        newNode[context.getConfigNodeTitle()] = uuid;
        context.getNodes().push(newNode);

        drawGraph();
        d3.select('svg').on('click', null)
    });


}

function cancelNodeAddMode(keyevent) {
    $('#graph-container').css('cursor', 'auto').unbind();
    document.removeEventListener("keydown", keyevent)
}

function removeNode() {
    enableSelectCircleMode();
    const keyEvent = function (e) {
        if (e.key === "Escape") {
            cancelNodeRemoveMode(keyEvent);
        }
    };
    document.addEventListener("keydown", keyEvent);

    d3.selectAll('circle').on('click', function (node) {

        const nodeId = node[context.getConfigNodeId()];
        context.getNodes().splice(node.index, 1);

        let indexes = [];
        $.each(context.getLinks(), function (index, link) {
            if (link.target.id === nodeId || link.source.id === nodeId) {
                indexes.push(index);
            }
        });

        indexes.reverse().forEach(index => {
            context.getLinks().splice(index, 1);
        });
        drawGraph();
    });
}

function addLink() {
    enableSelectCircleMode();
    const keyEvent = function (e) {
        if (e.key === "Escape") {
            cancelNodeRemoveMode(keyEvent); //TODO name unpassend.. remove node..
        }
    };
    document.addEventListener("keydown", keyEvent);

    d3.selectAll('circle').on('click', function (node) {
        let sourceNode = node;

        d3.selectAll('circle').on('click', function (node) {

            context.getLinks().push({source: sourceNode, target: node});
            drawGraph();
        });
    });


}

function enableSelectCircleMode() {
    $('circle').css('cursor', 'crosshair');
}

function cancelNodeRemoveMode(keyEvent) {
    $('circle').css('cursor', 'auto').unbind();
    document.removeEventListener("keydown", keyEvent)
}


function pulse() {
    $('#save-icon').fadeOut(1000).fadeIn(1000);
}

function startSaveAnimation() {
    $('#save-icon').css("color", "#00AAFF").show();
    return setInterval(pulse, 1000);
}

function stopSaveAnimation(animation, success) {
    clearInterval(animation);
    const color = success ? "green" : "red";
    const time = success ? 2000 : 5000;
    $("#save-icon").animate({
        color: color
    }, time, function () {
        $('#save-icon').hide();
    });
}

function saveGraph() {
    const animation = startSaveAnimation();
    const json = {source: userData.activeSource, graphData: context.getData()};

    $.ajax('/setGraphData', {
        data: JSON.stringify(json),
        contentType: 'application/json',
        type: 'POST',
    })
        .done((data) => {
            stopSaveAnimation(animation, true);
        }).fail((jqXHR, textStatus, errorThrown) => {
        stopSaveAnimation(animation, false);
        showGraphAlert(textStatus);
    });
}

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
    const json = {"Nodes": result.data};
    return json;
}


function clickNode(node) {
    nodeInfo.setNode(node);
    $('#info-tab').tab('show');
    //showNodeContent(d);
}

function getNodeColor(node) {
    if (node.weight) {
        return nodeColors(node.weight)
    }
    return nodeColors(defaultNodeWeight);
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
function selectAllNodes(select) {
    $('.node-input-checkbox').each(function () {
        let nodeID = $(this).parent().attr('data-node-id');
        hideNode(nodeID, !select);
        $(this).prop('checked', select);
    });
}

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


function createSource() {

    const name = $('#create-source-name').val().trim();
    const desc = $('#create-source-description').val().trim();
    let data = $('#create-source-area').val().trim();

    if (!isValidJSON(data)) {
        data = JSON.stringify(parseCSV(data));
        //TODO Wenn kein CSV, dann XML testen.
    }

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

    postJSON('/createSource', json);
    closeAddSourceWindow();
    SourcesReact.setActiveSource(name)
}


function addSourceWindowOnChange() {
    const name = $('#create-source-name').val();
    const source = $('#create-source-area').val();

    const disable = (name.trim() === "") || (source.trim() === "");
    $('#create-source-create-btn').prop("disabled", disable)
}

function formatDate(date) {
    return date.toLocaleDateString("de-de", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

// var force = d3.layout.force()
//     .gravity(.05)
//     .distance(100)
//     .charge(-100)
//     .size([width, height]);

function postJSON(url, json) {
    $.ajax(url, {
        data: JSON.stringify(json),
        contentType: 'application/json',
        type: 'POST',
    });
}

function showAddSourceWindow() {
    $('#add-source-box').show("clip", 100);
    $('#page-mask').show("clip", 100);
}

function closeAddSourceWindow() {
    $('#add-source-box').hide("clip", 100);
    $('#page-mask').hide("clip", 100)
}


function setLinkLineType(e) {
    const config = {configLinkLineType: e.value};
    sendSourceConfig(config);
    SIM.refresh();
}

function sendSourceConfig(config) {
    const data = {sourceConfig: config};
    postJSON('/setSourceConfig', data);
}


function createPalette(palette) {
    return d3.scaleSequential()
        .domain([minNodeWeight, maxNodeWeight])
        .interpolator(palette);
}

$('#sources-tab').tab('show');
$('#node-settings-tab').tab('show');


function setNodeColorPalette(e) {
    const palette = e.value ? e.value : e;

    switch (palette) {
        case "BrBg":
            nodeColors = createPalette(d3.interpolateBrBG);
            break;
        case "PRGn":
            nodeColors = createPalette(d3.interpolatePRGn);
            break;
        case "PiYG":
            nodeColors = createPalette(d3.interpolatePiYG);
            break;
        case "PuoR":
            nodeColors = createPalette(d3.interpolatePuOr);
            break;
        case "RdBu":
            nodeColors = createPalette(d3.interpolateRdBu);
            break;
        case "RdYIBu":
            nodeColors = createPalette(d3.interpolateRdYlBu);
            break;
        case "Spectral":
            nodeColors = createPalette(d3.interpolateSpectral);
            break;
        case "Blues":
            nodeColors = createPalette(d3.interpolateBlues);
            break;
        case "Greens":
            nodeColors = createPalette(d3.interpolateGreens);
            break;
        case "Oranges":
            nodeColors = createPalette(d3.interpolateOranges);
            break;
        case "Reds":
            nodeColors = createPalette(d3.interpolateReds);
            break;
        case "Purples":
            nodeColors = createPalette(d3.interpolatePurples);
            break;
        case "Viridis":
            nodeColors = createPalette(d3.interpolateViridis);
            break;
        case "Inferno":
            nodeColors = createPalette(d3.interpolateInferno);
            break;
        case "Warm":
            nodeColors = createPalette(d3.interpolateWarm);
            break;
        case "Cool":
            nodeColors = createPalette(d3.interpolateCool);
            break;
        case "Rainbow":
            nodeColors = createPalette(d3.interpolateRainbow);
            break;
        case "Sinebow":
            nodeColors = createPalette(d3.interpolateSinebow);
            break;
    }

    $('svg circle').each((index, node) => {
        const nodeId = parseInt(node.getAttribute('nodeID'));
        node.style.fill = getNodeColor(context.getNode(nodeId));
    });

    const config = {nodeColorPalette: palette};
    sendSourceConfig(config);
}

function getGraphNodeById(id) {
    return nodeMap[id];
}

function createOption(option) {
    return "<option>" + option + "</option>";
}

//TODO: Unite with login-message
function showGraphAlert(message) {
    let control = $('#graph-message');
    $('#graph-alert').addClass('show');
    control.text(message);
}

//TODO: Unite with login-message
function hideAlert() {
    $('#graph-alert').removeClass('show')
}

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}

function isFloat(n) {
    return Number(n) === n && n % 1 !== 0;
}