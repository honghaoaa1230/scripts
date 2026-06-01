/**
 * 寿司郎小程序 - 排队号覆写脚本
 * 适配 Quantumult X (iOS)
 *
 * ==================== 使用方法 ====================
 *
 * 方法一：本地脚本
 *   把此文件放到 Quantumult X 的「我的iPhone → Quantumult X → Scripts」目录
 *   然后在 Quantumult X 配置文件的 [rewrite_local] 中添加：
 *
 *   [rewrite_local]
 *   ^https:\/\/crm-cn-prd\.sushiro\.com\.cn\/wechat\/api_auth\/2\.0\/(ticketing\/createNetTicket|ticket\/status) url script-response-body override-ticket-number.js
 *
 * 方法二：远程脚本（推荐）
 *   把此文件上传到 GitHub Gist，然后在 [rewrite_remote] 中添加：
 *
 *   [rewrite_remote]
 *   ^https:\/\/crm-cn-prd\.sushiro\.com\.cn\/wechat\/api_auth\/2\.0\/(ticketing\/createNetTicket|ticket\/status) url script-response-body https://your-gist-url/override-ticket-number.js
 *
 * ==================== HTTPS 解密设置 ====================
 *
 * Quantumult X → 设置 → HTTPS 解密 → 开启
 *   → 生成 CA 证书 → 安装 → 去 iOS 设置信任证书
 * iOS: 设置 → 通用 → 关于本机 → 证书信任设置 → 开启 Quantumult X 证书
 *
 * ==================== 通知设置（可选） ====================
 *
 * 如果不想收到覆写通知，将 ENABLE_NOTIFY 改为 false
 */

// ==================== 配置区域 ====================
var TARGET_NUMBER = '374';       // 改成你想要的排队号
var OVERRIDE_WAIT = true;        // 同时把 wait 等待桌数设为 0
var OVERRIDE_QUEUE_TIME = false; // 是否覆写排队时间
var ENABLE_NOTIFY = true;        // 是否弹出通知
// ==================== 配置结束 ====================

/**
 * 递归遍历 JSON 对象，替换所有 number/wait 字段
 */
function deepReplaceNumber(obj, target) {
    if (obj === null || obj === undefined) {
        return;
    }

    if (Object.prototype.toString.call(obj) === '[object Array]') {
        for (var i = 0; i < obj.length; i++) {
            deepReplaceNumber(obj[i], target);
        }
        return;
    }

    if (typeof obj === 'object') {
        if ('number' in obj) {
            obj.number = target;
        }
        if (OVERRIDE_WAIT && ('wait' in obj)) {
            obj.wait = 0;
        }

        var keys = Object.keys(obj);
        for (var k = 0; k < keys.length; k++) {
            var val = obj[keys[k]];
            if (typeof val === 'object' && val !== null) {
                deepReplaceNumber(val, target);
            }
        }
    }
}

// ==================== 主逻辑 ====================

if (typeof $response === 'undefined') {
    $done({});
} else {
    try {
        var body = JSON.parse($response.body);

        deepReplaceNumber(body, TARGET_NUMBER);

        if (OVERRIDE_QUEUE_TIME) {
            if (body.netTicket && body.netTicket.TICKET_DETAIL) {
                body.netTicket.TICKET_DETAIL.queueTime = '000000';
            }
            if (body.queueTime) {
                body.queueTime = '000000';
            }
        }

        if (ENABLE_NOTIFY) {
            // 兼容新旧 Quantumult X 通知 API
            try {
                $notification.post(
                    '寿司郎排队号',
                    '已覆写为 ' + TARGET_NUMBER,
                    'wait 已置 0，queueTime 已重置'
                );
            } catch (e1) {
                try {
                    $notify(
                        '寿司郎排队号',
                        '已覆写为 ' + TARGET_NUMBER,
                        'wait 已置 0，queueTime 已重置'
                    );
                } catch (e2) {
                    // 通知失败不影响功能
                }
            }
        }

        $done({ body: JSON.stringify(body) });
    } catch (e) {
        // 出错时放行原始响应
        if (ENABLE_NOTIFY) {
            try {
                $notification.post('寿司郎覆写失败', '脚本执行错误', String(e));
            } catch (e1) {
                try {
                    $notify('寿司郎覆写失败', '脚本执行错误', String(e));
                } catch (e2) {}
            }
        }
        $done({});
    }
}
