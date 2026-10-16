const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');

function load({ before = 0, after = 3, httpStatus = 200, reply = { code: '10000', message: '操作成功' } } = {}) {
  const source = fs.readFileSync(__dirname + '/zeeho-test.js', 'utf8');
  const start = source.indexOf('!(async () => {');
  const end = source.indexOf('\nfunction randomPattern(', start);
  assert(start > 0 && end > start);
  const requests = [], notices = [], logs = [];
  const env = { SERVER_CHAN_KEY: 'test-sendkey', ckName: '[{"token":"Bearer test-private-token"}]' };
  const context = {
    module: { exports: {} }, process: { env, argv: ['node', 'zeeho-test.js'] },
    require: name => {
      assert.equal(name, './sendNotify');
      assert.equal(env.PUSH_KEY, env.SERVER_CHAN_KEY, 'Map the existing key before loading QingLong notifications');
      return { sendNotify: async (title, content) => notices.push({ title, content }) };
    },
    console: { log: (...args) => logs.push(args.join(' ')), error() {}, warn() {} },
    setTimeout, clearTimeout,
  };
  vm.runInNewContext(source.slice(0, start) + source.slice(end) + '\nthis.api = { $, UserInfo, main, SendMsgList, todayStr, setUsers: users => { userList = users; } };', context);
  const api = context.api;
  api.$.wait = async () => {};
  let infoCalls = 0;
  for (const method of ['get', 'post']) api.$.http[method] = async opts => {
    requests.push({ method, ...opts });
    if (httpStatus >= 400) return { statusCode: httpStatus, body: '<InvalidTokenException><error>invalid_token</error><error_description>test-private-token</error_description></InvalidTokenException>' };
    const body = opts.url.includes('/signin/info')
      ? { code: '10000', message: '操作成功', data: { nowSignDetailVos: [{ createDate: api.todayStr(), signStatue: infoCalls++ === 0 ? before : after, integralScore: '1' }] } }
      : reply;
    return { statusCode: 200, body: JSON.stringify(body) };
  };
  const user = new api.UserInfo({ token: 'Bearer test-private-token', userName: 'test', userId: 'test-user', userAgent: 'test-agent' });
  api.setUsers([user]);
  user.getSignRecord = async () => ({ count: 30, prize: 1, prizes: 2 });
  user.getMissedDays = async () => [];
  user.getSupplementCount = async () => 0;
  user.exchangeSupplementCard = async () => { throw Error('Unexpected exchange without a missed day'); };
  user.createArticle = async () => undefined;
  user.getArticles = async () => undefined;
  user.getSignInfo = async () => 6155;
  return { ...api, user, requests, notices, logs, process: context.process };
}

(async () => {
  let f = load();
  await f.main(); await f.SendMsgList(f.$.notifyList);
  assert.equal(f.user.signinResult.confirmed, true);
  assert(f.notices[0].title.includes('签到已确认'));
  assert(!f.notices[0].content.includes('共获得4'), 'Do not invent interaction rewards');
  const request = f.requests.find(r => r.method === 'post');
  assert.equal(request.url, 'https://h5.zeehoev.com/cfmotoservermine/H5/signin');
  assert.equal(request.body, '{}');
  assert.equal(request.headers.interfaceversion, '2');
  assert.equal(request.headers.user_id, 'test-user');
  assert.equal(request.retry, 0);
  const raw = '{}' + request.headers['cfmoto-x-param'] + '70c2c7458ab88ca9504ad0521f170075bc91f2f7';
  const expected = crypto.createHash('md5').update(crypto.createHash('sha1').update(raw).digest('hex')).digest('hex');
  assert.equal(request.headers['cfmoto-x-sign'], expected, 'Preserve upstream H5 body signing');

  f = load({ after: 0 });
  await f.main(); await f.SendMsgList(f.$.notifyList);
  assert.equal(f.user.signinResult.confirmed, false);
  assert.equal(f.process.exitCode, 1);
  assert(f.notices[0].title.includes('签到待确认'));
  assert(!f.notices[0].content.includes('签到成功'));
  assert(!f.logs.join('\n').includes('签到成功 +1'));

  for (const before of [3, '5']) {
    f = load({ before });
    await f.user.signin();
    assert.equal(f.user.signinResult.confirmed, true);
    assert.equal(f.requests.filter(r => r.method === 'post').length, 0);
  }
  f = load({ reply: { code: 'repeatedly_operation', message: '重复提交' } });
  await f.user.signin(); assert.equal(f.user.signinResult.confirmed, true);

  f = load({ httpStatus: 401 });
  await f.main(); await f.SendMsgList(f.$.notifyList);
  assert.equal(f.requests.length, 1, 'Stop sign-in after failed authentication');
  assert(f.notices[0].title.includes('任务异常'));
  assert(f.notices[0].content.includes('invalid_token'));
  assert(!JSON.stringify([f.notices, f.logs]).includes('test-private-token'));

  f = load({ reply: { code: '430', message: 'permit error' } });
  await f.main(); await f.SendMsgList(f.$.notifyList);
  assert(!f.user.signinResult.confirmed);
  assert(f.notices[0].title.includes('任务异常'));
  f = load();
  const actions = [];
  let cardQueries = 0;
  f.user.getMissedDays = async () => ['2026-10-15'];
  f.user.getSupplementCount = async () => cardQueries++ === 0 ? 0 : 1;
  f.user.exchangeSupplementCard = async () => { actions.push('exchange'); return true; };
  f.user.supplement = async day => { actions.push('supplement:' + day); return true; };
  await f.main();
  assert.deepEqual(actions, ['exchange', 'supplement:2026-10-15'], 'Honor the authorized automatic card exchange');
  f = load();
  f.user.getMissedDays = async () => { throw Error('follow-up task failed'); };
  await assert.rejects(f.main(), /follow-up task failed/);
  await f.SendMsgList(f.$.notifyList);
  // Bootstrap also appends the uncaught error to the notification body in production.
  f.$.notifyMsg.push('follow-up task failed');
  await f.SendMsgList(f.$.notifyList);
  assert(f.notices.at(-1).title.includes('任务异常'));
  console.log('PASS: latest H5 signature, QingLong ServerChan mapping, truthful notifications, already-signed, and automatic card exchange');
})().catch(error => { console.error(error); process.exitCode = 1; });
