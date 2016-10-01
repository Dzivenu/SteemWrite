(function()
{
    var path = require('path');

    var textHelpers = require(path.resolve('./modules/textHelpers.js')),
        htmlToText = require('html-to-text'),
        getSlug = require('speakingurl'),
        base58 = require('bs58'),
        secureRandom = require('secure-random'),
        sha1 = require('sha1');

    function cleanPermlink(permlink)
    {
        //Over STEEMIT_MAX_PERMLINK_LENGTH
        if (permlink.length > 255) permlink = permlink.substring(permlink.length - 255, permlink.length);

        // only letters numbers and dashes shall survive
        permlink = permlink.toLowerCase().replace(/[^a-z0-9-]+/g, '');
        return permlink;
    }

    function createPermlink(title, author, parent_author, parent_permlink, cb)
    {
        var permlink = '';

        if (title && title.trim() !== '')
        {
            var s = module.exports.slug(title.toLowerCase());

            if (s === '') s = base58.encode(secureRandom.randomBuffer(4));

            //ensure the permlink(slug) is unique
            var prefix = '';

            irpcRenderer.call('posts.bcGetContent', {
                author: author,
                permlink: s
            }, function(err, result)
            {
                if (err) return cb(err);

                if (result.body !== '') //post already for that slug
                {
                    // make sure slug is unique
                    prefix = base58.encode(secureRandom.randomBuffer(4)) + '-';
                }

                permlink = prefix + s;
                cb(null, cleanPermlink(permlink));
            });

        }
        else
        {
            // comments: re-parentauthor-parentpermlink-time
            var timeStr = new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, '');
            parent_permlink = parent_permlink.replace(/(-\d{8}t\d{9}z)/g, '');
            permlink = 're-' + parent_author + '-' + parent_permlink + '-' + timeStr;

            cb(null, cleanPermlink(permlink));
        }

    }

    module.exports = {
        slug: function(text) {
            return getSlug(text, {
                truncate: 128
            });
        },
        createMainPermlink: function(title, author, cb)
        {
            createPermlink(title, author, '', '', cb);
        },
        createReplyPermlink: function(parent_author, parent_permlink, cb)
        {
            createPermlink('', '', parent_author, parent_permlink, cb);
        },
        hashContent: function(title, body, tags, additionalJSON)
        {
            if (typeof tags == 'object') tags = tags.join(' ');
            if (typeof additionalJSON == 'object') additionalJSON = JSON.stringify(additionalJSON);
            additionalJSON = additionalJSON.trim();

            if (additionalJSON.length === 0) additionalJSON = '{}';

            body = textHelpers.preview(body);

            return sha1([title, body, tags, additionalJSON].join('$'));
        },
        getPostStrLen: function(str)
        {
            str = str.trim();
            return (textHelpers.isHtml(str)) ? htmlToText.fromString(str).trim().length : str.length;
        },
        validate: {
            postTitleLength: function(text)
            {
                var errMsg = null;
                var len = text.length;

                if (len === 0)
                {
                    errMsg = 'Title is required';
                }
                else if (len > 255)
                {
                    errMsg = 'Please shorten title';
                }

                return errMsg;
            },
            postBody: function(text, len)
            {
                if (typeof len != 'number') len = module.exports.getPostStrLen(text);

                var errMsg = null;
                var maxKb = 100;

                if (len > 0)
                {
                    if (len > maxKb * 1024)
                    {
                        errMsg = 'Exceeds maximum length (' + maxKb + 'KB)';
                    }
                    else
                    {
                        var metadata = textHelpers.metadata(text);

                        var errorStrings = [];

                        if (metadata.tagsWarning.length > 0) errorStrings.push('<p>' + metadata.tagsWarning + '</p>');
                        if (metadata.sanitizeErrorsWarning.length > 0) errorStrings.push('<p>' + metadata.sanitizeErrorsWarning + '</p>');

                        //set errMsg if errorStrings not empty
                        if (errorStrings.length > 0) errMsg = errorStrings.join('<br>');
                    }

                }
                else
                {
                    errMsg = 'Message is required';
                }

                return errMsg;
            },
            additionalJSONParse: function(text)
            {
                var result = {
                    errMsg: null,
                    decoded: {}
                };

                if (text.length > 0)
                {
                    try {
                        var jsonData = JSON.parse(text);

                        if (typeof jsonData == 'object')
                        {
                            var errorStrings = [];

                            if (jsonData.hasOwnProperty('tags')) errorStrings.push('<p><code>tags</code> key is automatically added and is not allowed</p>');
                            if (jsonData.hasOwnProperty('users')) errorStrings.push('<p><code>users</code> key is automatically added and is not allowed</p>');
                            if (jsonData.hasOwnProperty('image')) errorStrings.push('<p><code>image</code> key is automatically added and is not allowed</p>');
                            if (jsonData.hasOwnProperty('links')) errorStrings.push('<p><code>links</code> key is automatically added and is not allowed</p>');

                            if (errorStrings.length > 0)
                            {
                                result.errMsg = errorStrings.join('<br>');
                            }
                            else
                            {
                                result.decoded = jsonData;
                            }

                        }
                        else
                        {
                            result.errMsg = 'Invaild JSON Data';
                        }

                    } catch (err)
                    {
                        result.errMsg = 'Invaild JSON Data';
                    }
                }

                return result;
            }

        }

    };

})();
