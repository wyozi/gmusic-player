// Node exceptions disrupt workflow. We'd rather just log them than change the node-webkit page
process.on("uncaughtException", function(e) {
    console.error(e);

    try {
        // Source: http://stackoverflow.com/a/24596251
        var $body = angular.element(document.body);   // 1
        var $rootScope = $body.scope().$root;         // 2
        $rootScope.$apply(function () {               // 3
            $rootScope.nodeError = e;
        });
    }
    catch (err) {}
})
