import { Server } from 'mock-socket';

const MSG_TYPE = {
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

const ROLES = {
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

export default class AutobahnMockServer {
    constructor(url, realm, roles = ROLES) {
        this._mockServer = new Server(url);
        this._realm = realm;
        this._roles = roles;

        this._subscriptions = {};

        this._listenMessages();
    }

    publish(topic, message) {
        if (!(topic in this._subscriptions)) {
            throw Error(`Client did not subscribed to topic ${topic}`);
        }

        let subIds = this._subscriptions[topic];

        subIds.forEach(subId => {
            this._send([
                MSG_TYPE.EVENT,
                subId,
                newid(),
                {},
                [message]
            ]);
        });
    }

    close(options) {
        this._mockServer.close(options);
    }

    _listenMessages() {
        this._mockServer.on('message', (msg) => {
            let [msgType, ...payload] = JSON.parse(msg);

            switch (msgType) {
                case MSG_TYPE.HELLO:
                    this._onHello(payload);
                    break;

                case MSG_TYPE.GOODBYE:
                    this._onGoodbye(payload);
                    break;

                case MSG_TYPE.SUBSCRIBE:
                    this._onSubscribe(payload);
                    break;

                case MSG_TYPE.UNSUBSCRIBE:
                    this._onUnsubscribe(payload);
                    break;
            }
        });
    }

    _send(msg) {
        this._mockServer.send(JSON.stringify(msg));
    }

    _onHello() {
        this._send([
            MSG_TYPE.WELCOME,
            newid(),
            {
                realm: this._realm,
                authprovider: 'static',
                roles: this._roles,
                authid: 'UMG3-7A49-VJXC-KTFY-WFRM-MNKC',
                authrole: 'anonymous',
                authmethod: 'anonymous',
                x_cb_node_id: 'Test-mocker'
            }
        ]);
    }

    _onGoodbye(msg) {
        if (msg[1] === 'wamp.error.goodbye_and_out') {
            return;
        }

        this._send([MSG_TYPE.GOODBYE, {}, 'wamp.close.normal'])
    }

    _onSubscribe(msg) {
        let subId = newid(),
            requestId = msg[0],
            topicName = msg[2];

        if (!(topicName in this._subscriptions)) {
            this._subscriptions[topicName] = [];
        }

        this._subscriptions[topicName].push(subId);

        this._send([
            MSG_TYPE.SUBSCRIBED,
            requestId,
            subId
        ]);
    }

    _onUnsubscribe(msg) {
        let [requestId, subId] = msg;

        Object.keys(this._subscriptions).forEach(topicName => {
            let subIds = this._subscriptions[topicName],
                index = subIds.indexOf(subId);

            if (index !== -1) {
                subIds.splice(index, 1);
            }
        });

        this._send([
            MSG_TYPE.UNSUBSCRIBED,
            requestId
        ]);
    }
}
