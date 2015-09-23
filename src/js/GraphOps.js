(function (Backbone, _, template) {
    "use strict";

    window.app = window.app || {};
    window.app.view = window.app.view || {};

    var $ = Backbone.$;

    window.app.view.GraphOps = Backbone.View.extend({
        render: function () {
            var focused,
                renderTemplate;

            this.$el.html(template.graphOps());

            this.$("button.nodecentrality")
                .on("click", _.bind(function () {
                    console.log("nodecentrality");
                }, this));
        }
    });
}(window.Backbone, window._, window.template));
