/**
 * 寿司郎排队号设置器 - Quantumult X
 *
 * [rewrite_local] 粘贴下面这行（一整行）：
 * ^https:\/\/httpbin\.org\/get\?sq=\d+ url script-response-body sushiro-setter.js
 *
 * 使用方法：
 * 打开 Safari，在地址栏输入 https://httpbin.org/get?sq=888
 * 等待页面加载，弹出通知即表示号码已设置
 * 之后去寿司郎小程序取号，排队号就是你设置的值
 */

var num = null;

// 方式1：从请求 URL 提取（最可靠
if (typeof $request !== 'undefined' && $request.url) {
    var m = $request.url.match(/sq=(\d+)/);
    if (m) { num = m[1]; }
}

// 方式2：从 httpbin 响应体提取（fallback）
if (!num && typeof $response !== 'undefined' && $response.body) {
    try {
        var json = JSON.parse($response.body);
        if (json.args && json.args.sq) {
            num = json.args.sq;
        }
    } catch (e) {}
}

if (num) {
    $prefs.setValueForKey(num, 'sq_target_number');
    console.log('[Sushiro] 排队号已设置为 ' + num);
    $notify('寿司郎设置成功', '排队号 = ' + num, '下次取号自动生效');
} else {
    console.log('[Sushiro] 未能从 URL 提取号码');
    $notify('寿司郎设置失败', '未识别到号码', '请确认 URL 格式: ?sq=数字');
}

$done({});
