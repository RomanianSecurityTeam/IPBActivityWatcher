(function () {

    var app = angular.module('Feedr', ['ngSanitize']);

    app.controller('MainCtrl', function ($scope, $rootScope, $http, $window) {
        $rootScope.notificationsCount = 0;
        $rootScope.notificationsCounter = {
            activity : 0,
            alerts   : 0,
            inbox    : 0,
            reports  : 0
        };

        $scope.initializing = true;
        $scope.app = IPBAW || {};
        $scope.app.url = $scope.app.url.replace(/\/+$/g, '');
        $scope.activity = [];

        $scope.tab = localStorage.tab || 'alerts';
        $scope.banned = localStorage.banned || '';
        $scope.activityType = localStorage.activityType || 'content';
        $scope.ignoredCategories = localStorage.ignoredCategories || $scope.app.ignoredCategories.join('\n');
        $scope.notificationsEnabled = localStorage.notificationsEnabled || true;

        $scope.bgColor = localStorage.theme == 'dark' ? '#04050a' : '#e5e3e3';

        $scope.$watch('app', function () {
        	$rootScope.app = $scope.app;
        }, true);

        angular.forEach(['tab', 'activityType', 'notificationsEnabled'], function (resource) {
            $scope.$watch(resource, function (value) {
                if (value) {
                    localStorage[resource] = value;
                }
            });
        });

        angular.forEach(['banned', 'ignoredCategories'], function (resource) {
            $scope.$watch(resource, function (value) {
                localStorage[resource] = value;
                updateBannedResources();
            });
        });

        angular.element($window).on('focus', function () {
            $rootScope.notificationsCounter.activity = 0;
            $rootScope.notificationsCounter[$scope.tab] = 0;
            $scope.$apply();
        });

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

        $scope.changeActivityType = function (type) {
            $scope.activityType = type;
        };

        $scope.toggleSidebar = function () {
            $scope.displaySidebar = ! $scope.displaySidebar;
        };

        $scope.toggleBanlist = function () {
            $scope.displayBanlist = ! $scope.displayBanlist;
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

        function updateBannedResources() {
            var banned = angular.copy($scope.banned).split('\n').map(function (item) { return item.trim() });
            var ignoredCategories = angular.copy($scope.ignoredCategories).split('\n').map(function (item) { return item.trim() });

            angular.forEach($scope.activity, function (item, i) {
                $scope.activity[i].skip =
                    (item.author && banned.indexOf(item.author) > -1)
                    || (item.category && ignoredCategories.indexOf(item.category) > -1);
            });
        }

        function parseInitialRequest(html) {
            var userMatch = $(html).find('#elUserNav').find('a.ipsUserPhoto_tiny');

            angular.extend($scope.app, {
                csrfKey    : html.getMatch(/csrfKey: "(.+?)",/),
                title      : html.getMatch(/<meta property="og:site_name" content="(.+?)">/),
                shortTitle : $scope.app.shortTitle || $scope.app.title,
                user       : null
            });

            if (userMatch.length) {
                $scope.app.user = {
                    url    : userMatch.attr('href'),
                    name   : userMatch.find('img').attr('alt'),
                    avatar : userMatch.find('img').attr('src'),
                    isMod  : !! html.match(/\/modcp\/reports\//)
                };
            }

            $scope.activity = [];

            var stream = $(html).find('li.ipsStreamItem').not('.ipsStreamItem_time');

            stream.each(function () {
                $scope.activity.push(ContentHandler.process($(this)).get());
            });

            updateBannedResources();
            $scope.initializing = false;
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

            updateBannedResources();
        }

        $scope.toggleTheme = function () {
            if (localStorage.theme == 'light') {
                localStorage.theme = 'dark';
                $scope.bgColor = '#04050a';
            } else {
                localStorage.theme = 'light';
                $scope.bgColor = '#e5e3e3';
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
                $scope.app = IPBAW || {};

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
                    $.get(IPBAW.url, params)
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

    app.directive('checkSrc', function () {
        return {
            restrict: 'A',
            replace: true,
            scope: {
                checkSrc: '='
            },
            template: '<img />',
            link: function ($scope, $elem, $attr) {
                var image = new Image();
                image.src = $scope.checkSrc;
                image.onload = function () {
                    $attr.$set('src', $scope.checkSrc);
                };
                image.onerror = function () {
                    $attr.$set('src', IPBAW.url.replace(/\/+$/, '') + '/' + IPBAW.defaultAvatar.replace(/^\/+/, ''));
                };
            }
        }
    });

    app.filter('makeUrl', function () {
        return function (input) {
            if (typeof input !== 'string') {
                return input;
            }

            return input.match(/^https?:/) ? input : IPBAW.url.replace(/\/+$/g, '') + input;
        }
    });

})();
