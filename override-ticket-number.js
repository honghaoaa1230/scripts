/**
 * 寿司郎小程序 - 排队号覆写
 * Quantumult X 脚本 (response-body)
 *
 * [rewrite_local] 添加这行（注意：是一整行）：
 * ^https:\/\/crm-cn-prd\.sushiro\.com\.cn\/wechat\/api_auth\/2\.0\/(ticketing\/createNetTicket|ticket\/status) url script-response-body override-ticket-number.js
 */

var TARGET = '374';

if (typeof $response === 'undefined' || !$response.body) {
    $done({});
} else {
    var body = $response.body;
    body = body.replace(/"number"\s*:\s*"[^"]*"/g, '"number":"' + TARGET + '"');
    if (body.indexOf('"wait"') !== -1) {
        body = body.replace(/"wait"\s*:\s*\d+/g, '"wait":0');
    }
    $done({ body: body });
}
