const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');

function load({ signinOnly = false, fail, business, status = 0, points = 3, responseStatus = 200, rawBody } = {}) {
    const source = fs.readFileSync(__dirname + '/zeeho-test.js', 'utf8');
    const start = source.indexOf('!(async () => {');
    const end = source.indexOf('\nfunction randomPattern(', start);
    assert(start > 0 && end > start);
    const requests = [], notices = [], logs = [];
    const context = {
        module: { exports: {} }, require: name => {
            assert.equal(name, './sendNotify', 'No real dependency or network access in checks');
            return { sendNotify: async () => {} };
        },
        process: { env: { SERVER_CHAN_KEY: 'test-sendkey' }, argv: ['node', 'zeeho-test.js', ...(signinOnly ? ['--signin-only'] : [])] },
        console: { log: (...args) => logs.push(args.join(' ')), error() {}, warn() {} },
        setTimeout, clearTimeout, URLSearchParams,
        fetch: async (_url, opts) => {
            notices.push(Object.fromEntries(opts.body));
            return { json: async () => ({ code: 0, data: { errno: 0 } }) };
        }
    };
    vm.runInNewContext(source.slice(0, start) + source.slice(end) + '\nthis.api = { UserInfo, Request, main, $, setUsers: users => { userList = users; } };', context);
    const api = context.api;
    api.$.wait = async () => {};
    for (const method of ['get', 'post']) api.$.http[method] = async opts => {
        requests.push({ method, ...opts });
        if (fail) throw new Error('Response code 401 (Unauthorized)');
        let data;
        if (opts.url.includes('/signin/info')) data = { signCount: 29, integral: 2 };
        else data = { signInStatus: status, integralScore: points };
        return { statusCode: responseStatus, body: rawBody ?? JSON.stringify(business || { code: '10000', message: '操作成功', data }) };
    };
    const user = new api.UserInfo({ token: 'Bearer fake-private-token', userId: 'fake-id', userName: 'test', userAgent: 'test-agent' });
    api.setUsers([user]);
    return { ...api, user, requests, notices, logs };
}

(async () => {
    let f = load({ fail: true });
    await assert.rejects(f.main(), /401/);
    assert.equal(f.notices.length, 1);
    assert(!f.notices[0].title.includes('签到成功'));

    f = load({ responseStatus: 401, rawBody: '<InvalidTokenException><error>invalid_token</error><error_description>fake-private-token</error_description></InvalidTokenException>' });
    await assert.rejects(f.main(), /HTTP 401: invalid_token/);
    assert(!JSON.stringify([f.logs, f.notices]).includes('fake-private-token'), 'Do not echo tokens from error responses');
    assert(!f.notices[0].title.includes('签到成功'));

    f = load({ business: { code: '40001', message: '登录失效' } });
    await assert.rejects(f.user.signin(), /登录失效/);
    f = load({ business: { code: '10000', message: '操作成功', data: {} } });
    await assert.rejects(f.user.signin(), /未确认/);
    f = load({ signinOnly: true, fail: true });
    await assert.rejects(f.main(), /401/);
    assert.equal(f.requests.length, 1);
    assert.equal(f.notices.length, 0);

    f = load();
    assert.deepEqual(JSON.parse(JSON.stringify(await f.user.signin())), { integral: 3, alreadySigned: false });
    const request = f.requests[0];
    assert.equal(request.url, 'https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/signin?server_name=SMART');
    assert.equal(request.retry, 0, 'One POST attempt only');
    const payload = 'server_name=SMART' + request.headers['cfmoto-x-param'] + 'c5e0da7f4da28df805694ec3dd1fc6792e9df99d';
    const expected = crypto.createHash('md5').update(crypto.createHash('sha1').update(payload).digest('hex')).digest('hex');
    assert.equal(request.headers['cfmoto-x-sign'], expected);
    assert.equal(request.headers.signature, expected);
    assert.equal(request.headers.Authorization, 'Bearer fake-private-token');

    await f.user.getSignRecord();
    const record = f.requests[1];
    assert(record.url.startsWith('https://tapi.zeehoev.com/v1.0/mine/cfmotoservermine/signin/info?'));
    assert.equal(record.params, undefined, 'Do not append the query twice');
    const body = { postcontent: 'test content' };
    await f.Request({ url: 'https://tapi.zeehoev.com/test', type: 'post', dataType: 'json', body, headers: request.headers });
    const bodyRequest = f.requests[2];
    const bodyPayload = JSON.stringify(body) + bodyRequest.headers['cfmoto-x-param'] + 'c5e0da7f4da28df805694ec3dd1fc6792e9df99d';
    const bodySignature = crypto.createHash('md5').update(crypto.createHash('sha1').update(bodyPayload).digest('hex')).digest('hex');
    assert.equal(bodyRequest.headers.signature, bodySignature);

    f = load({ status: 1, points: 0 });
    assert.deepEqual(JSON.parse(JSON.stringify(await f.user.signin())), { integral: 0, alreadySigned: true });
    f.user.getSignRecord = async () => ({ count: 29 });
    f.user.getSignInfo = async () => 100;
    for (const name of ['createArticle', 'getArticles', 'thumbsUp', 'share', 'deletePost']) f.user[name] = async () => 'post';
    await f.main();
    assert(f.notices[0].title.includes('今日已签到'));
    assert(f.notices[0].desp.includes('签到获得积分: 0分'));

    f = load({ signinOnly: true });
    f.user.getSignInfo = async () => 100;
    for (const name of ['lottery', 'createArticle', 'getArticles', 'thumbsUp', 'share', 'deletePost']) {
        f.user[name] = async () => { throw Error('Unexpected side effect: ' + name); };
    }
    await f.main();
    assert.equal(f.notices.length, 0, 'Validation must not push messages');
    assert(!f.logs.join('\n').includes('fake-private-token'), 'Never print credentials');
    assert(f.logs.some(line => line.includes('SIGNIN_RESULT')));
    console.log('PASS: authentication failures, result confirmation, App signature, query encoding, already-signed, and one-signin-only mode');
})().catch(error => { console.error(error); process.exitCode = 1; });
