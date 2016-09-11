(function () {

    var app = angular.module('Feedr', ['ngSanitize']);

    app.controller('MainCtrl', function ($scope, $rootScope, $http, $window) {
        $rootScope.notificationsCounter = {
            activity : 0,
            alerts   : 0,
            inbox    : 0,
            reports  : 0
        };

        $scope.activity = [];
        $scope.app = IPBAW || {};
        $scope.app.url = $scope.app.url.replace(/\/+$/g, '');
        $scope.tab = localStorage.tab || 'alerts';
        $scope.notificationsEnabled = localStorage.notificationsEnabled || 'alerts';

        $scope.$watch('tab', function (tab) {
            if (tab) {
                localStorage.tab = tab;
                $rootScope.notificationsCounter[$scope.tab] = 0;
            }
        });

        $scope.$watch('notificationsEnabled', function (notificationsEnabled) {
            if (notificationsEnabled) {
                localStorage.notificationsEnabled = notificationsEnabled;
            }
        });

        $scope.$watch('app', function () {
        	$rootScope.app = $scope.app;
        }, true);

        $window.onfocus = function () {
            $rootScope.notificationsCounter.activity = 0;
            $rootScope.notificationsCounter[$scope.tab] = 0;
            $scope.$apply();
        };

        $rootScope.$watch('notificationsCounter', function () {
        	$scope.notificationsCount =
                $rootScope.notificationsCounter.alerts  +
                $rootScope.notificationsCounter.inbox   +
                $rootScope.notificationsCounter.reports +
                $rootScope.notificationsCounter.activity;
        }, true);

        $scope.selectTab = function (tab) {
            $scope.tab = tab;
        };

        setInterval(checkActivity, 5000);
        checkActivity(true);

        function checkActivity(init) {
            var url = $scope.app.url + '/discover/';

            if (init) {
                $http({ method: 'GET', url: url }).then(function (res) {
                    parseInitialRequest(res.data);
                });
            } else {
                $.post(url, {
                    csrfKey: $scope.app.csrfKey,
                    after: $scope.activity.maxBy('timestamp').timestamp
                }).done(function (res) {
                    if (res.results && ! res.results.match(/There are no results to show in this activity stream yet/)) {
                        handleNewActivity(res.results);
                    }
                });
            }
        }

        function parseInitialRequest(html) {
            var userMatch = html.match(/<a href="(.*?\/profile\/.*?\/)".*?ipsUserPhoto_tiny" title="Go to .*? profile">[\s\S]*?<img src='(.*?)' alt='(.*?)' itemprop="image"/);

            angular.extend($scope.app, {
                csrfKey    : html.getMatch(/csrfKey: "(.+?)",/),
                title      : html.getMatch(/<meta property="og:site_name" content="(.+?)">/),
                shortTitle : $scope.app.shortTitle || $scope.app.title,
                user       : null
            });

            if (userMatch) {
                $scope.app.user = {
                    name   : userMatch[3],
                    url    : userMatch[1],
                    avatar : userMatch[2],
                    isMod  : html.match(/\/modcp\/reports\//)
                };
            }

            var stream = $(html.getMatch(/(<ol class=.ipsStream[\s\S]*?<\/ol>)/))
                .find('> li').not('.ipsStreamItem_time');

            stream.each(function () {
                $scope.activity.push(ContentHandler.process($(this)).get());
            });
        }

        function handleNewActivity(data) {
            var stream = $('<div/>').html(data).find('> li').not('.ipsStreamItem_time');

            stream.each(function () {
                if (! window.focused && $(this).hasClass('ipsStreamItem_contentBlock')) {
                    $rootScope.notificationsCounter.activity++;
                    $scope.notificationsEnabled && notifySound.play();
                }

                $scope.activity.push(ContentHandler.process($(this)).get());
                $scope.$apply();
            });
        }

        $scope.toggleTheme = function () {
            if (localStorage.theme == 'light') {
                localStorage.theme = 'dark';
            } else {
                localStorage.theme = 'light';
            }
        };

        $scope.toggleNotifications = function () {
            $scope.notificationsEnabled = ! $scope.notificationsEnabled;
        };

        $scope.$watch(function () {
            return localStorage.theme;
        }, function (theme) {
            $scope.theme = theme;
        });
    });

    app.directive('timestamp', function () {
        return {
            restrict: 'E',
            scope: {
                date: '='
            },
            replace: true,
            template: '<span>{{ timestamp }} ago</span>',
            link: function ($scope) {
                function updateTimestamp() {
                    $scope.timestamp = moment.duration(moment().diff($scope.date)).humanize();
                }

                updateTimestamp();
                setInterval(updateTimestamp, 10 * 1000);
            }

        };
    });

    app.directive('list', function ($rootScope) {
        return {
            restrict: 'E',
            scope: {
                resource: '@',
                csrfKey: '='
            },
            templateUrl: 'list.html',
            link: function ($scope) {
                var params = { app: 'core', csrfKey: $scope.csrfKey };

                $scope.list = [];

                switch ($scope.resource) {
                    case 'alerts':
                        angular.extend(params, {
                            module: 'system',
                            controller: 'notifications'
                        });
                        break;

                    case 'inbox':
                        angular.extend(params, {
                            module: 'messaging',
                            controller: 'messenger'
                        });
                        break;

                    case 'reports':
                        angular.extend(params, {
                            module: 'modcp',
                            controller: 'modcp',
                            tab: 'reports',
                            overview: 1
                        });
                        break;
                }

                function getList() {
                    $.post(IPBAW.url, params)
                        .done(function (res) {
                            var stream = $('<div/>').html(res.data || res).find('> li, > ol > li');

                            stream.each(function () {
                                $(this).addClass('user-' + $scope.resource);

                                if (! $scope.list.exists('hash', $(this).getMD5())) {
                                    if (! window.focused) {
                                        $rootScope.notificationsCounter[$scope.resource]++;
                                        $scope.notificationsEnabled && notifySound.play();
                                    }

                                    $scope.list.push(ContentHandler.process($(this)).get());
                                    $scope.$apply();
                                }
                            });
                        });
                }

                getList();
                setInterval(getList, 5000);
            }
        }
    });

})();
