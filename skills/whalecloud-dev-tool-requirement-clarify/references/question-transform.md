# question-transform.py — 问题格式转换工具

将命令行参数转换为前端可渲染的 JSON 格式问题。

## 参数说明

| 参数 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `--type` | 否 | 问题类型：`single`（单选）、`multiple`（多选）、`boolean`（判断） | `--type=single` |
| `--title` | 是* | 问题标题（生成问题时必填，更新问题时必填） | `--title="索引优先级的类型"` |
| `--context` | 否 | 问题的描述信息 | `--context="请选择索引优先级类型"` |
| `--option1` ~ `--optionN` | 否* | 选项内容（生成问题时必填，更新时不需要） | `--option1="Hash索引" --option2="B+Tree索引"` |
| `--custom` | 否 | 是否允许用户自定义输入，默认 `true` | `--custom=true` |
| `--answer` | 否* | 用户答案（更新问题时必填） | `--answer="B+Tree索引"` |
| `--reset` | 否 | 清空记录文件 | `--reset` |
| `--read` | 否 | 读取未回答的问题并输出JSON格式 | `--read` |
| `--readall` | 否 | 读取所有问题并格式化输出（包含已解决状态） | `--readall` |
| `--update` | 否 | 更新问题答案并标记为已解决（需配合 --title 和 --answer 使用） | `--update --title="问题标题" --answer="用户答案"` |

> 注：`*` 表示在对应模式下必填

## 使用模式

### 模式一：生成单个问题

直接生成一个问题并输出：

```bash
py question-transform.py --type=single --title="索引优先级的类型" --context="请选择索引优先级类型" --option1="Hash索引" --option2="B+Tree索引" --option3="主键索引" --custom=true
```

**输出：**
```json
{
  "type": "questionnaire",
  "version": "1.0",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "title": "索引优先级的类型",
      "context": "请选择索引优先级类型",
      "options": [
        { "value": "A", "label": "Hash索引", "selected": false },
        { "value": "B", "label": "B+Tree索引", "selected": false },
        { "value": "C", "label": "主键索引", "selected": false }
      ],
      "inputEnabled": true,
      "inputPlaceholder": "或者你的答案：",
      "required": false,
      "render": {
        "layout": "vertical",
        "optionStyle": "radio",
        "showProgress": true,
        "progress": { "current": 1, "total": 1 }
      }
    }
  ]
}
```

### 模式二：累积多个问题

通过多次调用脚本，累积多个问题后统一输出：

```bash

# 逐个添加问题
py question-transform.py --type=single --title="Q1" --context="描述1" --option1="A" --option2="B"
py question-transform.py --type=multiple --title="Q2" --context="描述2" --option1="C" --option2="D"
py question-transform.py --type=boolean --title="Q3" --context="描述3"

# 读取未回答的问题（JSON格式输出）
py question-transform.py --read
```

> ⚠️ **注意**：`--read` 只返回未回答的问题，已回答的问题会被过滤掉。如需查看所有问题（含已解决状态），请使用 `--readall`。

**--read 输出：**
```json
{
  "type": "questionnaire",
  "version": "1.0",
  "questions": [
    {
      "id": "q2",
      "type": "multiple",
      "title": "Q2",
      "context": "描述2",
      "options": [...],
      "render": {
        "optionStyle": "checkbox",
        "progress": { "current": 1, "total": 1 }
      }
    }
  ]
}
```

### 模式三：更新问题答案

当用户回答问题后，可以更新记录文件中的答案并标记为已解决：

```bash
# 更新问题答案并标记为已解决
py question-transform.py --update --title="Q1" --answer="A"
```

### 模式四：查看所有问题

查看记录文件中的所有问题（含已解决状态）：

```bash
# 格式化输出所有问题
py question-transform.py --readall
```

**--readall 输出：**
```
问题1：Q1 内容：描述1 状态：已解决 用户回复：A
问题2：Q2 内容：描述2 状态：未解决
```

## 输出字段说明

| 字段 | 说明 |
|------|------|
| `type` | 固定为 `questionnaire` |
| `version` | 版本号 `1.0` |
| `questions[].id` | 问题ID |
| `questions[].type` | 问题类型：`single`（单选）、`multiple`（多选） |
| `questions[].title` | 问题标题 |
| `questions[].context` | 问题描述 |
| `questions[].options` | 选项列表 |
| `questions[].options[].value` | 选项值（A、B、C...） |
| `questions[].options[].label` | 选项显示文本 |
| `questions[].inputEnabled` | 是否启用输入框 |
| `questions[].inputPlaceholder` | 输入框占位符 |
| `questions[].render.optionStyle` | 渲染样式：`radio`（单选）、`checkbox`（多选）、`boolean`（判断） |
| `questions[].render.progress` | 进度信息（current/total） |
| `questions[].answer` | 用户回答的答案（仅在问题被更新后存在） |
| `questions[].resolved` | 问题是否已解决（true/false，仅在问题被更新后存在） |

## 记录文件

累积问题时会生成临时文件 `.questions.json`，存储在脚本同目录下：

- `--reset`：删除记录文件
- `--read`：读取未回答的问题，不删除记录文件
- `--readall`：格式化输出所有问题（含已解决状态），不删除记录文件
- `--update`：更新问题答案并标记为已解决
- 其他参数：追加到记录文件
