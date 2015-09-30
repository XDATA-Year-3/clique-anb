/*jshint browser: true, jquery: true */
/*global clique, _, tangelo, d3, PEG */

$(function () {
    "use strict";

    var parser,
        removeAlert,
        createAlert,
        cfg;

    $("#add-clause").on("show.bs.modal", function () {
        var emptyQuery,
            secondary;

        // If the query string is currently empty, then remove the logical
        // connective from the UI.
        emptyQuery = _.size($("#query-string").val().trim()) === 0;
        d3.select("#clause-type")
            .style("display", emptyQuery ? "none" : null);

        // Query the database for all available field names, and construct an
        // autocomplete menu from them.
        $.getJSON("assets/tangelo/anb/get_fieldnames", {
            host: cfg.host,
            db: cfg.database,
            coll: cfg.collection
        }).then(function (fields) {
            $("#fieldname").autocomplete({
                source: fields,
                minLength: 0
            }).focus(function () {
                $(this).autocomplete("search", $(this).val());
            });
        });

        // This function extracts the field name from the appropriate place - it
        // winds up in different locations for different triggering events.
        secondary = _.debounce(function (evt, ui) {
            var field;

            if (ui) {
                field = ui.item.value;
            } else {
                field = $("#fieldname").val();
            }

            field = field.trim();
            if (field !== "") {
                // Pass the field name to the value service in order to get a
                // list of possible values.
                $.getJSON("assets/tangelo/anb/get_values", {
                    host: cfg.host,
                    db: cfg.database,
                    coll: cfg.collection,
                    field: field
                }).then(function (values) {
                    $("#value").autocomplete({
                        source: values,
                        minLength: 0
                    }).focus(function () {
                        var $this = $(this);

                        if ($this.data("ui-autocomplete")) {
                            $(this).autocomplete("search", $(this).val());
                        }
                    });
                });
            } else {
                $("#value").autocomplete("destroy");
            }
        }, 200);

        // Trigger the secondary autocomplete population on both manual typing
        // and selecting a choice from the primary autocomplete menu.
        $("#fieldname").on("input", secondary);
        $("#fieldname").on("autocompleteselect", secondary);
    });

    removeAlert = function (selector) {
        d3.select(selector)
            .selectAll(".alert.alert-danger")
            .remove();
    };

    createAlert = function (selector, message) {
        d3.select(selector)
            .append("div")
            .classed("alert", true)
            .classed("alert-danger", true)
            .classed("alert-dismissible", true)
            .classed("fade", true)
            .classed("in", true)
            .html("<a class=\"close\" data-dismiss=\"alert\">&times;</a>" + message);
    };

    $("#add").on("click", function () {
        var query = $("#query-string").val(),
            clause = $("#clause-type select").val(),
            field = $("#fieldname").val(),
            op = $("#operator").val(),
            value = $("#value").val();

        removeAlert("#errors");

        if (_.size(query.trim()) > 0 && clause === "Clause type") {
            createAlert("#errors", "You must specify a <strong>clause type</strong>!");
            return;
        }

        if (field === "") {
            createAlert("#errors", "You must specify a <strong>field name</strong>!");
            return;
        }

        if (op === "Operator") {
            createAlert("#errors", "You must specify an <strong>operator</strong>!");
            return;
        }

        switch (clause) {
        case "AND": {
            query += " & ";
            break;
        }

        case "OR": {
            query += " | ";
            break;
        }

        case "Clause type": {
            break;
        }

        default: {
            throw new Error("Impossible");
        }
        }

        query += [field, op, "\"" + value + "\""].join(" ");

        $("#query-string").val(query);
        $("#add-clause").modal("hide");
    });

    var launch = function (_cfg) {
        var graph,
            view,
            info,
            linkInfo,
            colormap;

        cfg = _cfg;

        window.graph = graph = new clique.Graph({
            adapter: tangelo.getPlugin("mongo").Mongo({
                host: cfg.host || "localhost",
                database: cfg.database,
                collection: cfg.collection
            })
        });

        $.getJSON("assets/tangelo/anb/get_filenames", {
            host: cfg.host,
            db: cfg.database,
            coll: cfg.collection
        }).then(function (filenames) {
            $("#filename").autocomplete({
                source: filenames,
                minLength: 0
            }).focus(function () {
                $(this).autocomplete("search", $(this).val());
            });
        });

        (function () {
            var request = null,
                action;

            action = _.debounce(function () {
                var filename = $("#filename").val();

                if (request) {
                    request.abort();
                }

                request = $.getJSON("assets/tangelo/anb/get_nodes", {
                    host: cfg.host,
                    db: cfg.database,
                    coll: cfg.collection,
                    filename: filename
                }).then(function (nodes) {
                    request = null;

                    $("#label").autocomplete({
                        source: nodes,
                        minLength: 0
                    }).focus(function () {
                        $(this).autocomplete("search", $(this).val());
                    });
                });
            }, 300);

            $("#filename").on("input", action);
            $("#filename").on("autocompleteselect", action);
        }());

        $("#submit").on("click", function () {
            var label = $("#label").val().trim(),
                filename = $("#filename").val().trim(),
                spec = {},
                delsearch = $("#delsearch").prop("checked");

            if (label === "" && filename === "") {
                return;
            }

            spec = {
                logicOp: "and",
                left: {
                    queryOp: "==",
                    field: "filename",
                    value: filename
                },
                right: {
                    queryOp: "==",
                    field: "label",
                    value: label
                }
            };

            graph.adapter.findNode(spec)
                .then(function (center) {
                    if (center) {
                        graph.addNode(center);
                    }
                });
        });

        $("#submit-adv").on("click", function () {
            var query = $("#query-string").val().trim(),
                errMsg,
                spec;

            // Remove any existing syntax error alert.
            removeAlert("#syntaxerror");

            // Bail if there's no query.
            if (query === "") {
                return;
            }

            // Attempt to parse the string.
            try {
                spec = parser.parse(query);
            } catch (e) {
                errMsg = "line " + e.location.start.line + ", column " + e.location.start.column + ": " + e.message;
                createAlert("#syntaxerror", "<h4>Syntax error</h4> " + errMsg);
                return;
            }

            graph.adapter.findNodes(spec)
                .then(function (nodes) {
                    _.each(nodes, function (node) {
                        graph.addNode(node);
                    });
                });
        });

        colormap = d3.scale.category10();
        window.view = view = new clique.view.Cola({
            model: graph,
            el: "#content",
            fill: function (d) {
                return colormap((d.data || {}).type || "no type");
            },
            nodeRadius: function (d, r) {
                return d.data && d.data.grouped ? 2*r : r;
            },
            postLinkAdd: function (s) {
                s.style("stroke-dasharray", function (d) {
                    return d.data && d.data.grouping ? "5,5" : "none";
                });
            },
            transitionTime: 500,
            focusColor: "pink",
            rootColor: "gold"
        });

        window.info = info = new clique.view.SelectionInfo({
            model: view.selection,
            el: "#info",
            graph: graph,
            nodeButtons: [
                {
                    label: "Hide",
                    color: "purple",
                    icon: "eye-close",
                    callback: function (node) {
                        _.bind(clique.view.SelectionInfo.hideNode, this)(node);
                    }
                },
                {
                    label: function (node) {
                        return node.getData("deleted") ? "Undelete" : "Delete";
                    },
                    color: "red",
                    icon: "remove",
                    callback: function (node) {
                        _.bind(clique.view.SelectionInfo.deleteNode, this)(node);
                    }
                },
                {
                    label: "Ungroup",
                    color: "blue",
                    icon: "scissors",
                    callback: function (node) {
                        this.graph.adapter.findLinks({
                            source: node.key(),
                            grouping: true
                        }).then(_.bind(function (links) {
                            this.hideNode(node);
                            this.graph.adapter.destroyNode(node.key());

                            _.each(links, _.bind(function (link) {
                                this.graph.adapter.findNodeByKey(link.getTransient("target"))
                                    .then(_.bind(function (child) {
                                        child.clearData("deleted");
                                        this.graph.adapter.once("cleared:" + child.key(), _.bind(function () {
                                            this.model.add(child.key());
                                            this.graph.addNode(child);
                                        }, this));
                                    }, this));
                            }, this));
                        }, this));
                    },
                    show: function (node) {
                        return node.getData("grouped");
                    }
                },
                {
                    label: "Expand",
                    color: "blue",
                    icon: "fullscreen",
                    callback: function (node) {
                        _.bind(clique.view.SelectionInfo.expandNode, this)(node);
                    }
                },
                {
                    label: "Collapse",
                    color: "blue",
                    icon: "resize-small",
                    callback: function (node) {
                        _.bind(clique.view.SelectionInfo.collapseNode, this)(node);
                    }
                }
            ],
            selectionButtons: [
                {
                    label: "Hide",
                    color: "purple",
                    icon: "eye-close",
                    repeat: true,
                    callback: function (node) {
                        _.bind(clique.view.SelectionInfo.hideNode, this)(node);
                    }
                },
                {
                    label: "Delete",
                    color: "red",
                    icon: "remove",
                    repeat: true,
                    callback: function (node) {
                        return _.bind(clique.view.SelectionInfo.deleteNode, this)(node);
                    }
                },
                {
                    label: "Expand",
                    color: "blue",
                    icon: "fullscreen",
                    repeat: true,
                    callback: function (node) {
                        _.bind(clique.view.SelectionInfo.expandNode, this)(node);
                    }
                },
                {
                    label: "Collapse",
                    color: "blue",
                    icon: "resize-small",
                    repeat: true,
                    callback: function (node) {
                        _.bind(clique.view.SelectionInfo.collapseNode, this)(node);
                    }
                },
                {
                    label: "Group",
                    color: "blue",
                    icon: "paperclip",
                    callback: function (selection) {
                        var nodeSet,
                            nodes,
                            newKey;

                        nodes = _.map(selection, this.graph.adapter.getMutator, this.graph.adapter);

                        // Construct a new node with special properties.
                        this.graph.adapter.newNode({
                            grouped: true
                        }).then(_.bind(function (mongoRec) {
                            newKey = mongoRec._id.$oid;

                            // Find all links to/from the nodes in the group.
                            return $.when.apply($, _.flatten(_.map(nodes, _.bind(function (node) {
                                return [
                                    this.graph.adapter.findLinks({
                                        source: node
                                    }),
                                    this.graph.adapter.findLinks({
                                        target: node
                                    })
                                ];
                            }, this)), true));
                        }, this)).then(_.bind(function () {
                            var links,
                                addLinks = [];

                            links = Array.prototype.concat.apply([], Array.prototype.slice.call(arguments));

                            nodeSet = new clique.util.Set();
                            _.each(nodes, _.bind(function (node) {
                                nodeSet.add(node);

                                // Add an "inclusion" link between the group node and
                                // constituents.
                                addLinks.push(this.graph.adapter.newLink(newKey, node, {
                                    grouping: true
                                }));
                            }, this));

                            _.each(links, _.bind(function (link) {
                                var source = link.getTransient("source"),
                                    target = link.getTransient("target");

                                if (!nodeSet.has(source)) {
                                    addLinks.push(this.graph.adapter.newLink(newKey, source));
                                }

                                if (!nodeSet.has(link.getTransient("target"))) {
                                    addLinks.push(this.graph.adapter.newLink(newKey, target));
                                }
                            }, this));

                            return $.when.apply($, addLinks);
                        }, this)).then(_.bind(function () {
                            var mongoRecs = _.map(nodeSet.items(), function (key) {
                                return {
                                    _id: {
                                        $oid: key
                                    }
                                };
                            });

                            this.graph.adapter.findNodeByKey(newKey)
                                .then(_.bind(function (groupNode) {
                                    return this.graph.addNode(groupNode)
                                        .then(_.bind(function () {
                                            this.model.add(groupNode.key());
                                        }, this));
                                }, this))
                                .then(_.bind(function () {
                                    var children = _.map(mongoRecs, this.graph.adapter.getMutator, this.graph.adapter);
                                    _.each(children, _.bind(function (child) {
                                        child.setData("deleted", true);
                                        this.hideNode(child);
                                    }, this));
                                }, this));
                        }, this));
                    }
                }
            ]
        });
        info.render();

        linkInfo = new clique.view.LinkInfo({
            model: view.linkSelection,
            el: "#link-info",
            graph: graph
        });
        linkInfo.render();
    };

    $.get("assets/query.pegjs", "text")
        .then(function (src) {
            parser = PEG.buildParser(src);
        });

    $.getJSON("anb.json")
        .then(launch, _.bind(launch, {}));
});
