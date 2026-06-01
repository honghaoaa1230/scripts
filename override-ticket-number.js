/**
 * 寿司郎排队号覆写 - Quantumult X
 *
 * [rewrite_local] 粘贴下面这行（一整行，不要换行）：
 * ^https:\/\/crm-cn-prd\.sushiro\.com\.cn\/wechat\/api_auth\/2\.0\/(ticketing\/createNetTicket|ticket\/status) url script-response-body override-ticket-number.js
 */

var TARGET = '374';
var CHECK_TIME = '154714';

// 脚本被加载就会打日志（在 Quantumult X 日志面板可见）
console.log('[Sushiro] 脚本已加载 v3');

if (typeof $response === 'undefined') {
    console.log('[Sushiro] $response 未定义，跳过');
    $notify('Sushiro', '$response 未定义', '脚本被加载但无响应对象');
    $done({});
} else if (!$response.body) {
    console.log('[Sushiro] $response.body 为空，跳过');
    $notify('Sushiro', 'body 为空', 'statusCode=' + $response.statusCode);
    $done({});
} else {
    var raw = $response.body;
    var before = raw.length;

    // 替换 number
    raw = raw.replace(/"number"\s*:\s*"[^"]*"/g, '"number":"' + TARGET + '"');
    raw = raw.replace(/"queueTime"\s*:\s*"[^"]*"/g, '"queueTime":"' + CHECK_TIME + '"');

    // 替换 wait
    raw = raw.replace(/"wait"\s*:\s*\d+/g, '"wait":0');

    var after = raw.length;

    console.log('[Sushiro] 覆写完成 body长度=' + before + ' status=' + $response.statusCode);

    $notify(
        '寿司郎 排队号=' + TARGET,
        'body: ' + before + ' -> ' + after + ' 字节',
        'status=' + $response.statusCode
    );

    $done({ body: raw });
}
