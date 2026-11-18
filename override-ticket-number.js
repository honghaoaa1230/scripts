/**
 * 寿司郎排队号覆写 - 精准 JSON 路径版
 * 适用接口: https://sapi.sushiro.com.cn/gateway/wechat/api_auth/2.0/(ticketing/createNetTicket|ticket/status)
 */

// 优先读取本地持久化存储的值（如 BoxJs），未设置时使用右侧默认值
var TARGET = $prefs.valueForKey('sushiro_target_number') || '566';
var CHECK_TIME = $prefs.valueForKey('sushiro_check_time') || '154714';

if (typeof $response === 'undefined' || !$response.body) {
    $done({});
} else {
    try {
        var obj = JSON.parse($response.body);

        // 精准定位到 netTicket.TICKET_DETAIL，不误伤 STORE_INFO
        if (obj && obj.netTicket && obj.netTicket.TICKET_DETAIL) {
            var detail = obj.netTicket.TICKET_DETAIL;

            detail.number = String(TARGET);
            detail.queueTime = String(CHECK_TIME);
            detail.wait = 0;

            console.log('[Sushiro] 精准覆写完成 -> 号码:' + detail.number + ' 时间:' + detail.queueTime);
            $notify('寿司郎排队号已更新', '当前号码: ' + detail.number, '前方等待桌数已设为 0');

            $done({ body: JSON.stringify(obj) });
        } else {
            $done({});
        }
    } catch (e) {
        console.log('[Sushiro] JSON 解析异常: ' + e.message);
        $done({});
    }
}
