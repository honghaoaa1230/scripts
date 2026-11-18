/**
 * 寿司郎接口探测与排队号覆写测试脚本 (Debug版)
 */

var TARGET = '566';
var CHECK_TIME = '154714';

// 1. 只要规则命中，第一行就会打印
var reqUrl = (typeof $request !== 'undefined' && $request.url) ? $request.url : '未知URL';
console.log('[Sushiro-Debug] 命中请求: ' + reqUrl);

if (typeof $response === 'undefined' || !$response.body) {
    console.log('[Sushiro-Debug] 无响应体，跳过: ' + reqUrl);
    $done({});
} else {
    var raw = $response.body;
    console.log('[Sushiro-Debug] 响应体前200字: ' + raw.substring(0, 200));

    // 检查响应体里是否包含排队相关关键字（忽略大小写）
    var hasTicketData = /("number"|"queueTime"|"wait"|ticket|queue)/i.test(raw);

    if (hasTicketData) {
        var before = raw.length;
        // 尝试执行覆写
        var modified = raw
            .replace(/"number"\s*:\s*"[^"]*"/g, '"number":"' + TARGET + '"')
            .replace(/"queueTime"\s*:\s*"[^"]*"/g, '"queueTime":"' + CHECK_TIME + '"')
            .replace(/"wait"\s*:\s*\d+/g, '"wait":0');

        console.log('[Sushiro-Debug] 发现目标字段！URL=' + reqUrl);
        console.log('[Sushiro-Debug] 完整响应体: ' + modified);

        // 弹窗通知显示命中的真实路径，方便你后续收紧正则
        var shortPath = reqUrl.replace(/^https?:\/\/[^\/]+/, '');
        $notify(
            '寿司郎命中目标接口',
            '路径: ' + shortPath,
            '已尝试覆写排队号为 ' + TARGET + ' (点击查看完整日志)'
        );

        $done({ body: modified });
    } else {
        // 不是排队接口的普通静态/配置接口直接放行，不弹窗打扰
        console.log('[Sushiro-Debug] 非排队接口，直接放行');
        $done({});
    }
}
