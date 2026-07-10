# POPO 卡片模板说明

文章正式推送使用 POPO `card` 消息。发送接口本身不能直接传任意 HTML，必须先在 POPO 开发者后台创建卡片模板，然后用变量填充。

当前推荐结构是“每个案例一条独立文章 URL + 一期合集 URL”：

- `itemList[].url`：每个案例条目的独立文章页
- `articleUrl`：本期合集页
- 底部按钮打开合集页，列表项点击打开对应案例页

## 环境变量

```env
POPO_CARD_TEMPLATE_UUID="开发者后台卡片详情中的 Template_Series_ID"
POPO_CARD_CALLBACK_CONFIG_KEY=""
```

`POPO_CARD_CALLBACK_CONFIG_KEY` 可选。当前 MVP 没有卡片按钮回调逻辑，可以先留空。

## 模板变量

代码会向 `publicVariableMap` 传入以下变量：

| 变量名 | 类型 | 说明 |
| --- | --- | --- |
| `columnTitle` | String | 栏目标题 |
| `title` | String | 文章标题 |
| `summary` | String | 文章摘要 |
| `articleUrl` | String | 免登录阅读链接 |
| `coverUrl` | String | 封面图绝对 URL，可能为空 |
| `itemList` | List | 从正文 `h2` / `h3` / `li` 提取的条目列表，最多 5 条 |
| `item1Title` | String | 第 1 条标题 |
| `item2Title` | String | 第 2 条标题 |
| `item3Title` | String | 第 3 条标题 |
| `item4Title` | String | 第 4 条标题 |
| `item5Title` | String | 第 5 条标题 |
| `readMoreText` | String | 阅读按钮文案 |

`itemList` 内每一项结构：

```json
{
  "index": 1,
  "title": "案例标题",
  "url": "https://your-domain.com/p/case-token",
  "line": "1. 案例标题"
}
```

如果 POPO 卡片模板不方便使用列表组件，可以直接使用 `item1Title` 到 `item5Title`。

## 建议卡片结构

建议按截图方向做一张信息卡：

1. 顶部大封面图：绑定 `coverUrl`
2. 主标题：绑定 `title`
3. 摘要小字：绑定 `summary`
4. 条目列表：绑定 `itemList` 或 `item1Title` 到 `item5Title`
5. 按钮或链接区域：绑定 `articleUrl`

模板中每个列表项会通过 `item.url` 打开对应案例文章；底部“阅读全文”按钮会跳转到 `articleUrl`，也就是本期合集页。

## 可复制模板

已准备两份可复制文件：

- `docs/popo-card-template-copy.json`
- `docs/popo-card-template-copy.js`

模板已按当前提供的组件文档使用 `image/src/ratio`、`text/content`、`divider` 和 `jump`。`ratio: 2` 表示 16:9 封面图。

当前模板没有使用 `cols-flex`，因为列表项可以直接用 `item.line` 渲染，组件依赖更少。如果后续要做“左序号 + 右标题 + 右侧 logo”的复杂布局，再引入 `cols-flex`。

如果卡片只显示空白框和箭头，说明当前 POPO 后台生效的模板不是这版 JSON/JS，或动态变量没有绑定成功。正常情况下，即使后台没有传变量，模板里的静态标题和 JS 默认测试标题、摘要、3 条测试条目也应该显示。

排查顺序：

1. 先把 `docs/popo-card-template-smoke-test.json` 复制到卡片 JSON 模板里保存/发布。这个模板完全不用 JS 和变量，应该显示固定测试文字。
2. 如果冒烟模板仍然空白，优先检查 POPO 后台是否点了保存/发布、生效模板 ID 是否还是当前 `.env` 里的 `POPO_CARD_TEMPLATE_UUID`。
3. 如果冒烟模板正常，再复制 `docs/popo-card-template-js-smoke-test.json` 和 `docs/popo-card-template-js-smoke-test.js`，测试 JavaScript 和 `dynamic: true` 是否生效。
4. 如果 JS 冒烟模板正常，再复制 `docs/popo-card-template-copy.json` 和 `docs/popo-card-template-copy.js`，并确认模板变量包含 `columnTitle`、`title`、`summary`、`articleUrl`、`coverUrl`、`hasCover`、`hasItems`、`itemList`、`readMoreText`。

## 兼容文本

低版本 POPO 客户端不支持卡片时，会显示兼容文本：

```text
标题
摘要
阅读全文链接
```
