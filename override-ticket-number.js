/**
 * 寿司郎排队号覆写 - Quantumult X
 * [rewrite_local]
 * ^https:\/\/crm-cn-prd\.sushiro\.com\.cn\/wechat\/api_auth\/2\.0\/(ticketing\/createNetTicket|ticket\/status) url script-response-body override-ticket-number.js
 *
 * 设置号码：Safari 访问 https://httpbin.org/get?sq=你的号码
 */

try {
    var TARGET = '374';

    // 读取 $prefs 中的目标号码
    try {
        var v = $prefs.valueForKey('sq_target_number');
        if (v) { TARGET = v; }
    } catch (e1) {}

    // $response 可能为 null / undefined / 无 body
    if (!$response || !$response.body) {
        $done({});
    } else {
        var raw = $response.body;
        if (typeof raw !== 'string') {
            raw = String(raw);
        }

        raw = raw.replace(/"number"\s*:\s*"[^"]*"/g, '"number":"' + TARGET + '"');
        raw = raw.replace(/"wait"\s*:\s*\d+/g, '"wait":0);

        try { $notify('寿司郎', '排队号=' + TARGET); } catch (e2) {}

        $done({ body: raw });
    }
} catch (e) {
    $done({});
}
