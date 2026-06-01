/**
 * 寿司郎排队号覆写 - Quantumult X
 * [rewrite_local]
 * ^https:\/\/crm-cn-prd\.sushiro\.com\.cn\/wechat\/api_auth\/2\.0\/(ticketing\/createNetTicket|ticket\/status) url script-response-body override-ticket-number.js
 *
 * 设置号码：Safari 访问 https://httpbin.org/get?sq=你的号码
 */

var TARGET = '374';

// 安全读取 $prefs
try {
    var v = $prefs.valueForKey('sq_target_number');
    if (v) { TARGET = v; }
} catch (e) {}

// 安全通知
function notify(title, msg) {
    try { $notify(title, msg); } catch (e) {}
}

if (typeof $response === 'undefined') {
    $done({});
} else if (!$response.body) {
    $done({});
} else {
    try {
        var raw = $response.body;
        // 确保是字符串
        if (typeof raw !== 'string') {
            raw = JSON.stringify(raw);
        }
        raw = raw.replace(/"number"\s*:\s*"[^"]*"/g, '"number":"' + TARGET + '"');
        raw = raw.replace(/"wait"\s*:\s*\d+/g, '"wait":0);
        notify('寿司郎', '排队号=' + TARGET);
        $done({ body: raw });
    } catch (e) {
        $done({});
    }
}
