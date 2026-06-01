/**
 * 寿司郎排队号覆写 - Quantumult X
 *
 * [rewrite_local] 粘贴下面这行（一整行）：
 * ^https:\/\/crm-cn-prd\.sushiro\.com\.cn\/wechat\/api_auth\/2\.0\/(ticketing\/createNetTicket|ticket\/status) url script-response-body override-ticket-number.js
 *
 * 修改排队号：打开 Safari 访问 http://httpbin.org/get?sq=你的号码
 * 例如：http://httpbin.org/get?sq=888
 */

// 从 $prefs 读取目标号码，没设置过就用默认值
var TARGET = $prefs.valueForKey('sq_target_number') || '374';

console.log('[Sushiro] 目标排队号=' + TARGET);

if (typeof $response === 'undefined' || !$response.body) {
    console.log('[Sushiro] 无响应体，跳过');
    $done({});
} else {
    var raw = $response.body;
    raw = raw.replace(/"number"\s*:\s*"[^"]*"/g, '"number":"' + TARGET + '"');
    raw = raw.replace(/"wait"\s*:\s*\d+/g, '"wait":0);

    console.log('[Sushiro] 已覆写排队号为 ' + TARGET);

    $notify(
        '寿司郎 排队号=' + TARGET,
        '',
        '如需修改，Safari 访问 httpbin.org/get?sq=新号码'
    );

    $done({ body: raw });
}
