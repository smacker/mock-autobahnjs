'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mockSocket = require('mock-socket');

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MSG_TYPE = {
    HELLO: 1,
    WELCOME: 2,
    ABORT: 3,
    CHALLENGE: 4,
    AUTHENTICATE: 5,
    GOODBYE: 6,
    HEARTBEAT: 7,
    ERROR: 8,
    PUBLISH: 16,
    PUBLISHED: 17,
    SUBSCRIBE: 32,
    SUBSCRIBED: 33,
    UNSUBSCRIBE: 34,
    UNSUBSCRIBED: 35,
    EVENT: 36,
    CALL: 48,
    CANCEL: 49,
    RESULT: 50,
    REGISTER: 64,
    REGISTERED: 65,
    UNREGISTER: 66,
    UNREGISTERED: 67,
    INVOCATION: 68,
    INTERRUPT: 69,
    YIELD: 70
};

var ROLES = {
    broker: {
        features: {
            publisher_identification: true,
            pattern_based_subscription: true,
            subscription_meta_api: true,
            payload_encryption_cryptobox: true,
            payload_transparency: true,
            subscriber_blackwhite_listing: true,
            session_meta_api: true,
            publisher_exclusion: true,
            subscription_revocation: true
        }
    },
    dealer: {
        features: {
            payload_encryption_cryptobox: true,
            payload_transparency: true,
            pattern_based_registration: true,
            registration_meta_api: true,
            shared_registration: true,
            caller_identification: true,
            session_meta_api: true,
            registration_revocation: true,
            progressive_call_results: true
        }
    }
};

/**
 * WAMP ID generator
 * @returns {number}
 */
function newid() {
    return Math.floor(Math.random() * 9007199254740992);
}

var AutobahnMockServer = function () {
    function AutobahnMockServer(url, realm) {
        var _ref = arguments.length <= 2 || arguments[2] === undefined ? { ROLES: ROLES } : arguments[2];

        var roles = _ref.roles;

        _classCallCheck(this, AutobahnMockServer);

        this._mockServer = new _mockSocket.Server(url);
        this._realm = realm;
        this._roles = roles;

        this._subscriptions = {};

        this._listenMessages();
    }

    _createClass(AutobahnMockServer, [{
        key: 'publish',
        value: function publish(topic, message) {
            var _this = this;

            if (!(topic in this._subscriptions)) {
                throw Error('Client did not subscribed to topic ' + topic);
            }

            var subIds = this._subscriptions[topic];

            subIds.forEach(function (subId) {
                _this._send([MSG_TYPE.EVENT, subId, newid(), {}, [message]]);
            });
        }
    }, {
        key: 'close',
        value: function close(options) {
            this._mockServer.close(options);
        }
    }, {
        key: '_listenMessages',
        value: function _listenMessages() {
            var _this2 = this;

            this._mockServer.on('message', function (msg) {
                var _JSON$parse = JSON.parse(msg);

                var _JSON$parse2 = _toArray(_JSON$parse);

                var msgType = _JSON$parse2[0];

                var payload = _JSON$parse2.slice(1);

                switch (msgType) {
                    case MSG_TYPE.HELLO:
                        _this2._onHello(payload);
                        break;

                    case MSG_TYPE.SUBSCRIBE:
                        _this2._onSubscribe(payload);
                        break;

                    case MSG_TYPE.UNSUBSCRIBE:
                        _this2._onUnsubscribe(payload);
                        break;
                }
            });
        }
    }, {
        key: '_send',
        value: function _send(msg) {
            this._mockServer.send(JSON.stringify(msg));
        }
    }, {
        key: '_onHello',
        value: function _onHello() {
            this._send([MSG_TYPE.WELCOME, newid(), {
                realm: this._realm,
                authprovider: 'static',
                roles: this._roles,
                authid: 'UMG3-7A49-VJXC-KTFY-WFRM-MNKC',
                authrole: 'anonymous',
                authmethod: 'anonymous',
                x_cb_node_id: 'Test-mocker'
            }]);
        }
    }, {
        key: '_onSubscribe',
        value: function _onSubscribe(msg) {
            var subId = newid(),
                requestId = msg[0],
                topicName = msg[2];

            if (!(topicName in this._subscriptions)) {
                this._subscriptions[topicName] = [];
            }

            this._subscriptions[topicName].push(subId);

            this._send([MSG_TYPE.SUBSCRIBED, requestId, subId]);
        }
    }, {
        key: '_onUnsubscribe',
        value: function _onUnsubscribe(msg) {
            var _this3 = this;

            var _msg = _slicedToArray(msg, 2);

            var requestId = _msg[0];
            var subId = _msg[1];


            Object.keys(this._subscriptions).forEach(function (topicName) {
                var subIds = _this3._subscriptions[topicName],
                    index = subIds.indexOf(subId);

                if (index !== -1) {
                    subIds.splice(index, 1);
                }
            });

            this._send([MSG_TYPE.UNSUBSCRIBED, requestId]);
        }
    }]);

    return AutobahnMockServer;
}();

exports.default = AutobahnMockServer;