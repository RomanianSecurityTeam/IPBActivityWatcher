/**
 * IPB Activity Watcher configuration file.
 *
 * @author Gecko (degecko.com)
 * @version 1.0
 */

var IPBAW = {
    // The short title used on the header (<TITLE> Activity Watcher).
    // Optional. If not specified, it will use the title.
    shortTitle: 'RST',

    // IPB base URL. The URL of your forum.
    url: 'http://ipb.dev/index.php?/',

    // Default avatar path.
    defaultAvatar: '/uploads/set_resources_1/84c1e40ea0e759e3f1505eb1788ddf3c_default_photo.png',

    // Default ignored categories.
    // Note: Users can edit those on their side.
    ignoredCategories: ['Cosul de gunoi'],

    // Navigation links.
    // Icon names here: http://semantic-ui.com/elements/icon.html
    nav: [
        {
            url: '/',
            title: 'Forum',
            icon: 'users',
            target: '_blank',
            highlight: true
        },
        {
            url: '/chat/',
            title: 'Chat',
            icon: 'comments',
            target: '_blank'
        },
        {
            url: '/topic/100304-regulamentul-forumului/',
            title: 'Regulament',
            icon: 'warning circle',
            target: '_blank'
        },
        {
            url: 'https://www.facebook.com/rstforums',
            title: 'Facebook',
            icon: 'facebook',
            target: '_blank'
        }
    ],

    // If enabled, it prints some useful information in the console, for development purposes.
    //debug: true
};