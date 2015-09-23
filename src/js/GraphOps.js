(function (clique, Backbone, _, template) {
    "use strict";

    window.app = window.app || {};
    window.app.view = window.app.view || {};

    var $ = Backbone.$;

    window.app.view.GraphOps = Backbone.View.extend({
        initialize: function (options) {
            clique.util.require(options.database, "database");
            clique.util.require(options.collection, "collection");

            this.graphName = [options.database, options.collection].join(",");
        },

        render: function () {
            var focused,
                renderTemplate;

            this.$el.html(template.graphOps());

            this.$("button.nodecentrality")
                .on("click", _.bind(function () {
                    var rexster = window.location.origin + ["", "plugin", "mongo", "rexster", "graphs", this.graphName].join("/");

                    $.getJSON("assets/tangelo/romanesco/degree_centrality/workflow", {
                        sourceGraph: rexster
                    }).then(function (result) {
                        console.log(result);
                    });
                }, this));
        }
    });
}(window.clique, window.Backbone, window._, window.template));
