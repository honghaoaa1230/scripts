/**
 * 寿司郎排队号设置器 - Quantumult X
 * [rewrite_local]
 * ^https:\/\/httpbin\.org\/get\?sq=\d+ url script-response-body sushiro-setter.js
 *
 * 使用方法：Safari 访问 https://httpbin.org/get?sq=888
 */

var num = null;

// 从请求 URL 提取
try {
    if ($request && $request.url) {
        var m = $request.url.match(/sq=(\d+)/);
        if (m) { num = m[1]; }
    }
} catch (e) {}

// 从响应体提取（fallback）
if (!num) {
    try {
        if ($response && $response.body) {
            var json = JSON.parse($response.body);
            if (json && json.args && json.args.sq) {
                num = json.args.sq;
            }
        }
    } catch (e) {}
}

if (num) {
    try { $prefs.setValueForKey(num, 'sq_target_number'); } catch (e) {}
    try { $notify('寿司郎设置成功', '排队号=' + num); } catch (e) {}
} else {
    try { $notify('寿司郎设置失败', '未能识别号码'); } catch (e) {}
}

$done({});
