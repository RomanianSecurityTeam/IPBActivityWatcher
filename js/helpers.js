var notifySound = new Audio(IPBAW.url + '/applications/core/interface/sounds/notification.mp3');
window.focused = true;

window.onload = function () {
    window.onfocus = function () {
        window.focused = true;
    };
    window.onblur = function () { window.focused = false };
};

$(document).ready(function() {
    $(window).trigger('focus');

    $(window).focus(function () {
        $('.unfocused').not('.old').addClass('old');
    });

    $('[data-content]').popup({
        variation: 'inverted'
    });
});

String.prototype.getMatch = function (regex, index, def) {
    var match = this.match(regex);
    return match ? match[index || 1] : def;
};

String.prototype.removeExcess = function () {
    return (this || '').replace(/(<br ?\/?>|\n)/g, ' ').trim().substr(0, 1024).clean();
};

Array.prototype.maxBy = function (prop) {
    var max = null, maxObject = null;

    for (var i = 0; i < this.length; i++) {
    	if (max === null || this[i][prop] > max) {
            max = this[i][prop];
            maxObject = this[i];
        }
    }

    return maxObject || {};
};

Array.prototype.exists = function (key, value) {
    for (var i = 0; i < this.length; i++) {
    	if (this[i][key] == value) {
    	    return true;
        }
    }

    return false;
};

String.prototype.clean = function () {
    var string = this + '';

    return string.replace(/<.*?>/g, '').substr(0, 1024).trim();
};

$.fn.getMD5 = function () {
    var elem = angular.copy(this).wrap('<div/>');
    elem.find('time').remove();

    return md5(elem.html()
        .replace(/<time.*?<\/time>/g, '')
        .replace(/(<span data-ipstooltip.*?title=).Started by .*?>/i, '$1"">'));
};

var ContentHandler = {
    process: function (elem) {
        this.elem = elem;
        this.html = this.elem.html();
        this.props = {
            hash: this.elem.getMD5(),
            type: this.determineType(),
            event: this.elem.hasClass('ipsStreamItem_contentBlock') ? 'content' : 'action',
            timestamp: this.elem.data('timestamp') || parseInt(moment(this.elem.find('time').attr('datetime')) / 1000),
            unfocused: ! window.focused
        };
        // Get type specific fields.
        this[this.props.type]();

        return this;
    },

    get: function () {
        return this.props;
    },

    determineType: function () {
        switch (true) {
            case this.elem.hasClass('user-alerts'):
                return 'user_alerts';
            case this.elem.hasClass('user-inbox'):
                return 'user_inbox';
            case this.elem.hasClass('user-reports'):
                return 'user_reports';
            case !! this.elem.find('[data-ipstooltip][title=Post]').length:
                return 'post';
            case !! this.elem.find('[data-ipstooltip][title=Topic]').length:
                return 'topic';
            case !! this.html.match(/changed their profile photo/):
                return 'profile_photo';
            case !! this.html.match(/gave (positive|negative) reputation/):
                return 'rep';
            case !! this.html.match(/joined the community/):
                return 'join';
            case !! this.html.match(/profile[\s\S]*? started following/):
                if (this.html.match(/\/topic\//)) {
                    return 'follow_topic';
                }
                return 'follow_user';
        }

        return 'unsupported';
    },

    user_alerts: function () {
        angular.extend(this.props, {
            url          : this.elem.find('.ipsDataItem_main a').attr('href'),
            author       : this.elem.find('.ipsDataItem_icon a').text(),
            author_url   : this.elem.find('.ipsDataItem_icon a').attr('href'),
            author_photo : this.elem.find('.ipsDataItem_icon a img').attr('src'),
            message      : this.elem.find('.ipsDataItem_title').text().clean()
        });
    },

    user_inbox: function () {
        angular.extend(this.props, {
            url          : this.elem.find('a.cMessageTitle').attr('href'),
            title        : this.elem.find('a.cMessageTitle').text().trim(),
            author       : this.elem.find('a.ipsUserPhoto img').attr('alt'),
            author_url   : this.elem.find('a.ipsUserPhoto').attr('href'),
            author_photo : this.elem.find('a.ipsUserPhoto img').attr('src'),
            message      : this.elem.find('.ipsDataItem_meta').html().removeExcess()
        });
    },

    user_reports: function () {
        angular.extend(this.props, {
            url          : this.elem.find('.ipsDataItem_title a').attr('href'),
            title        : this.elem.find('.ipsDataItem_title a').text().clean(),
            author       : this.elem.find('a.ipsUserPhoto img').attr('alt'),
            author_url   : this.elem.find('a.ipsUserPhoto').attr('href'),
            author_photo : this.elem.find('a.ipsUserPhoto img').attr('src'),
        });
    },

    post: function () {
        angular.extend(this.props, {
            url          : this.elem.find('.ipsStreamItem_title a').last().attr('href'),
            title        : this.elem.find('.ipsStreamItem_title a').last().text().clean(),
            content      : this.elem.find('.ipsStreamItem_snippet').text().clean(),
            author       : this.html.getMatch(/\s(.*?) (posted a topic|replied to)/).trim().replace(/<[^>]+>/g, ''),
            author_url   : this.elem.find('a.ipsUserPhoto').attr('href'),
            author_photo : this.elem.find('a.ipsUserPhoto img').attr('src'),
            category     : this.elem.find('.ipsStreamItem_status a').text().removeExcess(),
            category_url : this.elem.find('.ipsStreamItem_status a').attr('href')
        });
    },

    topic: function () {
        this.post();
    },

    follow_topic: function () {
        angular.extend(this.props, {
            url        : this.elem.find('.ipsStreamItem_action a').last().attr('href'),
            title      : this.elem.find('.ipsStreamItem_action a').last().html().removeExcess(),
            author     : this.elem.find('.ipsStreamItem_action a').first().text(),
            author_url : this.elem.find('.ipsStreamItem_action a').first().attr('href')
        });
    },

    follow_user: function () {
        angular.extend(this.props, {
            target_url : this.elem.find('.ipsStreamItem_action a').last().attr('href'),
            target     : this.elem.find('.ipsStreamItem_action a').last().html().removeExcess(),
            author     : this.elem.find('.ipsStreamItem_action a').first().text(),
            author_url : this.elem.find('.ipsStreamItem_action a').first().attr('href')
        });
    },

    profile_photo: function () {
        angular.extend(this.props, {
            author       : this.elem.find('.ipsStreamItem_action a').last().text(),
            author_url   : this.elem.find('a.ipsUserPhoto').attr('href'),
            author_photo : this.elem.find('a.ipsUserPhoto img').attr('src'),
        });
    },

    rep: function () {
        angular.extend(this.props, {
            title      : this.html.getMatch(/gave (positive|negative) reputation/),
            author     : this.elem.find('.ipsStreamItem_action a').first().text(),
            author_url : this.elem.find('.ipsStreamItem_action a').first().attr('href'),
            target     : this.elem.find('.ipsStreamItem_action a').last().text(),
            target_url : this.elem.find('.ipsStreamItem_action a').last().attr('href'),
        });
    },

    join: function () {
        angular.extend(this.props, {
            author     : this.elem.find('.ipsStreamItem_action a').text(),
            author_url : this.elem.find('.ipsStreamItem_action a').attr('href'),
        });
    },

    unsupported: function () {
        IPBAW.debug && console.log('Unsupported element', this.elem);
    }
};
