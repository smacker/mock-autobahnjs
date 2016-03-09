import { expect } from 'chai';
import { WebSocket } from 'mock-socket';
import autobahn from 'autobahn';
import AutobahnMockServer from '../src';

window.WebSocket = WebSocket;

describe('AutobahnMockServer', () => {
    const url = 'ws://127.0.0.1:8000/ws';
    const realm = 'test';

    let server = new AutobahnMockServer(url, realm);
    let client = new autobahn.Connection({
        url: url,
        realm: realm,
        max_retries: 0
    });

    describe('reply to autobahn', () => {
        it('hello', (done) => {
            client.onopen = () => {
                expect(client.isOpen).to.equal(true);
                client.close();
                done();
            };
            client.open();
        });

        it('subscribe', (done) => {
            client.onopen = (session) => {
                session.subscribe('topic', () => null).then((subscription) => {
                    expect(subscription.active).to.equal(true);
                    client.close();
                    done();
                });
            };
            client.open();
        });

        it('unsubscribe', (done) => {
            client.onopen = (session) => {
                let subscription;

                session.subscribe('topic', () => null)
                    .then((s) => {
                        subscription = s;
                        return session.unsubscribe(subscription);
                    })
                    .then(() => {
                        expect(subscription.active).to.equal(false);
                        client.close();
                        done();
                    });
            };
            client.open();
        });
    });

    describe('publish', () => {
        it('should raise error without subscription from client', () => {
            expect(() => server.publish('notopic', 'message')).to.throws();
        });

        it('should send message correctly', (done) => {
            const msg = 'test message';
            const onEvent = (args) => {
                expect(args).to.have.length(1);
                expect(args[0]).to.equal(msg)
                client.close();
                done();
            };

            client.onopen = (session) => {
                session.subscribe('topic-publish', onEvent).then(() => {
                    server.publish('topic-publish', msg);
                });
            };
            client.open();
        });
    });
});
